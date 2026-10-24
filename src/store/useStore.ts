import { create } from 'zustand';
import type { Screen, Corner, SoundConfig, SessionSetup, Task, Session, CustomTrack, Note, FocusKind, UserScene, UserTrack } from '../types';
import { DURATIONS } from '../data/durations';
import { uid } from '../core/uid';
import { CORNERS } from '../data/corners';
import { breakForSeconds, longBreakForSeconds, LONG_BREAK_EVERY } from '../core/pomodoro';
import { liveElapsed, TAKEOVER_SEC, type LiveTimer } from '../core/liveModel';
import { mergeRoutine, pruneHidden, type LogiRoutine } from '../core/logiTasks';

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
  /** Puts a removed task back at `index` (undo). Its time is not restored. */
  restoreTask: (task: Task, index: number) => void;
  reorderTasks: (from: number, to: number) => void;
  activeTask: () => Task | undefined;
  toggleTask: (id: string) => void;
  clearCompletedTasks: () => void;
  /** Makes a task the current one (moves it first) and sets the clock to its length. Only while the clock waits. */
  startTask: (id: string) => void;
  /** Ids of logi tasks removed here today (synced in prefs). */
  logiHidden: string[];
  /** Merges a fresh logi routine into the tasks. `pending` = ticks not yet confirmed. */
  applyLogiRoutine: (r: LogiRoutine, pending?: ReadonlyMap<string, boolean>, keepDone?: boolean) => void;
  /** Last fetch of the logi routine, for the task sheet. Not persisted. */
  logiSync: { state: 'idle' | 'loading' | 'ok' | 'error'; message: string; at: number };
  setLogiSync: (s: AppStore['logiSync']) => void;
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
    autoContinue?: boolean;
    customTracks?: CustomTrack[];
    phase?: Phase;
    lastFocusSec?: number;
    focusStartedAt?: number | null;
    notes?: Note[];
    cycleCount?: number;
    longBreak?: boolean;
    dailyGoalMin?: number;
    muted?: boolean;
    logi?: LogiLink;
    hiddenScenes?: string[];
    logiHidden?: string[];
  }) => void;
  clearSessions: () => void;

  // New session runtime fields & actions
  elapsedSec: number;
  isRunning: boolean;
  sessionActive: boolean;
  activeTaskId: string | null;

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
  randomScene: () => void;

  // Pomodoro actions
  setAutoContinue: (b: boolean) => void;
  enterReview: () => void;
  reviewMarkDone: (done: boolean) => void;
  startBreak: () => void;
  finishBreak: () => void;
  focusAgain: (durationSec: number) => void;
  stopAllSessions: () => void;

  // Pomodoro cycle: finished blocks since the last long break.
  cycleCount: number;
  /** The current or next break is a long one. */
  longBreak: boolean;
  /** Session logged by the last review, so the sheet can attach a note to it. Not persisted. */
  lastSessionId: string | null;
  setCustomDuration: (minutes: number) => void;

  notes: Note[];
  addNote: (text: string) => void;
  removeNote: (id: string) => void;
  noteToTask: (id: string) => void;

  setTaskKind: (id: string, kind: FocusKind) => void;
  setSessionNote: (id: string, note: string) => void;
  updateSession: (id: string, patch: { taskName?: string; minutes?: number }) => void;
  removeSession: (id: string) => Session | undefined;
  restoreSession: (s: Session) => void;

  dailyGoalMin: number;
  setDailyGoal: (minutes: number) => void;
  muted: boolean;
  setMuted: (b: boolean) => void;

  /** Live link to logi (account-wide, synced in prefs). Off by default. */
  logi: LogiLink;
  setLogi: (patch: Partial<LogiLink>) => void;
  /** What the Cloud Function last did with logi, for Settings. Not persisted. */
  logiStatus: { state: 'idle' | 'ok' | 'error'; message: string; at: number };
  setLogiStatus: (s: AppStore['logiStatus']) => void;

  /** Music the owner uploaded (cloud only, mirrored from Firestore). Not persisted locally. */
  userTracks: UserTrack[];
  /** Scenes the owner uploaded (cloud only, mirrored from Firestore). Not persisted locally. */
  userScenes: UserScene[];
  /** Default scene ids the owner hid from the picker (synced in prefs). */
  hiddenScenes: string[];
  toggleHiddenScene: (id: string) => void;
  showAllScenes: () => void;

  /** Id of the current run of the clock (Play to Pause). Not persisted. */
  runId: string | null;
  /** This device follows a timer another device started; that device logs the block. Not persisted. */
  liveFollower: boolean;
  /** When a following device reached the end and began waiting for the leader. Not persisted. */
  overdueSince: number | null;
  /** Takes over the shared timer from another device. */
  applyLive: (l: LiveTimer, now?: number) => void;
  /** A local action makes this device the leader again. */
  leadLive: () => void;

  /** Applies data that came from another device (cloud sync). */
  applyRemote: (p: {
    tasks?: Task[];
    sessions?: Session[];
    notes?: Note[];
    userScenes?: UserScene[];
    userTracks?: UserTrack[];
    prefs?: Partial<Pick<AppStore, 'setup' | 'roomBackground' | 'corner' | 'autoContinue' | 'dailyGoalMin' | 'hiddenScenes' | 'logiHidden'>> & {
      sound?: Omit<SoundConfig, 'customTrackId'> & { customTrackId?: string | null };
      logi?: { enabled: boolean };
    };
  }) => void;
}

