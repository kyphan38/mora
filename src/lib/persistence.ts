import type { Task, Session, SoundConfig, SessionSetup, Corner } from '../types';

export const PERSIST_VERSION = 1;

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
  audioActive?: boolean;
  autoContinue?: boolean;
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
  audioActive?: boolean;
  autoContinue?: boolean;
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
    audioActive: s.audioActive ?? false,
    autoContinue: s.autoContinue ?? false,
  };
}

export function migrate(raw: PersistedState | null): PersistedState | null {
  if (!raw) return null;
  return { ...raw, version: PERSIST_VERSION };
}
