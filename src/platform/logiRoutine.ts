// Today's logi routine in the task list, through the logiRoutine Cloud Function.
//
// Pulled, not pushed: on start, when the app comes back to the front, every
// few minutes while visible, and when the task sheet opens. A tick made here
// goes to logi at once; until logi confirms it, the fetch does not undo it.

import { httpsCallable } from 'firebase/functions';
import { getFunctionsClient } from './functions';
import { readRoutine, type LogiRoutine } from '../core/logiTasks';
import { setLogiTickHandler, useStore } from '../store/useStore';
import type { Task } from '../types';

const POLL_MS = 3 * 60_000;

type Call = { action: 'get' } | { action: 'tick'; date: string; itemId: string; on: boolean };

let refreshNow: (() => void) | null = null;

/** Fetches again soon, if the sync is running (the task sheet calls this on open). */
export function refreshLogiRoutine() {
  refreshNow?.();
}

export function startLogiRoutine(): () => void {
  const call = httpsCallable<Call, { snapshot: unknown; error: string | null }>(getFunctionsClient(), 'logiRoutine');
  const pending = new Map<string, boolean>();
  let stopped = false;
  let inFlight = false;
  let lastAt = 0;
  let last: LogiRoutine | null = null;

  const apply = (raw: unknown, error: string | null) => {
    const r: LogiRoutine | null = readRoutine(raw);
    if (!r || stopped) return;
    last = r;
    useStore.getState().applyLogiRoutine(r, pending);
    useStore.getState().setLogiSync({ state: error ? 'error' : 'ok', message: error ?? '', at: Date.now() });
  };

  const fail = (e: unknown) => {
    if (stopped) return;
    const message = (e as { message?: string })?.message ?? 'logi unreachable';
    useStore.getState().setLogiSync({ ...useStore.getState().logiSync, state: 'error', message });
  };

  const fetchNow = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    lastAt = Date.now();
    if (useStore.getState().logiSync.state === 'idle') useStore.getState().setLogiSync({ state: 'loading', message: '', at: 0 });
    try {
      const res = await call({ action: 'get' });
      apply(res.data.snapshot, res.data.error);
    } catch (e) {
      fail(e);
    } finally {
      inFlight = false;
    }
  };

  const tick = async (t: Task) => {
    if (!t.logi) return;
    pending.set(t.id, t.done);
    try {
      const res = await call({ action: 'tick', date: t.logi.date, itemId: t.logi.itemId, on: t.done });
      pending.delete(t.id);
      apply(res.data.snapshot, res.data.error);
    } catch (e) {
      // Kept in `pending`: the next fetch keeps showing it, the next tick retries.
      fail(e);
      setTimeout(() => {
        if (!stopped && pending.has(t.id)) void tick({ ...t, done: pending.get(t.id)! });
      }, 30_000);
    }
  };

  setLogiTickHandler((t) => void tick(t));
  // Tasks or hidden ids that came from another device: add what is missing, drop what is hidden.
  const unsubStore = useStore.subscribe((s, prev) => {
    if (last && (s.tasks !== prev.tasks || s.logiHidden !== prev.logiHidden)) s.applyLogiRoutine(last, pending, true);
  });
  refreshNow = () => {
    // A sheet opened right after a fetch does not need another one.
    if (Date.now() - lastAt > 10_000) void fetchNow();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') refreshNow?.();
  };
  document.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') void fetchNow();
  }, POLL_MS);
  void fetchNow();

  return () => {
    stopped = true;
    refreshNow = null;
    setLogiTickHandler(null);
    unsubStore();
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    useStore.getState().setLogiSync({ state: 'idle', message: '', at: 0 });
  };
}
