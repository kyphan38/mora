import { describe, expect, it } from 'vitest';
import { cleanNext, clearNextOnDone, withNext } from '../core/nextStep';
import type { Task } from '../types';

const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, name: id, done: false, createdAt: 0, ...extra });

describe('next step', () => {
  it('cleans spaces and length', () => {
    expect(cleanNext('  write   the intro  ')).toBe('write the intro');
    expect(cleanNext('a'.repeat(300))).toHaveLength(200);
  });
  it('sets, replaces and clears', () => {
    const one = withNext([task('a')], 'a', 'outline');
    expect(one[0].next).toBe('outline');
    expect(withNext(one, 'a', 'draft')[0].next).toBe('draft');
    expect('next' in withNext(one, 'a', '  ')[0]).toBe(false);
  });
  it('keeps the same array when nothing changes', () => {
    const list = [task('a', { next: 'x' })];
    expect(withNext(list, 'a', 'x')).toBe(list);
    expect(withNext(list, 'zzz', 'y')).toBe(list);
  });
  it('clears done tasks only', () => {
    const out = clearNextOnDone([task('a', { done: true, next: 'x' }), task('b', { next: 'y' })]);
    expect(out[0].next).toBeUndefined();
    expect(out[1].next).toBe('y');
  });
});
