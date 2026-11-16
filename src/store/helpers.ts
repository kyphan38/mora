// Helpers the store slices share. Pure, except tellLogi (calls the logi tick handler).

import type { Corner, SoundConfig, Task, Session } from '../types';
import { uid } from '../core/uid';

import type { AppStore } from './types';

// The logi routine sync listens for ticks made here (platform/logiRoutine).
let logiTickHandler: ((t: Task) => void) | null = null;
export function setLogiTickHandler(fn: ((t: Task) => void) | null) {
  logiTickHandler = fn;
}
export function tellLogi(before: Task[], after: Task[]) {
  if (!logiTickHandler) return;
  const old = new Map(before.map((t) => [t.id, t.done]));
  for (const t of after) if (t.logi && old.has(t.id) && old.get(t.id) !== t.done) logiTickHandler(t);
}

// "Read 50m", "Gym 1.5h": a planned length at the end of the name.
export function readLength(name: string): { name: string; min?: number } {
  const m = name.match(/^(.*\S)\s+(\d{1,3})m$/i) ?? null;
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 600) return { name: m[1], min: Number(m[2]) };
  const h = name.match(/^(.*\S)\s+(\d(?:\.\d)?)h$/i);
  if (h && Number(h[2]) > 0 && Number(h[2]) <= 10) return { name: h[1], min: Math.round(Number(h[2]) * 60) };
  return { name };
}

export const clamp = (v: number) => Math.max(0, Math.min(100, v));

// Every start of the clock is a new run (logi keeps one record per run).
export const run = (on: boolean) => (on ? { isRunning: true, runSyncAt: Date.now(), runId: uid() } : { isRunning: false, runSyncAt: null });

// Blocks shorter than a minute are not worth a History row.
export const MIN_LOG_SEC = 60;

/** The picked task while it is still there and undone. */
export const currentTask = (s: { tasks: readonly Task[]; activeTaskId: string | null }): Task | undefined =>
  s.activeTaskId ? s.tasks.find((t) => t.id === s.activeTaskId && !t.done) : undefined;

/** Keeps a pick only while it points at an undone task. */
export const keepPick = (id: string | null | undefined, tasks: readonly Task[]): string | null =>
  id && tasks.some((t) => t.id === id && !t.done) ? id : null;

/** Name logged for a block with no task (logi uses the same word). */
export const NO_TASK_NAME = 'Focus';

export function buildSession(
  state: { corner: Corner | null; sound: SoundConfig; focusStartedAt: number | null },
  task: Task | undefined,
  elapsedSec: number,
): Session | null {
  if (elapsedSec < MIN_LOG_SEC) return null;
  const endedAt = Date.now();
  return {
    id: uid(),
    taskName: task?.name ?? NO_TASK_NAME,
    kind: task?.kind ?? 'learn',
    minutes: Math.round(elapsedSec / 60),
    startedAt: state.focusStartedAt ?? endedAt - elapsedSec * 1000,
    endedAt,
    corner: state.corner?.name ?? '',
    ambient: state.sound.ambient,
  };
}


/**
 * When an edit changes the picked task in the middle of a focus block, close
 * that block: log it for the old task (if asked) and restart the clock at 0.
 * Without this, the old task's seconds would silently move to the next one.
 * A block with no task simply becomes the newly picked task's block.
 */
export function switchPatch(
  state: AppStore,
  newTasks: Task[],
  nextId: string | null,
  logOld: boolean,
): Partial<AppStore> {
  if (state.phase !== 'focus' || state.elapsedSec <= 0) return {};
  const before = currentTask(state);
  if (!before) return {};
  const after = currentTask({ tasks: newTasks, activeTaskId: nextId });
  if (before.id === after?.id) return {};
  const session = logOld ? buildSession(state, before, state.elapsedSec) : null;
  const now = Date.now();
  return {
    sessions: session ? [session, ...state.sessions] : state.sessions,
    elapsedSec: 0,
    focusStartedAt: state.isRunning ? now : null,
    runSyncAt: state.isRunning ? now : null,
    ...(state.isRunning ? { runId: uid() } : {}),
  };
}
