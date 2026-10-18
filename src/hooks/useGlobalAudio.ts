import { useEffect } from 'react';
import { useStore, shouldPlayAudio } from '../store/useStore';
import { getAudioEngine } from '../platform/audio';
import { volumeToGain } from '../core/soundFormat';
import { getCustomTrack } from '../platform/customTrackDb';

/** A track saved on this device (desktop build, or not yet moved to the cloud). */
const customTracksLocal = (id: string) => useStore.getState().customTracks.some((t) => t.id === id);

export function useGlobalAudio() {
  const sound = useStore((s) => s.sound);
  const muted = useStore((s) => s.muted);
  const removeCustomTrack = useStore((s) => s.removeCustomTrack);
  const userTracks = useStore((s) => s.userTracks);
  const active = useStore(shouldPlayAudio);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    const engine = getAudioEngine();
    engine.setAmbient(sound.ambient);
    // Mute keeps the chosen levels; it only sends silence.
    engine.setAmbientVolume(muted ? 0 : volumeToGain(sound.ambientVolume));
    engine.setMusicVolume(muted ? 0 : volumeToGain(sound.musicVolume));

    const customTrackId = sound.customTrackId;
    const cloud = customTrackId ? userTracks.find((t) => t.id === customTrackId) : undefined;
    if (cloud) {
      engine.setMusicUrl(cloud.url);
    } else if (customTrackId && userTracks.length === 0 && !customTracksLocal(customTrackId)) {
      // A cloud track whose list has not loaded yet: keep the music quiet until it does.
      engine.setMusicUrl(null);
    } else if (customTrackId) {
      getCustomTrack(customTrackId).then((rec) => {
        if (cancelled) return;
        if (rec) {
          createdUrl = URL.createObjectURL(rec.blob);
          engine.setMusicUrl(createdUrl);
        } else {
          // Blob missing (e.g. site data cleared) - fall back to the last preset and prune the dangling entry.
          engine.setMusicUrl(null);
          engine.setMusic(sound.musicStyle);
          removeCustomTrack(customTrackId);
        }
      });
    } else {
      engine.setMusicUrl(null);
      engine.setMusic(sound.musicStyle);
    }

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [sound.ambient, sound.musicStyle, sound.ambientVolume, sound.musicVolume, sound.customTrackId, muted, removeCustomTrack, userTracks]);

  useEffect(() => {
    const engine = getAudioEngine();
    if (active) {
      engine.play();
    } else {
      engine.pause();
    }
  }, [active]);
}
