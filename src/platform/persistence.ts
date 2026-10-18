import type { Task, Session, SoundConfig, SessionSetup, Corner, CustomTrack, Note } from '../types';

type Phase = 'focus' | 'break' | 'review';

export const PERSIST_VERSION = 2;

export interface PersistedState {
  version: number;
  tasks: Task[];
  sessions: Session[];
  sound: SoundConfig;
  setup: SessionSetup;
  corner: Corner | null;
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
}

export interface StorageAdapter {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
}

export function createMemoryAdapter(seed?: PersistedState | null): StorageAdapter {
  let data: PersistedState | null = seed ?? null;
  return {
    async load() {
      return data ? JSON.parse(JSON.stringify(data)) : null;
    },
    async save(state) {
      data = JSON.parse(JSON.stringify(state));
    },
  };
}

export function createLocalStorageAdapter(key = 'mora-state'): StorageAdapter {
  return {
    async load() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as PersistedState;
      } catch {
        return null;
      }
    },
    async save(state) {
      localStorage.setItem(key, JSON.stringify(state));
    },
  };
}

export function createTauriAdapter(file = 'mora.json'): StorageAdapter {
  return {
    async load() {
      try {
        const { load } = await import('@tauri-apps/plugin-store');
        const store = await load(file);
        const state = await store.get<PersistedState>('state');
        return state ?? null;
      } catch {
        return null;
      }
    },
    async save(state) {
      try {
        const { load } = await import('@tauri-apps/plugin-store');
        const store = await load(file);
        await store.set('state', state);
        await store.save();
      } catch {
        // swallow
      }
    },
  };
}

export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function selectAdapter(): StorageAdapter {
  return isTauri() ? createTauriAdapter() : createLocalStorageAdapter();
}

export function toPersisted(s: {
  tasks: Task[];
  sessions: Session[];
  sound: SoundConfig;
  setup: SessionSetup;
  corner: Corner | null;
  roomBackground: 'color' | 'scene';
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
}): PersistedState {
  return {
    version: PERSIST_VERSION,
    tasks: s.tasks,
    sessions: s.sessions,
    sound: s.sound,
    setup: s.setup,
    corner: s.corner,
    roomBackground: s.roomBackground,
    elapsedSec: s.elapsedSec ?? 0,
    isRunning: s.isRunning ?? false,
    sessionActive: s.sessionActive ?? false,
    activeTaskId: s.activeTaskId ?? null,
    autoContinue: s.autoContinue ?? false,
    customTracks: s.customTracks ?? [],
    phase: s.phase ?? 'focus',
    lastFocusSec: s.lastFocusSec ?? 0,
    focusStartedAt: s.focusStartedAt ?? null,
    notes: s.notes ?? [],
    cycleCount: s.cycleCount ?? 0,
    longBreak: s.longBreak ?? false,
    dailyGoalMin: s.dailyGoalMin ?? 0,
    muted: s.muted ?? false,
  };
}

export function migrate(raw: PersistedState | null): PersistedState | null {
  if (!raw) return null;
  return {
    ...raw,
    version: PERSIST_VERSION,
    sound: raw.sound ? { ...raw.sound, customTrackId: raw.sound.customTrackId ?? null } : raw.sound,
    customTracks: raw.customTracks ?? [],
  };
}
