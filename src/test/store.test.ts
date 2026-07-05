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
});
