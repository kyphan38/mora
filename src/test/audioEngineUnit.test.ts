import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAudioEngine, resetAudioEngineInstanceForTest } from '../lib/audio';

class MockHTMLAudioElement {
  src = '';
  volume = 1;
  loop = false;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
}

describe('AudioEngine unit tests', () => {
  let originalAudio: any;
  let originalUserAgent: string;

  beforeEach(() => {
    resetAudioEngineInstanceForTest();
    originalAudio = (window as any).Audio;
    originalUserAgent = window.navigator.userAgent;

    // Stub Audio
    (window as any).Audio = vi.fn().mockImplementation(() => new MockHTMLAudioElement());

    // Stub UserAgent to bypass jsdom check
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    (window as any).Audio = originalAudio;
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
      writable: true,
    });
  });

  it('creates a singleton AudioEngine', () => {
    const engine1 = createAudioEngine();
    const engine2 = createAudioEngine();
    expect(engine1).toBe(engine2);
  });

  it('sets track URLs correctly based on name', () => {
    const engine = createAudioEngine();
    engine.setAmbient('Wind');
    engine.setMusic('Nature');

    const audioCalls = (window.Audio as any).mock.results;
    expect(audioCalls.length).toBe(2);

    const ambientMock = audioCalls[0].value;
    const musicMock = audioCalls[1].value;

    expect(ambientMock.src).toBe('/audio/ambient/wind.mp3');
    expect(musicMock.src).toBe('/audio/music/nature.mp3');
  });

  it('play triggers play on mock audio elements', () => {
    const engine = createAudioEngine();
    engine.setAmbient('Wind');
    engine.setMusic('Nature');
    
    engine.play();

    const audioCalls = (window.Audio as any).mock.results;
    const ambientMock = audioCalls[0].value;
    const musicMock = audioCalls[1].value;

    expect(ambientMock.play).toHaveBeenCalled();
    expect(musicMock.play).toHaveBeenCalled();
  });

  it('dispose pauses mock audio elements but keeps src', () => {
    const engine = createAudioEngine();
    engine.setAmbient('Wind');
    engine.setMusic('Nature');

    engine.dispose();

    const audioCalls = (window.Audio as any).mock.results;
    const ambientMock = audioCalls[0].value;
    const musicMock = audioCalls[1].value;

    expect(ambientMock.pause).toHaveBeenCalled();
    expect(musicMock.pause).toHaveBeenCalled();
    expect(ambientMock.src).toBe('/audio/ambient/wind.mp3');
    expect(musicMock.src).toBe('/audio/music/nature.mp3');
  });

  it('setMusicUrl plays an arbitrary URL directly, bypassing the preset resolver', () => {
    const engine = createAudioEngine();
    engine.setMusicUrl('blob:http://localhost/abc-123');

    const audioCalls = (window.Audio as any).mock.results;
    const musicMock = audioCalls[1].value;

    expect(musicMock.src).toBe('blob:http://localhost/abc-123');
  });

  it('setMusic and setMusicUrl are detected as changes against each other', () => {
    const engine = createAudioEngine();
    engine.setMusic('Nature');
    engine.setMusicUrl('blob:http://localhost/custom');

    const audioCalls = (window.Audio as any).mock.results;
    const musicMock = audioCalls[1].value;
    expect(musicMock.src).toBe('blob:http://localhost/custom');

    // Switching back to a preset name is detected as a change even though we just came from a URL.
    engine.setMusic('Piano');
    expect(musicMock.src).toBe('/audio/music/piano.mp3');

    // Switching back to the same custom URL a second time is a no-op (src untouched) since it's unchanged.
    engine.setMusic('Piano');
    expect(musicMock.src).toBe('/audio/music/piano.mp3');
  });

  it('setMusicUrl(null) clears the music source', () => {
    const engine = createAudioEngine();
    engine.setMusicUrl('blob:http://localhost/custom');
    engine.setMusicUrl(null);

    const audioCalls = (window.Audio as any).mock.results;
    const musicMock = audioCalls[1].value;
    expect(musicMock.src).toBe('');
  });

  it('setMusicUrl only calls play when playing and a non-null url is given', () => {
    const engine = createAudioEngine();
    engine.play();
    const audioCalls = (window.Audio as any).mock.results;
    const musicMock = audioCalls[1].value;
    musicMock.play.mockClear();

    engine.setMusicUrl('blob:http://localhost/custom');
    expect(musicMock.play).toHaveBeenCalled();

    musicMock.play.mockClear();
    engine.setMusicUrl(null);
    expect(musicMock.play).not.toHaveBeenCalled();
  });
});
