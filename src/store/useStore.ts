import { create } from 'zustand';
import type { Screen, Corner, SoundConfig, SessionSetup, Task, Session, CustomTrack } from '../types';
import { DURATIONS } from '../data/durations';
import { uid } from '../lib/uid';
import { CORNERS } from '../data/corners';
import { breakForSeconds } from '../lib/pomodoro';

export type Phase = 'focus' | 'break' | 'review';

interface AppStore {
  screen: Screen;
  corner: Corner | null;
  sound: SoundConfig;
  setup: SessionSetup;
  tasks: Task[];
  sessions: Session[];
  setScreen: (s: Screen) => void;
  setCorner: (corner: Corner) => void;
  setAmbient: (name: string) => void;
  setMusicStyle: (name: string) => void;
  setAmbientVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  customTracks: CustomTrack[];
  addCustomTrack: (track: CustomTrack) => void;
  selectCustomTrack: (id: string) => void;
  removeCustomTrack: (id: string) => void;
  setDuration: (label: string) => void;
  addTask: (name: string) => void;
  removeTask: (id: string) => void;
  reorderTasks: (from: number, to: number) => void;
  activeTask: () => Task | undefined;
  toggleTask: (id: string) => void;
  clearCompletedTasks: () => void;
  roomBackground: 'color' | 'scene';
  setRoomBackground: (m: 'color' | 'scene') => void;
  completeActive: (elapsedSec: number) => void;
  stopActive: (elapsedSec: number) => boolean;
  hydrate: (p: {
    tasks?: Task[];
    sessions?: Session[];
    sound?: SoundConfig;
    setup?: SessionSetup;
    corner?: Corner | null;
    roomBackground?: 'color' | 'scene';
    elapsedSec?: number;
    isRunning?: boolean;
    sessionActive?: boolean;
    activeTaskId?: string | null;
    audioActive?: boolean;
    autoContinue?: boolean;
    customTracks?: CustomTrack[];
    phase?: Phase;
    lastFocusSec?: number;
    focusStartedAt?: number | null;
  }) => void;
  clearSessions: () => void;

  // New session runtime fields & actions
  elapsedSec: number;
  isRunning: boolean;
  sessionActive: boolean;
  activeTaskId: string | null;
  audioActive: boolean;

  // Pomodoro phase machine
  phase: Phase;
  lastFocusSec: number;
  autoContinue: boolean;

  /** Wall-clock time the current run started counting from; null while paused. Not persisted. */
  runSyncAt: number | null;
  /** When the current focus block first started running; used as the session start. */
  focusStartedAt: number | null;
  /** Last natural phase end, so the app can chime and notify. Not persisted. */
  lastEvent: { kind: 'focus-done' | 'break-done'; taskName: string; at: number } | null;

  startFocus: () => void;
  setIsRunning: (b: boolean) => void;
  /** Hotkey / tray toggle: ignored when there is nothing to run. */
  togglePlay: () => void;
  /** Adds deltaSec (default 1) of run time. */
  tickSession: (deltaSec?: number) => void;
  /** Catches the timer up with the wall clock, so throttled intervals or sleep do not slow it. */
  syncClock: (now?: number) => void;
  stopFocus: () => void;
  setAudioActive: (b: boolean) => void;
  randomScene: () => void;

