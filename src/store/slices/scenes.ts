import { CORNERS } from '../../data/corners';

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
});
