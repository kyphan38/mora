import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import Room from '../screens/Room';
import { useStore } from '../store/useStore';
import { toPersisted } from '../lib/persistence';

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

  it('toggling background option changes Room UI', () => {
    const { getByTestId, getByText } = render(<Room />);

    const mainPanel = getByTestId('room-main');
    const timerCard = getByTestId('room-timer-card');

    // Default style: Color mode (no background image, no glass class)
    expect(mainPanel.style.backgroundImage).toBe('');
    expect(timerCard.className).not.toBe('glass');

    // Click "Scene" button
    const sceneBtn = getByText('Scene');
    fireEvent.click(sceneBtn);

    // Verify store changed
    expect(useStore.getState().roomBackground).toBe('scene');

    // Verify UI updated to Scene mode
    expect(mainPanel.style.backgroundImage).toContain('scenes/da-lat-misty-dawn.jpg');
    expect(mainPanel.style.backgroundImage).toContain('linear-gradient');
    expect(timerCard.className).toBe('glass');

    // Click "Color" button
    const colorBtn = getByText('Color');
    fireEvent.click(colorBtn);

    // Verify UI restored
    expect(useStore.getState().roomBackground).toBe('color');
    expect(mainPanel.style.backgroundImage).toBe('');
    expect(timerCard.className).not.toBe('glass');
  });

  it('persistence includes roomBackground', () => {
    const state = useStore.getState();
    const p = toPersisted(state);
    expect(p.roomBackground).toBe('color');
  });
});
