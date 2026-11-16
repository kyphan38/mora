
import type { Slice, SoundSlice } from '../types';
import { clamp } from '../helpers';

export const soundSlice: Slice<SoundSlice> = (set) => ({
  sound: {
    ambient: 'Wind',
    musicStyle: 'Nature',
    ambientVolume: 18,
    musicVolume: 6,
    customTrackId: null,
  },
  customTracks: [],
  setAmbient: (name) =>
    set((state) => ({ sound: { ...state.sound, ambient: name } })),
  setMusicStyle: (name) =>
    set((state) => ({ sound: { ...state.sound, musicStyle: name, customTrackId: null } })),
  setAmbientVolume: (v) =>
    set((state) => ({ sound: { ...state.sound, ambientVolume: clamp(v) } })),
  setMusicVolume: (v) =>
    set((state) => ({ sound: { ...state.sound, musicVolume: clamp(v) } })),
  setIdleTrack: (name) =>
    set((state) => ({ sound: { ...state.sound, idleTrack: name } })),
  setIdleVolume: (v) =>
    set((state) => ({ sound: { ...state.sound, idleVolume: clamp(v) } })),
  addCustomTrack: (track) => set(() => ({ customTracks: [track] })),
  selectCustomTrack: (id) =>
    set((state) => ({ sound: { ...state.sound, customTrackId: id } })),
  removeCustomTrack: (id) =>
    set((state) => ({
      customTracks: state.customTracks.filter((t) => t.id !== id),
      sound: state.sound.customTrackId === id
        ? { ...state.sound, customTrackId: null }
        : state.sound,
    })),
  muted: false,
  setMuted: (b) => set({ muted: b }),
});
