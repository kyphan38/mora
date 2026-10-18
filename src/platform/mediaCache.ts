// Keeps scene media on the device (Cache Storage), so each file downloads
// once per device and plays offline afterwards. The first play streams
// from the network while a background copy is saved.

const CACHE = 'mora-media-v1';
const INDEX_KEY = 'mora.mediaIndex';
export const MEDIA_BUDGET_BYTES = 500 * 1024 * 1024;

type Index = Record<string, { size: number; used: number }>;

function readIndex(): Index {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '{}') as Index;
  } catch {
    return {};
  }
}

function writeIndex(i: Index): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(i));
  } catch {
    // Storage full or private mode: eviction just runs less precisely.
  }
}

const supported = () => typeof caches !== 'undefined' && typeof fetch !== 'undefined';
const pending = new Map<string, Promise<void>>();

/** The saved copy as an object URL, or null if this file is not on the device yet. */
export async function cachedObjectUrl(url: string): Promise<string | null> {
  if (!supported()) return null;
  try {
    const hit = await (await caches.open(CACHE)).match(url);
    if (!hit) return null;
    const idx = readIndex();
    if (idx[url]) {
      idx[url].used = Date.now();
      writeIndex(idx);
    }
    return URL.createObjectURL(await hit.blob());
  } catch {
    return null;
  }
}

/** Downloads and saves a file in the background (once at a time per URL). */
export function saveForLater(url: string): Promise<void> {
  if (!supported()) return Promise.resolve();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve();
  const running = pending.get(url);
  if (running) return running;
  const job = (async () => {
    try {
      const cache = await caches.open(CACHE);
      if (await cache.match(url)) return;
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      await cache.put(url, new Response(blob, { headers: { 'Content-Type': blob.type } }));
      const idx = readIndex();
      idx[url] = { size: blob.size, used: Date.now() };
      await evict(cache, idx);
      writeIndex(idx);
    } catch {
      // Offline or quota: the file streams from the network next time too.
    } finally {
      pending.delete(url);
    }
  })();
  pending.set(url, job);
  return job;
}

/** Drops the least recently used files until the total fits the budget. */
async function evict(cache: Cache, idx: Index): Promise<void> {
  let total = Object.values(idx).reduce((sum, e) => sum + e.size, 0);
  const oldest = Object.entries(idx).sort(([, a], [, b]) => a.used - b.used);
  for (const [url, e] of oldest) {
    if (total <= MEDIA_BUDGET_BYTES) break;
    await cache.delete(url);
    delete idx[url];
    total -= e.size;
  }
}
