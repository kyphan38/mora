import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { noopAudioEngine } from '../platform/audio';
import { useGlobalAudio } from '../hooks/useGlobalAudio';
import { useStore } from '../store/useStore';

function Harness() {
  useGlobalAudio();
  return null;
}

const st = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

afterEach(() => vi.restoreAllMocks());

describe('audio sources vs volume', () => {
  it('moving volume sliders never reloads the ambient or the music', () => {
    const setAmbient = vi.spyOn(noopAudioEngine, 'setAmbient');
    const setMusic = vi.spyOn(noopAudioEngine, 'setMusic');
    const setMusicUrl = vi.spyOn(noopAudioEngine, 'setMusicUrl');
    const setMusicVolume = vi.spyOn(noopAudioEngine, 'setMusicVolume');
    render(<Harness />);
    const loads = setAmbient.mock.calls.length + setMusic.mock.calls.length + setMusicUrl.mock.calls.length;
    act(() => {
      st().setAmbientVolume(40);
      st().setMusicVolume(25);
      st().setMusicVolume(26);
    });
    expect(setAmbient.mock.calls.length + setMusic.mock.calls.length + setMusicUrl.mock.calls.length).toBe(loads);
    expect(setMusicVolume).toHaveBeenLastCalledWith(0.26);
  });

  it('a cloud track is not reloaded by volume or by an unrelated tracks update', () => {
    const setMusicUrl = vi.spyOn(noopAudioEngine, 'setMusicUrl');
    const track = { id: 't', name: 'T', url: 'https://x/t.mp3', path: 'p', mimeType: 'audio/mpeg', size: 1, createdAt: 1 };
    useStore.setState({ userTracks: [track], sound: { ...st().sound, customTrackId: 't' } });
    render(<Harness />);
    expect(setMusicUrl).toHaveBeenCalledTimes(1);
    act(() => {
      st().setMusicVolume(50);
      useStore.setState({ userTracks: [{ ...track }, { ...track, id: 'other', url: 'https://x/o.mp3' }] });
    });
    expect(setMusicUrl).toHaveBeenCalledTimes(1);
  });

  it('changing the ambient or the style does load the new one', () => {
    const setAmbient = vi.spyOn(noopAudioEngine, 'setAmbient');
    const setMusic = vi.spyOn(noopAudioEngine, 'setMusic');
    render(<Harness />);
    act(() => {
      st().setAmbient('Rain');
      st().setMusicStyle('Piano');
    });
    expect(setAmbient).toHaveBeenLastCalledWith('Rain');
    expect(setMusic).toHaveBeenLastCalledWith('Piano');
  });
});
