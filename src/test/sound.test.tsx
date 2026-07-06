import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { useSound } from '../hooks/useSound';
import { useStore } from '../store/useStore';
import { type AudioEngine, createAudioEngine } from '../lib/audio';
import { type NotifyBridge, createNotifyBridge } from '../lib/notify';

class MockAudioEngine implements AudioEngine {
  setAmbient = vi.fn();
  setMusic = vi.fn();
  setMusicUrl = vi.fn();
  setAmbientVolume = vi.fn();
  setMusicVolume = vi.fn();
  play = vi.fn();
  pause = vi.fn();
  chime = vi.fn();
  dispose = vi.fn();
}

class MockNotifyBridge implements NotifyBridge {
  notify = vi.fn().mockResolvedValue(undefined);
}

function SoundHarness({
  engine,
  notify,
  expose,
}: {
  engine: AudioEngine;
  notify: NotifyBridge;
  expose: (funcs: { setRunning: (r: boolean) => void; complete: (t: string) => void }) => void;
}) {
  const { setRunning, complete } = useSound({ engine, notify });
  React.useEffect(() => {
    expose({ setRunning, complete });
  }, [setRunning, complete, expose]);
  return <div>Sound Harness</div>;
}

describe('sound engine and notify bridge wiring', () => {
  let mockEngine: MockAudioEngine;
  let mockNotify: MockNotifyBridge;
  let exposed: { setRunning: (r: boolean) => void; complete: (t: string) => void } | null = null;

  beforeEach(() => {
    mockEngine = new MockAudioEngine();
    mockNotify = new MockNotifyBridge();
    exposed = null;

    // Reset store state to default values
    const store = useStore.getState();
    store.setAmbient('Wind');
    store.setMusicStyle('Nature');
    store.setAmbientVolume(18);
    store.setMusicVolume(6);
  });

  const expose = (funcs: typeof exposed) => {
    exposed = funcs;
  };

  it('initial config applied on mount', () => {
    render(<SoundHarness engine={mockEngine} notify={mockNotify} expose={expose} />);

    expect(mockEngine.setAmbient).toHaveBeenCalledWith('Wind');
    expect(mockEngine.setMusic).toHaveBeenCalledWith('Nature');
    expect(mockEngine.setAmbientVolume).toHaveBeenCalledWith(0.18);
    expect(mockEngine.setMusicVolume).toHaveBeenCalledWith(0.06);
  });

  it('changing store.sound updates engine', async () => {
    render(<SoundHarness engine={mockEngine} notify={mockNotify} expose={expose} />);

    const store = useStore.getState();

    // Trigger state changes
    act(() => {
      store.setAmbient('Cafe Ambience');
      store.setAmbientVolume(50);
    });

    await waitFor(() => {
      expect(mockEngine.setAmbient).toHaveBeenCalledWith('Cafe Ambience');
      expect(mockEngine.setAmbientVolume).toHaveBeenCalledWith(0.5);
    });
  });

  it('setRunning play/pause controls loops', () => {
    render(<SoundHarness engine={mockEngine} notify={mockNotify} expose={expose} />);
    expect(exposed).not.toBeNull();

    exposed!.setRunning(true);
    expect(mockEngine.play).toHaveBeenCalled();

    exposed!.setRunning(false);
    expect(mockEngine.pause).toHaveBeenCalled();
  });

  it('complete("Write") triggers chime and notify', () => {
    render(<SoundHarness engine={mockEngine} notify={mockNotify} expose={expose} />);
    expect(exposed).not.toBeNull();

    exposed!.complete('Write');
    expect(mockEngine.chime).toHaveBeenCalled();
    expect(mockNotify.notify).toHaveBeenCalledWith('Session complete', 'Write · nice work');
  });

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
