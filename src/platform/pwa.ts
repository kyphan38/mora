// Helpers for the installable web app (PWA).

const isWeb = () => typeof window !== 'undefined';

/** Offline shell. Only in a production build: in dev a cache would serve old code. */
export async function registerServiceWorker(): Promise<void> {
  if (!isWeb() || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    // Private mode and some WebViews refuse. The app still works online.
  }
}

/** Asks the browser not to evict local data (Safari clears unused site data after a while). */
export async function requestPersistentStorage(): Promise<void> {
  if (!isWeb()) return;
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported: nothing to do.
  }
}

/** Notification permission must be asked inside a tap; call this from Play. */
export function askNotificationPermissionOnce(): void {
  if (!isWeb() || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'default') return;
  try {
    void Notification.requestPermission();
  } catch {
    // Old Safari: callback form only. Skip.
  }
}

type WakeLockSentinelLike = { release(): Promise<void> };

let sentinel: WakeLockSentinelLike | null = null;

/** Keeps a phone screen on while a block runs. Released on pause; the OS also drops it when hidden. */
export async function setScreenAwake(on: boolean): Promise<void> {
  if (!isWeb()) return;
  const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }).wakeLock;
  if (!wl) return;
  try {
    if (on && !sentinel) sentinel = await wl.request('screen');
    if (!on && sentinel) {
      const s = sentinel;
      sentinel = null;
      await s.release();
    }
  } catch {
    sentinel = null;
  }
}

/** Forget the held lock (the browser releases it when the page is hidden). */
export function wakeLockLost(): void {
  sentinel = null;
}

const ENTRY = /\/assets\/index-[^"']+\.js/;

/** The entry script of a page, like /assets/index-C9WnuUGy.js. Vite hashes it per build. */
export function buildId(html: string): string | null {
  return html.match(ENTRY)?.[0] ?? null;
}

/** The build this page is running, or null in dev (no hashed entry). */
export function runningBuild(): string | null {
  if (!isWeb()) return null;
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return s ? buildId(new URL(s.src).pathname) : null;
}

/**
 * Asks the server for the page and reports whether a newer build is out.
 * When it is, the fresh page also goes into the service worker cache: the
 * worker answers a reload from its cache first, so without this the reload
 * would open the old build again.
 */
export async function checkForNewBuild(): Promise<boolean> {
  const running = runningBuild();
  if (!running) return false;
  try {
    const res = await fetch('/', { cache: 'no-store' });
    if (!res.ok) return false;
    const latest = buildId(await res.clone().text());
    if (!latest || latest === running) return false;
    if ('caches' in window) {
      for (const key of await caches.keys()) {
        if (key.startsWith('mora-')) await (await caches.open(key)).put('/', res.clone());
      }
    }
    void navigator.serviceWorker?.getRegistration?.().then((r) => r?.update());
    return true;
  } catch {
    // Offline: try again later.
    return false;
  }
}
