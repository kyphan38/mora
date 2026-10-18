import { describe, it, expect } from 'vitest';
import {
  diffDocs,
  fingerprint,
  mergeById,
  sessionToDoc,
  taskToDoc,
  tasksFromDocs,
  sessionsFromDocs,
  notesFromDocs,
} from '../core/syncModel';
import type { Session, Task } from '../types';

const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, name: id, done: false, createdAt: 1, ...extra });

describe('sync model', () => {
  it('task docs keep order and drop undefined fields', () => {
    const d = taskToDoc(task('a', { kind: 'work', est: 3 }), 2);
    expect(d).toEqual({ name: 'a', done: false, createdAt: 1, order: 2, kind: 'work', est: 3 });
    const back = tasksFromDocs([
      { id: 'b', data: taskToDoc(task('b'), 1) },
      { id: 'a', data: taskToDoc(task('a'), 0) },
    ]);
    expect(back.map((t) => t.id)).toEqual(['a', 'b']);
    expect('kind' in back[1]).toBe(false);
  });

  it('session docs are clamped to what the rules accept', () => {
    const s: Session = { id: 's', taskName: 'x'.repeat(300), minutes: 900, startedAt: 10.4, endedAt: 5, corner: '', ambient: '', note: 'n'.repeat(900) };
    const d = sessionToDoc(s);
    expect((d.taskName as string).length).toBe(200);
    expect(d.minutes).toBe(600);
    expect(d.endedAt).toBeGreaterThanOrEqual(d.startedAt as number);
    expect((d.note as string).length).toBe(500);
  });

  it('sessions come back newest first, notes oldest first', () => {
    const s = sessionsFromDocs([
      { id: 'old', data: { taskName: 'a', minutes: 1, startedAt: 0, endedAt: 1 } },
      { id: 'new', data: { taskName: 'b', minutes: 1, startedAt: 0, endedAt: 9 } },
    ]);
    expect(s.map((x) => x.id)).toEqual(['new', 'old']);
    const n = notesFromDocs([
      { id: 'b', data: { text: 'b', createdAt: 2 } },
      { id: 'a', data: { text: 'a', createdAt: 1 } },
    ]);
    expect(n.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('fingerprint ignores key order', () => {
    expect(fingerprint({ a: 1, b: { c: 2, d: 3 } })).toBe(fingerprint({ b: { d: 3, c: 2 }, a: 1 }));
  });

  it('diff writes only changed docs and deletes missing ones', () => {
    const local = new Map([
      ['same', { v: 1 }],
      ['changed', { v: 2 }],
      ['new', { v: 3 }],
    ]);
    const remote = new Map([
      ['same', fingerprint({ v: 1 })],
      ['changed', fingerprint({ v: 1 })],
      ['gone', fingerprint({ v: 9 })],
    ]);
    const { writes, deletes } = diffDocs(local, remote);
    expect(writes.map(([id]) => id)).toEqual(['changed', 'new']);
    expect(deletes).toEqual(['gone']);
  });

  it('first merge keeps both sides; remote wins on the same id', () => {
    const merged = mergeById([task('a', { name: 'local' }), task('b')], [task('a', { name: 'remote' }), task('c')]);
    expect(merged.map((t) => `${t.id}:${t.name}`)).toEqual(['a:remote', 'c:c', 'b:b']);
  });
});
