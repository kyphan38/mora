import { useStore } from '../store/useStore';
import { dayLabel, formatClock, formatMinutes, isToday } from '../core/format';
import type { Session } from '../types';

export function HistoryView() {
  const sessions = useStore((s) => s.sessions);
  const today = sessions.filter((s) => isToday(s.endedAt));
  const todayMin = today.reduce((sum, s) => sum + s.minutes, 0);

  // Newest first, grouped by day.
  const groups: { day: string; items: Session[] }[] = [];
  for (const s of sessions) {
    const day = dayLabel(s.endedAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(s);
    else groups.push({ day, items: [s] });
  }

  return (
    <div>
      <h2 className="text-[17px] font-medium">History</h2>
      <p className="mt-1 font-mono text-[12px] text-faint">
        today · <span data-testid="sessions-today">{today.length}</span> {today.length === 1 ? 'session' : 'sessions'} ·{' '}
        <span data-testid="focused-today">{formatMinutes(todayMin)}</span>
      </p>

      {sessions.length === 0 ? (
        <p className="mt-8 text-[15px] text-faint">No sessions yet.</p>
      ) : (
        groups.map((g) => (
          <section key={g.day} className="mt-6">
            <h2 className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">{g.day}</h2>
            <ul className="mt-2">
              {g.items.map((s) => (
                <li key={s.id} className="flex items-baseline gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[15px]">{s.taskName}</span>
                  <span className="shrink-0 font-mono text-[12px] text-faint">
                    {formatClock(s.endedAt)} · {s.minutes}m
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
