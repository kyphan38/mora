import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
}

// A tiny Cache Storage stand-in.
function fakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    match: async (u: string) => store.get(u)?.clone(),
    put: async (u: string, r: Response) => void store.set(u, r),
    delete: async (u: string) => store.delete(u),
  };
  return { store, caches: { open: async () => cache } };
}

let fake: ReturnType<typeof fakeCaches>;

beforeEach(() => {
  vi.resetModules();
  fake = fakeCaches();
  vi.stubGlobal('caches', fake.caches);
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:local', revokeObjectURL: () => {} });
});

afterEach(() => vi.unstubAllGlobals());

describe('media cache', () => {
  it('first time: nothing on the device; saving downloads once', async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(['abc'], { type: 'video/mp4' })));
    vi.stubGlobal('fetch', fetchMock);
    const { cachedObjectUrl, saveForLater } = await import('../platform/mediaCache');
    expect(await cachedObjectUrl('https://x/a.mp4')).toBeNull();
    await Promise.all([saveForLater('https://x/a.mp4'), saveForLater('https://x/a.mp4')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await cachedObjectUrl('https://x/a.mp4')).toBe('blob:local');
  });

  it('keeps the total under the budget by dropping the least recently used', async () => {
    const mod = await import('../platform/mediaCache');
    const big = Math.ceil(mod.MEDIA_BUDGET_BYTES / 2) + 1;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(big))));
    await mod.saveForLater('https://x/1.mp4');
    await new Promise((r) => setTimeout(r, 5));
    await mod.saveForLater('https://x/2.mp4');
    expect(fake.store.has('https://x/1.mp4')).toBe(false);
    expect(fake.store.has('https://x/2.mp4')).toBe(true);
  });

  it('a failed download is not saved', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    const { saveForLater } = await import('../platform/mediaCache');
    await saveForLater('https://x/missing.mp4');
    expect(fake.store.size).toBe(0);
  });
});
