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
  addSession: (s: Session) => void;
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

  startFocus: () => void;
  setIsRunning: (b: boolean) => void;
  tickSession: () => void;
  completeCurrent: () => void;
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
      set({
        setup: { durationLabel: dur.label, durationSec: dur.seconds },
        elapsedSec: 0,
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
        isRunning: firstUndone ? state.isRunning : false,
        sessionActive: firstUndone ? state.sessionActive : false,
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
      };
    }),
  activeTask: () => get().tasks.find((t) => !t.done),
  addSession: (s) =>
    set((state) => ({ sessions: [s, ...state.sessions] })),
  toggleTask: (id) =>
    set((state) => {
      const newTasks = state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      const firstUndone = newTasks.find((t) => !t.done);
      return {
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
        isRunning: firstUndone ? state.isRunning : false,
        sessionActive: firstUndone ? state.sessionActive : false,
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
    const minutes = Math.max(1, Math.round(elapsedSec / 60));
    const endedAt = Date.now();
    const startedAt = endedAt - elapsedSec * 1000;
    const session: Session = {
      id: uid(),
      taskName: t.name,
      minutes,
      startedAt,
      endedAt,
      corner: state.corner?.name ?? '',
      ambient: state.sound.ambient,
    };
    const updatedTasks = state.tasks.map((task) => (task.id === t.id ? { ...task, done: true } : task));
    const firstUndone = updatedTasks.find((task) => !task.done);
    set({
      sessions: [session, ...state.sessions],
      tasks: updatedTasks,
      activeTaskId: firstUndone ? firstUndone.id : null,
    });
  },
  stopActive: (elapsedSec) => {
    if (elapsedSec < 60) return false;
    const state = get();
    const t = state.tasks.find((task) => !task.done);
    if (!t) return false;
    const minutes = Math.round(elapsedSec / 60);
    const endedAt = Date.now();
    const startedAt = endedAt - elapsedSec * 1000;
    const session: Session = {
      id: uid(),
      taskName: t.name,
      minutes,
      startedAt,
      endedAt,
      corner: state.corner?.name ?? '',
      ambient: state.sound.ambient,
    };
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

    // Auto-heal activeTaskId on load
    const tasksList = p.tasks !== undefined ? p.tasks : get().tasks;
    const firstUndone = tasksList.find((t) => !t.done);
    update.activeTaskId = p.activeTaskId || (firstUndone ? firstUndone.id : null);

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
    });
  },
  setIsRunning: (b) => set({ isRunning: b }),
  tickSession: () => {
    const state = get();
    if (!state.isRunning) return;

    // Break phase countdown
    if (state.phase === 'break') {
      const elapsed = state.elapsedSec + 1;
      set({ elapsedSec: elapsed });
      const breakDur = breakForSeconds(state.lastFocusSec);
      if (elapsed >= breakDur) {
        get().finishBreak();
      }
      return;
    }

    // Focus phase
    const currentTaskId = state.activeTaskId || state.tasks.find((t) => !t.done)?.id;
    if (!currentTaskId) return;

    const elapsed = state.elapsedSec + 1;
    set({ elapsedSec: elapsed, activeTaskId: currentTaskId });
    if (state.setup.durationSec > 0 && elapsed >= state.setup.durationSec) {
      get().enterReview();
    }
  },
  completeCurrent: () => {
    const elapsed = get().elapsedSec;
    get().completeActive(elapsed);
    const nextUndone = get().tasks.find((t) => !t.done);
    const activeTaskId = nextUndone ? nextUndone.id : null;
    set({
      activeTaskId,
      elapsedSec: 0,
      isRunning: false,
      sessionActive: activeTaskId !== null,
      phase: 'focus',
    });
  },
  stopFocus: () => {
    get().stopActive(get().elapsedSec);
    set({
      sessionActive: false,
      isRunning: false,
      elapsedSec: 0,
      activeTaskId: null,
      phase: 'focus',
    });
  },
  setAudioActive: (b) => set({ audioActive: b }),

  // --- Pomodoro actions ---
  setAutoContinue: (b) => set({ autoContinue: b }),

  enterReview: () => {
    const state = get();
    const focusDur = state.setup.durationSec > 0 ? state.setup.durationSec : state.elapsedSec;

    if (state.autoContinue) {
      // Auto-continue: log + mark done the active task, then start break
      const elapsed = state.elapsedSec;
      get().completeActive(elapsed);
      const nextUndone = get().tasks.find((t) => !t.done);
      if (!nextUndone) {
        // No more tasks - stop
        set({
          sessionActive: false, isRunning: false, elapsedSec: 0,
          activeTaskId: null, phase: 'focus', lastFocusSec: focusDur,
        });
        return;
      }
      set({
        activeTaskId: nextUndone.id,
        lastFocusSec: focusDur,
        phase: 'break',
        elapsedSec: 0,
        isRunning: true,
      });
      return;
    }

    // Manual: show review sheet
    set({
      lastFocusSec: focusDur,
      phase: 'review',
      isRunning: false,
    });
  },

  reviewMarkDone: (done) => {
    if (done) {
      const state = get();
      const elapsed = state.elapsedSec > 0 ? state.elapsedSec : state.lastFocusSec;
      get().completeActive(elapsed);
      const nextUndone = get().tasks.find((t) => !t.done);
      set({ activeTaskId: nextUndone ? nextUndone.id : null });
    } else {
      set({
        phase: 'focus',
        elapsedSec: 0,
        isRunning: true,
      });
    }
  },

  startBreak: () => {
    set({
      phase: 'break',
      elapsedSec: 0,
      isRunning: true,
    });
  },

  finishBreak: () => {
    const state = get();
    if (state.autoContinue) {
      // Auto-continue: go straight to next focus
      const nextUndone = get().tasks.find((t) => !t.done);
      if (!nextUndone) {
        set({
          sessionActive: false, isRunning: false, elapsedSec: 0,
          activeTaskId: null, phase: 'focus',
        });
        return;
      }
      set({
        phase: 'focus',
        elapsedSec: 0,
        isRunning: true,
        activeTaskId: nextUndone.id,
      });
      return;
    }
    // Manual: go to ready state (paused)
    const firstUndone = state.tasks.find((t) => !t.done);
    set({
      phase: 'focus',
      elapsedSec: 0,
      isRunning: false,
      activeTaskId: firstUndone ? firstUndone.id : null,
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
      isRunning: false,
    });
  },

  stopAllSessions: () => {
    get().stopFocus();
    set({ phase: 'focus', screen: 'history' });
  },
}));

export const canStart = () => useStore.getState().tasks.length > 0;

export const shouldPlayAudio = (state: { screen: Screen; audioActive: boolean; isRunning: boolean }) => {
  if (state.screen === 'sound' || state.screen === 'session') {
    return state.audioActive;
  }
  if (state.screen === 'room') {
    return state.isRunning;
  }
  return false;
};
