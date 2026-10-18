/** Browser fullscreen for zen. Phones in a home-screen app are already full. */
export async function setFullscreen(on: boolean): Promise<void> {
  try {
    if (typeof document === 'undefined') return;
    if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    if (!on && document.fullscreenElement) await document.exitFullscreen?.();
  } catch {
    // Not allowed here (iOS Safari, iframes): zen still hides the chrome.
  }
}

/** Calls back when the user leaves fullscreen with the OS key, so zen can end too. */
export function onFullscreenExit(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const handler = () => {
    if (!document.fullscreenElement) cb();
  };
  document.addEventListener('fullscreenchange', handler);
  return () => document.removeEventListener('fullscreenchange', handler);
}
