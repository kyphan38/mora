import { useEffect, useState } from 'react';

/** True after `ms` without pointer or key input, while `enabled`. */
export function useIdle(ms: number, enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    let t = setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), ms);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [ms, enabled]);

  return idle;
}
