import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../platform/auth';
import { CORNERS } from '../data/corners';
import { cornerFromUserScene } from '../data/sceneManifest';
import type { Corner } from '../types';

/** The scenes the picker shows: own uploads first, then the default ones not hidden. */
export function useSceneList(): Corner[] {
  const userScenes = useStore((s) => s.userScenes);
  const hidden = useStore((s) => s.hiddenScenes);
  const signedIn = useAuth((s) => !!s.user?.uid);
  return useMemo(
    () => [...(signedIn ? userScenes : []).map(cornerFromUserScene), ...CORNERS.filter((c) => !hidden.includes(c.id))],
    [signedIn, userScenes, hidden],
  );
}
