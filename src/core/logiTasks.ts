// Today's logi routine as mora tasks. Pure, so the merge rules are easy to test.
//
// logi owns the list and the ticks; mora keeps its own order. A routine item
// becomes a task with a fixed id per day, so two devices that fetch at the
// same time make the same task, not two.

import type { FocusKind, LogiCategory, Task } from '../types';

export interface LogiRoutineItem {
  id: string;
  text: string;
  group: string;
  minutes: number | null;
  category: LogiCategory | null;
  done: boolean;
}

export interface LogiRoutine {
  date: string;
  items: LogiRoutineItem[];
}

const CATEGORIES: readonly string[] = ['learn', 'work', 'fitness', 'leisure'];

export const logiTaskId = (date: string, itemId: string) => `logi-${date}-${itemId}`;

/** mora only knows learn and work; fitness and leisure count as learn here (logi keeps the real one). */
export const kindOf = (c: LogiCategory | null | undefined): FocusKind => (c === 'work' ? 'work' : 'learn');

/** Checks the callable's answer; anything odd becomes null. */
export function readRoutine(v: unknown): LogiRoutine | null {
  const r = v as Record<string, unknown> | null;
  if (!r || typeof r.date !== 'string' || !Array.isArray(r.items)) return null;
  const items: LogiRoutineItem[] = [];
  for (const raw of r.items as Record<string, unknown>[]) {
    if (typeof raw?.id !== 'string' || typeof raw?.text !== 'string') continue;
    items.push({
      id: raw.id,
      text: raw.text.slice(0, 200),
      group: String(raw.group ?? ''),
      minutes: typeof raw.minutes === 'number' && raw.minutes > 0 ? Math.round(raw.minutes) : null,
      category: CATEGORIES.includes(String(raw.category)) ? (raw.category as LogiCategory) : null,
      done: raw.done === true,
    });
  }
  return { date: r.date, items };
}

function toTask(item: LogiRoutineItem, date: string, done: boolean, base?: Task): Task {
  const t: Task = {
    ...(base ?? { createdAt: Date.now() }),
    id: logiTaskId(date, item.id),
    name: item.text,
    done,
    kind: kindOf(item.category),
    logi: { date, itemId: item.id, group: item.group, ...(item.category ? { category: item.category } : {}) },
  } as Task;
  if (item.minutes) t.min = item.minutes;
  else delete t.min;
  return t;
}

const same = (a: Task, b: Task) =>
  a.name === b.name &&
  a.done === b.done &&
  a.kind === b.kind &&
  a.min === b.min &&
  a.logi?.group === b.logi?.group &&
  a.logi?.category === b.logi?.category;

/**
 * Applies a fresh routine to the task list.
 *
 * - mora's own tasks stay as they are, in place.
 * - Tasks from another logi day go (the routine is daily).
 * - Items still in the routine update in place; removed items go.
 * - Hidden tasks go; new items join at the end unless hidden.
 * - `pending` holds ticks sent but not yet confirmed; they win over the fetch.
 * - `keepDone` keeps the done state of tasks already here: used when the
 *   list changed from another device, where the routine may be older.
 *
 * Returns the same array when nothing changed, so the store does not churn.
 */
export function mergeRoutine(
  tasks: Task[],
  routine: LogiRoutine,
  hidden: readonly string[],
  pending: ReadonlyMap<string, boolean> = new Map(),
  keepDone = false,
): Task[] {
  const hide = new Set(hidden);
  const items = new Map(routine.items.map((i) => [i.id, i]));
  const doneOf = (i: LogiRoutineItem) => pending.get(logiTaskId(routine.date, i.id)) ?? i.done;
  const seen = new Set<string>();
  let changed = false;
  const out: Task[] = [];
  for (const t of tasks) {
    if (!t.logi) {
      out.push(t);
      continue;
    }
    const item = t.logi.date === routine.date ? items.get(t.logi.itemId) : undefined;
    if (!item || seen.has(item.id) || hide.has(t.id)) {
      changed = true;
      continue;
    }
    seen.add(item.id);
    const next = toTask(item, routine.date, keepDone ? t.done : doneOf(item), t);
    if (same(t, next)) out.push(t);
    else {
      out.push(next);
      changed = true;
    }
  }
  for (const item of routine.items) {
    if (seen.has(item.id) || hide.has(logiTaskId(routine.date, item.id))) continue;
    out.push(toTask(item, routine.date, doneOf(item)));
    changed = true;
  }
  return changed ? out : tasks;
}

/** Hidden ids from other days are dropped. */
export const pruneHidden = (hidden: readonly string[], date: string) => hidden.filter((id) => id.startsWith(`logi-${date}-`));

/** Minutes still planned: undone tasks that carry a length. */
export const plannedLeft = (tasks: readonly Task[]) => tasks.reduce((m, t) => (t.done || !t.min ? m : m + t.min), 0);

/** "25m", "2h", "1h 30m": short task lengths. */
export function lengthLabel(min: number): string {
  if (min < 60) return `${min}m`;
  return min % 60 === 0 ? `${min / 60}h` : `${Math.floor(min / 60)}h ${min % 60}m`;
}
