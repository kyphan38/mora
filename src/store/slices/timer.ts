import { DURATIONS } from '../../data/durations';
import { breakForSeconds, longBreakForSeconds, LONG_BREAK_EVERY } from '../../core/pomodoro';
import { TAKEOVER_SEC } from '../../core/liveModel';

import type { Slice, TimerSlice } from '../types';
import { buildSession, currentTask, keepPick, MIN_LOG_SEC, run, tellLogi } from '../helpers';

export const timerSlice: Slice<TimerSlice> = (set, get) => ({
  setup: {
    durationLabel: '50 min',
    durationSec: 3000,
  },
  setDuration: (label) => {
    const dur = DURATIONS.find((d) => d.label === label);
    if (dur) {
      const s = get();
      const keepProgress = s.sessionActive && s.phase === 'focus';
      set({
        setup: { durationLabel: dur.label, durationSec: dur.seconds },
        ...(keepProgress ? {} : { elapsedSec: 0 }),
      });
    }
  },
  setCustomDuration: (minutes) => {
    const min = Math.round(minutes);
    if (!Number.isFinite(min) || min < 1 || min > 600) return;
    const known = DURATIONS.find((d) => d.seconds === min * 60);
    if (known) return get().setDuration(known.label);
    const s = get();
    set({
      setup: { durationLabel: `${min} min`, durationSec: min * 60 },
      ...(s.sessionActive && s.phase === 'focus' ? {} : { elapsedSec: 0 }),
    });
  },
  elapsedSec: 0,
  isRunning: false,
  sessionActive: false,
  phase: 'focus',
  lastFocusSec: 0,
  autoContinue: false,
  runSyncAt: null,
  focusStartedAt: null,
  lastEvent: null,
  cycleCount: 0,
  longBreak: false,
  lastSessionId: null,
  completeActive: (elapsedSec) => {
    const state = get();
    const t = currentTask(state);
    const session = buildSession(state, t, elapsedSec);
    const updatedTasks = t ? state.tasks.map((task) => (task.id === t.id ? { ...task, done: true } : task)) : state.tasks;
    tellLogi(state.tasks, updatedTasks);
    set({
      sessions: session ? [session, ...state.sessions] : state.sessions,
      focusStartedAt: null,
      tasks: updatedTasks,
      activeTaskId: keepPick(state.activeTaskId, updatedTasks),
    });
  },
  stopActive: (elapsedSec) => {
    const state = get();
    const session = buildSession(state, currentTask(state), elapsedSec);
    if (!session) return false;
    set({ sessions: [session, ...state.sessions] });
    return true;
  },
  startFocus: () => {
    set({
      sessionActive: true,
      elapsedSec: 0,
      isRunning: false,
      screen: 'focus',
      phase: 'focus',
      runSyncAt: null,
      focusStartedAt: null,
    });
  },
  setIsRunning: (b) => {
    const s = get();
    if (b === s.isRunning) return;
    set({
      ...run(b),
      ...(b && s.phase === 'focus' && s.focusStartedAt === null ? { focusStartedAt: Date.now() } : {}),
    });
  },
  togglePlay: () => {
    const s = get();
    if (!s.sessionActive || s.phase === 'review') return;
    get().setIsRunning(!s.isRunning);
  },
  tickSession: (deltaSec = 1) => {
    // A following device lets the leader log the block; if the leader is gone
    // (closed, asleep) for TAKEOVER_SEC past the end, this device finishes it.
    const waitForLeader = () => {
      const s = get();
      if (!s.liveFollower) return false;
      const now = Date.now();
      if (s.overdueSince === null) {
        set({ overdueSince: now });
        return true;
      }
      if (now - s.overdueSince < TAKEOVER_SEC * 1000) return true;
      set({ liveFollower: false, overdueSince: null });
      return false;
    };
    const state = get();
    if (!state.isRunning || deltaSec <= 0) return;

    // Break phase countdown
    if (state.phase === 'break') {
      const breakDur = state.longBreak ? longBreakForSeconds(state.lastFocusSec) : breakForSeconds(state.lastFocusSec);
      const elapsed = Math.min(breakDur, state.elapsedSec + deltaSec);
      set({ elapsedSec: elapsed });
      if (elapsed >= breakDur) {
        if (waitForLeader()) return;
        set({ lastEvent: { kind: 'break-done', taskName: '', at: Date.now() } });
        get().finishBreak();
      }
      return;
    }
    if (state.phase !== 'focus') return;

    // Focus phase: a task is optional.
    const total = state.setup.durationSec;
    const elapsed = total > 0
      ? Math.min(total, state.elapsedSec + deltaSec)
      : state.elapsedSec + deltaSec;
    set({ elapsedSec: elapsed });
    if (total > 0 && elapsed >= total) {
      if (waitForLeader()) return;
      set({ lastEvent: { kind: 'focus-done', taskName: currentTask(state)?.name ?? '', at: Date.now() } });
      get().enterReview();
    }
  },
  syncClock: (now = Date.now()) => {
    const s = get();
    if (!s.isRunning) return;
    if (s.runSyncAt === null) {
      set({ runSyncAt: now });
      return;
    }
    const delta = Math.floor((now - s.runSyncAt) / 1000);
    if (delta <= 0) return;
    // Keep the sub-second remainder so no time is lost between syncs.
    set({ runSyncAt: s.runSyncAt + delta * 1000 });
    get().tickSession(delta);
  },
  stopFocus: () => {
    // Break time is not focus time.
    if (get().phase === 'focus') get().stopActive(get().elapsedSec);
    set({
      sessionActive: false,
      ...run(false),
      elapsedSec: 0,
      phase: 'focus',
      focusStartedAt: null,
    });
  },
  // --- Pomodoro actions ---
  setAutoContinue: (b) => set({ autoContinue: b }),
  enterReview: () => {
    const state = get();
    if (state.phase !== 'focus') return;
    const focusDur = state.setup.durationSec > 0 ? state.setup.durationSec : state.elapsedSec;
    // A block counts toward the cycle and the task when it lasted a minute.
    const counted = state.elapsedSec >= MIN_LOG_SEC;
    const cycleCount = counted ? state.cycleCount + 1 : state.cycleCount;
    const longBreak = cycleCount >= LONG_BREAK_EVERY;
    const current = currentTask(state);
    if (counted && current) {
      set({ tasks: state.tasks.map((t) => (t.id === current.id ? { ...t, blocks: (t.blocks ?? 0) + 1 } : t)) });
    }
    set({ cycleCount, longBreak });

    if (state.autoContinue) {
      // Auto-continue: log the block (and mark the picked task done), then start the break.
      get().completeActive(state.elapsedSec);
      set({
        ...(longBreak ? { cycleCount: 0 } : {}),
        lastFocusSec: focusDur,
        phase: 'break',
        elapsedSec: 0,
        ...run(true),
      });
      return;
    }

    // Manual: log the finished block now, so every choice on the review
    // sheet (keep working, break, focus again, stop) keeps that time.
    const session = buildSession(state, currentTask(get()), state.elapsedSec);
    set({
      sessions: session ? [session, ...state.sessions] : state.sessions,
      lastSessionId: session?.id ?? null,
      lastFocusSec: focusDur,
      phase: 'review',
      elapsedSec: 0,
      focusStartedAt: null,
      ...run(false),
    });
  },
  reviewMarkDone: (done) => {
    if (done) {
      // The block was already logged by enterReview; only mark the task.
      const state = get();
      const t = currentTask(state);
      if (!t) return;
      const tasks = state.tasks.map((task) => (task.id === t.id ? { ...task, done: true } : task));
      tellLogi(state.tasks, tasks);
      set({ tasks, activeTaskId: null });
    } else {
      set({
        phase: 'focus',
        elapsedSec: 0,
        ...run(true),
        focusStartedAt: Date.now(),
      });
    }
  },
  startBreak: () => {
    set({
      ...(get().longBreak ? { cycleCount: 0 } : {}),
      phase: 'break',
      elapsedSec: 0,
      ...run(true),
    });
  },
  finishBreak: () => {
    if (get().longBreak && get().cycleCount === 0) set({ longBreak: false });
    const state = get();
    if (state.autoContinue) {
      // Auto-continue: go straight to the next focus block.
      set({
        phase: 'focus',
        elapsedSec: 0,
        ...run(true),
        focusStartedAt: Date.now(),
      });
      return;
    }
    // Manual: go to ready state (paused)
    set({
      phase: 'focus',
      elapsedSec: 0,
      ...run(false),
      focusStartedAt: null,
    });
  },
  focusAgain: (durationSec) => {
    const dur = DURATIONS.find((d) => d.seconds === durationSec);
    set({
      setup: {
        durationLabel: dur ? dur.label : `${Math.round(durationSec / 60)} min`,
        durationSec,
      },
      phase: 'focus',
      elapsedSec: 0,
      ...run(false),
      focusStartedAt: null,
    });
  },
  stopAllSessions: () => {
    get().stopFocus();
    set({ phase: 'focus', screen: 'history' });
  },
});
