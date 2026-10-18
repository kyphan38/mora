import { describe, it, expect } from 'vitest';
import { volumeToGain, sessionCompleteNotification, slug } from '../core/soundFormat';
import { ambientUrl, musicUrl } from '../data/audioManifest';

describe('soundFormat pure tests', () => {
  it('volumeToGain converts correctly', () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(100)).toBe(1);
    expect(volumeToGain(18)).toBe(0.18);
    expect(volumeToGain(-5)).toBe(0);
    expect(volumeToGain(150)).toBe(1);
  });

  it('sessionCompleteNotification returns correct title and body', () => {
    expect(sessionCompleteNotification('Write intro')).toEqual({
      title: 'Session complete',
      body: 'Write intro · nice work',
    });

    expect(sessionCompleteNotification('')).toEqual({
      title: 'Session complete',
      body: 'Nice work',
    });

    expect(sessionCompleteNotification('   ')).toEqual({
      title: 'Session complete',
      body: 'Nice work',
    });
  });

  it('slug converts names to lower kebab case', () => {
    expect(slug('City Walk')).toBe('city-walk');
    expect(slug('Lo-fi')).toBe('lofi');
    expect(slug('Rain on Window')).toBe('rain-on-window');
    expect(slug('Deep Focus')).toBe('deep-focus');
  });

  it('audioManifest returns correct URLs', () => {
    // Storage path, slugged; the bucket prefix depends on the env.
    expect(decodeURIComponent(ambientUrl('City Walk'))).toMatch(/audio\/ambient\/city-walk\.mp3/);
    expect(decodeURIComponent(musicUrl('Lo-fi'))).toMatch(/audio\/music\/lofi\.mp3/);
  });
});
