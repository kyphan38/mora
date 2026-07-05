import { describe, it, expect } from 'vitest';
import {
  createTimer, start, pause, reset, tick,
  remainingSec, isComplete, formatTime,
} from '../lib/timer';

describe('timer engine', () => {
  it('createTimer(3000) returns countdown', () => {
    const t = createTimer(3000);
    expect(t.mode).toBe('countdown');
    expect(t.totalSec).toBe(3000);
    expect(t.elapsedSec).toBe(0);
    expect(t.running).toBe(false);
  });

  it('createTimer(0) returns countup', () => {
    const t = createTimer(0);
    expect(t.mode).toBe('countup');
    expect(t.totalSec).toBe(0);
    expect(t.elapsedSec).toBe(0);
    expect(t.running).toBe(false);
  });

  it('tick does nothing when not running', () => {
    const t = createTimer(3000);
    const after = tick(t);
    expect(after).toBe(t); // same reference - no change
  });

  it('start sets running true; pause sets running false', () => {
    const t = createTimer(3000);
    const running = start(t);
    expect(running.running).toBe(true);
    const paused = pause(running);
    expect(paused.running).toBe(false);
  });

  it('tick while running advances elapsedSec by 1', () => {
    const t = start(createTimer(3000));
    const after = tick(t);
    expect(after.elapsedSec).toBe(1);
    expect(after.running).toBe(true);
  });

  it('tick with deltaSec advances by that amount', () => {
    const t = start(createTimer(3000));
    const after = tick(t, 5);
    expect(after.elapsedSec).toBe(5);
  });

  it('countdown clamps at totalSec and stops running', () => {
    let t = start(createTimer(3000));
    t = { ...t, elapsedSec: 2999 };
    const after = tick(t);
    expect(after.elapsedSec).toBe(3000);
    expect(after.running).toBe(false);
    expect(isComplete(after)).toBe(true);
  });

  it('remainingSec countdown = total - elapsed', () => {
    let t = createTimer(3000);
    expect(remainingSec(t)).toBe(3000);
    t = { ...t, elapsedSec: 100 };
    expect(remainingSec(t)).toBe(2900);
    t = { ...t, elapsedSec: 5000 };
    expect(remainingSec(t)).toBe(0); // floored at 0
  });

  it('remainingSec countup = elapsed', () => {
    let t = createTimer(0);
    expect(remainingSec(t)).toBe(0);
    t = { ...t, elapsedSec: 42 };
    expect(remainingSec(t)).toBe(42);
  });

  it('isComplete false for countup regardless of elapsed', () => {
    let t = createTimer(0);
    t = { ...t, elapsedSec: 99999 };
    expect(isComplete(t)).toBe(false);
  });

  it('formatTime', () => {
    expect(formatTime(3000)).toBe('50:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(5400)).toBe('90:00');
  });

  it('purity: original object not mutated after tick/start', () => {
    const t = createTimer(3000);
    const started = start(t);
    expect(t.running).toBe(false);
    const ticked = tick(started);
    expect(started.elapsedSec).toBe(0);
    expect(ticked.elapsedSec).toBe(1);
  });

  it('reset keeps mode/totalSec, clears elapsed and running', () => {
    let t = start(createTimer(3000));
    t = tick(t, 500);
    const r = reset(t);
    expect(r.elapsedSec).toBe(0);
    expect(r.running).toBe(false);
    expect(r.mode).toBe('countdown');
    expect(r.totalSec).toBe(3000);
  });
});
