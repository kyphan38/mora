export interface TimerState {
  mode: 'countdown' | 'countup';
  totalSec: number;
  elapsedSec: number;
  running: boolean;
}

export function remainingSec(s: TimerState): number {
  if (s.mode === 'countdown') return Math.max(0, s.totalSec - s.elapsedSec);
  return s.elapsedSec;
}

/** mm:ss, or h:mm:ss from one hour up. */
export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}
