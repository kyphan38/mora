import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

const R = 47;
const C = 2 * Math.PI * R;

export const RING_MAX_MIN = 120;
const STEP = 5;
// Presses closer to the middle than this go to the content, not the ring.
const BAND_FROM = 0.34;
const clampMin = (m: number) => Math.max(STEP, Math.min(RING_MAX_MIN, m));

/** Minutes for a point on the ring, 0 at the top, clockwise. */
export function minutesAt(x: number, y: number, cx: number, cy: number) {
  const turn = (Math.atan2(x - cx, cy - y) / (2 * Math.PI) + 1) % 1;
  return Math.round((turn * RING_MAX_MIN) / STEP) * STEP;
}

/** Keeps a drag from jumping between the two ends when it crosses the top. */
export function nextDragMinutes(prev: number, raw: number) {
  if (prev >= RING_MAX_MIN - 30 && raw < 30) return RING_MAX_MIN;
  if (prev <= 30 && raw > RING_MAX_MIN - 30) return STEP;
  return clampMin(raw);
}

type Adjust = { minutes: number; onChange: (minutes: number) => void };

/**
 * A hairline ring that fills as time passes. Content sits in the middle.
 * With `adjust`, the band can be dragged (or use arrow keys) to pick minutes.
 */
export function Ring({
  progress,
  adjust,
  settleKey = 0,
  breath = false,
  lastMinute = false,
  children,
}: {
  progress: number;
  adjust?: Adjust;
  /** Goes up by 1 each time a block ends; the ring settles and a ripple spreads once. */
  settleKey?: number;
  /** A slow breathing circle behind the text (break time). */
  breath?: boolean;
  /** The last minute of a countdown: the arc gets a little thicker, once. */
  lastMinute?: boolean;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    if (settleKey === 0) return;
    setRipple(true);
    const t = setTimeout(() => setRipple(false), 900);
    return () => clearTimeout(t);
  }, [settleKey]);

  const showDrag = !!adjust && dragging;
  const p = Math.max(0, Math.min(1, showDrag ? adjust.minutes / RING_MAX_MIN : progress));
  const angle = adjust ? (Math.min(adjust.minutes, RING_MAX_MIN) / RING_MAX_MIN) * 2 * Math.PI : 0;

  const change = (m: number) => {
    if (!adjust || m === last.current) return;
    last.current = m;
    navigator.vibrate?.(4);
    adjust.onChange(m);
  };

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = boxRef.current!.getBoundingClientRect();
    const raw = minutesAt(e.clientX, e.clientY, r.left + r.width / 2, r.top + r.height / 2);
    change(nextDragMinutes(last.current, raw));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!adjust || e.button !== 0) return;
    const r = boxRef.current!.getBoundingClientRect();
    const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    if (dist <= r.width * BAND_FROM) return;
    last.current = adjust.minutes;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
    pick(e);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!adjust) return;
    const dir =
      e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    adjust.onChange(clampMin(adjust.minutes + dir * STEP));
  };

  const sliderProps = adjust
    ? {
        role: 'slider',
        tabIndex: 0,
        'aria-label': 'Focus minutes',
        'aria-valuemin': STEP,
        'aria-valuemax': RING_MAX_MIN,
        'aria-valuenow': clampMin(adjust.minutes),
        onPointerDown,
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => dragging && pick(e),
        onPointerUp: () => setDragging(false),
        onPointerCancel: () => setDragging(false),
        onKeyDown,
      }
    : {};

  return (
    <div
      ref={boxRef}
      className={`relative aspect-square w-[min(78vw,22rem)] ${adjust ? 'touch-none select-none' : ''}`}
      {...sliderProps}
    >
      {ripple && (
        <span
          className="ring-ripple absolute inset-0 rounded-full border border-ink"
          data-testid="ring-settle"
          aria-hidden="true"
        />
      )}
      <div key={settleKey} className={`absolute inset-0 ${settleKey > 0 ? 'ring-settle' : ''}`}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line)" strokeWidth="0.6" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={lastMinute ? 1.4 : 0.9}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - p)}
            className={`${showDrag ? '' : 'transition-[stroke-dashoffset,stroke-width] duration-1000 ease-linear'} ${settleKey > 0 ? 'ring-glow' : ''}`}
            data-testid="ring-progress"
          />
          {adjust && (
            <circle
              cx={50 + R * Math.cos(angle)}
              cy={50 + R * Math.sin(angle)}
              r={dragging ? 2.2 : 1.4}
              fill="var(--ink)"
              data-testid="ring-handle"
            />
          )}
        </svg>
      </div>
      {breath && (
        <span
          className="breath absolute inset-0 m-auto h-[70%] w-[70%] rounded-full bg-ink/5"
          data-testid="breath"
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">{children}</div>
    </div>
  );
}
