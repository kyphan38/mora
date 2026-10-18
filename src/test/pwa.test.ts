import { describe, it, expect, vi, afterEach } from 'vitest';
import { setScreenAwake, askNotificationPermissionOnce, registerServiceWorker } from '../platform/pwa';
import { readFileSync } from 'node:fs';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('screen wake lock', () => {
  it('holds one lock while running and releases it on pause', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    await setScreenAwake(true);
    await setScreenAwake(true);
    expect(request).toHaveBeenCalledTimes(1);
    await setScreenAwake(false);
    expect(release).toHaveBeenCalledTimes(1);
    delete (navigator as unknown as Record<string, unknown>).wakeLock;
  });

  it('does nothing where the API is missing', async () => {
    await expect(setScreenAwake(true)).resolves.toBeUndefined();
  });
});

describe('notification permission', () => {
  it('asks only while the answer is still open', () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    askNotificationPermissionOnce();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission });
    askNotificationPermissionOnce();
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
});

describe('service worker', () => {
  it('is not registered outside a production build', async () => {
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    await registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('never caches audio or video', () => {
    const sw = readFileSync('public/sw.js', 'utf8');
    expect(sw).toMatch(/mp4\|mp3/);
  });

  it('manifest points at icons that exist', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(m.display).toBe('standalone');
    for (const icon of m.icons) expect(() => readFileSync(`public${icon.src}`)).not.toThrow();
  });
});
