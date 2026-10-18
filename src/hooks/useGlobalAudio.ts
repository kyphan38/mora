import { useEffect } from 'react';
import { useStore, shouldPlayAudio } from '../store/useStore';
import { getAudioEngine } from '../platform/audio';
import { volumeToGain } from '../core/soundFormat';
import { getCustomTrack } from '../platform/customTrackDb';

/** A track still saved on this device from before cloud tracks (moves up once). */
const customTracksLocal = (id: string) => useStore.getState().customTracks.some((t) => t.id === id);

/**
 * Keeps the one audio engine in step with the store. Source, volume and
 * play state are separate effects on purpose: moving a volume slider must
 * never reload a track (that restarted it from the beginning).
 */
export function useGlobalAudio() {
  const ambient = useStore((s) => s.sound.ambient);
  const ambientVolume = useStore((s) => s.sound.ambientVolume);
  const musicVolume = useStore((s) => s.sound.musicVolume);
  const musicStyle = useStore((s) => s.sound.musicStyle);
  const customTrackId = useStore((s) => s.sound.customTrackId);
  const muted = useStore((s) => s.muted);
  const removeCustomTrack = useStore((s) => s.removeCustomTrack);
  // A string, so a new tracks list with the same URL does not reload the music.
  const cloudUrl = useStore((s) => (customTrackId ? (s.userTracks.find((t) => t.id === customTrackId)?.url ?? '') : ''));
  const tracksLoaded = useStore((s) => s.userTracks.length > 0);
  const active = useStore(shouldPlayAudio);

  useEffect(() => {
    getAudioEngine().setAmbient(ambient);
  }, [ambient]);

  useEffect(() => {
    const engine = getAudioEngine();
    // Mute keeps the chosen levels; it only sends silence.
    engine.setAmbientVolume(muted ? 0 : volumeToGain(ambientVolume));
    engine.setMusicVolume(muted ? 0 : volumeToGain(musicVolume));
  }, [ambientVolume, musicVolume, muted]);

  useEffect(() => {
    const engine = getAudioEngine();
    let cancelled = false;
    let createdUrl: string | null = null;

    if (!customTrackId) {
      engine.setMusic(musicStyle);
    } else if (cloudUrl) {
      engine.setMusicUrl(cloudUrl);
    } else if (!tracksLoaded && !customTracksLocal(customTrackId)) {
      // A cloud track whose list has not loaded yet: stay quiet until it does.
      engine.setMusicUrl(null);
    } else {
      void getCustomTrack(customTrackId).then((rec) => {
        if (cancelled) return;
        if (rec) {
          createdUrl = URL.createObjectURL(rec.blob);
          engine.setMusicUrl(createdUrl);
        } else {
          // Blob missing (site data cleared): back to the style, drop the dangling entry.
          engine.setMusic(musicStyle);
          removeCustomTrack(customTrackId);
        }
      });
    }

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [customTrackId, cloudUrl, tracksLoaded, musicStyle, removeCustomTrack]);

  useEffect(() => {
    const engine = getAudioEngine();
    if (active) engine.play();
    else engine.pause();
  }, [active]);
}
