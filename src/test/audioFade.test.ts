import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAudioEngine, resetAudioEngineInstanceForTest } from '../platform/audio';
import { ambientUrl } from '../data/audioManifest';

class FakeAudio {
  src = '';
  volume = 1;
  loop = false;
  paused = true;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
}

let made: FakeAudio[] = [];
let ua: string;

beforeEach(() => {
  vi.useFakeTimers();
  resetAudioEngineInstanceForTest();
  made = [];
  vi.stubGlobal('Audio', vi.fn(() => {
    const a = new FakeAudio();
    made.push(a);
    return a;
  }));
  ua = navigator.userAgent;
  Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 AppleWebKit', configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
});

describe('audio fades', () => {
  it('play starts silent and rises to the set volume', () => {
    const e = createAudioEngine();
    e.setAmbient('Wind');
    e.setAmbientVolume(0.6);
    e.play();
    const [amb] = made;
    expect(amb.volume).toBe(0);
    vi.advanceTimersByTime(400);
    expect(amb.volume).toBeGreaterThan(0);
    expect(amb.volume).toBeLessThan(0.6);
    vi.advanceTimersByTime(600);
    expect(amb.volume).toBeCloseTo(0.6, 5);
  });

  it('pause fades out before pausing; play during the fade cancels it', () => {
    const e = createAudioEngine();
    e.setAmbient('Wind');
    e.setAmbientVolume(0.5);
    e.play();
    vi.advanceTimersByTime(1000);
    const [amb] = made;
    e.pause();
    expect(amb.pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    e.play();
    vi.advanceTimersByTime(1000);
    expect(amb.pause).not.toHaveBeenCalled();
    expect(amb.volume).toBeCloseTo(0.5, 5);
    e.pause();
    vi.advanceTimersByTime(600);
    expect(amb.pause).toHaveBeenCalled();
    expect(amb.volume).toBe(0);
  });

  it('changing the track while playing fades the old one out first', () => {
    const e = createAudioEngine();
    e.setAmbient('Wind');
    e.play();
    vi.advanceTimersByTime(1000);
    const [amb] = made;
    e.setAmbient('Rain');
    expect(amb.src).toBe(ambientUrl('Wind'));
    vi.advanceTimersByTime(400);
    expect(amb.src).toBe(ambientUrl('Rain'));
    vi.advanceTimersByTime(900);
    expect(amb.volume).toBeCloseTo(1, 5);
  });

  it('volume changes during a fade land on the new value', () => {
    const e = createAudioEngine();
    e.setAmbient('Wind');
    e.play();
    vi.advanceTimersByTime(200);
    e.setAmbientVolume(0.3);
    vi.advanceTimersByTime(1000);
    expect(made[0].volume).toBeCloseTo(0.3, 5);
  });
});
