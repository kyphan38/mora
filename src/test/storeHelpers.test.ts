import { describe, it, expect, vi } from 'vitest';
import { buildSession, clamp, currentTask, keepPick, MIN_LOG_SEC, NO_TASK_NAME, readLength, setLogiTickHandler, switchPatch, tellLogi } from '../store/helpers';
import type { AppStore } from '../store/types';
import type { Task } from '../types';

const task = (id: string, done = false, extra: Partial<Task> = {}): Task =>
  ({ id, name: id, done, createdAt: 0, kind: 'learn', ...extra }) as Task;

describe('readLength', () => {
  it('reads minutes and hours at the end of a name', () => {
    expect(readLength('Read 50m')).toEqual({ name: 'Read', min: 50 });
    expect(readLength('Gym 1.5h')).toEqual({ name: 'Gym', min: 90 });
  });
  it('ignores lengths out of range or without a name', () => {
    expect(readLength('Plan 0m')).toEqual({ name: 'Plan 0m' });
    expect(readLength('Walk 11h')).toEqual({ name: 'Walk 11h' });
    expect(readLength('50m')).toEqual({ name: '50m' });
  });
});

describe('clamp', () => {
  it('keeps volume between 0 and 100', () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(42)).toBe(42);
    expect(clamp(130)).toBe(100);
  });
});

describe('currentTask and keepPick', () => {
  const tasks = [task('a'), task('b', true)];
  it('only an undone task can stay picked', () => {
    expect(currentTask({ tasks, activeTaskId: 'a' })?.id).toBe('a');
    expect(currentTask({ tasks, activeTaskId: 'b' })).toBeUndefined();
    expect(keepPick('a', tasks)).toBe('a');
    expect(keepPick('b', tasks)).toBeNull();
    expect(keepPick('gone', tasks)).toBeNull();
    expect(keepPick(null, tasks)).toBeNull();
  });
});

describe('buildSession', () => {
  const state = { corner: null, sound: { ambient: 'Wind' } as AppStore['sound'], focusStartedAt: null };
  it('skips blocks under a minute', () => {
    expect(buildSession(state, undefined, MIN_LOG_SEC - 1)).toBeNull();
  });
  it('logs a block with no task under the default name', () => {
    const s = buildSession(state, undefined, 25 * 60)!;
    expect(s.taskName).toBe(NO_TASK_NAME);
    expect(s.minutes).toBe(25);
    expect(s.endedAt - s.startedAt).toBe(25 * 60 * 1000);
  });
});

describe('switchPatch', () => {
  const base = {
    phase: 'focus',
    elapsedSec: 600,
    isRunning: false,
    tasks: [task('a'), task('b')],
    activeTaskId: 'a',
    sessions: [],
    corner: null,
    sound: { ambient: 'Wind' },
    focusStartedAt: null,
  } as unknown as AppStore;
  it('closes the block and logs it for the old task when the pick changes', () => {
    const p = switchPatch(base, base.tasks, 'b', true);
    expect(p.elapsedSec).toBe(0);
    expect(p.sessions?.[0]?.taskName).toBe('a');
  });
  it('does nothing when the pick stays or no time ran', () => {
    expect(switchPatch(base, base.tasks, 'a', true)).toEqual({});
    expect(switchPatch({ ...base, elapsedSec: 0 }, base.tasks, 'b', true)).toEqual({});
  });
});

describe('tellLogi', () => {
  it('reports only logi tasks whose done state changed', () => {
    const seen = vi.fn();
    setLogiTickHandler(seen);
    const before = [task('x', false, { logi: { date: '2026-11-16', itemId: 'i1' } as Task['logi'] }), task('y')];
    tellLogi(before, [{ ...before[0]!, done: true }, { ...before[1]!, done: true }]);
    setLogiTickHandler(null);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]![0].id).toBe('x');
  });
});