export interface LogiLink {
  enabled: boolean;
}

// The logi routine sync listens for ticks made here (platform/logiRoutine).
let logiTickHandler: ((t: Task) => void) | null = null;
export function setLogiTickHandler(fn: ((t: Task) => void) | null) {
  logiTickHandler = fn;
}
function tellLogi(before: Task[], after: Task[]) {
  if (!logiTickHandler) return;
  const old = new Map(before.map((t) => [t.id, t.done]));
  for (const t of after) if (t.logi && old.has(t.id) && old.get(t.id) !== t.done) logiTickHandler(t);
}

// "Read 50m", "Gym 1.5h": a planned length at the end of the name.
function readLength(name: string): { name: string; min?: number } {
  const m = name.match(/^(.*\S)\s+(\d{1,3})m$/i) ?? null;
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 600) return { name: m[1], min: Number(m[2]) };
  const h = name.match(/^(.*\S)\s+(\d(?:\.\d)?)h$/i);
  if (h && Number(h[2]) > 0 && Number(h[2]) <= 10) return { name: h[1], min: Math.round(Number(h[2]) * 60) };
  return { name };
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

// Every start of the clock is a new run (logi keeps one record per run).
const run = (on: boolean) => (on ? { isRunning: true, runSyncAt: Date.now(), runId: uid() } : { isRunning: false, runSyncAt: null });

// Blocks shorter than a minute are not worth a History row.
const MIN_LOG_SEC = 60;

function buildSession(
  state: { corner: Corner | null; sound: SoundConfig; focusStartedAt: number | null },
  task: Task,
  elapsedSec: number,
): Session | null {
  if (elapsedSec < MIN_LOG_SEC) return null;
  const endedAt = Date.now();
  return {
    id: uid(),
    taskName: task.name,
    kind: task.kind ?? 'learn',
    minutes: Math.round(elapsedSec / 60),
    startedAt: state.focusStartedAt ?? endedAt - elapsedSec * 1000,
    endedAt,
    corner: state.corner?.name ?? '',
    ambient: state.sound.ambient,
  };
}

