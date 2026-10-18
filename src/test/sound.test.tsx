import { describe, it, expect } from 'vitest';
import { createAudioEngine } from '../platform/audio';
import { createNotifyBridge } from '../platform/notify';

describe('audio engine and notify bridge off-Tauri', () => {
  it('noop engine safe', () => {
    // createAudioEngine returns noopAudioEngine in jsdom context since Audio is mock/unsupported
    const engine = createAudioEngine();
    expect(() => engine.setAmbient('Wind')).not.toThrow();
    expect(() => engine.setMusic('Nature')).not.toThrow();
    expect(() => engine.setAmbientVolume(0.5)).not.toThrow();
    expect(() => engine.setMusicVolume(0.2)).not.toThrow();
    expect(() => engine.play()).not.toThrow();
    expect(() => engine.pause()).not.toThrow();
    expect(() => engine.chime()).not.toThrow();
    expect(() => engine.dispose()).not.toThrow();
  });

  it('createNotifyBridge off-Tauri without permission', async () => {
    const notify = createNotifyBridge();
    await expect(notify.notify('title', 'body')).resolves.not.toThrow();
  });
});
