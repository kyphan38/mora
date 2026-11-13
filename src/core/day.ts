// The task list is a list for one day, like logi's routine. A new day starts
// at 04:00 (logi's cut), so a late session still counts as the same day.

import type { Task } from '../types';

export const DAY_CUTOFF_HOUR = 4;

/** "YYYY-MM-DD" of the logical day at `ms`, in device time. */
export function logicalDay(ms: number): string {
  const d = new Date(ms);
  if (d.getHours() < DAY_CUTOFF_HOUR) d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The day a task belongs to: its logi day, else the day it was added. */
export const taskDay = (t: Task) => t.logi?.date ?? logicalDay(t.createdAt);

/** Tasks from earlier days go. Returns the same array when none do. */
export function dropOldTasks(tasks: Task[], today: string): Task[] {
  const kept = tasks.filter((t) => taskDay(t) >= today);
  return kept.length === tasks.length ? tasks : kept;
}
