import type { TimerState } from './timer';
import { breakForSeconds, longBreakForSeconds } from './pomodoro';

/** The timer the user sees, derived from store fields. Break uses the break length. */
export function sessionTimer(s: {
  phase: 'focus' | 'break' | 'review';
  lastFocusSec: number;
  longBreak?: boolean;
  setup: { durationSec: number };
  elapsedSec: number;
  isRunning: boolean;
}): TimerState {
  if (s.phase === 'break') {
    return {
      mode: 'countdown',
      totalSec: s.longBreak ? longBreakForSeconds(s.lastFocusSec) : breakForSeconds(s.lastFocusSec),
      elapsedSec: s.elapsedSec,
      running: s.isRunning,
    };
  }
  return {
    mode: s.setup.durationSec > 0 ? 'countdown' : 'countup',
    totalSec: s.setup.durationSec,
    elapsedSec: s.elapsedSec,
    running: s.isRunning,
  };
}
