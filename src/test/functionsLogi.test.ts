import { describe, it, expect, vi } from 'vitest';
import { blockFromSession, postBlocks, isAllowed, AUTO_SEND_MS } from '../../functions/src/logi';

describe('cloud function helpers (logi)', () => {
  it('builds the block from a session doc', () => {
    expect(blockFromSession('s1', { taskName: 'Read', minutes: 25, endedAt: 10_000_000, kind: 'work' })).toEqual({
      id: 's1', kind: 'work', label: 'Read', startAt: 10_000_000 - 1_500_000, endAt: 10_000_000,
    });
    expect(blockFromSession('s2', { minutes: 0, endedAt: 1 })).toBeNull();
    expect(blockFromSession('s3', { minutes: 5, endedAt: 1 })?.kind).toBe('learn');
    expect(AUTO_SEND_MS).toBe(3 * 86_400_000);
  });

  it('classifies logi answers', async () => {
    const reply = (status: number, body: unknown = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
    expect(await postBlocks('https://l/', 't', [], reply(200, { accepted: ['a'], rejected: [] }))).toEqual({ kind: 'ok', accepted: ['a'], rejected: [] });
    expect((await postBlocks('https://l', 't', [], reply(401))).kind).toBe('stop');
    expect((await postBlocks('https://l', 't', [], reply(503))).kind).toBe('stop');
    expect((await postBlocks('https://l', 't', [], reply(502))).kind).toBe('retry');
    const offline = vi.fn(async () => {
      throw new TypeError('offline');
    });
    expect((await postBlocks('https://l', 't', [], offline)).kind).toBe('retry');
  });

  it('sends to the ingest route with the bearer token', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 200 }));
    await postBlocks('https://logi.test/', 'secret', [], f);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://logi.test/api/ingest/mora');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
  });

  it('only the allowed, verified email may backfill', () => {
    expect(isAllowed({ email: 'Me@x.com', email_verified: true }, 'me@x.com')).toBe(true);
    expect(isAllowed({ email: 'me@x.com', email_verified: false }, 'me@x.com')).toBe(false);
    expect(isAllowed(undefined, 'me@x.com')).toBe(false);
  });
});
