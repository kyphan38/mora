import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';
import { toPersisted } from '../platform/persistence';

describe('Room background option tests', () => {
  beforeEach(() => {
    // Reset state
    const state = useStore.getState();
    act(() => {
      state.setRoomBackground('color');
    });
    useStore.setState({
      tasks: [{ id: 't1', name: 'Coding Task', done: false, createdAt: Date.now() }],
      corner: {
        id: 'da-lat-misty-dawn',
        name: 'Da Lat Misty Dawn',
        description: 'misty',
        ambient: 'Wind',
        gradient: 'linear-gradient(to bottom, #748158, #3b422e)'
      },
    });
  });

  it('default roomBackground is color', () => {
    expect(useStore.getState().roomBackground).toBe('color');
  });

  it('setRoomBackground("scene") updates store', () => {
    act(() => {
      useStore.getState().setRoomBackground('scene');
    });
    expect(useStore.getState().roomBackground).toBe('scene');
  });

  it('persistence includes roomBackground', () => {
    const state = useStore.getState();
    const p = toPersisted(state);
    expect(p.roomBackground).toBe('color');
  });
});