  // Pomodoro actions
  setAutoContinue: (b: boolean) => void;
  enterReview: () => void;
  reviewMarkDone: (done: boolean) => void;
  startBreak: () => void;
  finishBreak: () => void;
  focusAgain: (durationSec: number) => void;
  stopAllSessions: () => void;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

const run = (on: boolean) => ({ isRunning: on, runSyncAt: on ? Date.now() : null });

// Blocks shorter than a minute are not worth a History row.
const MIN_LOG_SEC = 60;

function buildSession(
  state: { corner: Corner | null; sound: SoundConfig; focusStartedAt: number | null },
  taskName: string,
  elapsedSec: number,
): Session | null {
  if (elapsedSec < MIN_LOG_SEC) return null;
  const endedAt = Date.now();
  return {
    id: uid(),
    taskName,
    minutes: Math.round(elapsedSec / 60),
    startedAt: state.focusStartedAt ?? endedAt - elapsedSec * 1000,
    endedAt,
    corner: state.corner?.name ?? '',
    ambient: state.sound.ambient,
  };
}

export const useStore = create<AppStore>((set, get) => ({
  screen: 'landing',
  corner: null,
  sound: {
    ambient: 'Wind',
    musicStyle: 'Nature',
    ambientVolume: 18,
    musicVolume: 6,
    customTrackId: null,
  },
  customTracks: [],
  setup: {
    durationLabel: '50 min',
    durationSec: 3000,
  },
  tasks: [],
  sessions: [],
  roomBackground: 'color',
  elapsedSec: 0,
  isRunning: false,
  sessionActive: false,
  activeTaskId: null,
  audioActive: false,
  phase: 'focus',
  lastFocusSec: 0,
  autoContinue: false,
  runSyncAt: null,
  focusStartedAt: null,
  lastEvent: null,
  setRoomBackground: (m) => {
    set({ roomBackground: m });
    if (m === 'scene' && get().corner === null) {
      get().randomScene();
    }
  },
  randomScene: () => {
    const current = get().corner;
    const available = current
      ? CORNERS.filter((c) => c.id !== current.id)
      : CORNERS;
    const pool = available.length > 0 ? available : CORNERS;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    get().setCorner(picked);
  },
  setScreen: (s) => set({ screen: s }),
  setCorner: (corner) => set({ corner }),
  setAmbient: (name) =>
    set((state) => ({ sound: { ...state.sound, ambient: name } })),
  setMusicStyle: (name) =>
    set((state) => ({ sound: { ...state.sound, musicStyle: name, customTrackId: null } })),
  setAmbientVolume: (v) =>
    set((state) => ({ sound: { ...state.sound, ambientVolume: clamp(v) } })),
  setMusicVolume: (v) =>
    set((state) => ({ sound: { ...state.sound, musicVolume: clamp(v) } })),
  addCustomTrack: (track) => set(() => ({ customTracks: [track] })),
  selectCustomTrack: (id) =>
    set((state) => ({ sound: { ...state.sound, customTrackId: id } })),
  removeCustomTrack: (id) =>
    set((state) => ({
      customTracks: state.customTracks.filter((t) => t.id !== id),
      sound: state.sound.customTrackId === id
        ? { ...state.sound, customTrackId: null }
        : state.sound,
    })),
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
  addTask: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => {
      const newTasks = [...state.tasks, { id: uid(), name: trimmed, done: false, createdAt: Date.now() }];
      const firstUndone = newTasks.find((t) => !t.done);
      return {
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
      };
    });
  },
  removeTask: (id) =>
    set((state) => {
      const newTasks = state.tasks.filter((t) => t.id !== id);
      const firstUndone = newTasks.find((t) => !t.done);
      return {
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
        ...(firstUndone ? {} : run(false)),
        sessionActive: firstUndone ? state.sessionActive : false,
        // A removed task's time is discarded, not moved to the next task.
        ...switchPatch(state, newTasks, false),
      };
    }),
  reorderTasks: (from, to) =>
    set((state) => {
      if (from < 0 || from >= state.tasks.length || to < 0 || to >= state.tasks.length) {
        return {};
      }
      const copy = [...state.tasks];
      const [moved] = copy.splice(from, 1);
      if (moved) {
        copy.splice(to, 0, moved);
      }
      const firstUndone = copy.find((t) => !t.done);
      return {
        tasks: copy,
        activeTaskId: firstUndone ? firstUndone.id : null,
        ...switchPatch(state, copy, true),
      };
    }),
  activeTask: () => get().tasks.find((t) => !t.done),
  toggleTask: (id) =>
    set((state) => {
      const newTasks = state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      const firstUndone = newTasks.find((t) => !t.done);
      return {
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
        ...(firstUndone ? {} : run(false)),
        sessionActive: firstUndone ? state.sessionActive : false,
        ...switchPatch(state, newTasks, true),
      };
    }),
  clearCompletedTasks: () =>
    set((state) => {
      const newTasks = state.tasks.filter((t) => !t.done);
      const firstUndone = newTasks.find((t) => !t.done);
      return {
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
      };
    }),
  completeActive: (elapsedSec) => {
    const state = get();
    const t = state.tasks.find((task) => !task.done);
    if (!t) return;
    const session = buildSession(state, t.name, elapsedSec);
    const updatedTasks = state.tasks.map((task) => (task.id === t.id ? { ...task, done: true } : task));
    const firstUndone = updatedTasks.find((task) => !task.done);
    set({
      sessions: session ? [session, ...state.sessions] : state.sessions,
      focusStartedAt: null,
      tasks: updatedTasks,
      activeTaskId: firstUndone ? firstUndone.id : null,
    });
  },
  stopActive: (elapsedSec) => {
    const state = get();
    const t = state.tasks.find((task) => !task.done);
    if (!t) return false;
    const session = buildSession(state, t.name, elapsedSec);
    if (!session) return false;
    set({ sessions: [session, ...state.sessions] });
    return true;
  },
  hydrate: (p) => {
    const update: Partial<AppStore> = {};
    if (p.tasks !== undefined) update.tasks = p.tasks;
    if (p.sessions !== undefined) update.sessions = p.sessions;
    if (p.sound !== undefined) update.sound = p.sound;
    if (p.setup !== undefined) update.setup = p.setup;
    if (p.corner !== undefined) update.corner = p.corner;
    if (p.roomBackground !== undefined) update.roomBackground = p.roomBackground;
    if (p.elapsedSec !== undefined) update.elapsedSec = p.elapsedSec;
    if (p.isRunning !== undefined) update.isRunning = p.isRunning;
    if (p.sessionActive !== undefined) update.sessionActive = p.sessionActive;
    if (p.audioActive !== undefined) update.audioActive = p.audioActive;
    if (p.autoContinue !== undefined) update.autoContinue = p.autoContinue;
    if (p.customTracks !== undefined) update.customTracks = p.customTracks;
    if (p.phase !== undefined) update.phase = p.phase;
    if (p.lastFocusSec !== undefined) update.lastFocusSec = p.lastFocusSec;
    if (p.focusStartedAt !== undefined) update.focusStartedAt = p.focusStartedAt;
    update.runSyncAt = null;

    // Auto-heal activeTaskId on load: it must point at an undone task.
    const tasksList = p.tasks !== undefined ? p.tasks : get().tasks;
    const firstUndone = tasksList.find((t) => !t.done);
    const savedOk = p.activeTaskId && tasksList.some((t) => t.id === p.activeTaskId && !t.done);
    update.activeTaskId = savedOk ? p.activeTaskId! : (firstUndone ? firstUndone.id : null);

    set(update);
  },
  clearSessions: () => set({ sessions: [] }),
  startFocus: () => {
    const firstUndone = get().tasks.find((t) => !t.done);
    set({
      sessionActive: true,
      elapsedSec: 0,
      isRunning: false,
      activeTaskId: firstUndone ? firstUndone.id : null,
      screen: 'room',
      phase: 'focus',
      runSyncAt: null,
      focusStartedAt: null,
    });
  },
  setIsRunning: (b) => {
    const s = get();
    set({
      ...run(b),
      ...(b && s.phase === 'focus' && s.focusStartedAt === null ? { focusStartedAt: Date.now() } : {}),
    });
  },
  togglePlay: () => {
    const s = get();
    if (!s.sessionActive || s.phase === 'review') return;
    if (s.phase === 'focus' && !s.tasks.some((t) => !t.done)) return;
    get().setIsRunning(!s.isRunning);
  },
  tickSession: (deltaSec = 1) => {
    const state = get();
    if (!state.isRunning || deltaSec <= 0) return;

    // Break phase countdown
    if (state.phase === 'break') {
      const breakDur = breakForSeconds(state.lastFocusSec);
      const elapsed = Math.min(breakDur, state.elapsedSec + deltaSec);
      set({ elapsedSec: elapsed });
      if (elapsed >= breakDur) {
        set({ lastEvent: { kind: 'break-done', taskName: '', at: Date.now() } });
        get().finishBreak();
      }
      return;
    }
    if (state.phase !== 'focus') return;

    // Focus phase
    const current = state.tasks.find((t) => t.id === state.activeTaskId && !t.done)
      ?? state.tasks.find((t) => !t.done);
    if (!current) return;

    const total = state.setup.durationSec;
    const elapsed = total > 0
      ? Math.min(total, state.elapsedSec + deltaSec)
      : state.elapsedSec + deltaSec;
    set({ elapsedSec: elapsed, activeTaskId: current.id });
    if (total > 0 && elapsed >= total) {
      set({ lastEvent: { kind: 'focus-done', taskName: current.name, at: Date.now() } });
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
      activeTaskId: null,
      phase: 'focus',
      focusStartedAt: null,
    });
  },
  setAudioActive: (b) => set({ audioActive: b }),

