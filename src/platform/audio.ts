import { ambientUrl, musicUrl } from '../data/audioManifest';
import { cachedObjectUrl, saveForLater } from './mediaCache';

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

  // Sound never starts or stops with a hard cut: every change is a short fade.
  const FADE_IN_MS = 800;
  const FADE_OUT_MS = 450;
  const SWAP_MS = 350;
  const STEP_MS = 30;

  interface Channel {
    el: HTMLAudioElement;
    key: string;
    target: number;
    timer: ReturnType<typeof setInterval> | null;
    swapping: boolean;
  }

  const makeChannel = (): Channel => {
    const el = new Audio();
    el.loop = true;
    return { el, key: '', target: 1, timer: null, swapping: false };
  };
  const ambient = makeChannel();
  const music = makeChannel();
  let playing = false;

  const stopFade = (c: Channel) => {
    if (c.timer) clearInterval(c.timer);
    c.timer = null;
  };

  // Moves volume toward `to` (or toward the live target when `to` is null).
  const fade = (c: Channel, to: number | null, ms: number, done?: () => void) => {
    stopFade(c);
    const from = c.el.volume;
    const steps = Math.max(1, Math.round(ms / STEP_MS));
    let i = 0;
    c.timer = setInterval(() => {
      i += 1;
      const end = to ?? c.target;
      try {
        c.el.volume = Math.max(0, Math.min(1, from + (end - from) * (i / steps)));
      } catch {
        // Some WebViews refuse volume writes; the fade just becomes a cut.
      }
      if (i >= steps) {
        stopFade(c);
        done?.();
      }
    }, STEP_MS);
  };

  const startChannel = (c: Channel) => {
    if (!c.el.src) return;
    if (c.el.paused !== false) {
      try {
        c.el.volume = 0;
      } catch {
        /* ignore */
      }
    }
    c.el.play().catch(() => {});
    fade(c, null, FADE_IN_MS);
  };

  // Remote sounds play from the device copy when one is saved; otherwise they
  // stream and a copy is saved for next time. Without Cache Storage (tests,
  // old WebViews) the URL is used as is.
  const resolve = (c: Channel, key: string, src: string, autoplay: boolean) => {
    if (!/^https?:/.test(src) || typeof caches === 'undefined') return setSource(c, key, src, autoplay);
    c.key = key;
    void cachedObjectUrl(src).then((local) => {
      if (c.key !== key) {
        if (local) URL.revokeObjectURL(local);
        return;
      }
      c.key = '';
      setSource(c, key, local ?? src, autoplay);
      if (!local) void saveForLater(src);
    });
  };

  // Changes the source. While playing, fade the old track out first.
  const setSource = (c: Channel, key: string, src: string, autoplay: boolean) => {
    if (key === c.key) return;
    c.key = key;
    if (!playing || !c.el.src) {
      c.el.src = src;
      if (playing && autoplay) startChannel(c);
      return;
    }
    c.swapping = true;
    fade(c, 0, SWAP_MS, () => {
      c.swapping = false;
      c.el.src = src;
      if (playing && autoplay) startChannel(c);
    });
  };

  const setTarget = (c: Channel, gain: number) => {
    c.target = Math.max(0, Math.min(1, gain));
    // A running fade reads the live target; otherwise apply now.
    if (!c.timer && !c.swapping && (playing || c.el.paused !== false)) {
      try {
        c.el.volume = c.target;
      } catch {
        /* ignore */
      }
    }
  };

  const engine: AudioEngine = {
    setAmbient(name: string) {
      if (name === ambient.key) return;
      resolve(ambient, name, ambientUrl(name), true);
    },

    setMusic(name: string) {
      if (name === music.key) return;
      resolve(music, name, musicUrl(name), true);
    },

    setMusicUrl(url: string | null) {
      if ((url ?? '') === music.key) return;
      // Cloud tracks play from the device copy once saved; blob: URLs as is.
      if (url) resolve(music, url, url, true);
      else setSource(music, '', '', false);
    },

    setAmbientVolume(gain: number) {
      setTarget(ambient, gain);
    },

    setMusicVolume(gain: number) {
      setTarget(music, gain);
    },

    play() {
      playing = true;
      startChannel(ambient);
      startChannel(music);
    },

    pause() {
      playing = false;
      for (const c of [ambient, music]) {
        if (!c.el.src) continue;
        fade(c, 0, FADE_OUT_MS, () => {
          if (!playing) c.el.pause();
        });
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
      for (const c of [ambient, music]) {
        stopFade(c);
        c.el.pause();
      }
    },
  };

  instance = engine;
  return engine;
}

export function getAudioEngine(): AudioEngine {
  return createAudioEngine();
}
