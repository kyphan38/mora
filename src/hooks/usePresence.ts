import { useEffect, useState } from 'react';

/** Users who ask for less motion, and test DOMs without matchMedia, skip exit animations. */
export function reducedMotion(): boolean {
  return typeof matchMedia === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Keeps something mounted for `exitMs` after `open` turns false, so it can
 * animate out. `leaving` is true during that time.
 */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; leaving: boolean } {
  const [mounted, setMounted] = useState(open);
  const instant = reducedMotion();

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (instant) {
      setMounted(false);
      return;
    }
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs, instant]);

  return { mounted: open || (mounted && !instant), leaving: !open && mounted && !instant };
}
