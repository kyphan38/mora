import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('useStore', () => {
  it('initial screen is landing', () => {
    expect(useStore.getState().screen).toBe('landing');
  });

  it('setScreen updates screen', () => {
    useStore.getState().setScreen('corner');
    expect(useStore.getState().screen).toBe('corner');
  });

  it('initial sound defaults', () => {
    const { sound } = useStore.getState();
    expect(sound.ambient).toBe('Wind');
    expect(sound.musicStyle).toBe('Nature');
    expect(sound.ambientVolume).toBe(18);
    expect(sound.musicVolume).toBe(6);
    expect(sound.customTrackId).toBeNull();
  });

  it('initial customTracks is empty', () => {
    expect(useStore.getState().customTracks).toEqual([]);
  });

  it('addCustomTrack replaces any existing custom track (single slot)', () => {
    const trackA = { id: 'a', name: 'Song A.mp3', mimeType: 'audio/mpeg', size: 100, createdAt: 1 };
    const trackB = { id: 'b', name: 'Song B.mp3', mimeType: 'audio/mpeg', size: 200, createdAt: 2 };
    useStore.getState().addCustomTrack(trackA);
    expect(useStore.getState().customTracks).toEqual([trackA]);
    useStore.getState().addCustomTrack(trackB);
    expect(useStore.getState().customTracks).toEqual([trackB]);
  });

  it('selectCustomTrack sets sound.customTrackId', () => {
    useStore.getState().selectCustomTrack('track-1');
    expect(useStore.getState().sound.customTrackId).toBe('track-1');
  });

  it('removeCustomTrack clears the track and resets customTrackId only if it was active', () => {
    const track = { id: 'a', name: 'Song A.mp3', mimeType: 'audio/mpeg', size: 100, createdAt: 1 };
    useStore.getState().addCustomTrack(track);
    useStore.getState().selectCustomTrack('a');
    useStore.getState().removeCustomTrack('a');
    expect(useStore.getState().customTracks).toEqual([]);
    expect(useStore.getState().sound.customTrackId).toBeNull();
  });

  it('removeCustomTrack does not touch customTrackId when removing an inactive track', () => {
    const track = { id: 'a', name: 'Song A.mp3', mimeType: 'audio/mpeg', size: 100, createdAt: 1 };
    useStore.getState().addCustomTrack(track);
    useStore.getState().setMusicStyle('Piano');
    useStore.getState().removeCustomTrack('a');
    expect(useStore.getState().sound.customTrackId).toBeNull();
    expect(useStore.getState().sound.musicStyle).toBe('Piano');
  });

  it('initial setup is 50 min / 3000s', () => {
    const { setup } = useStore.getState();
    expect(setup.durationLabel).toBe('50 min');
    expect(setup.durationSec).toBe(3000);
  });

  it('tasks and sessions start empty', () => {
    expect(useStore.getState().tasks).toEqual([]);
    expect(useStore.getState().sessions).toEqual([]);
  });

  it('clearCompletedTasks removes completed tasks and updates activeTaskId', () => {
    useStore.setState({
      tasks: [
        { id: 't1', name: 'Task 1', done: true, createdAt: 123 },
        { id: 't2', name: 'Task 2', done: false, createdAt: 124 },
        { id: 't3', name: 'Task 3', done: true, createdAt: 125 },
      ],
      activeTaskId: 't2',
    });
    useStore.getState().clearCompletedTasks();
    const state = useStore.getState();
    expect(state.tasks).toEqual([
      { id: 't2', name: 'Task 2', done: false, createdAt: 124 },
    ]);
    expect(state.activeTaskId).toBe('t2');
  });
});
