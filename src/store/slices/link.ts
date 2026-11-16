import { CORNERS } from '../../data/corners';
import { breakForSeconds, longBreakForSeconds } from '../../core/pomodoro';
import { liveElapsed } from '../../core/liveModel';
import { mergeRoutine, pruneHidden } from '../../core/logiTasks';

import type { AppStore, Slice, LinkSlice } from '../types';
import { keepPick, switchPatch } from '../helpers';

export const linkSlice: Slice<LinkSlice> = (set, get) => ({
  logi: { enabled: false },
  setLogi: (patch) => set((s) => ({ logi: { ...s.logi, ...patch } })),
  logiStatus: { state: 'idle', message: '', at: 0 },
  setLogiStatus: (logiStatus) => set({ logiStatus }),
  logiHidden: [],
  logiSync: { state: 'idle', message: '', at: 0 },
  setLogiSync: (logiSync) => set({ logiSync }),
  applyLogiRoutine: (r, pending, keepDone) =>
    set((state) => {
      const hidden = pruneHidden(state.logiHidden, r.date);
      const newTasks = mergeRoutine(state.tasks, r, hidden, pending, keepDone);
      const patch: Partial<AppStore> = hidden.length !== state.logiHidden.length ? { logiHidden: hidden } : {};
      if (newTasks === state.tasks) return patch;
      const activeTaskId = keepPick(state.activeTaskId, newTasks);
      return {
        ...patch,
        tasks: newTasks,
        activeTaskId,
        ...switchPatch(state, newTasks, activeTaskId, true),
      };
    }),
  runId: null,
  liveFollower: false,
  overdueSince: null,
  applyLive: (l, now = Date.now()) => {
    const s = get();
    const total =
      l.phase === 'break'
        ? l.longBreak ? longBreakForSeconds(l.lastFocusSec) : breakForSeconds(l.lastFocusSec)
        : l.durationSec;
    let elapsed = liveElapsed(l, now);
    if (total > 0 && l.phase !== 'review') elapsed = Math.min(elapsed, total);
    const whole = Math.floor(elapsed);
    const freshEvent = l.event && l.event.at > (s.lastEvent?.at ?? 0) && now - l.event.at < 60_000;
    set({
      sessionActive: l.sessionActive,
      phase: l.phase,
      isRunning: l.isRunning,
      elapsedSec: whole,
      // Keep the sub-second part so both devices tick on the same second.
      runSyncAt: l.isRunning ? now - (elapsed - whole) * 1000 : null,
      setup: { durationSec: l.durationSec, durationLabel: l.durationLabel },
      lastFocusSec: l.lastFocusSec,
      longBreak: l.longBreak,
      cycleCount: l.cycleCount,
      focusStartedAt: l.focusStartedAt,
      runId: l.runId ?? null,
      // Older timers carry no task id: keep this device's pick then.
      activeTaskId: keepPick(l.taskId === undefined ? s.activeTaskId : l.taskId, s.tasks),
      liveFollower: true,
      overdueSince: null,
      ...(freshEvent ? { lastEvent: l.event } : {}),
    });
  },
  leadLive: () => set({ liveFollower: false, overdueSince: null }),
  applyRemote: ({ tasks, sessions, notes, prefs, userScenes, userTracks }) => {
    const s = get();
    const patch: Partial<AppStore> = {};
    if (tasks) {
      patch.tasks = tasks;
      // The picked task was finished or removed elsewhere: the clock goes on with no task.
      patch.activeTaskId = keepPick(s.activeTaskId, tasks);
    }
    if (sessions) patch.sessions = sessions;
    if (notes) patch.notes = notes;
    if (userTracks) {
      patch.userTracks = userTracks;
      // The chosen cloud track was deleted on another device.
      const id = (prefs?.sound?.customTrackId !== undefined ? prefs.sound.customTrackId : s.sound.customTrackId) ?? null;
      if (id && !userTracks.some((t) => t.id === id) && !s.customTracks.some((t) => t.id === id)) {
        patch.sound = { ...(patch.sound ?? s.sound), customTrackId: null };
      }
    }
    if (userScenes) {
      patch.userScenes = userScenes;
      // The scene in use was deleted on another device.
      if (s.corner?.video && !userScenes.some((u) => 'u_' + u.id === s.corner!.id)) patch.corner = CORNERS[0] ?? null;
    }
    if (prefs) {
      const { sound, logi, ...rest } = prefs;
      Object.assign(patch, rest);
      // The chosen track syncs when it is a cloud track; mute and the logi token are per device.
      if (sound) patch.sound = { ...sound, customTrackId: sound.customTrackId ?? null };
      if (logi) patch.logi = { ...s.logi, ...logi };
    }
    set(patch);
  },
  hydrate: (p) => {
    const update: Partial<AppStore> = {};
    if (p.tasks !== undefined) update.tasks = p.tasks;
    if (p.sessions !== undefined) update.sessions = p.sessions;
    if (p.sound !== undefined) update.sound = p.sound;
    if (p.setup !== undefined) update.setup = p.setup;
    // A saved scene may have been removed from the app since; fall back to a current one.
    if (p.corner !== undefined)
      update.corner = p.corner && (p.corner.video ? p.corner : (CORNERS.find((c) => c.id === p.corner!.id) ?? CORNERS[0] ?? null));
    if (p.roomBackground !== undefined) update.roomBackground = p.roomBackground;
    if (p.elapsedSec !== undefined) update.elapsedSec = p.elapsedSec;
    if (p.isRunning !== undefined) update.isRunning = p.isRunning;
    if (p.sessionActive !== undefined) update.sessionActive = p.sessionActive;
    if (p.autoContinue !== undefined) update.autoContinue = p.autoContinue;
    if (p.customTracks !== undefined) update.customTracks = p.customTracks;
    if (p.phase !== undefined) update.phase = p.phase;
    if (p.lastFocusSec !== undefined) update.lastFocusSec = p.lastFocusSec;
    if (p.focusStartedAt !== undefined) update.focusStartedAt = p.focusStartedAt;
    if (p.notes !== undefined) update.notes = p.notes;
    if (p.cycleCount !== undefined) update.cycleCount = p.cycleCount;
    if (p.longBreak !== undefined) update.longBreak = p.longBreak;
    if (p.dailyGoalMin !== undefined) update.dailyGoalMin = p.dailyGoalMin;
    if (p.muted !== undefined) update.muted = p.muted;
    if (p.logi !== undefined) update.logi = { enabled: p.logi.enabled === true };
    if (p.hiddenScenes !== undefined) update.hiddenScenes = p.hiddenScenes;
    if (p.logiHidden !== undefined) update.logiHidden = p.logiHidden;
    update.runSyncAt = null;

    // The saved pick must still point at an undone task.
    update.activeTaskId = keepPick(p.pickedTaskId, p.tasks !== undefined ? p.tasks : get().tasks);

    set(update);
  },
});
