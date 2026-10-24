import { describe, expect, it } from 'vitest';
import { logiTaskId, mergeRoutine, plannedLeft, pruneHidden, readRoutine, type LogiRoutine } from '../core/logiTasks';
import { taskToDoc, tasksFromDocs } from '../core/syncModel';
import type { Task } from '../types';

const routine = (date: string, items: Partial<LogiRoutine['items'][number]>[]): LogiRoutine => ({
  date,
  items: items.map((i, n) => ({ id: `i${n}`, text: `Item ${n}`, group: 'Morning', minutes: null, category: null, done: false, ...i })),
});

const own: Task = { id: 'own', name: 'Write', done: false, createdAt: 1, kind: 'learn' };

describe('mergeRoutine', () => {
  it('adds today items after own tasks, with length and kind', () => {
    const out = mergeRoutine([own], routine('2026-10-24', [{ minutes: 50, category: 'work' }, { done: true }]), []);
    expect(out.map((t) => t.id)).toEqual(['own', logiTaskId('2026-10-24', 'i0'), logiTaskId('2026-10-24', 'i1')]);
    expect(out[1]).toMatchObject({ name: 'Item 0', min: 50, kind: 'work', done: false, logi: { itemId: 'i0', group: 'Morning', category: 'work' } });
    expect(out[2].done).toBe(true);
  });

  it('returns the same array when nothing changed', () => {
    const r = routine('2026-10-24', [{}]);
    const once = mergeRoutine([own], r, []);
    expect(mergeRoutine(once, r, [])).toBe(once);
  });

  it('keeps mora order, updates in place, drops removed items and other days', () => {
    const first = mergeRoutine([own], routine('2026-10-24', [{}, {}]), []);
    const moved = [first[2], first[0], first[1]];
    const out = mergeRoutine(moved, routine('2026-10-24', [{ text: 'Renamed', done: true }]), []);
    expect(out.map((t) => t.name)).toEqual(['Write', 'Renamed']);
    expect(out[1].done).toBe(true);
    const next = mergeRoutine(out, routine('2026-10-25', [{}]), []);
    expect(next.map((t) => t.id)).toEqual(['own', logiTaskId('2026-10-25', 'i0')]);
  });

  it('skips hidden items and drops hidden tasks', () => {
    const r = routine('2026-10-24', [{}, {}]);
    const hidden = [logiTaskId('2026-10-24', 'i1')];
    expect(mergeRoutine([own], r, hidden).map((t) => t.id)).toEqual(['own', logiTaskId('2026-10-24', 'i0')]);
    const both = mergeRoutine([own], r, []);
    expect(mergeRoutine(both, r, hidden)).toHaveLength(2);
  });

  it('a pending tick wins over the fetch; keepDone keeps local ticks', () => {
    const r = routine('2026-10-24', [{ done: false }]);
    const id = logiTaskId('2026-10-24', 'i0');
    expect(mergeRoutine([], r, [], new Map([[id, true]]))[0].done).toBe(true);
    const done = [{ ...mergeRoutine([], r, [])[0], done: true }];
    expect(mergeRoutine(done, r, [], new Map(), true)[0].done).toBe(true);
    expect(mergeRoutine(done, r, [])[0].done).toBe(false);
  });
});

describe('helpers', () => {
  it('readRoutine drops broken items and odd categories', () => {
    const r = readRoutine({ date: '2026-10-24', items: [{ id: 'a', text: 'A', category: 'sleep', minutes: -1 }, { text: 'no id' }] });
    expect(r?.items).toEqual([{ id: 'a', text: 'A', group: '', minutes: null, category: null, done: false }]);
    expect(readRoutine(null)).toBeNull();
  });

  it('pruneHidden keeps only today, plannedLeft sums undone lengths', () => {
    expect(pruneHidden(['logi-2026-10-23-a', 'logi-2026-10-24-b'], '2026-10-24')).toEqual(['logi-2026-10-24-b']);
    expect(plannedLeft([{ ...own, min: 50 }, { ...own, min: 25, done: true }, own])).toBe(50);
  });

  it('logi tasks survive the Firestore round trip', () => {
    const [t] = mergeRoutine([], routine('2026-10-24', [{ minutes: 25, category: 'fitness' }]), []);
    const back = tasksFromDocs([{ id: t.id, data: taskToDoc(t, 0) }]);
    expect(back[0]).toMatchObject({ min: 25, logi: { date: '2026-10-24', itemId: 'i0', group: 'Morning', category: 'fitness' } });
  });
});
