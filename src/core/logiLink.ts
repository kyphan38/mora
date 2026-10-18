import type { FocusKind, Session } from '../types';

/** One finished focus block, in the shape logi's /api/ingest/mora expects. */
export interface LogiBlock {
  id: string;
  kind: FocusKind;
  label: string;
  startAt: number;
  endAt: number;
}

export const LOGI_BATCH = 50;

/**
 * The block ends when the session ended and lasts its focused minutes, so
 * logi counts focus time, not pauses.
 */
export function blockFromSession(s: Session): LogiBlock {
  return {
    id: s.id,
    kind: s.kind ?? 'learn',
    label: s.taskName,
    startAt: s.endedAt - s.minutes * 60_000,
    endAt: s.endedAt,
  };
}

/** Reasons logi will give again on every retry; those blocks are dropped, not resent. */
export function isPermanentReject(reason: string): boolean {
  return reason !== 'write-failed';
}

/** Adds blocks that are not queued yet. */
export function mergeOutbox(outbox: LogiBlock[], add: LogiBlock[]): LogiBlock[] {
  const ids = new Set(outbox.map((b) => b.id));
  return [...outbox, ...add.filter((b) => !ids.has(b.id))];
}
