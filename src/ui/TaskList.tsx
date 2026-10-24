import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useFlip } from '../hooks/useFlip';
import { reducedMotion } from '../hooks/usePresence';
import { useStore } from '../store/useStore';
import { UpIcon, DownIcon, CloseIcon } from './Icons';
import { withTransition } from './viewTransition';
import type { Task } from '../types';
import { lengthLabel, plannedLeft } from '../core/logiTasks';
import { formatClock } from '../core/format';

// Row tools wait for the pointer; on touch screens they stay visible but faint.
const ROW_TOOL =
  'p-1 text-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 disabled:invisible';

// True once `done` has changed while mounted, so rows that are done on open show no effect.
function useChanged(done: boolean) {
  const first = useRef(done);
  const changed = useRef(false);
  if (done !== first.current) changed.current = true;
  return changed.current;
}

function TaskCheck({ done, onToggle, name }: { done: boolean; onToggle: () => void; name: string }) {
  const changed = useChanged(done);
  return (
    <span className="relative flex shrink-0">
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        aria-label={`Toggle ${name}`}
        className="h-4 w-4 appearance-none rounded-full border border-line-strong transition-colors checked:border-faint checked:bg-faint"
      />
      {done && (
        <span
          className={`pointer-events-none absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-bg ${changed ? 'pop' : ''}`}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

function TaskName({ done, name, active }: { done: boolean; name: string; active: boolean }) {
  const changed = useChanged(done);
  return (
    <span
      style={{ viewTransitionName: active ? 'active-task' : undefined }}
      className={`relative min-w-0 truncate text-[15px] transition-colors duration-300 ${done ? 'text-faint' : ''}`}
    >
      {name}
      <span className="strike" data-testid="strike" data-on={done} data-instant={!changed} aria-hidden="true" />
    </span>
  );
}

const LOCK_PX = 8;
const ACT_PX = 72;

/**
 * A row that follows a horizontal drag. Right past 72px = done, left = delete.
 * The word behind it shows in the space the row leaves; the buttons stay as the
 * keyboard and mouse way.
 */
function SwipeRow({ onDone, onDelete, children }: { onDone: () => void; onDelete: () => void; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const doneWord = useRef<HTMLSpanElement>(null);
  const deleteWord = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x: number; y: number; locked: boolean } | null>(null);

  const place = (dx: number, ease: boolean) => {
    const el = inner.current;
    if (!el) return;
    el.style.transition = ease ? 'transform 200ms var(--ease-soft)' : 'none';
    el.style.transform = dx ? `translateX(${dx}px)` : '';
    if (doneWord.current) doneWord.current.style.width = `${Math.max(dx, 0)}px`;
    if (deleteWord.current) deleteWord.current.style.width = `${Math.max(-dx, 0)}px`;
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, locked: false };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.locked) {
      if (Math.hypot(dx, dy) < LOCK_PX) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null;
        return;
      }
      d.locked = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    // Keep the sheet from taking a diagonal drag.
    e.stopPropagation();
    place(dx, false);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.locked) return;
    place(0, true);
    const dx = e.clientX - d.x;
    if (e.type !== 'pointerup') return;
    if (dx > ACT_PX) onDone();
    else if (dx < -ACT_PX) onDelete();
  };

  return (
    <div className="relative min-w-0 flex-1">
      <span
        ref={doneWord}
        className="absolute inset-y-0 left-0 flex items-center overflow-hidden text-[11px] text-faint"
        style={{ width: 0 }}
        aria-hidden="true"
      >
        done
      </span>
      <span
        ref={deleteWord}
        className="absolute inset-y-0 right-0 flex items-center justify-end overflow-hidden text-[11px] text-faint"
        style={{ width: 0 }}
        aria-hidden="true"
      >
        delete
      </span>
      <div
        ref={inner}
        className="flex touch-pan-y items-center gap-3 py-2 select-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {children}
      </div>
    </div>
  );
}

/** Done share as a hairline that fills with scaleX, plus what is left to plan for. */
function TaskSummary({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.done).length;
  const planned = plannedLeft(tasks);
  return (
    <div className="mb-3" data-testid="task-summary">
      <div className="flex items-baseline justify-between font-mono text-[11px] text-faint tabular-nums">
        <span>
          {done} of {tasks.length} done
        </span>
        {planned > 0 && <span aria-label="Planned time left">{lengthLabel(planned)} left</span>}
      </div>
      <div className="mt-1.5 h-px w-full overflow-hidden bg-line" aria-hidden="true">
        <div
          className="h-px origin-left bg-ink transition-transform duration-300 ease-[var(--ease-soft)]"
          style={{ transform: `scaleX(${tasks.length ? done / tasks.length : 0})` }}
          data-testid="task-progress"
        />
      </div>
    </div>
  );
}

/** Length, blocks and where a task came from, after the kind in the line under the name. */
function taskMeta(t: Task): string[] {
  const parts: string[] = [];
  if (t.min) parts.push(lengthLabel(t.min));
  if (t.est || t.blocks) parts.push(`${t.blocks ?? 0}${t.est ? `/${t.est}` : ''} blocks`);
  if (t.logi) parts.push(t.logi.group ? `logi · ${t.logi.group}` : 'logi');
  return parts;
}

function LogiLine() {
  const on = useStore((s) => s.logi.enabled);
  const sync = useStore((s) => s.logiSync);
  if (!on || sync.state === 'idle') return null;
  return (
    <p className={`fade-in mt-1 flex items-center gap-2 font-mono text-[11px] ${sync.state === 'error' ? 'text-ink' : 'text-faint'}`} data-testid="logi-sync">
      {sync.state === 'loading' && <span className="breathe h-1 w-1 rounded-full bg-faint" aria-hidden="true" />}
      {sync.state === 'loading' ? 'logi' : sync.state === 'error' ? `logi · ${sync.message}` : `logi · ${formatClock(sync.at)}`}
    </p>
  );
}

/**
 * `onStart` makes a task the current one and starts the clock (only while the
 * clock waits; otherwise moving a task first would switch the running block).
 */
export function TaskList({ onStart }: { onStart?: (id: string) => void } = {}) {
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const removeTask = useStore((s) => s.removeTask);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const clearCompletedTasks = useStore((s) => s.clearCompletedTasks);
  const setTaskKind = useStore((s) => s.setTaskKind);
  const notes = useStore((s) => s.notes);
  const noteToTask = useStore((s) => s.noteToTask);
  const removeNote = useStore((s) => s.removeNote);
  const clockWaits = useStore((s) => s.phase === 'focus' && !s.isRunning && s.elapsedSec === 0);
  const [draft, setDraft] = useState('');
  const [leaving, setLeaving] = useState<string | null>(null);
  const restoreTask = useStore((s) => s.restoreTask);
  const [undo, setUndo] = useState<{ task: Task; index: number } | null>(null);

  // "deleted · undo" for a few seconds, like History.
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);
  const flip = useFlip(tasks.map((t) => t.id));

  // A removed row fades out first; the rows below then slide up (FLIP).
  const remove = (id: string) => {
    if (reducedMotion()) return removeTask(id);
    setLeaving(id);
    setTimeout(() => {
      removeTask(id);
      setLeaving(null);
    }, 180);
  };

  const toggle = (id: string) => withTransition('task', () => toggleTask(id));
  const swipeDelete = (task: Task, index: number) => {
    setUndo({ task, index });
    remove(task.id);
  };

  const activeId = tasks.find((t) => !t.done)?.id;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <section aria-label="Task list">
      {tasks.length > 0 && <TaskSummary tasks={tasks} />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTask(draft);
          setDraft('');
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus={tasks.length === 0}
          placeholder="Add a task…  (50m, ~3 blocks)"
          aria-label="Add a task"
          className="w-full border-b border-line bg-transparent py-2 text-[15px] transition-colors placeholder:text-faint focus:border-line-strong"
        />
      </form>

      <ul className="mt-1">
        {tasks.map((t, i) => {
          const meta = taskMeta(t);
          const isActive = t.id === activeId;
          return (
            <li key={t.id} ref={flip(t.id)} className={`task-row group ${leaving === t.id ? 'row-out' : 'rise'}`}>
              <SwipeRow onDone={() => toggle(t.id)} onDelete={() => swipeDelete(t, i)}>
                <TaskCheck done={t.done} onToggle={() => toggle(t.id)} name={t.name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <TaskName done={t.done} name={t.name} active={isActive} />
                  <span
                    className={`truncate font-mono text-[11px] text-faint transition-opacity ${t.done ? 'opacity-60' : ''}`}
                    data-testid="task-meta"
                  >
                    {isActive && <span className="text-ink">now </span>}
                    {t.logi ? (
                      <span>{t.logi.category ?? t.kind ?? 'learn'}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTaskKind(t.id, (t.kind ?? 'learn') === 'learn' ? 'work' : 'learn')}
                        className="hover:text-ink"
                        aria-label={`Kind of ${t.name}: ${t.kind ?? 'learn'}`}
                      >
                        {t.kind ?? 'learn'}
                      </button>
                    )}
                    {meta.length > 0 && ` · ${meta.join(' · ')}`}
                  </span>
                </span>
                {onStart && (
                  // A fixed slot keeps the row tools in line.
                  <span className="flex w-9 shrink-0 justify-end">
                    {clockWaits && !t.done && (
                      <button
                        type="button"
                        className={`${isActive ? '' : ROW_TOOL} text-[12px] text-faint hover:text-ink active:scale-[0.97]`}
                        onClick={() => onStart(t.id)}
                        aria-label={`Start ${t.name}`}
                      >
                        start
                      </button>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  className={ROW_TOOL}
                  onClick={() => reorderTasks(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move ${t.name} up`}
                  data-testid={`room-task-move-up-${i}`}
                >
                  <UpIcon />
                </button>
                <button
                  type="button"
                  className={ROW_TOOL}
                  onClick={() => reorderTasks(i, i + 1)}
                  disabled={i === tasks.length - 1}
                  aria-label={`Move ${t.name} down`}
                  data-testid={`room-task-move-down-${i}`}
                >
                  <DownIcon />
                </button>
                <button type="button" className={ROW_TOOL} onClick={() => remove(t.id)} aria-label={`Remove ${t.name}`}>
                  <CloseIcon />
                </button>
              </SwipeRow>
            </li>
          );
        })}
      </ul>

      {undo && (
        <div className="fade-in mt-2 flex items-baseline gap-3 text-[12px] text-faint" data-testid="task-undo">
          <span>{undo.task.logi ? 'hidden for today' : 'deleted'}</span>
          <span>·</span>
          <button
            type="button"
            className="text-ink"
            onClick={() => {
              restoreTask(undo.task, undo.index);
              setUndo(null);
            }}
          >
            undo
          </button>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-2 flex items-baseline gap-3 text-[12px] text-faint">
          <span>{tasks.length - doneCount} left</span>
          {doneCount > 0 && (
            <button
              type="button"
              onClick={clearCompletedTasks}
              className="hover:text-ink"
              data-testid="clear-completed-btn"
            >
              clear done
            </button>
          )}
        </div>
      )}
      <LogiLine />

      {notes.length > 0 && (
        <div className="mt-6" aria-label="Parked thoughts">
          <h3 className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">parked</h3>
          <ul className="mt-1">
            {notes.map((n) => (
              <li key={n.id} className="rise flex items-baseline gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{n.text}</span>
                <button
                  type="button"
                  className="text-[12px] text-faint hover:text-ink"
                  onClick={() => noteToTask(n.id)}
                >
                  make task
                </button>
                <button
                  type="button"
                  className="text-[12px] text-faint hover:text-ink"
                  onClick={() => removeNote(n.id)}
                  aria-label={`Remove note ${n.text}`}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
