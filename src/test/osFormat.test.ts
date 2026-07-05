import { describe, it, expect } from 'vitest';
import { EV, trayTitle, buildTick } from '../lib/osFormat';
import { type TimerState } from '../lib/timer';

describe('osFormat pure functions', () => {
  it('EV constants have the exact string values', () => {
    expect(EV.TOGGLE).toBe('mora://toggle');
    expect(EV.STOP).toBe('mora://stop');
  });

  it('trayTitle formats correctly', () => {
    expect(trayTitle(true, 1471)).toBe('● 24:31');
    expect(trayTitle(false, 1471)).toBe('24:31');
    expect(trayTitle(false, -1)).toBe('mora');
    expect(trayTitle(true, 0)).toBe('● 00:00');
  });

  it('buildTick with null timer', () => {
    const tick = buildTick(null, '');
    expect(tick).toEqual({
      running: false,
      remainingSec: -1,
      taskName: '',
      mode: 'countdown',
    });
  });

  it('buildTick with active timer', () => {
    const timer: TimerState = {
      mode: 'countdown',
      totalSec: 3000,
      elapsedSec: 500,
      running: true,
    };
    const tick = buildTick(timer, 'Write code');
    expect(tick).toEqual({
      running: true,
      remainingSec: 2500,
      taskName: 'Write code',
      mode: 'countdown',
    });
  });
});
