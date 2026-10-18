import { describe, it, expect } from 'vitest';
import { formatTime, remainingSec, type TimerState } from '../core/timer';

const timer = (totalSec: number, elapsedSec: number): TimerState => ({
  mode: totalSec > 0 ? 'countdown' : 'countup',
  totalSec,
  elapsedSec,
  running: false,
});

describe('timer helpers', () => {
  it('remainingSec countdown = total - elapsed, floored at 0', () => {
    expect(remainingSec(timer(3000, 0))).toBe(3000);
    expect(remainingSec(timer(3000, 100))).toBe(2900);
    expect(remainingSec(timer(3000, 5000))).toBe(0);
  });

  it('remainingSec countup = elapsed', () => {
    expect(remainingSec(timer(0, 0))).toBe(0);
    expect(remainingSec(timer(0, 42))).toBe(42);
  });

  it('formatTime', () => {
    expect(formatTime(3000)).toBe('50:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(5400)).toBe('1:30:00');
    expect(formatTime(3599)).toBe('59:59');
  });
});
