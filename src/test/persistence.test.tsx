import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMemoryAdapter,
  createLocalStorageAdapter,
  toPersisted,
  migrate,
  PERSIST_VERSION,
  type PersistedState,
} from '../lib/persistence';
import { initPersistence } from '../lib/persist';
import { useStore } from '../store/useStore';

const makeSeed = (): PersistedState => ({
  version: PERSIST_VERSION,
  tasks: [{ id: 't1', name: 'Task 1', done: false, createdAt: 1000 }],
  sessions: [
    { id: 's1', taskName: 'Task 0', minutes: 25, startedAt: 500, endedAt: 2000, corner: 'X', ambient: 'Wind' },
  ],
  sound: { ambient: 'Rain', musicStyle: 'Lo-fi', ambientVolume: 50, musicVolume: 30, customTrackId: null },
  setup: { durationLabel: '25 min', durationSec: 1500 },
  corner: { id: 'c1', name: 'Corner1', description: 'desc', ambient: 'Rain', gradient: '' },
  customTracks: [],
});

// jsdom's localStorage may be incomplete - provide a shim
function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
}

let mockLS: ReturnType<typeof createMockLocalStorage>;

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  mockLS = createMockLocalStorage();
  vi.stubGlobal('localStorage', mockLS);
});

describe('memory adapter', () => {
  it('round-trip: save then load returns deep-equal but different reference', async () => {
    const seed = makeSeed();
    const adapter = createMemoryAdapter();
    await adapter.save(seed);
    const loaded = await adapter.load();
    expect(loaded).toEqual(seed);
    expect(loaded).not.toBe(seed);
  });
});

describe('toPersisted', () => {
  it('stamps version and carries fields', () => {
    const state = useStore.getState();
    const p = toPersisted(state);
    expect(p.version).toBe(PERSIST_VERSION);
    expect(p.tasks).toBe(state.tasks);
    expect(p.sessions).toBe(state.sessions);
    expect(p.sound).toBe(state.sound);
    expect(p.setup).toBe(state.setup);
    expect(p.corner).toBe(state.corner);
  });
});

describe('migrate', () => {
  it('null returns null', () => {
    expect(migrate(null)).toBe(null);
  });

  it('wrong version returns valid PersistedState with current version', () => {
    const old = { ...makeSeed(), version: 999 };
    const result = migrate(old);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(PERSIST_VERSION);
    expect(result!.tasks).toEqual(old.tasks);
  });

  it('backfills customTrackId and customTracks for a legacy v1 record', () => {
    const legacy = {
      version: 1,
      tasks: [],
      sessions: [],
      sound: { ambient: 'Wind', musicStyle: 'Nature', ambientVolume: 18, musicVolume: 6 },
      setup: { durationLabel: '50 min', durationSec: 3000 },
      corner: null,
    } as unknown as PersistedState;
    const result = migrate(legacy);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(PERSIST_VERSION);
    expect(result!.sound.customTrackId).toBeNull();
    expect(result!.customTracks).toEqual([]);
  });
});

describe('localStorage adapter', () => {
  it('round-trip', async () => {
    const adapter = createLocalStorageAdapter('test-key');
    const seed = makeSeed();
    await adapter.save(seed);
    const loaded = await adapter.load();
    expect(loaded).toEqual(seed);
  });

  it('missing key returns null', async () => {
    const adapter = createLocalStorageAdapter('nonexistent');
    expect(await adapter.load()).toBeNull();
  });

  it('corrupt JSON returns null', async () => {
    mockLS.setItem('bad-key', '{not valid json');
    const adapter = createLocalStorageAdapter('bad-key');
    expect(await adapter.load()).toBeNull();
  });
});

describe('initPersistence', () => {
  it('hydrates store from adapter', async () => {
    const seed = makeSeed();
    const adapter = createMemoryAdapter(seed);
    const h = await initPersistence(adapter);
    const state = useStore.getState();
    expect(state.tasks).toEqual(seed.tasks);
    expect(state.sessions).toEqual(seed.sessions);
    expect(state.sound).toEqual(seed.sound);
    expect(state.setup).toEqual(seed.setup);
    expect(state.corner).toEqual(seed.corner);
    h.unsubscribe();
  });

  it('saves on change', async () => {
    const adapter = createMemoryAdapter();
    const h = await initPersistence(adapter, { debounceMs: 0 });
    useStore.getState().addSession({
      id: 'new-s', taskName: 'T', minutes: 10,
      startedAt: 0, endedAt: 1000, corner: '', ambient: 'Wind',
    });
    await h.saveNow();
    const loaded = await adapter.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.sessions.length).toBe(1);
    expect(loaded!.sessions[0].id).toBe('new-s');
    h.unsubscribe();
  });
});

describe('import side-effect free', () => {
  it('importing persistence modules does not auto-run', async () => {
    await import('../lib/persistence');
    await import('../lib/persist');
    expect(useStore.getState().tasks).toEqual([]);
    expect(mockLS.length).toBe(0);
  });
});
