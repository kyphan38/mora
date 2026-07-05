import { useStore } from '../store/useStore';
import {
  type StorageAdapter,
  selectAdapter,
  toPersisted,
  migrate,
  isTauri,
} from './persistence';

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
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let closeUnsub: (() => void) | null = null;

  const doSave = async () => {
    try {
      const snap = useStore.getState();
      await a.save(toPersisted(snap));
    } catch {
      // swallow
    }
  };

  const unsub = useStore.subscribe(() => {
    if (timer) clearTimeout(timer);
    if (debounceMs <= 0) {
      doSave();
    } else {
      timer = setTimeout(doSave, debounceMs);
    }
  });

  if (isTauri()) {
    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        closeUnsub = await win.onCloseRequested(async (event) => {
          event.preventDefault();
          useStore.getState().setIsRunning(false);
          try {
            await doSave();
          } finally {
            await win.destroy();
          }
        });
      } catch (err) {
        console.error('Failed to register onCloseRequested handler:', err);
      }
    })();
  }

  return {
    unsubscribe: () => {
      if (timer) clearTimeout(timer);
      unsub();
      if (closeUnsub) {
        closeUnsub();
      }
    },
    saveNow: async () => {
      if (timer) clearTimeout(timer);
      timer = null;
      await doSave();
    },
  };
}