  // --- Pomodoro actions ---
  setAutoContinue: (b) => set({ autoContinue: b }),

  enterReview: () => {
    const state = get();
    if (state.phase !== 'focus') return;
    const focusDur = state.setup.durationSec > 0 ? state.setup.durationSec : state.elapsedSec;

    if (state.autoContinue) {
      // Auto-continue: log + mark done the active task, then start break
      const elapsed = state.elapsedSec;
      get().completeActive(elapsed);
      const nextUndone = get().tasks.find((t) => !t.done);
      if (!nextUndone) {
        // No more tasks - stop
        set({
          sessionActive: false, ...run(false), elapsedSec: 0,
          activeTaskId: null, phase: 'focus', lastFocusSec: focusDur,
        });
        return;
      }
      set({
        activeTaskId: nextUndone.id,
        lastFocusSec: focusDur,
        phase: 'break',
        elapsedSec: 0,
        ...run(true),
      });
      return;
    }

    // Manual: log the finished block now, so every choice on the review
    // sheet (keep working, break, focus again, stop) keeps that time.
    const active = state.tasks.find((t) => !t.done);
    const session = active ? buildSession(state, active.name, state.elapsedSec) : null;
    set({
      sessions: session ? [session, ...state.sessions] : state.sessions,
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
      const t = state.tasks.find((task) => !task.done);
      if (!t) return;
      const tasks = state.tasks.map((task) => (task.id === t.id ? { ...task, done: true } : task));
      const nextUndone = tasks.find((task) => !task.done);
      set({ tasks, activeTaskId: nextUndone ? nextUndone.id : null });
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
      phase: 'break',
      elapsedSec: 0,
      ...run(true),
    });
  },

