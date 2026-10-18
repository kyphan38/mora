import { useEffect } from 'react';
import { useAuth } from '../platform/auth';
import { isTauri } from '../platform/persistence';

/** Syncs tasks, history, notes and settings while signed in (web/PWA only). */
export function useCloudSync() {
  const uid = useAuth((s) => s.user?.uid ?? null);

  useEffect(() => {
    if (!uid || isTauri()) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    // Loaded on demand so the desktop build and tests never pull Firestore in.
    void import('../platform/sync').then(({ startSync }) => {
      if (!cancelled) stop = startSync(uid);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [uid]);
}
