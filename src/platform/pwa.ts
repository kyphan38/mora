import { isTauri } from './persistence';

// Browser-only helpers for the installable web app. The desktop (Tauri)
// build skips all of them: it has its own window, storage and notifications.

const isWeb = () => typeof window !== 'undefined' && !isTauri();

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
