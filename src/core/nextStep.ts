// M1: the "next step" saved on a task when a block ends. Pure.

import type { Task } from '../types';

export const MAX_NEXT = 200;

/** Trimmed and cut; empty means "none". */
export function cleanNext(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_NEXT);
}

/** Sets or clears a task's next step. Same array when nothing changes. */
export function withNext(tasks: Task[], id: string, text: string): Task[] {
  const next = cleanNext(text);
  const at = tasks.findIndex((t) => t.id === id);
  if (at < 0 || (tasks[at].next ?? '') === next) return tasks;
  const { next: _drop, ...rest } = tasks[at];
  void _drop;
  const copy = [...tasks];
  copy[at] = next ? { ...rest, next } : rest;
  return copy;
}

/** A task marked done loses its next step. */
export function clearNextOnDone(tasks: Task[]): Task[] {
  return tasks.some((t) => t.done && t.next) ? tasks.map((t) => (t.done && t.next ? withNext([t], t.id, '')[0] : t)) : tasks;
}
