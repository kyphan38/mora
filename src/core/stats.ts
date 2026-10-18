import type { FocusKind, Session } from '../types';

const DAY_MS = 86_400_000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Minutes per day for the last `n` days, oldest first, ending today. */
export function lastDays(sessions: Session[], n: number, now = Date.now()): { day: number; minutes: number }[] {
  const today = startOfDay(now);
  const days = Array.from({ length: n }, (_, i) => ({ day: today - (n - 1 - i) * DAY_MS, minutes: 0 }));
  for (const s of sessions) {
    const d = startOfDay(s.endedAt);
    const slot = days.find((x) => x.day === d);
    if (slot) slot.minutes += s.minutes;
  }
  return days;
}

/** Days in a row with at least one session, counting back from today (or yesterday if today is empty). */
export function streak(sessions: Session[], now = Date.now()): number {
  const days = new Set(sessions.map((s) => startOfDay(s.endedAt)));
  let day = startOfDay(now);
  if (!days.has(day)) day -= DAY_MS;
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = startOfDay(day - DAY_MS / 2);
  }
  return count;
}

/** Minutes per focus kind since `sinceMs`. Sessions without a kind count as learn. */
export function kindTotals(sessions: Session[], sinceMs: number): Record<FocusKind, number> {
  const out: Record<FocusKind, number> = { learn: 0, work: 0 };
  for (const s of sessions) if (s.endedAt >= sinceMs) out[s.kind ?? 'learn'] += s.minutes;
  return out;
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function sessionsToCsv(sessions: Session[]): string {
  const head = ['task', 'kind', 'minutes', 'started', 'ended', 'note'];
  const rows = sessions.map((s) => [
    s.taskName,
    s.kind ?? 'learn',
    s.minutes,
    new Date(s.startedAt).toISOString(),
    new Date(s.endedAt).toISOString(),
    s.note ?? '',
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}
