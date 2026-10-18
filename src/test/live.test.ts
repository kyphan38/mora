import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useStore } from '../store/useStore';
import { actionKey, liveElapsed, toLive, TAKEOVER_SEC, type LiveTimer } from '../core/liveModel';

const st = () => useStore.getState();

const live = (over: Partial<LiveTimer> = {}): LiveTimer => ({
  deviceId: 'phone',
  sessionActive: true,
  phase: 'focus',
  isRunning: true,
  elapsedBase: 100,
  anchorAt: 1_000_000,
  durationSec: 1500,
  durationLabel: '25 min',
  lastFocusSec: 0,
  longBreak: false,
  cycleCount: 0,
  focusStartedAt: 999_000,
  event: null,
  runId: 'run-1',
  taskName: 'A',
  taskKind: 'learn',
  at: 1_000_000,
  ...over,
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  st().addTask('A');
});

afterEach(() => vi.useRealTimers());

describe('live model', () => {
  it('elapsed grows from the anchor while running and stays while paused', () => {
    expect(liveElapsed(live(), 1_010_000)).toBe(110);
    expect(liveElapsed(live({ isRunning: false, anchorAt: null }), 9_999_999)).toBe(100);
  });

  it('toLive anchors at now and keeps the sub-second part', () => {
    const l = toLive({ ...st(), isRunning: true, elapsedSec: 10, runSyncAt: 5_000 }, 'mac', 5_500);
    expect(l).toMatchObject({ deviceId: 'mac', elapsedBase: 10.5, anchorAt: 5_500 });
  });

  it('clock ticks do not change the action key; play, pause and resets do', () => {
    const base = { ...st(), isRunning: true, elapsedSec: 10 };
    expect(actionKey({ ...base, elapsedSec: 11 })).toBe(actionKey(base));
    expect(actionKey({ ...base, isRunning: false })).not.toBe(actionKey(base));
    expect(actionKey({ ...base, isRunning: false, elapsedSec: 0 })).not.toBe(actionKey({ ...base, isRunning: false, elapsedSec: 5 }));
  });
});

describe('following another device', () => {
  it('applies the shared timer and follows it', () => {
    st().applyLive(live(), 1_030_000);
    expect(st()).toMatchObject({ sessionActive: true, phase: 'focus', isRunning: true, elapsedSec: 130, liveFollower: true });
    expect(st().setup).toEqual({ durationSec: 1500, durationLabel: '25 min' });
  });

  it('a follower waits for the leader at the end, then takes over', () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    st().applyLive(live({ elapsedBase: 1490, anchorAt: 2_000_000 }), 2_000_000);
    st().tickSession(10);
    expect(st().phase).toBe('focus');
    expect(st().sessions).toEqual([]);
    vi.setSystemTime(2_000_000 + (TAKEOVER_SEC + 1) * 1000);
    st().tickSession(1);
    expect(st().phase).toBe('review');
    expect(st().sessions.length).toBe(1);
    expect(st().liveFollower).toBe(false);
  });

  it('a fresh natural end from the leader chimes here too; an old one does not', () => {
    const now = 3_000_000;
    st().applyLive(live({ phase: 'review', isRunning: false, anchorAt: null, event: { kind: 'focus-done', taskName: 'A', at: now - 5_000 } }), now);
    expect(st().lastEvent?.at).toBe(now - 5_000);
    useStore.setState({ lastEvent: null });
    st().applyLive(live({ event: { kind: 'focus-done', taskName: 'A', at: now - 120_000 } }), now);
    expect(st().lastEvent).toBeNull();
  });

  it('a local action makes this device lead again', () => {
    st().applyLive(live(), 1_000_000);
    st().leadLive();
    expect(st().liveFollower).toBe(false);
  });
});

describe('runs', () => {
  it('each Play starts a new run; Pause keeps the id for the record', () => {
    st().startFocus();
    st().setIsRunning(true);
    const first = st().runId;
    expect(first).toBeTruthy();
    st().setIsRunning(true);
    expect(st().runId).toBe(first);
    st().setIsRunning(false);
    expect(st().runId).toBe(first);
    st().setIsRunning(true);
    expect(st().runId).not.toBe(first);
  });

  it('the shared timer carries the run, the task and its kind', () => {
    st().setTaskKind(st().tasks[0].id, 'work');
    st().startFocus();
    st().setIsRunning(true);
    const l = toLive({ ...st() }, 'mac', 5_000);
    expect(l).toMatchObject({ runId: st().runId, taskName: 'A', taskKind: 'work', at: 5_000, stoppedBy: null });
  });

  it('a new run changes the action key', () => {
    const a = actionKey({ ...st(), runId: 'r1' });
    expect(actionKey({ ...st(), runId: 'r2' })).not.toBe(a);
  });
});
