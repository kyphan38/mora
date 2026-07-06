import { useEffect } from 'react';
import { useStore, shouldPlayAudio } from '../store/useStore';
import { getAudioEngine } from '../lib/audio';
import { volumeToGain } from '../lib/soundFormat';
import { getCustomTrack } from '../lib/customTrackDb';

export function useGlobalAudio() {
  const sound = useStore((s) => s.sound);
  const removeCustomTrack = useStore((s) => s.removeCustomTrack);
  const active = useStore(shouldPlayAudio);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    const engine = getAudioEngine();
    engine.setAmbient(sound.ambient);
    engine.setAmbientVolume(volumeToGain(sound.ambientVolume));
    engine.setMusicVolume(volumeToGain(sound.musicVolume));

    const customTrackId = sound.customTrackId;
    if (customTrackId) {
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
  }, [sound.ambient, sound.musicStyle, sound.ambientVolume, sound.musicVolume, sound.customTrackId, removeCustomTrack]);

  useEffect(() => {
    const engine = getAudioEngine();
    if (active) {
      engine.play();
    } else {
      engine.pause();
    }
  }, [active]);
}
