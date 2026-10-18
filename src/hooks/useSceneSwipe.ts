import { useRef, type PointerEvent } from 'react';
import { reducedMotion } from './usePresence';

const LOCK_PX = 8;
const STEP_PX = 60;
const MAX_SHIFT = 24;

type Start = { x: number; y: number; lock: 'x' | null };

// SceneLayer reads these two custom properties; no React state per move.
function shift(px: number, ms: number) {
  const root = document.documentElement.style;
  root.setProperty('--scene-ms', `${ms}ms`);
  root.setProperty('--scene-dx', `${px}px`);
}

/**
 * Horizontal swipe on the clock area. The scene follows the finger by up to
 * 24px; past 60px it steps to the next (swipe left) or previous (swipe right).
 */
export function useSceneSwipe(enabled: boolean, onStep: (dir: 1 | -1) => void) {
  const start = useRef<Start | null>(null);

  const end = (e: PointerEvent<HTMLElement>, commit: boolean) => {
    const s = start.current;
    start.current = null;
    if (!s || s.lock !== 'x') return;
    shift(0, 220);
    const dx = e.clientX - s.x;
    if (commit && Math.abs(dx) > STEP_PX) onStep(dx < 0 ? 1 : -1);
  };

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0 || (e.target as Element).closest('[role=slider]')) return;
      start.current = { x: e.clientX, y: e.clientY, lock: null };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.lock) {
        if (Math.hypot(dx, dy) < LOCK_PX) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          start.current = null;
          return;
        }
        s.lock = 'x';
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      if (!reducedMotion()) shift(Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, dx * 0.4)), 0);
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => end(e, true),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => end(e, false),
  };
}
