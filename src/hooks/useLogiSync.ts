import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { blockFromSession, isPermanentReject, LOGI_BATCH } from '../core/logiLink';
import { sendBlocks } from '../platform/logiClient';

const RETRY_MS = 5 * 60_000;
// Only sessions that just ended are queued automatically; loading saved
// history or undoing a delete must not resend old blocks.
const FRESH_MS = 10 * 60_000;

/** Queues finished blocks and sends them to logi when the link is on. */
export function useLogiSync() {
  const sending = useRef(false);

  useEffect(() => {
    const flush = async () => {
      const { logi, outbox } = useStore.getState();
      if (sending.current || !logi.enabled || !logi.token || outbox.length === 0) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      sending.current = true;
      const store = useStore.getState();
      store.setLogiStatus({ state: 'sending', message: '', at: Date.now() });
      try {
        const batch = outbox.slice(0, LOGI_BATCH);
        const res = await sendBlocks(logi.url, logi.token, batch);
        if (res.kind === 'ok') {
          const done = [...res.accepted, ...res.rejected.filter((r) => isPermanentReject(r.reason)).map((r) => r.id)];
          store.dropFromOutbox(done);
          const skipped = res.rejected.filter((r) => isPermanentReject(r.reason)).length;
          store.setLogiStatus({
            state: 'ok',
            message: skipped ? `${skipped} too old or invalid, skipped` : '',
            at: Date.now(),
          });
          sending.current = false;
          if (useStore.getState().outbox.length > 0 && done.length > 0) void flush();
          return;
        }
        const message =
          res.kind === 'unauthorized' ? 'token rejected' : res.kind === 'off' ? 'link is off in logi' : 'offline, will retry';
        store.setLogiStatus({ state: 'error', message, at: Date.now() });
      } finally {
        sending.current = false;
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 1500);
    };

    const unsub = useStore.subscribe((state, prev) => {
      if (state.sessions !== prev.sessions && state.logi.enabled) {
        const known = new Set(prev.sessions.map((s) => s.id));
        const fresh = state.sessions.filter((s) => !known.has(s.id) && Date.now() - s.endedAt < FRESH_MS);
        if (fresh.length) state.enqueueBlocks(fresh.map(blockFromSession));
      }
      if (state.outbox !== prev.outbox || state.logi !== prev.logi) soon();
    });

    const interval = setInterval(flush, RETRY_MS);
    window.addEventListener('online', flush);
    soon();
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('online', flush);
    };
  }, []);
}

/** Queues every session of the last 7 days (logi refuses older ones). */
export function queueRecentSessions(now = Date.now()): number {
  const { sessions, enqueueBlocks } = useStore.getState();
  const recent = sessions.filter((s) => now - s.endedAt < 7 * 86_400_000 - 60_000);
  enqueueBlocks(recent.map(blockFromSession));
  return recent.length;
}
