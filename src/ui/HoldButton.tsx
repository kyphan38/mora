import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../hooks/usePresence';

export const HOLD_MS = 800;
const HINT_MS = 1600;

/**
 * A word that acts only after a long press, so a stray tap cannot end the
 * block. A keyboard or assistive click (detail 0) acts at once.
 */
export function HoldButton({
  label,
  ariaLabel,
  className,
  onHold,
}: {
  label: string;
  ariaLabel: string;
  className: string;
  onHold: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState<'off' | 'on' | 'fading'>('off');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearHint = () => {
    hintTimers.current.forEach(clearTimeout);
    hintTimers.current = [];
  };
  const stopTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(
    () => () => {
      stopTimer();
      clearHint();
    },
    [],
  );

  const start = (button: number) => {
    if (button !== 0 || timer.current) return;
    clearHint();
    setHint('off');
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      navigator.vibrate?.(12);
      onHold();
    }, HOLD_MS);
  };

  const cancel = () => {
    stopTimer();
    setHolding(false);
  };

  const release = () => {
    if (!timer.current) return;
    cancel();
    setHint('on');
    hintTimers.current = [setTimeout(() => setHint('fading'), HINT_MS), setTimeout(() => setHint('off'), HINT_MS + 300)];
  };

  return (
    <span className="relative inline-flex w-10 justify-center">
      <button
        type="button"
        className={`${className} relative inline-flex w-full select-none justify-center whitespace-nowrap`}
        aria-label={ariaLabel}
        onPointerDown={(e) => start(e.button)}
        onPointerUp={release}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.detail === 0 && onHold()}
      >
        {holding && reducedMotion() ? 'holding…' : label}
        <span
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-current"
          style={{
            transform: `scaleX(${holding ? 1 : 0})`,
            transition: holding ? `transform ${HOLD_MS}ms linear` : 'transform 150ms ease-out',
          }}
          aria-hidden="true"
        />
      </button>
      <span
        aria-live="polite"
        className={`pointer-events-none absolute top-full mt-1 text-[11px] text-faint transition-opacity duration-300 ${hint === 'on' ? 'opacity-100' : 'opacity-0'}`}
      >
        {hint === 'off' ? '' : 'hold'}
      </span>
    </span>
  );
}