export const useStore = create<AppStore>((set, get) => ({
  screen: 'focus',
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
  phase: 'focus',
  lastFocusSec: 0,
  autoContinue: false,
  runSyncAt: null,
  focusStartedAt: null,
  lastEvent: null,
  cycleCount: 0,
  longBreak: false,
  lastSessionId: null,
  notes: [],
  dailyGoalMin: 0,
  muted: false,
  logi: { enabled: false },
  logiStatus: { state: 'idle', message: '', at: 0 },
  userScenes: [],
  userTracks: [],
  hiddenScenes: [],
  liveFollower: false,
  overdueSince: null,
  runId: null,
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
    // "Write report ~3" adds the task with an estimate of 3 focus blocks; "Read 50m" plans 50 minutes.
    const m = name.trim().match(/^(.*?)\s*~\s*(\d{1,2})$/);
    const len = readLength((m ? m[1] : name).trim());
    const trimmed = len.name.trim().slice(0, 200);
    if (!trimmed) return;
    const est = m ? Math.max(1, Number(m[2])) : undefined;
    set((state) => {
      const task: Task = {
        id: uid(),
        name: trimmed,
        done: false,
        createdAt: Date.now(),
        kind: 'learn',
        ...(est ? { est } : {}),
        ...(len.min ? { min: len.min } : {}),
      };
      const newTasks = [...state.tasks, task];
      const firstUndone = newTasks.find((t) => !t.done);
      return {
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
      };
    });
  },
  removeTask: (id) =>
    set((state) => {
      const gone = state.tasks.find((t) => t.id === id);
      const newTasks = state.tasks.filter((t) => t.id !== id);
      const firstUndone = newTasks.find((t) => !t.done);
      return {
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
        ...(firstUndone ? {} : run(false)),
        sessionActive: firstUndone ? state.sessionActive : false,
        ...(gone?.logi && !state.logiHidden.includes(id) ? { logiHidden: [...state.logiHidden, id] } : {}),
        // A removed task's time is discarded, not moved to the next task.
        ...switchPatch(state, newTasks, false),
      };
    }),
  restoreTask: (task, index) =>
    set((state) => {
      if (state.tasks.some((t) => t.id === task.id)) return {};
      const copy = [...state.tasks];
      copy.splice(Math.max(0, Math.min(index, copy.length)), 0, task);
      const firstUndone = copy.find((t) => !t.done);
      return {
        tasks: copy,
        logiHidden: state.logiHidden.filter((h) => h !== task.id),
        activeTaskId: firstUndone ? firstUndone.id : null,
        ...switchPatch(state, copy, true),
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
  startTask: (id) => {
    const s = get();
    const started = s.phase !== 'focus' || s.isRunning || s.elapsedSec > 0;
    const from = s.tasks.findIndex((t) => t.id === id);
    if (started || from === -1 || s.tasks[from].done) return;
    const task = s.tasks[from];
    if (from > 0) s.reorderTasks(from, 0);
    if (task.min) s.setCustomDuration(task.min);
  },
  logiHidden: [],
  logiSync: { state: 'idle', message: '', at: 0 },
  setLogiSync: (logiSync) => set({ logiSync }),
  applyLogiRoutine: (r, pending, keepDone) =>
    set((state) => {
      const hidden = pruneHidden(state.logiHidden, r.date);
      const newTasks = mergeRoutine(state.tasks, r, hidden, pending, keepDone);
      const patch: Partial<AppStore> = hidden.length !== state.logiHidden.length ? { logiHidden: hidden } : {};
      if (newTasks === state.tasks) return patch;
      const firstUndone = newTasks.find((t) => !t.done);
      return {
        ...patch,
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
        ...(firstUndone ? {} : run(false)),
        sessionActive: firstUndone ? state.sessionActive : false,
        ...switchPatch(state, newTasks, true),
      };
    }),
  toggleTask: (id) =>
    set((state) => {
      const newTasks = state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      const firstUndone = newTasks.find((t) => !t.done);
      tellLogi(state.tasks, newTasks);
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
      // Cleared logi tasks stay hidden for today, or the next fetch brings them back.
      const cleared = state.tasks.filter((t) => t.done && t.logi && !state.logiHidden.includes(t.id)).map((t) => t.id);
      return {
        tasks: newTasks,
        activeTaskId: firstUndone ? firstUndone.id : null,
        ...(cleared.length ? { logiHidden: [...state.logiHidden, ...cleared] } : {}),
      };
    }),
  completeActive: (elapsedSec) => {
    const state = get();
    const t = state.tasks.find((task) => !task.done);
    if (!t) return;
    const session = buildSession(state, t, elapsedSec);
    const updatedTasks = state.tasks.map((task) => (task.id === t.id ? { ...task, done: true } : task));
    const firstUndone = updatedTasks.find((task) => !task.done);
    tellLogi(state.tasks, updatedTasks);
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
    const session = buildSession(state, t, elapsedSec);
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
    if (s.phase === 'focus' && !s.tasks.some((t) => !t.done)) return;
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
      if (waitForLeader()) return;
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
    const current = state.tasks.find((t) => !t.done);
    if (counted && current) {
      set({ tasks: state.tasks.map((t) => (t.id === current.id ? { ...t, blocks: (t.blocks ?? 0) + 1 } : t)) });
    }
    set({ cycleCount, longBreak });

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
        ...(longBreak ? { cycleCount: 0 } : {}),
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
    const active = get().tasks.find((t) => !t.done);
    const session = active ? buildSession(state, active, state.elapsedSec) : null;
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

  addNote: (text) => {
    const t = text.trim().slice(0, 500);
    if (!t) return;
    set((s) => ({ notes: [...s.notes, { id: uid(), text: t, createdAt: Date.now() }] }));
  },
  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  noteToTask: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    get().addTask(note.text);
    get().removeNote(id);
  },

  setTaskKind: (id, kind) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, kind } : t)) })),
  setSessionNote: (id, note) =>
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, note: note.trim().slice(0, 500) || undefined } : x)),
    })),
  updateSession: (id, patch) =>
    set((s) => ({
      sessions: s.sessions.map((x) => {
        if (x.id !== id) return x;
        const taskName = patch.taskName?.trim() || x.taskName;
        const minutes = patch.minutes !== undefined && patch.minutes >= 1 ? Math.round(patch.minutes) : x.minutes;
        return { ...x, taskName, minutes };
      }),
    })),
  removeSession: (id) => {
    const found = get().sessions.find((x) => x.id === id);
    if (found) set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    return found;
  },
  restoreSession: (session) =>
    set((s) =>
      s.sessions.some((x) => x.id === session.id)
        ? {}
        : { sessions: [...s.sessions, session].sort((a, b) => b.endedAt - a.endedAt) },
    ),

  setDailyGoal: (minutes) => set({ dailyGoalMin: Math.max(0, Math.round(minutes)) }),
  setMuted: (b) => set({ muted: b }),

  setLogi: (patch) => set((s) => ({ logi: { ...s.logi, ...patch } })),
  setLogiStatus: (logiStatus) => set({ logiStatus }),

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
      liveFollower: true,
      overdueSince: null,
      ...(freshEvent ? { lastEvent: l.event } : {}),
    });
  },
  leadLive: () => set({ liveFollower: false, overdueSince: null }),

  toggleHiddenScene: (id) =>
    set((s) => ({ hiddenScenes: s.hiddenScenes.includes(id) ? s.hiddenScenes.filter((x) => x !== id) : [...s.hiddenScenes, id] })),
  showAllScenes: () => set({ hiddenScenes: [] }),

  applyRemote: ({ tasks, sessions, notes, prefs, userScenes, userTracks }) => {
    const s = get();
    const patch: Partial<AppStore> = {};
    if (tasks) {
      patch.tasks = tasks;
      const first = tasks.find((t) => !t.done);
      patch.activeTaskId = first ? first.id : null;
      // The task being focused on was finished or removed elsewhere.
      if (!first && s.sessionActive && s.phase === 'focus') {
        Object.assign(patch, { sessionActive: false, ...run(false), elapsedSec: 0, focusStartedAt: null });
      }
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
  const session = logOld && before ? buildSession(state, before, state.elapsedSec) : null;
  const now = Date.now();
  return {
    sessions: session ? [session, ...state.sessions] : state.sessions,
    elapsedSec: 0,
    focusStartedAt: state.isRunning && after ? now : null,
    runSyncAt: state.isRunning && after ? now : null,
    ...(state.isRunning && after ? { runId: uid() } : {}),
  };
}

// Sound follows the timer on every screen; previews in Room settings call the engine directly.
export const shouldPlayAudio = (state: { isRunning: boolean }) => state.isRunning;
