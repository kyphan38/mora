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

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
