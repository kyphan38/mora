import { useStore } from '../store/useStore';
import {
  type StorageAdapter,
  selectAdapter,
  toPersisted,
  migrate,
} from './persistence';

const CLOCK_SAVE_MS = 15_000;
const CLOCK_KEYS = new Set(['elapsedSec', 'runSyncAt', 'lastEvent']);

function onlyClockChanged(state: object, prev: object): boolean {
  const a = state as Record<string, unknown>;
  const b = prev as Record<string, unknown>;
  let changed = false;
  for (const k of Object.keys(a)) {
    if (a[k] === b[k]) continue;
    if (!CLOCK_KEYS.has(k)) return false;
    changed = true;
  }
  return changed;
}

export interface PersistHandle {
  unsubscribe: () => void;
  saveNow: () => Promise<void>;
}

export async function initPersistence(
  adapter?: StorageAdapter,
  opts?: { debounceMs?: number },
): Promise<PersistHandle> {
  const a = adapter ?? selectAdapter();
  const debounceMs = opts?.debounceMs ?? 300;

  const loaded = migrate(await a.load());
  if (loaded) {
    useStore.getState().hydrate(loaded);
    // A session always comes back paused: the time the app was closed is not focus time.
    if (useStore.getState().isRunning) useStore.getState().setIsRunning(false);
  }

  let timer: ReturnType<typeof setTimeout> | null = null;

  let lastSaveAt = 0;
  const doSave = async () => {
    lastSaveAt = Date.now();
    try {
      const snap = useStore.getState();
      await a.save(toPersisted(snap));
    } catch {
      // swallow
    }
  };

  const unsub = useStore.subscribe((state, prev) => {
    // The clock changes every second; writing the file that often is wasteful.
    // Clock-only changes are saved at most every CLOCK_SAVE_MS.
    if (onlyClockChanged(state, prev) && Date.now() - lastSaveAt < CLOCK_SAVE_MS) return;
    if (timer) clearTimeout(timer);
    if (debounceMs <= 0) {
      doSave();
    } else {
      timer = setTimeout(doSave, debounceMs);
    }
  });


  return {
    unsubscribe: () => {
      if (timer) clearTimeout(timer);
      unsub();
    },
    saveNow: async () => {
      if (timer) clearTimeout(timer);
      timer = null;
      await doSave();
    },
  };
}
