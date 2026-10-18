import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { getAudioEngine } from '../platform/audio';
import { createNotifyBridge } from '../platform/notify';
import { sessionCompleteNotification } from '../core/soundFormat';
import { setScreenAwake, wakeLockLost } from '../platform/pwa';

const SYNC_MS = 250;

/**
 * App-level session runtime: keeps the clock in step with the wall clock,
 * keeps a phone screen awake while running, and chimes and notifies at
 * natural phase ends.
 */
export function useSessionRuntime() {
  const isRunning = useStore((s) => s.isRunning);
  const syncClock = useStore((s) => s.syncClock);

  useEffect(() => {
    if (!isRunning) return;
    syncClock();
    const id = setInterval(() => syncClock(), SYNC_MS);
    const onVisible = () => syncClock();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isRunning, syncClock]);

  // Phones: keep the screen on while the timer runs.
  useEffect(() => {
    setScreenAwake(isRunning);
    if (!isRunning) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      wakeLockLost();
      setScreenAwake(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isRunning]);

  const notify = useMemo(() => createNotifyBridge(), []);
  useEffect(() => {
    return useStore.subscribe((state, prev) => {
      const ev = state.lastEvent;
      if (!ev || ev === prev.lastEvent) return;
      getAudioEngine().chime();
      if (ev.kind === 'focus-done') {
        const { title, body } = sessionCompleteNotification(ev.taskName);
        notify.notify(title, body);
      } else {
        notify.notify('Break over', 'Ready when you are');
      }
    });
  }, [notify]);
}
