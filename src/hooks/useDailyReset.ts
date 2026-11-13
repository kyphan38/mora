import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { logicalDay } from '../core/day';

const CHECK_MS = 60_000;

/**
 * Each day starts with a fresh task list, like logi: tasks from earlier days
 * go (today's logi routine comes back on its own). Checked on start, every
 * minute, on return to the front, and whenever the tasks change (a cloud
 * snapshot may bring old ones back from a device that has not reset yet).
 */
export function useDailyReset() {
  useEffect(() => {
    const check = () => useStore.getState().resetDay(logicalDay(Date.now()));
    check();
    const timer = setInterval(check, CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const unsub = useStore.subscribe((s, prev) => {
      // A block that just ended may have held back a reset.
      if (s.tasks !== prev.tasks || (prev.elapsedSec > 0 && s.elapsedSec === 0)) check();
    });
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      unsub();
    };
  }, []);
}
