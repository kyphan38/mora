import { useEffect } from 'react';
import { useAuth } from '../platform/auth';
import { useStore } from '../store/useStore';

/** Syncs tasks, history, notes, settings and the running timer while signed in . */
export function useCloudSync() {
  const uid = useAuth((s) => s.user?.uid ?? null);

  useEffect(() => {
    if (!uid) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    // Loaded on demand so the sign-in screen and tests never pull Firestore in.
    void Promise.all([import('../platform/sync'), import('../platform/liveSync')]).then(([{ startSync }, { startLiveSync }]) => {
      if (cancelled) return;
      const stopData = startSync(uid);
      const stopLive = startLiveSync(uid);
      // A track saved on this device before cloud tracks existed moves up once.
      if (useStore.getState().customTracks.length) {
        void import('../platform/trackUpload').then(({ migrateLocalTrack }) => migrateLocalTrack(uid)).catch((e) => console.warn('[tracks] move failed', e));
      }
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
