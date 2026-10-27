import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildId, checkForNewBuild } from '../platform/pwa';
import { idleForUpdate } from '../hooks/useAppUpdate';

const page = (hash: string) => `<script type="module" crossorigin src="/assets/index-${hash}.js"></script>`;

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.innerHTML = '';
});

describe('new build check', () => {
  it('reads the hashed entry script', () => {
    expect(buildId(page('C9WnuUGy'))).toBe('/assets/index-C9WnuUGy.js');
    expect(buildId('<script src="/src/main.tsx"></script>')).toBeNull();
  });

  it('sees a new build and puts the fresh page in the worker cache', async () => {
    document.head.innerHTML = page('old');
    const put = vi.fn();
    vi.stubGlobal('caches', { keys: async () => ['mora-v4', 'other'], open: vi.fn(async () => ({ put })) });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(page('new'))));
    expect(await checkForNewBuild()).toBe(true);
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0]).toBe('/');
  });

  it('stays quiet on the same build, in dev and offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(page('same'))));
    expect(await checkForNewBuild()).toBe(false); // dev: no hashed entry
    document.head.innerHTML = page('same');
    expect(await checkForNewBuild()).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    expect(await checkForNewBuild()).toBe(false);
  });
});

describe('reload only when idle', () => {
  const idle = { phase: 'focus' as const, isRunning: false, elapsedSec: 0, screen: 'focus' as const };

  it('waits for a running or paused block, a break and open sheets', () => {
    expect(idleForUpdate(idle)).toBe(true);
    expect(idleForUpdate({ ...idle, isRunning: true })).toBe(false);
    expect(idleForUpdate({ ...idle, elapsedSec: 12 })).toBe(false);
    expect(idleForUpdate({ ...idle, phase: 'break' })).toBe(false);
    expect(idleForUpdate({ ...idle, screen: 'settings' })).toBe(false);
  });

  it('waits while something is being typed', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    expect(idleForUpdate(idle)).toBe(false);
    input.remove();
  });
});
