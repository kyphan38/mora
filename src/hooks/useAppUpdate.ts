import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { checkForNewBuild } from '../platform/pwa';

const CHECK_MS = 30 * 60 * 1000;

type Store = ReturnType<typeof useStore.getState>;

/** Safe to reload: no block started, no sheet open, nothing being typed. */
export function idleForUpdate(s: Pick<Store, 'phase' | 'isRunning' | 'elapsedSec' | 'screen'>): boolean {
  if (s.phase !== 'focus' || s.isRunning || s.elapsedSec > 0 || s.screen !== 'focus') return false;
  const el = document.activeElement;
  return !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable);
}

/**
 * A home-screen app can stay open for days and never load a new build.
 * Checks for one every half hour and when the app comes back to the front,
 * then reloads the first time the timer is idle. A running or paused block
 * is never cut off.
 */
export function useAppUpdate() {
  const ready = useRef(false);

  useEffect(() => {
    const reloadIfIdle = () => {
      if (ready.current && idleForUpdate(useStore.getState())) window.location.reload();
    };
    const check = async () => {
      if (!ready.current) ready.current = await checkForNewBuild();
      reloadIfIdle();
    };
    void check();
    const id = setInterval(check, CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    // A block that ends (or a sheet that closes) may be the first idle moment.
    const unsub = useStore.subscribe(reloadIfIdle);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      unsub();
    };
  }, []);
}
