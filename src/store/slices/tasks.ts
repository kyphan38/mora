import type { Task } from '../../types';
import { uid } from '../../core/uid';
import { dropOldTasks } from '../../core/day';
import { clearNextOnDone, withNext } from '../../core/nextStep';

import type { Slice, TasksSlice } from '../types';
import { currentTask, keepPick, readLength, switchPatch, tellLogi } from '../helpers';

export const tasksSlice: Slice<TasksSlice> = (set, get) => ({
  tasks: [],
  activeTaskId: null,
  addTask: (name) => {
    // "Write report ~3" adds the task with an estimate of 3 focus blocks; "Read 50m" plans 50 minutes.
    const m = name.trim().match(/^(.*?)\s*~\s*(\d{1,2})$/);
    const len = readLength((m ? m[1] : name).trim());
    const trimmed = len.name.trim().slice(0, 200);
    if (!trimmed) return;
    const est = m ? Math.max(1, Number(m[2])) : undefined;
    set((state) => {
      const task: Task = {
        id: uid(),
        name: trimmed,
        done: false,
        createdAt: Date.now(),
        kind: 'learn',
        ...(est ? { est } : {}),
        ...(len.min ? { min: len.min } : {}),
      };
      return { tasks: [...state.tasks, task] };
    });
  },
  removeTask: (id) =>
    set((state) => {
      const gone = state.tasks.find((t) => t.id === id);
      const newTasks = state.tasks.filter((t) => t.id !== id);
      const activeTaskId = keepPick(state.activeTaskId, newTasks);
      return {
        tasks: newTasks,
        activeTaskId,
        ...(gone?.logi && !state.logiHidden.includes(id) ? { logiHidden: [...state.logiHidden, id] } : {}),
        // A removed task's time is discarded, not moved to another task.
        ...switchPatch(state, newTasks, activeTaskId, false),
      };
    }),
  restoreTask: (task, index) =>
    set((state) => {
      if (state.tasks.some((t) => t.id === task.id)) return {};
      const copy = [...state.tasks];
      copy.splice(Math.max(0, Math.min(index, copy.length)), 0, task);
      return { tasks: copy, logiHidden: state.logiHidden.filter((h) => h !== task.id) };
    }),
  reorderTasks: (from, to) =>
    set((state) => {
      if (from < 0 || from >= state.tasks.length || to < 0 || to >= state.tasks.length) {
        return {};
      }
      const copy = [...state.tasks];
      const [moved] = copy.splice(from, 1);
      if (moved) {
        copy.splice(to, 0, moved);
      }
      return { tasks: copy };
    }),
  activeTask: () => currentTask(get()),
  pickTask: (id) =>
    set((state) => {
      const next = id === state.activeTaskId ? null : keepPick(id, state.tasks);
      if (next === state.activeTaskId) return {};
      return { activeTaskId: next, ...switchPatch(state, state.tasks, next, true) };
    }),
  startTask: (id) => {
    const s = get();
    const started = s.phase !== 'focus' || s.isRunning || s.elapsedSec > 0;
    const task = s.tasks.find((t) => t.id === id);
    if (started || !task || task.done) return;
    set({ activeTaskId: id });
    if (task.min) s.setCustomDuration(task.min);
  },
  resetDay: (today) =>
    set((state) => {
      // A block in progress keeps its task; the next check resets.
      if (state.isRunning || state.elapsedSec > 0 || state.phase !== 'focus') return {};
      const tasks = dropOldTasks(state.tasks, today);
      if (tasks === state.tasks) return {};
      return { tasks, activeTaskId: keepPick(state.activeTaskId, tasks) };
    }),
  toggleTask: (id) =>
    set((state) => {
      const newTasks = clearNextOnDone(state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
      const activeTaskId = keepPick(state.activeTaskId, newTasks);
      tellLogi(state.tasks, newTasks);
      return {
        tasks: newTasks,
        activeTaskId,
        ...switchPatch(state, newTasks, activeTaskId, true),
      };
    }),
  clearCompletedTasks: () =>
    set((state) => {
      const newTasks = state.tasks.filter((t) => !t.done);
      // Cleared logi tasks stay hidden for today, or the next fetch brings them back.
      const cleared = state.tasks.filter((t) => t.done && t.logi && !state.logiHidden.includes(t.id)).map((t) => t.id);
      return {
        tasks: newTasks,
        ...(cleared.length ? { logiHidden: [...state.logiHidden, ...cleared] } : {}),
      };
    }),
  setTaskKind: (id, kind) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, kind } : t)) })),
  setTaskNext: (id, text) =>
    set((s) => {
      const tasks = withNext(s.tasks, id, text);
      return tasks === s.tasks ? {} : { tasks };
    }),
  notes: [],
  addNote: (text) => {
    const t = text.trim().slice(0, 500);
    if (!t) return;
    set((s) => ({ notes: [...s.notes, { id: uid(), text: t, createdAt: Date.now() }] }));
  },
  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  noteToTask: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    get().addTask(note.text);
    get().removeNote(id);
  },
});
