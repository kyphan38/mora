import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { type AudioEngine, createAudioEngine } from '../lib/audio';
import { type NotifyBridge, createNotifyBridge } from '../lib/notify';
import { volumeToGain, sessionCompleteNotification } from '../lib/soundFormat';

export function useSound(args?: { engine?: AudioEngine; notify?: NotifyBridge }): {
  setRunning: (running: boolean) => void;
  complete: (taskName: string) => void;
} {
  const engine = useMemo(() => args?.engine ?? createAudioEngine(), [args?.engine]);
  const notify = useMemo(() => args?.notify ?? createNotifyBridge(), [args?.notify]);

  const sound = useStore((s) => s.sound);

  useEffect(() => {
    engine.setAmbient(sound.ambient);
    engine.setMusic(sound.musicStyle);
    engine.setAmbientVolume(volumeToGain(sound.ambientVolume));
    engine.setMusicVolume(volumeToGain(sound.musicVolume));
  }, [engine, sound.ambient, sound.musicStyle, sound.ambientVolume, sound.musicVolume]);

  useEffect(() => {
    return () => {
      engine.dispose();
    };
  }, [engine]);

  const setRunning = (running: boolean) => {
    if (running) {
      engine.play();
    } else {
      engine.pause();
    }
  };

  const complete = (taskName: string) => {
    engine.chime();
    const { title, body } = sessionCompleteNotification(taskName);
    notify.notify(title, body);
  };

  return { setRunning, complete };
}
