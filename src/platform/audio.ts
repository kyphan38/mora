import { ambientUrl, musicUrl } from '../data/audioManifest';

export interface AudioEngine {
  setAmbient(name: string): void;
  setMusic(name: string): void;
  setMusicUrl(url: string | null): void;
  setAmbientVolume(gain: number): void;
  setMusicVolume(gain: number): void;
  play(): void;
  pause(): void;
  chime(): void;
  dispose(): void;
}

export const noopAudioEngine: AudioEngine = {
  setAmbient: () => {},
  setMusic: () => {},
  setMusicUrl: () => {},
  setAmbientVolume: () => {},
  setMusicVolume: () => {},
  play: () => {},
  pause: () => {},
  chime: () => {},
  dispose: () => {},
};

let instance: AudioEngine | null = null;

export function resetAudioEngineInstanceForTest(): void {
  instance = null;
}

export function createAudioEngine(): AudioEngine {
  if (
    typeof Audio === 'undefined' ||
    (typeof window !== 'undefined' &&
      window.navigator &&
      window.navigator.userAgent &&
      window.navigator.userAgent.includes('jsdom'))
  ) {
    return noopAudioEngine;
  }

  if (instance) {
    return instance;
  }

  const ambientAudio = new Audio();
  ambientAudio.loop = true;

  const musicAudio = new Audio();
  musicAudio.loop = true;

  let ambientName = '';
  let musicKey = '';
  let playing = false;

  const engine: AudioEngine = {
    setAmbient(name: string) {
      if (name === ambientName) return;
      ambientName = name;
      try {
        ambientAudio.src = ambientUrl(name);
        if (playing) {
          ambientAudio.play().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to set ambient track:', err);
      }
    },

    setMusic(name: string) {
      if (name === musicKey) return;
      musicKey = name;
      try {
        musicAudio.src = musicUrl(name);
        if (playing) {
          musicAudio.play().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to set music track:', err);
      }
    },

    setMusicUrl(url: string | null) {
      const key = url ?? '';
      if (key === musicKey) return;
      musicKey = key;
      try {
        musicAudio.src = url ?? '';
        if (playing && url) {
          musicAudio.play().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to set custom music track:', err);
      }
    },

    setAmbientVolume(gain: number) {
      try {
        ambientAudio.volume = Math.max(0, Math.min(1, gain));
      } catch (err) {
        console.error('Failed to set ambient volume:', err);
      }
    },

    setMusicVolume(gain: number) {
      try {
        musicAudio.volume = Math.max(0, Math.min(1, gain));
      } catch (err) {
        console.error('Failed to set music volume:', err);
      }
    },

    play() {
      playing = true;
      try {
        if (ambientAudio.src) {
          ambientAudio.play().catch(() => {});
        }
        if (musicAudio.src) {
          musicAudio.play().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to play audio:', err);
      }
    },

    pause() {
      playing = false;
      try {
        ambientAudio.pause();
        musicAudio.pause();
      } catch (err) {
        console.error('Failed to pause audio:', err);
      }
    },

    chime() {
      try {
        const AudioContextClass =
          typeof window !== 'undefined' &&
          ((window as any).AudioContext || (window as any).webkitAudioContext);
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          // Envelope: quick attack, slow decay
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        // Synthesize a gentle 2-note bell (E5 followed by A5)
        playNote(659.25, now, 0.8);
        playNote(880.00, now + 0.12, 1.0);

        setTimeout(() => {
          ctx.close().catch(() => {});
        }, 1500);
      } catch (err) {
        console.error('Failed to synthesize chime:', err);
      }
    },

    dispose() {
      playing = false;
      try {
        ambientAudio.pause();
        musicAudio.pause();
      } catch (err) {
        console.error('Failed to dispose audio engine:', err);
      }
    },
  };

  instance = engine;
  return engine;
}

export function getAudioEngine(): AudioEngine {
  return createAudioEngine();
}
