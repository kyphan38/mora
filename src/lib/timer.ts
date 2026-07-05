export type TimerMode = 'countdown' | 'countup';

export interface TimerState {
  mode: TimerMode;
  totalSec: number;
  elapsedSec: number;
  running: boolean;
}

export function createTimer(totalSec: number): TimerState {
  return totalSec > 0
    ? { mode: 'countdown', totalSec, elapsedSec: 0, running: false }
    : { mode: 'countup', totalSec: 0, elapsedSec: 0, running: false };
}

export function start(s: TimerState): TimerState {
  return { ...s, running: true };
}

export function pause(s: TimerState): TimerState {
  return { ...s, running: false };
}

export function reset(s: TimerState): TimerState {
  return { ...s, elapsedSec: 0, running: false };
}

export function tick(s: TimerState, deltaSec: number = 1): TimerState {
  if (!s.running) return s;
  let elapsed = s.elapsedSec + deltaSec;
  let running: boolean = s.running;
  if (s.mode === 'countdown' && elapsed >= s.totalSec) {
    elapsed = s.totalSec;
    running = false;
  }
  return { ...s, elapsedSec: elapsed, running };
}

export function remainingSec(s: TimerState): number {
  if (s.mode === 'countdown') return Math.max(0, s.totalSec - s.elapsedSec);
  return s.elapsedSec;
}

export function isComplete(s: TimerState): boolean {
  return s.mode === 'countdown' && s.elapsedSec >= s.totalSec;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
