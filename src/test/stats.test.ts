import { describe, it, expect } from 'vitest';
import { lastDays, streak, kindTotals, sessionsToCsv } from '../core/stats';
import type { Session } from '../types';

const NOW = new Date(2026, 9, 18, 15, 0).getTime();
const at = (daysAgo: number, minutes = 25, extra: Partial<Session> = {}): Session => ({
  id: `${daysAgo}-${minutes}`,
  taskName: 'T',
  minutes,
  startedAt: NOW - daysAgo * 86_400_000 - minutes * 60_000,
  endedAt: NOW - daysAgo * 86_400_000,
  corner: '',
  ambient: '',
  ...extra,
});

describe('stats', () => {
  it('lastDays sums minutes per day, oldest first', () => {
    const d = lastDays([at(0, 25), at(0, 50), at(2, 10), at(9, 99)], 7, NOW);
    expect(d.map((x) => x.minutes)).toEqual([0, 0, 0, 0, 10, 0, 75]);
  });

  it('streak counts back from today, or from yesterday when today is empty', () => {
    expect(streak([at(0), at(1), at(2), at(4)], NOW)).toBe(3);
    expect(streak([at(1), at(2)], NOW)).toBe(2);
    expect(streak([at(2)], NOW)).toBe(0);
    expect(streak([], NOW)).toBe(0);
  });

  it('kindTotals splits learn and work since a time', () => {
    const t = kindTotals([at(0, 30, { kind: 'work' }), at(1, 20), at(10, 99, { kind: 'work' })], NOW - 7 * 86_400_000);
    expect(t).toEqual({ learn: 20, work: 30 });
  });

  it('csv quotes commas and quotes', () => {
    const csv = sessionsToCsv([at(0, 25, { taskName: 'Read, "slowly"', note: 'ok' })]);
    expect(csv.split('\n')[0]).toBe('task,kind,minutes,started,ended,note');
    expect(csv).toContain('"Read, ""slowly""",learn,25,');
  });
});
