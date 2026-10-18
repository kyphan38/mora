import type { ReactNode } from 'react';

const R = 47;
const C = 2 * Math.PI * R;

/** A hairline ring that fills as time passes. Content sits in the middle. */
export function Ring({ progress, children }: { progress: number; children: ReactNode }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative aspect-square w-[min(78vw,22rem)]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line)" strokeWidth="0.6" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          data-testid="ring-progress"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">{children}</div>
    </div>
  );
}
