import { useEffect, useState } from 'react';

const QUERY = '(orientation: portrait)';

/** True on a portrait screen (phones held upright); follows rotation. */
export function usePortrait(): boolean {
  const get = () => typeof matchMedia !== 'undefined' && matchMedia(QUERY).matches;
  const [portrait, setPortrait] = useState(get);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia(QUERY);
    const on = () => setPortrait(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return portrait;
}
