import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useOsSync } from './useOsSync';
import { getAudioEngine } from '../platform/audio';
import { createNotifyBridge } from '../platform/notify';
import { sessionCompleteNotification } from '../core/soundFormat';
import { sessionTimer } from '../core/sessionTimer';

const SYNC_MS = 250;

/**
 * App-level session runtime: keeps the clock in step with the wall clock,
 * chimes and notifies at natural phase ends, and drives the hotkey and tray
 * on every screen (not only the Room).
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

  const { pushTick } = useOsSync({
    onToggle: () => useStore.getState().togglePlay(),
  });

  const sessionActive = useStore((s) => s.sessionActive);
  const phase = useStore((s) => s.phase);
  const lastFocusSec = useStore((s) => s.lastFocusSec);
  const durationSec = useStore((s) => s.setup.durationSec);
  const elapsedSec = useStore((s) => s.elapsedSec);
  const taskName = useStore((s) => s.tasks.find((t) => !t.done)?.name ?? '');

  useEffect(() => {
    if (!sessionActive) {
      pushTick(null, '');
      return;
    }
    const timer = sessionTimer({ phase, lastFocusSec, setup: { durationSec }, elapsedSec, isRunning });
    pushTick(timer, phase === 'break' ? 'break' : taskName);
  }, [sessionActive, phase, lastFocusSec, durationSec, elapsedSec, isRunning, taskName, pushTick]);
}
