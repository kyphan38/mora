import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { reducedMotion, usePresence } from '../hooks/usePresence';

const EXIT_MS = 200;
const SWIPE_CLOSE_MS = 180;
// Closes when dragged past a quarter of the height, or flicked faster than this (px/ms).
const CLOSE_FRACTION = 0.25;
const CLOSE_SPEED = 0.5;
const START_PX = 6;

const isNarrow = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 767px)').matches;

type Drag = { y0: number; lastY: number; lastT: number; speed: number; fromHandle: boolean; active: boolean; height: number };

/**
 * Bottom sheet on phones, a centered panel on wide screens. Slides in and out.
 * Esc or a tap outside closes it, unless `onClose` is omitted (a choice is required).
 * On phones it can also be dragged down to close.
 */
export function Sheet({
  open,
  label,
  onClose,
  children,
  testId,
}: {
  open: boolean;
  label: string;
  onClose?: () => void;
  children: ReactNode;
  testId?: string;
}) {
  const { mounted, leaving } = usePresence(open, EXIT_MS);
  const panel = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // After a swipe the panel is already off screen; skip the normal exit animation.
  const [swiped, setSwiped] = useState(false);

  useEffect(() => {
    if (open) setSwiped(false);
  }, [open]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // A short panel cannot scroll, so the whole panel may take the touch; a long one
  // keeps vertical panning and only the handle starts a drag.
  useLayoutEffect(() => {
    const el = panel.current;
    if (el && onClose) el.style.touchAction = el.scrollHeight > el.clientHeight ? 'pan-y' : 'none';
  });

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = panel.current;
    if (!onClose || !el || e.button !== 0 || !isNarrow()) return;
    const target = e.target as Element;
    if (target.closest('input, textarea, [role=slider]')) return;
    const fromHandle = !!target.closest('[data-sheet-handle]');
    if (!fromHandle && el.scrollTop > 0) return;
    drag.current = {
      y0: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      speed: 0,
      fromHandle,
      active: false,
      height: el.getBoundingClientRect().height,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = panel.current;
    if (!d || !el) return;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      // A body drag must start downward; upward means the user is scrolling.
      if (!d.fromHandle && dy < -START_PX) {
        drag.current = null;
        return;
      }
      if (!d.fromHandle && dy < START_PX) return;
      d.active = true;
      el.setPointerCapture?.(e.pointerId);
      el.style.animation = 'none';
      el.style.transition = 'none';
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.speed = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    el.style.transform = `translateY(${dy > 0 ? dy : dy * 0.2}px)`;
    if (veil.current) {
      veil.current.style.animation = 'none';
      veil.current.style.opacity = String(Math.max(0, 1 - Math.max(dy, 0) / d.height));
    }
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = panel.current;
    drag.current = null;
    if (!d || !d.active || !el) return;
    const dy = e.clientY - d.y0;
    const ms = reducedMotion() ? 0 : SWIPE_CLOSE_MS;
    if (e.type === 'pointerup' && onClose && (dy > d.height * CLOSE_FRACTION || d.speed > CLOSE_SPEED)) {
      setSwiped(true);
      el.style.transition = `transform ${ms}ms ease-in`;
      el.style.transform = 'translateY(100%)';
      if (veil.current) {
        veil.current.style.transition = `opacity ${ms}ms ease-in`;
        veil.current.style.opacity = '0';
      }
      after(ms, () => onClose());
      return;
    }
    el.style.transition = 'transform 200ms var(--ease-soft)';
    el.style.transform = 'translateY(0)';
    if (veil.current) {
      veil.current.style.transition = 'opacity 200ms var(--ease-soft)';
      veil.current.style.opacity = '1';
    }
    after(200, () => {
      el.style.transition = '';
      el.style.animation = '';
      if (veil.current) {
        veil.current.style.transition = '';
        veil.current.style.animation = '';
      }
    });
  };

  if (!mounted) return null;
  const anim = (inAnim: string, outAnim: string) => (swiped ? '' : leaving ? outAnim : inAnim);
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center md:items-center ${leaving ? 'pointer-events-none' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={leaving || undefined}
    >
      <div
        ref={veil}
        className={`absolute inset-0 bg-black/30 ${anim('fade-in', 'fade-out')}`}
        onClick={onClose}
        aria-hidden="true"
        data-testid="sheet-veil"
      />
      <div
        ref={panel}
        className={`relative max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[10px] border border-line bg-surface px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] backdrop-blur-xl md:rounded-[10px] md:pb-5 ${anim('sheet-up', 'sheet-down')}`}
        data-testid={leaving ? undefined : testId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {onClose && (
          <div data-sheet-handle className="-mt-3 mb-1 flex touch-none justify-center py-2 md:hidden" data-testid="sheet-handle">
            <span className="h-1 w-9 rounded-full bg-line-strong" aria-hidden="true" />
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
