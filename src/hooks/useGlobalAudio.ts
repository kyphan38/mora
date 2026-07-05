import { useEffect } from 'react';
import { useStore, shouldPlayAudio } from '../store/useStore';
import { getAudioEngine } from '../lib/audio';
import { volumeToGain } from '../lib/soundFormat';

export function useGlobalAudio() {
  const sound = useStore((s) => s.sound);
  const active = useStore(shouldPlayAudio);

  useEffect(() => {
    const engine = getAudioEngine();
    engine.setAmbient(sound.ambient);
    engine.setMusic(sound.musicStyle);
    engine.setAmbientVolume(volumeToGain(sound.ambientVolume));
    engine.setMusicVolume(volumeToGain(sound.musicVolume));
  }, [sound.ambient, sound.musicStyle, sound.ambientVolume, sound.musicVolume]);

  useEffect(() => {
    const engine = getAudioEngine();
    if (active) {
      engine.play();
    } else {
      engine.pause();
    }
  }, [active]);
}
