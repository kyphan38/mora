// Pure helpers for sending mora sessions to logi. No Firebase imports, so the
// app's test suite can import this file.

export interface LogiBlock {
  id: string;
  kind: 'learn' | 'work';
  label: string;
  startAt: number;
  endAt: number;
}

/** Sessions that ended within this window are sent automatically. Older ones only via "send the last 7 days". */
export const AUTO_SEND_MS = 3 * 86_400_000;
/** logi refuses records older than 7 days. */
export const BACKFILL_MS = 7 * 86_400_000 - 60_000;
export const BATCH = 50;

type SessionDoc = { taskName?: unknown; minutes?: unknown; endedAt?: unknown; kind?: unknown };

/** Same shape the app used to send: the block ends at the session end and lasts its focused minutes. */
export function blockFromSession(id: string, d: SessionDoc): LogiBlock | null {
  const minutes = Number(d.minutes);
  const endAt = Number(d.endedAt);
  if (!Number.isFinite(minutes) || minutes < 1 || !Number.isFinite(endAt)) return null;
  return {
    id,
    kind: d.kind === 'work' ? 'work' : 'learn',
    label: String(d.taskName ?? '').slice(0, 120),
    startAt: endAt - minutes * 60_000,
    endAt,
  };
}

export type SendOutcome =
  | { kind: 'ok'; accepted: string[]; rejected: { id: string; reason: string }[] }
  | { kind: 'retry'; reason: string }
  | { kind: 'stop'; reason: string };

/** Posts blocks to logi. 'retry' = worth trying again later; 'stop' = will not work until a setting changes. */
export async function postBlocks(
  baseUrl: string,
  token: string,
  blocks: LogiBlock[],
  fetchFn: typeof fetch = fetch,
): Promise<SendOutcome> {
  let res: Response;
  try {
    res = await fetchFn(`${baseUrl.replace(/\/+$/, '')}/api/ingest/mora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ blocks }),
    });
  } catch {
    return { kind: 'retry', reason: 'network' };
  }
  if (res.status === 401) return { kind: 'stop', reason: 'token rejected' };
  if (res.status === 503) return { kind: 'stop', reason: 'link is off in logi' };
  if (res.status >= 500) return { kind: 'retry', reason: `logi ${res.status}` };
  if (!res.ok) return { kind: 'stop', reason: `logi ${res.status}` };
  const body = (await res.json().catch(() => ({}))) as { accepted?: string[]; rejected?: { id: string; reason: string }[] };
  return { kind: 'ok', accepted: body.accepted ?? [], rejected: body.rejected ?? [] };
}

/** Same guard as firestore.rules: the one allowed email, verified. */
export function isAllowed(token: { email?: string; email_verified?: boolean } | undefined, allowedEmail: string): boolean {
  const allowed = allowedEmail.trim().toLowerCase();
  return !!token && !!allowed && token.email_verified === true && (token.email ?? '').toLowerCase() === allowed;
}