  finishBreak: () => {
    const state = get();
    if (state.autoContinue) {
      // Auto-continue: go straight to next focus
      const nextUndone = get().tasks.find((t) => !t.done);
      if (!nextUndone) {
        set({
          sessionActive: false, ...run(false), elapsedSec: 0,
          activeTaskId: null, phase: 'focus',
        });
        return;
      }
      set({
        phase: 'focus',
        elapsedSec: 0,
        ...run(true),
        focusStartedAt: Date.now(),
        activeTaskId: nextUndone.id,
      });
      return;
    }
    // Manual: go to ready state (paused)
    const firstUndone = state.tasks.find((t) => !t.done);
    set({
      phase: 'focus',
      elapsedSec: 0,
      ...run(false),
      focusStartedAt: null,
      activeTaskId: firstUndone ? firstUndone.id : null,
      sessionActive: firstUndone ? state.sessionActive : false,
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
}));

/**
 * When an edit changes which task is active in the middle of a focus block,
 * close that block: log it for the old task (if asked) and restart the
 * clock at 0 for the new one. Without this, the old task's seconds would
 * silently move to the next task.
 */
function switchPatch(
  state: AppStore,
  newTasks: Task[],
  logOld: boolean,
): Partial<AppStore> {
  if (state.phase !== 'focus' || state.elapsedSec <= 0) return {};
  const before = state.tasks.find((t) => !t.done);
  const after = newTasks.find((t) => !t.done);
  if (before?.id === after?.id) return {};
  const session = logOld && before ? buildSession(state, before.name, state.elapsedSec) : null;
  const now = Date.now();
  return {
    sessions: session ? [session, ...state.sessions] : state.sessions,
    elapsedSec: 0,
    focusStartedAt: state.isRunning && after ? now : null,
    runSyncAt: state.isRunning && after ? now : null,
  };
}

export const shouldPlayAudio = (state: { screen: Screen; audioActive: boolean; isRunning: boolean }) => {
  if (state.screen === 'sound' || state.screen === 'session') {
    return state.audioActive;
  }
  if (state.screen === 'room') {
    return state.isRunning;
  }
  return false;
};
