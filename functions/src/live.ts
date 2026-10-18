// Pure rules for the live link with logi. No Firebase imports, so the app's
// test suite can import this file.

export interface LiveDoc {
  sessionActive?: boolean;
  phase?: string;
  isRunning?: boolean;
  runId?: string | null;
  taskName?: string;
  taskKind?: string;
  anchorAt?: number | null;
  elapsedBase?: number;
  focusStartedAt?: number | null;
  at?: number;
  stoppedBy?: string | null;
  [k: string]: unknown;
}

export type LogiCall =
  | { action: 'start'; runId: string; kind: 'learn' | 'work'; label: string; startAt: number }
  | { action: 'stop'; runId: string; endAt: number };

const runningFocus = (l: LiveDoc | undefined): l is LiveDoc & { runId: string } =>
  !!l && l.sessionActive === true && l.phase === 'focus' && l.isRunning === true && typeof l.runId === 'string';

/**
 * What logi should hear about a change of mora's shared timer:
 * the old run stops when the clock stops or a new run begins; a new run starts.
 * A stop that logi itself caused is not sent back.
 */
export function liveCalls(before: LiveDoc | undefined, after: LiveDoc | undefined, now: number): LogiCall[] {
  const calls: LogiCall[] = [];
  const b = runningFocus(before) ? before : null;
  const a = runningFocus(after) ? after : null;
  if (b && (!a || a.runId !== b.runId) && after?.stoppedBy !== 'logi') {
    calls.push({ action: 'stop', runId: b.runId, endAt: typeof after?.at === 'number' ? after.at : now });
  }
  if (a && (!b || a.runId !== b.runId)) {
    calls.push({
      action: 'start',
      runId: a.runId,
      kind: a.taskKind === 'work' ? 'work' : 'learn',
      label: String(a.taskName ?? '').slice(0, 120),
      startAt: typeof a.anchorAt === 'number' ? a.anchorAt : (a.at ?? now),
    });
  }
  return calls;
}

export interface StopResult {
  live: Record<string, unknown>;
  session: Record<string, unknown> | null;
}

/**
 * logi stopped run `runId` at `endAt`. If mora is still running that run,
 * end the block like a Stop: the timer resets for every device and the
 * focused time (a minute or more) becomes a session. Otherwise nothing.
 */
export function stopFromLogi(live: LiveDoc | undefined, runId: string, endAt: number): StopResult | null {
  if (!runningFocus(live) || live.runId !== runId) return null;
  const anchor = typeof live.anchorAt === 'number' ? live.anchorAt : endAt;
  const elapsedSec = Math.max(0, (live.elapsedBase ?? 0) + (endAt - anchor) / 1000);
  const minutes = Math.round(elapsedSec / 60);
  const session =
    elapsedSec >= 60
      ? {
          taskName: String(live.taskName ?? '').slice(0, 200) || 'Focus',
          minutes: Math.min(600, Math.max(1, minutes)),
          startedAt: Math.round(typeof live.focusStartedAt === 'number' ? live.focusStartedAt : endAt - elapsedSec * 1000),
          endedAt: Math.round(endAt),
          corner: '',
          ambient: '',
          kind: live.taskKind === 'work' ? 'work' : 'learn',
          updatedAt: Math.round(endAt),
        }
      : null;
  return {
    live: {
      ...live,
      deviceId: 'logi',
      sessionActive: false,
      phase: 'focus',
      isRunning: false,
      elapsedBase: 0,
      anchorAt: null,
      focusStartedAt: null,
      event: null,
      at: endAt,
      stoppedBy: 'logi',
    },
    session,
  };
}
