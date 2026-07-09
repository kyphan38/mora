import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import Room from '../screens/Room';
import { useStore } from '../store/useStore';
import { sceneVideoUrl } from '../data/sceneManifest';

describe('Room immersive scene tests', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
  });

  it('sceneVideoUrl maps corner IDs to mp4 files', () => {
    expect(sceneVideoUrl('autumn-lakeside-cabin')).toBe('/scenes/autumn-lakeside-cabin.mp4');
    expect(sceneVideoUrl('alpine-morning-desk')).toBe('/scenes/alpine-morning-desk.mp4');
  });

  it('renders Room in scene mode with correct elements', () => {
    useStore.setState({
      screen: 'room',
      roomBackground: 'scene',
      tasks: [{ id: 't1', name: 'Task 1', done: false, createdAt: Date.now() }],
      corner: {
        id: 'autumn-forest-cabin',
        name: 'Autumn Forest Cabin',
        description: '',
        ambient: 'Fireplace',
        gradient: 'linear-gradient(to bottom, #748158, #3b422e)'
      }
    });

    const { getByTestId } = render(<Room />);

    const bg = getByTestId('room-scene-bg');
    expect(bg).toBeDefined();

    const baseImg = bg.firstChild as HTMLElement;
    expect(baseImg.style.backgroundImage).toContain('scenes/autumn-forest-cabin.jpg');
    expect(baseImg.style.backgroundImage).toContain('linear-gradient');

    const video = getByTestId('scene-video') as HTMLVideoElement;
    expect(video).toBeDefined();
    const source = video.querySelector('source') as HTMLSourceElement;
    expect(source.src).toContain('/scenes/autumn-forest-cabin.mp4');

    // Verify button container has high zIndex (20) so it layers above transparent nav bar
    const bgToggle = getByTestId('room-bg-toggle');
    const togglesContainer = bgToggle.parentElement as HTMLElement;
    expect(togglesContainer.style.zIndex).toBe('20');
  });

  it('sets data-scene="true" on app root in scene mode and removes it in color mode', () => {
    useStore.setState({
      screen: 'room',
      roomBackground: 'scene',
      tasks: [{ id: 't1', name: 'Task 1', done: false, createdAt: Date.now() }],
      corner: {
        id: 'autumn-forest-cabin',
        name: 'Autumn Forest Cabin',
        description: '',
        ambient: 'Fireplace',
        gradient: 'linear-gradient(to bottom, #748158, #3b422e)'
      }
    });

    const { container, getByText } = render(<App />);

    const appRoot = container.firstChild as HTMLElement;
    expect(appRoot.getAttribute('data-scene')).toBe('true');

    const colorBtn = getByText('Color');
    fireEvent.click(colorBtn);

    expect(appRoot.getAttribute('data-scene')).toBeNull();
  });

  it('toggles Tasks panel display in scene mode', () => {
    useStore.setState({
      screen: 'room',
      roomBackground: 'scene',
      tasks: [{ id: 't1', name: 'Task 1', done: false, createdAt: Date.now() }],
      corner: {
        id: 'autumn-forest-cabin',
        name: 'Autumn Forest Cabin',
        description: '',
        ambient: 'Fireplace',
        gradient: 'linear-gradient(to bottom, #748158, #3b422e)'
      }
    });

    const { queryByText, getByText } = render(<Room />);

    // By default, the tasks side panel header is visible
    expect(getByText('Tasks · sessions')).toBeDefined();

    // Click Hide Tasks
    const hideBtn = getByText('Hide Tasks');
    fireEvent.click(hideBtn);

    // Bảng nhiệm vụ biến mất
    expect(queryByText('Tasks · sessions')).toBeNull();
    expect(getByText('Tasks')).toBeDefined();

    // Click Tasks to show it again
    const showBtn = getByText('Tasks');
    fireEvent.click(showBtn);
    expect(getByText('Tasks · sessions')).toBeDefined();
  });
});
