import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStore } from '../store/useStore';
import Room from '../screens/Room';

describe('Room settings panel', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
    // Seed at least one task so Room can render properly
    useStore.setState({
      tasks: [{ id: 't1', name: 'Focus Task', done: false, createdAt: 1000 }],
      activeTaskId: 't1',
    });
  });

  it('open/close settings panel toggle works', () => {
    render(<Room />);

    // Panel is initially hidden
    expect(screen.queryByTestId('room-settings-panel')).not.toBeInTheDocument();

    // Toggle button opens the panel
    const toggleBtn = screen.getByTestId('room-settings-toggle');
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('room-settings-panel')).toBeInTheDocument();

    // Close button closes the panel
    const closeBtn = screen.getByLabelText('Close settings');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('room-settings-panel')).not.toBeInTheDocument();
  });

  it('changing ambient sound in panel updates store', () => {
    render(<Room />);

    // Open settings panel
    fireEvent.click(screen.getByTestId('room-settings-toggle'));

    // Find and click an ambient sound button (e.g. Fireplace)
    const fireplaceBtn = screen.getByRole('button', { name: 'Fireplace' });
    fireEvent.click(fireplaceBtn);

    expect(useStore.getState().sound.ambient).toBe('Fireplace');
  });

  it('changing music style in panel updates store', () => {
    render(<Room />);

    // Open settings panel
    fireEvent.click(screen.getByTestId('room-settings-toggle'));

    // Find and click a music style button (e.g. Piano)
    const pianoBtn = screen.getByRole('button', { name: 'Piano' });
    fireEvent.click(pianoBtn);

    expect(useStore.getState().sound.musicStyle).toBe('Piano');
  });

  it('volume sliders in panel update store', () => {
    render(<Room />);

    // Open settings panel
    fireEvent.click(screen.getByTestId('room-settings-toggle'));

    // Find and change Ambient volume slider
    const ambientSlider = screen.getByLabelText('Ambient volume');
    fireEvent.change(ambientSlider, { target: { value: '75' } });
    expect(useStore.getState().sound.ambientVolume).toBe(75);

    // Find and change Music volume slider
    const musicSlider = screen.getByLabelText('Music volume');
    fireEvent.change(musicSlider, { target: { value: '45' } });
    expect(useStore.getState().sound.musicVolume).toBe(45);
  });

  it('changing scene in room updates corner + background', () => {
    // Set background to scene mode first
    useStore.setState({ roomBackground: 'scene' });

    render(<Room />);

    // Open settings panel
    fireEvent.click(screen.getByTestId('room-settings-toggle'));

    // Find and click Beautiful Courtyard Jazz scene item
    const sceneBtn = screen.getByRole('button', { name: /Beautiful Courtyard Jazz/ });
    fireEvent.click(sceneBtn);

    // Assert store corner updated
    expect(useStore.getState().corner?.id).toBe('scene_d5aa07');
    expect(useStore.getState().corner?.name).toBe('Beautiful Courtyard Jazz');

    // Assert background image updated in UI
    const roomMain = screen.getByTestId('room-main');
    expect(roomMain.style.backgroundImage).toContain('scene_d5aa07');
  });
});
