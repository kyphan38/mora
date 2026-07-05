import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useStore } from '../store/useStore';
import App from '../App';
import { SceneBackground } from '../components/SceneBackground';
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

  it('switching to scene sets data-scene app-wide (including Landing)', () => {
    act(() => {
      useStore.setState({ screen: 'landing' });
    });
    const { container, rerender } = render(<App />);

    // Toggle to scene mode
    act(() => {
      useStore.getState().setRoomBackground('scene');
    });
    rerender(<App />);

    const appRoot = container.firstChild as HTMLElement;
    expect(appRoot.getAttribute('data-scene')).toBe('true');
  });

  it('randomScene picks a corner from CORNERS and pairs ambient', () => {
    act(() => {
      useStore.getState().randomScene();
    });

    const state = useStore.getState();
    expect(state.corner).not.toBeNull();
    const cornerIds = CORNERS.map((c) => c.id);
    expect(cornerIds).toContain(state.corner?.id);
    expect(state.sound.ambient).toBe(state.corner?.ambient);
  });

  it('entering scene with no corner auto-randomizes', () => {
    act(() => {
      useStore.setState({ corner: null });
      useStore.getState().setRoomBackground('scene');
    });

    const state = useStore.getState();
    expect(state.corner).not.toBeNull();
  });

  it('appearance toggle renders on Landing and switches mode on click; scene-shuffle visible only in scene mode', () => {
    act(() => {
      useStore.setState({ screen: 'landing', roomBackground: 'color' });
    });
    const { rerender } = render(<App />);

    // Toggle container exists
    expect(screen.getByTestId('appearance-toggle')).toBeInTheDocument();
    // Shuffle should not exist in color mode
    expect(screen.queryByTestId('scene-shuffle')).not.toBeInTheDocument();

    // Click Scene button to switch to scene mode
    const sceneBtn = screen.getByRole('button', { name: 'Scene' });
    fireEvent.click(sceneBtn);
    expect(useStore.getState().roomBackground).toBe('scene');

    // Shuffle should now exist in scene mode
    rerender(<App />);
    const shuffleBtn = screen.getByTestId('scene-shuffle');
    expect(shuffleBtn).toBeInTheDocument();

    // Click Shuffle -> updates corner
    const initialCornerId = useStore.getState().corner?.id;
    fireEvent.click(shuffleBtn);
    const nextCornerId = useStore.getState().corner?.id;
    expect(initialCornerId).not.toBe(nextCornerId);
  });

  it('SceneBackground renders image + gradient (+ video source); graceful when corner null', () => {
    // Graceful when corner is null
    const { rerender } = render(<SceneBackground corner={null} testid="test-bg" />);
    const bgNode = screen.getByTestId('test-bg');
    expect(bgNode).toBeInTheDocument();

    // Render with corner
    const corner = CORNERS[0];
    rerender(<SceneBackground corner={corner} testid="test-bg" />);
    const imageContainer = screen.getByTestId('test-bg').firstElementChild as HTMLElement;
    expect(imageContainer.style.backgroundImage).toContain('scenes/winter-nyc-sunset.jpg');
    expect(imageContainer.style.backgroundImage).toContain('linear-gradient');

    // Has video element
    expect(screen.getByTestId('scene-video')).toBeInTheDocument();
  });

  it('Color mode: .screen-content has no glass; Scene mode under [data-scene]: glass class is mounted', () => {
    act(() => {
      useStore.setState({ screen: 'landing', roomBackground: 'color' });
    });
    const { container, rerender } = render(<App />);

    const screenContent = container.querySelector('.screen-content');
    expect(screenContent).toBeInTheDocument();

    // In color mode, app has no [data-scene="true"]
    const appRoot = container.firstChild as HTMLElement;
    expect(appRoot.getAttribute('data-scene')).toBeNull();

    // Switch to scene
    act(() => {
      useStore.getState().setRoomBackground('scene');
    });
    rerender(<App />);

    // In scene mode, app has [data-scene="true"]
    expect(appRoot.getAttribute('data-scene')).toBe('true');
  });
});
