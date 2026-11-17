import type { StateCreator } from 'zustand';
import type { Screen, Corner, SoundConfig, SessionSetup, Task, Session, CustomTrack, Note, FocusKind, UserScene, UserTrack, Phase, LogiLink } from '../types';
import { type LiveTimer } from '../core/liveModel';
import { type LogiRoutine } from '../core/logiTasks';

export interface AppStore {
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
  setIdleTrack: (name: string) => void;
  setIdleVolume: (v: number) => void;
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
  /** The task picked for the clock; undefined when the clock runs with no task. */
  activeTask: () => Task | undefined;
  toggleTask: (id: string) => void;
  clearCompletedTasks: () => void;
  /** Picks a task for the clock (null = no task). Same id again = unpick. */
  pickTask: (id: string | null) => void;
  /** Picks a task and sets the clock to its length. Only while the clock waits. */
  startTask: (id: string) => void;
  /** Drops tasks from days before `today` ("YYYY-MM-DD"), unless a block is in progress. */
  resetDay: (today: string) => void;
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
    pickedTaskId?: string | null;
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
    sceneByTime?: boolean;
    logiHidden?: string[];
  }) => void;
  clearSessions: () => void;

  // New session runtime fields & actions
  elapsedSec: number;
  isRunning: boolean;
  sessionActive: boolean;
  /** The task the user picked; null = the clock runs with no task (the default). */
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
  /** M1: set or clear (empty text) a task's next step. */
  setTaskNext: (id: string, text: string) => void;
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
  /** M10: a new scene that fits the time of day at each fresh Play (synced in prefs). */
  sceneByTime: boolean;
  setSceneByTime: (on: boolean) => void;
  /** M10: switch to a scene that fits the time, when scene mode and the setting are on. */
  sceneForTime: (now?: number) => void;
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
    prefs?: Partial<Pick<AppStore, 'setup' | 'roomBackground' | 'corner' | 'autoContinue' | 'dailyGoalMin' | 'hiddenScenes' | 'sceneByTime' | 'logiHidden'>> & {
      sound?: Omit<SoundConfig, 'customTrackId'> & { customTrackId?: string | null };
      logi?: { enabled: boolean };
    };
  }) => void;
}

export type { Phase, LogiLink };

/** One part of the store; `set` and `get` see the whole store. */
export type Slice<T> = StateCreator<AppStore, [], [], T>;

export type SoundSlice = Pick<AppStore, 'sound' | 'customTracks' | 'setAmbient' | 'setMusicStyle' | 'setAmbientVolume' | 'setMusicVolume' | 'setIdleTrack' | 'setIdleVolume' | 'addCustomTrack' | 'selectCustomTrack' | 'removeCustomTrack' | 'muted' | 'setMuted'>;
export type ScenesSlice = Pick<AppStore, 'screen' | 'corner' | 'roomBackground' | 'setRoomBackground' | 'randomScene' | 'setScreen' | 'setCorner' | 'userScenes' | 'userTracks' | 'hiddenScenes' | 'toggleHiddenScene' | 'showAllScenes' | 'sceneByTime' | 'setSceneByTime' | 'sceneForTime'>;
export type TasksSlice = Pick<AppStore, 'tasks' | 'activeTaskId' | 'addTask' | 'removeTask' | 'restoreTask' | 'reorderTasks' | 'activeTask' | 'pickTask' | 'startTask' | 'resetDay' | 'toggleTask' | 'clearCompletedTasks' | 'setTaskKind' | 'setTaskNext' | 'notes' | 'addNote' | 'removeNote' | 'noteToTask'>;
export type TimerSlice = Pick<AppStore, 'setup' | 'setDuration' | 'setCustomDuration' | 'elapsedSec' | 'isRunning' | 'sessionActive' | 'phase' | 'lastFocusSec' | 'autoContinue' | 'runSyncAt' | 'focusStartedAt' | 'lastEvent' | 'cycleCount' | 'longBreak' | 'lastSessionId' | 'completeActive' | 'stopActive' | 'startFocus' | 'setIsRunning' | 'togglePlay' | 'tickSession' | 'syncClock' | 'stopFocus' | 'setAutoContinue' | 'enterReview' | 'reviewMarkDone' | 'startBreak' | 'finishBreak' | 'focusAgain' | 'stopAllSessions'>;
export type HistorySlice = Pick<AppStore, 'sessions' | 'clearSessions' | 'setSessionNote' | 'updateSession' | 'removeSession' | 'restoreSession' | 'dailyGoalMin' | 'setDailyGoal'>;
export type LinkSlice = Pick<AppStore, 'logi' | 'setLogi' | 'logiStatus' | 'setLogiStatus' | 'logiHidden' | 'logiSync' | 'setLogiSync' | 'applyLogiRoutine' | 'runId' | 'liveFollower' | 'overdueSince' | 'applyLive' | 'leadLive' | 'applyRemote' | 'hydrate'>;
