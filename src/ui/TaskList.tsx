import { useState } from 'react';
import { useFlip } from '../hooks/useFlip';
import { reducedMotion } from '../hooks/usePresence';
import { useStore } from '../store/useStore';
import { UpIcon, DownIcon, CloseIcon } from './Icons';

// Row tools wait for the pointer; on touch screens they stay visible but faint.
const ROW_TOOL =
  'p-1 text-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 disabled:invisible';

export function TaskList() {
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const removeTask = useStore((s) => s.removeTask);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const clearCompletedTasks = useStore((s) => s.clearCompletedTasks);
  const [draft, setDraft] = useState('');
  const [leaving, setLeaving] = useState<string | null>(null);
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

  const activeId = tasks.find((t) => !t.done)?.id;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <section aria-label="Task list">
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
          placeholder="Add a task…"
          aria-label="Add a task"
          className="w-full border-b border-line bg-transparent py-2 text-[15px] transition-colors placeholder:text-faint focus:border-line-strong"
        />
      </form>

      <ul className="mt-1">
        {tasks.map((t, i) => (
          <li
            key={t.id}
            ref={flip(t.id)}
            className={`task-row group flex items-center gap-3 py-2 ${leaving === t.id ? 'row-out' : 'rise'}`}
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggleTask(t.id)}
              aria-label={`Toggle ${t.name}`}
              className="h-4 w-4 shrink-0 appearance-none rounded-full border border-line-strong transition-colors checked:border-faint checked:bg-faint"
            />
            <span className={`min-w-0 truncate text-[15px] transition-colors duration-300 ${t.done ? 'text-faint line-through' : ''}`}>
              {t.name}
            </span>
            {t.id === activeId && <span className="shrink-0 font-mono text-[11px] text-faint">now</span>}
            <span className="flex-1" />
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
          </li>
        ))}
      </ul>

      {tasks.length > 0 && (
        <div className="mt-2 flex items-baseline gap-3 text-[12px] text-faint">
          <span>{tasks.length - doneCount} left</span>
          {doneCount > 0 && (
            <button type="button" onClick={clearCompletedTasks} className="hover:text-ink" data-testid="clear-completed-btn">
              clear done
            </button>
          )}
        </div>
      )}
    </section>
  );
}
