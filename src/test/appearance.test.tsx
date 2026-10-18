import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useStore } from '../store/useStore';
import App from '../App';
import { CORNERS } from '../data/corners';

describe('Global appearance & scene mode', () => {
  beforeEach(() => {
    act(() => {
      useStore.setState(useStore.getInitialState());
    });
  });

  it('default roomBackground is color and app root has no data-scene', () => {
    const { container } = render(<App />);
    const appRoot = container.firstChild as HTMLElement;
    expect(useStore.getState().roomBackground).toBe('color');
    expect(appRoot.getAttribute('data-scene')).toBeNull();
  });

  it('scene mode sets data-scene in the Room only', () => {
    const { container, rerender } = render(<App />);

    // Toggle to scene mode
    act(() => {
      useStore.getState().setRoomBackground('scene');
    });
    rerender(<App />);

    const appRoot = container.firstChild as HTMLElement;
    expect(appRoot.getAttribute('data-scene')).toBe('true');

    act(() => {
      useStore.getState().setScreen('history');
    });
    expect(appRoot.getAttribute('data-scene')).toBeNull();
  });

  it('randomScene picks a corner from CORNERS and pairs ambient', () => {
    act(() => {
      useStore.getState().randomScene();
    });

    const state = useStore.getState();
    expect(state.corner).not.toBeNull();
    const cornerIds = CORNERS.map((c) => c.id);
    expect(cornerIds).toContain(state.corner?.id);
    // setCorner no longer overrides ambient, so ambient stays at default
    expect(state.sound.ambient).toBe('Wind');
  });

  it('entering scene with no corner auto-randomizes', () => {
    act(() => {
      useStore.setState({ corner: null });
      useStore.getState().setRoomBackground('scene');
    });

    const state = useStore.getState();
    expect(state.corner).not.toBeNull();
  });
});
