import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { dayLabel, formatClock, formatMinutes, isToday } from '../core/format';
import { lastDays, streak, kindTotals, sessionsToCsv } from '../core/stats';
import { downloadText } from '../platform/download';
import { CloseIcon } from './Icons';
import type { Session } from '../types';

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ROW_TOOL =
  'p-1 text-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

export function HistoryView() {
  const sessions = useStore((s) => s.sessions);
  const goal = useStore((s) => s.dailyGoalMin);
  const removeSession = useStore((s) => s.removeSession);
  const restoreSession = useStore((s) => s.restoreSession);
  const [editing, setEditing] = useState<string | null>(null);
  const [undo, setUndo] = useState<Session | null>(null);

  // "Deleted · undo" for a few seconds, the only toast-like thing (legi UndoBar idea).
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  const todayMin = sessions.filter((s) => isToday(s.endedAt)).reduce((sum, s) => sum + s.minutes, 0);
  const todayCount = sessions.filter((s) => isToday(s.endedAt)).length;
  const days = lastDays(sessions, 7);
  const maxDay = Math.max(goal, ...days.map((d) => d.minutes), 1);
  const week = kindTotals(sessions, days[0].day);
  const run = streak(sessions);

  const groups: { day: string; items: Session[] }[] = [];
  for (const s of sessions) {
    const day = dayLabel(s.endedAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(s);
    else groups.push({ day, items: [s] });
  }

  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h2 className="text-[17px] font-medium">History</h2>
      <p className="mt-1 font-mono text-[12px] text-faint">
        today · <span data-testid="sessions-today">{todayCount}</span> {todayCount === 1 ? 'session' : 'sessions'} ·{' '}
        <span data-testid="focused-today">{formatMinutes(todayMin)}</span>
        {goal > 0 && (
          <span className={todayMin >= goal ? 'text-ink' : ''}> / {formatMinutes(goal)}{todayMin >= goal ? ' reached' : ''}</span>
        )}
        {run > 1 && <span data-testid="streak"> · {run} days in a row</span>}
      </p>

      {sessions.length > 0 && (
        <section className="mt-6" aria-label="Last 7 days">
          <div className="relative flex h-20 items-end gap-2">
            {goal > 0 && (
              <div className="absolute inset-x-0 border-t border-dashed border-line-strong" style={{ bottom: `${(goal / maxDay) * 100}%` }} aria-hidden="true" />
            )}
            {days.map((d, i) => (
              <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${formatMinutes(d.minutes)}`}>
                <div
                  className={`w-full rounded-[2px] transition-[height] duration-500 ${i === days.length - 1 ? 'bg-ink' : 'bg-faint'}`}
                  style={{ height: d.minutes ? `${Math.max(4, (d.minutes / maxDay) * 100)}%` : '1px', opacity: d.minutes ? 1 : 0.4 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2 font-mono text-[10px] text-faint">
            {days.map((d) => (
              <span key={d.day} className="flex-1 text-center">
                {DAY_LETTER[new Date(d.day).getDay()]}
              </span>
            ))}
          </div>
          <p className="mt-3 font-mono text-[12px] text-faint">
            7 days · learn {formatMinutes(week.learn)} · work {formatMinutes(week.work)}
          </p>
        </section>
      )}

      {sessions.length === 0 ? (
        <p className="mt-8 text-[15px] text-faint">No sessions yet.</p>
      ) : (
        groups.map((g) => (
          <section key={g.day} className="mt-6">
            <h3 className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">{g.day}</h3>
            <ul className="mt-1">
              {g.items.map((s) =>
                editing === s.id ? (
                  <EditRow key={s.id} session={s} onDone={() => setEditing(null)} />
                ) : (
                  <li key={s.id} className="group flex items-baseline gap-3 py-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(s.id)} aria-label={`Edit ${s.taskName}`}>
                      <span className="block truncate text-[15px]">{s.taskName}</span>
                      {s.note && <span className="block truncate text-[13px] text-faint">{s.note}</span>}
                    </button>
                    <span className="shrink-0 font-mono text-[12px] text-faint">
                      {s.kind === 'work' ? 'work · ' : ''}
                      {formatClock(s.endedAt)} · {s.minutes}m
                    </span>
                    <button
                      type="button"
                      className={ROW_TOOL}
                      aria-label={`Delete ${s.taskName}`}
                      onClick={() => {
                        const removed = removeSession(s.id);
                        if (removed) setUndo(removed);
                      }}
                    >
                      <CloseIcon />
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>
        ))
      )}

      {sessions.length > 0 && (
        <div className="mt-8 flex gap-4 text-[12px] text-faint">
          <span>export</span>
          <button type="button" className="hover:text-ink" onClick={() => downloadText(`mora-${stamp}.csv`, sessionsToCsv(sessions), 'text/csv')}>
            csv
          </button>
          <button
            type="button"
            className="hover:text-ink"
            onClick={() => downloadText(`mora-${stamp}.json`, JSON.stringify({ app: 'mora', exportedAt: Date.now(), sessions }, null, 2), 'application/json')}
          >
            json
          </button>
        </div>
      )}

      {undo && (
        <div className="fade-in sticky bottom-0 mt-4 flex justify-center">
          <div className="flex items-baseline gap-3 rounded-full border border-line bg-surface px-4 py-2 text-[13px] text-muted">
            <span>Deleted</span>
            <span className="text-faint">·</span>
            <button
              type="button"
              className="text-ink"
              onClick={() => {
                restoreSession(undo);
                setUndo(null);
              }}
            >
              undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditRow({ session, onDone }: { session: Session; onDone: () => void }) {
  const updateSession = useStore((s) => s.updateSession);
  const [name, setName] = useState(session.taskName);
  const [minutes, setMinutes] = useState(String(session.minutes));

  return (
    <li className="py-2">
      <form
        className="flex items-baseline gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          updateSession(session.id, { taskName: name, minutes: Number(minutes) });
          onDone();
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Task name"
          className="min-w-0 flex-1 border-b border-line-strong bg-transparent text-[15px]"
        />
        <input
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, '').slice(0, 3))}
          aria-label="Minutes"
          className="w-10 border-b border-line-strong bg-transparent text-right font-mono text-[12px]"
        />
        <span className="font-mono text-[12px] text-faint">m</span>
        <button type="submit" className="text-[12px] text-ink">
          save
        </button>
        <button type="button" className="text-[12px] text-faint hover:text-ink" onClick={onDone}>
          cancel
        </button>
      </form>
    </li>
  );
}
