import { useEffect, useState } from 'react';
import { cachedObjectUrl, saveForLater } from '../platform/mediaCache';

/**
 * The URL to play: the device copy when there is one, otherwise the network
 * URL (and a copy is saved in the background for next time).
 * Returns null while checking, so the player does not start a download twice.
 */
export function useCachedMedia(url: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null);
    if (!url) return;
    let alive = true;
    let objectUrl: string | null = null;
    void cachedObjectUrl(url).then((local) => {
      if (!alive) {
        if (local) URL.revokeObjectURL(local);
        return;
      }
      objectUrl = local;
      setSrc(local ?? url);
      if (!local) void saveForLater(url);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return src;
}
