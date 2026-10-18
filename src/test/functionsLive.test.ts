import { describe, it, expect } from 'vitest';
import { liveCalls, stopFromLogi, type LiveDoc } from '../../functions/src/live';

const running = (over: Partial<LiveDoc> = {}): LiveDoc => ({
  sessionActive: true, phase: 'focus', isRunning: true, runId: 'r1', taskName: 'Read', taskKind: 'work',
  anchorAt: 1_000_000, elapsedBase: 0, focusStartedAt: 1_000_000, at: 1_000_000, ...over,
});
const paused = (over: Partial<LiveDoc> = {}) => running({ isRunning: false, anchorAt: null, at: 2_000_000, ...over });

describe('live link: what logi hears', () => {
  it('Play starts a run in logi', () => {
    expect(liveCalls(paused({ runId: null }), running(), 0)).toEqual([
      { action: 'start', runId: 'r1', kind: 'work', label: 'Read', startAt: 1_000_000 },
    ]);
  });

  it('Pause, Stop or Done stops the run at the action time', () => {
    expect(liveCalls(running(), paused(), 0)).toEqual([{ action: 'stop', runId: 'r1', endAt: 2_000_000 }]);
    expect(liveCalls(running(), { ...paused(), sessionActive: false }, 0)[0].action).toBe('stop');
    expect(liveCalls(running(), { ...paused(), phase: 'review' }, 0)[0].action).toBe('stop');
  });

  it('a new run (resume, task switch) stops the old one and starts the new one', () => {
    const calls = liveCalls(running(), running({ runId: 'r2', anchorAt: 3_000_000, taskName: 'Write' }), 0);
    expect(calls.map((c) => c.action)).toEqual(['stop', 'start']);
    expect(calls[1]).toMatchObject({ runId: 'r2', label: 'Write', startAt: 3_000_000 });
  });

  it('a stop that came from logi is not sent back; ticks and breaks send nothing', () => {
    expect(liveCalls(running(), paused({ stoppedBy: 'logi' }), 0)).toEqual([]);
    expect(liveCalls(running(), running({ elapsedBase: 42 }), 0)).toEqual([]);
    expect(liveCalls(paused({ phase: 'break', isRunning: true }), paused({ phase: 'break' }), 0)).toEqual([]);
  });
});

describe('live link: stop from logi', () => {
  it('ends the running block and saves the focused time', () => {
    const r = stopFromLogi(running({ elapsedBase: 120 }), 'r1', 1_000_000 + 30 * 60_000)!;
    expect(r.live).toMatchObject({ sessionActive: false, isRunning: false, stoppedBy: 'logi', deviceId: 'logi' });
    expect(r.session).toMatchObject({ taskName: 'Read', minutes: 32, kind: 'work', endedAt: 1_000_000 + 30 * 60_000 });
  });

  it('a short run ends without a session; another or stopped run is ignored', () => {
    expect(stopFromLogi(running(), 'r1', 1_000_000 + 20_000)?.session).toBeNull();
    expect(stopFromLogi(running(), 'other', 2_000_000)).toBeNull();
    expect(stopFromLogi(paused(), 'r1', 2_000_000)).toBeNull();
    expect(stopFromLogi(undefined, 'r1', 2_000_000)).toBeNull();
  });
});
