import { useEffect, useRef, type RefObject } from 'react';
import { reducedMotion } from './usePresence';

const MAX_PX = 12;
const EASE = 0.06;

/**
 * Moves `ref` a little against the mouse, eased in requestAnimationFrame.
 * Mouse devices only. `enabled` false eases it back to the middle.
 * Writes the style directly; no React state per frame.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  // Kept across effect runs so turning it off eases back from where it is.
  const pos = useRef({ tx: 0, ty: 0, x: 0, y: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof matchMedia === 'undefined') return;
    if (reducedMotion() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const p = pos.current;
    let raf = 0;
    const draw = () => {
      el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) scale(1.04)`;
    };
    const frame = () => {
      raf = 0;
      p.x += (p.tx - p.x) * EASE;
      p.y += (p.ty - p.y) * EASE;
      if (Math.abs(p.tx - p.x) < 0.05 && Math.abs(p.ty - p.y) < 0.05) {
        p.x = p.tx;
        p.y = p.ty;
        draw();
        return;
      }
      draw();
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      if (!enabled) return;
      p.tx = -(e.clientX / window.innerWidth - 0.5) * 2 * MAX_PX;
      p.ty = -(e.clientY / window.innerHeight - 0.5) * 2 * MAX_PX;
      kick();
    };
    const onVisible = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else kick();
    };

    draw();
    if (!enabled) {
      p.tx = 0;
      p.ty = 0;
      kick();
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ref, enabled]);
}
