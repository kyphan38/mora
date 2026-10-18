import { useEffect } from 'react';
import { useAuth } from '../platform/auth';
import { isTauri } from '../platform/persistence';

/** Syncs tasks, history, notes, settings and the running timer while signed in (web/PWA only). */
export function useCloudSync() {
  const uid = useAuth((s) => s.user?.uid ?? null);

  useEffect(() => {
    if (!uid || isTauri()) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    // Loaded on demand so the desktop build and tests never pull Firestore in.
    void Promise.all([import('../platform/sync'), import('../platform/liveSync')]).then(([{ startSync }, { startLiveSync }]) => {
      if (cancelled) return;
      const stopData = startSync(uid);
      const stopLive = startLiveSync(uid);
      stop = () => {
        stopData();
        stopLive();
      };
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [uid]);
}
