import { CORNERS } from '../../data/corners';
import { cornerFromUserScene } from '../../data/sceneManifest';
import { dayPartOf, pickForPart } from '../../core/sceneTime';

import type { Slice, ScenesSlice } from '../types';

export const scenesSlice: Slice<ScenesSlice> = (set, get) => ({
  screen: 'focus',
  corner: null,
  roomBackground: 'color',
  setRoomBackground: (m) => {
    set({ roomBackground: m });
    if (m === 'scene' && get().corner === null) {
      get().randomScene();
    }
  },
  randomScene: () => {
    const current = get().corner;
    const available = current
      ? CORNERS.filter((c) => c.id !== current.id)
      : CORNERS;
    const pool = available.length > 0 ? available : CORNERS;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    get().setCorner(picked);
  },
  setScreen: (s) => set({ screen: s }),
  setCorner: (corner) => set({ corner }),
  userScenes: [],
  userTracks: [],
  hiddenScenes: [],
  toggleHiddenScene: (id) =>
    set((s) => ({ hiddenScenes: s.hiddenScenes.includes(id) ? s.hiddenScenes.filter((x) => x !== id) : [...s.hiddenScenes, id] })),
  showAllScenes: () => set({ hiddenScenes: [] }),
  sceneByTime: true,
  setSceneByTime: (on) => set({ sceneByTime: on }),
  sceneForTime: (now = Date.now()) => {
    const s = get();
    if (s.roomBackground !== 'scene' || !s.sceneByTime) return;
    // Same list as the picker: own uploads, then the default ones not hidden.
    const list = [...s.userScenes.map(cornerFromUserScene), ...CORNERS.filter((c) => !s.hiddenScenes.includes(c.id))];
    const picked = pickForPart(list, dayPartOf(new Date(now).getHours()), s.corner?.id ?? null);
    if (picked && picked.id !== s.corner?.id) s.setCorner(picked);
  },
});
