import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';
import { dropOldTasks, logicalDay, taskDay } from '../core/day';
import type { LogiRoutine } from '../core/logiTasks';
import type { Task } from '../types';

const st = () => useStore.getState();
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).getTime();

const routine = (date: string, ids: string[]): LogiRoutine => ({
  date,
  items: ids.map((id) => ({ id, text: `Item ${id}`, group: 'Day', minutes: null, category: null, done: false })),
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('logical day', () => {
  it('starts at 04:00, like logi', () => {
    expect(logicalDay(at(2026, 11, 13, 3, 59))).toBe('2026-11-12');
    expect(logicalDay(at(2026, 11, 13, 4, 0))).toBe('2026-11-13');
    expect(logicalDay(at(2026, 1, 1, 1))).toBe('2025-12-31');
  });

  it('a logi task belongs to its logi day, an own task to the day it was added', () => {
    const own: Task = { id: 'a', name: 'A', done: false, createdAt: at(2026, 11, 12, 22) };
    const logi: Task = { ...own, id: 'b', logi: { date: '2026-11-13', itemId: 'x', group: '' } };
    expect(taskDay(own)).toBe('2026-11-12');
    expect(taskDay(logi)).toBe('2026-11-13');
  });

  it('drops tasks from earlier days and keeps the array when nothing goes', () => {
    const today: Task = { id: 't', name: 'T', done: false, createdAt: at(2026, 11, 13, 9) };
    const old: Task = { id: 'o', name: 'O', done: true, createdAt: at(2026, 11, 12, 9) };
    expect(dropOldTasks([old, today], '2026-11-13')).toEqual([today]);
    const same = [today];
    expect(dropOldTasks(same, '2026-11-13')).toBe(same);
  });
});

describe('resetDay', () => {
  const yesterday = '2026-11-12';
  const today = '2026-11-13';

  it('a new day starts with only that day\'s logi routine (no pile-up)', () => {
    // Day 1: own tasks plus the routine.
    useStore.setState({
      tasks: [
        { id: 'own1', name: 'Own done', done: true, createdAt: at(2026, 11, 12, 9) },
        { id: 'own2', name: 'Own open', done: false, createdAt: at(2026, 11, 12, 10) },
      ],
    });
    st().applyLogiRoutine(routine(yesterday, ['a', 'b', 'c']));
    expect(st().tasks).toHaveLength(5);

    // Day 2: everything from day 1 goes, then today's routine comes in fresh.
    st().resetDay(today);
    expect(st().tasks).toHaveLength(0);
    st().applyLogiRoutine(routine(today, ['a', 'b', 'c']));
    expect(st().tasks.map((t) => t.id)).toEqual(['logi-2026-11-13-a', 'logi-2026-11-13-b', 'logi-2026-11-13-c']);
  });

  it('drops the pick with its task', () => {
    useStore.setState({ tasks: [{ id: 'o', name: 'O', done: false, createdAt: at(2026, 11, 12, 9) }], activeTaskId: 'o' });
    st().resetDay(today);
    expect(st().activeTaskId).toBeNull();
  });

  it('waits while a block is in progress, then resets', () => {
    useStore.setState({
      tasks: [{ id: 'o', name: 'O', done: false, createdAt: at(2026, 11, 12, 23) }],
      activeTaskId: 'o',
      sessionActive: true,
      isRunning: true,
      elapsedSec: 600,
    });
    st().resetDay(today);
    expect(st().tasks).toHaveLength(1);
    useStore.setState({ phase: 'break', isRunning: true, elapsedSec: 0 });
    st().resetDay(today);
    expect(st().tasks).toHaveLength(1);
    useStore.setState({ phase: 'focus', isRunning: false, elapsedSec: 0 });
    st().resetDay(today);
    expect(st().tasks).toHaveLength(0);
  });

  it('keeps today\'s tasks', () => {
    st().addTask('Fresh');
    st().resetDay(logicalDay(Date.now()));
    expect(st().tasks.map((t) => t.name)).toEqual(['Fresh']);
  });
});
