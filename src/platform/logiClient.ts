import type { LogiBlock } from '../core/logiLink';

export type SendResult =
  | { kind: 'ok'; accepted: string[]; rejected: { id: string; reason: string }[] }
  | { kind: 'unauthorized' }
  | { kind: 'off' }
  | { kind: 'network' };

/** Posts blocks to logi. Network trouble is a normal outcome, not an exception. */
export async function sendBlocks(baseUrl: string, token: string, blocks: LogiBlock[]): Promise<SendResult> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/ingest/mora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ blocks }),
    });
    if (res.status === 401) return { kind: 'unauthorized' };
    if (res.status === 503) return { kind: 'off' };
    if (!res.ok) return { kind: 'network' };
    const body = (await res.json()) as { accepted?: string[]; rejected?: { id: string; reason: string }[] };
    return { kind: 'ok', accepted: body.accepted ?? [], rejected: body.rejected ?? [] };
  } catch {
    return { kind: 'network' };
  }
}
