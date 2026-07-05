import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';
import { Stepper } from '../components/Stepper';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('Corner screen', () => {
  beforeEach(() => {
    useStore.getState().setScreen('corner');
  });

  it('renders all corners', () => {
    render(<App />);
    const names = [
      'Alpine Escapes House', 'Alpine Morning Desk', 'Autumn Cafe Italy',
      'Autumn Lakeside Cafe', 'Calm Water Cabin', 'Clear Water Firelight',
      'Coastal Beach Lofi', 'Countryside Morning River'
    ];
    names.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('heading text is exactly "Choose a focus corner" with subtitle', () => {
    render(<App />);
    expect(screen.getByText('Choose a focus corner')).toBeInTheDocument();
    expect(screen.getByText('Choose the space that fits today\'s state.')).toBeInTheDocument();
  });

  it('clicking a corner sets store.corner and stays on corner screen', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Alpine Morning Desk'));
    expect(useStore.getState().corner?.name).toBe('Alpine Morning Desk');
    expect(useStore.getState().screen).toBe('corner');
  });

  it('selecting a corner does not override ambient', () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByText('Alpine Morning Desk'));
    // Ambient stays at default, not overridden by corner.ambient
    expect(useStore.getState().sound.ambient).toBe('Wind');
    unmount();

    // Select a different corner - ambient should remain unchanged
    useStore.getState().setScreen('corner');
    render(<App />);
    fireEvent.click(screen.getByText('Autumn Cafe Italy'));
    expect(useStore.getState().sound.ambient).toBe('Wind');
  });
});

describe('Sound screen', () => {
  beforeEach(() => {
    useStore.getState().setScreen('sound');
  });

  it('renders 12 ambient chips and 6 music styles', () => {
    render(<App />);
    const ambients = ['City Walk','Snowfall','Rain on Window','Cafe Ambience','Fireplace','Forest Night','City Terrace Night','Winter Wind','Waves','Wind','Room Tone','Rain'];
    ambients.forEach((a) => {
      // Some names may appear in summary too, so use getAllByText
      expect(screen.getAllByText(a).length).toBeGreaterThanOrEqual(1);
    });
    const styles = ['Lo-fi','Piano','Deep Focus','Synthwave','Nature','Ambient'];
    styles.forEach((s) => {
      expect(screen.getAllByText(s).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('selecting an ambient chip updates store', () => {
    render(<App />);
    fireEvent.click(screen.getByText('City Walk'));
    expect(useStore.getState().sound.ambient).toBe('City Walk');
  });

  it('selecting a music style updates store', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Lo-fi'));
    expect(useStore.getState().sound.musicStyle).toBe('Lo-fi');
  });

  it('default selections are Wind and Nature', () => {
    render(<App />);
    // Wind and Nature may appear in multiple places (chip + summary)
    expect(screen.getAllByText('Wind').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Nature').length).toBeGreaterThanOrEqual(1);
    expect(useStore.getState().sound.ambient).toBe('Wind');
    expect(useStore.getState().sound.musicStyle).toBe('Nature');
  });

  it('preset hint reflects chosen corner', () => {
    // Set a corner first
    const corner = { id: 'rainy-night-cafe', name: 'Rainy Night Cafe', description: '', ambient: 'Cafe Ambience', gradient: '' };
    useStore.getState().setCorner(corner);
    useStore.getState().setScreen('sound');
    render(<App />);
    expect(screen.getByText('Rainy Night Cafe pairs with Cafe Ambience.')).toBeInTheDocument();
  });
});

describe('Session screen', () => {
  beforeEach(() => {
    useStore.getState().setScreen('session');
  });

  it('duration selection updates setup', () => {
    render(<App />);
    fireEvent.click(screen.getByText('25 min'));
    expect(useStore.getState().setup.durationLabel).toBe('25 min');
    expect(useStore.getState().setup.durationSec).toBe(1500);

    fireEvent.click(screen.getByText('Count Up'));
    expect(useStore.getState().setup.durationSec).toBe(0);
  });

  it('add task appears and updates store', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a task…');
    fireEvent.change(input, { target: { value: 'Read chapter 5' } });
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Read chapter 5')).toBeInTheDocument();
    expect(useStore.getState().tasks.length).toBe(1);
  });

  it('remove task works', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a task…');
    fireEvent.change(input, { target: { value: 'Temp task' } });
    fireEvent.click(screen.getByText('Add'));
    expect(useStore.getState().tasks.length).toBe(1);
    fireEvent.click(screen.getByLabelText('Remove Temp task'));
    expect(useStore.getState().tasks.length).toBe(0);
  });

  it('Start focus disabled with 0 tasks, enabled with ≥1', () => {
    render(<App />);
    const startBtn = screen.getByText('Start focus');
    expect(startBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('Add a task…');
    fireEvent.change(input, { target: { value: 'A task' } });
    fireEvent.click(screen.getByText('Add'));
    expect(startBtn).not.toBeDisabled();
  });

  it('Start focus navigates to room', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a task…');
    fireEvent.change(input, { target: { value: 'Focus task' } });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Start focus'));
    expect(useStore.getState().screen).toBe('room');
  });
});

describe('Stepper', () => {
  it('step=2 marks step 1 done and step 2 active', () => {
    render(<Stepper step={2} />);
    const badge1 = screen.getByTestId('step-badge-1');
    const badge2 = screen.getByTestId('step-badge-2');
    const badge3 = screen.getByTestId('step-badge-3');
    expect(badge1.getAttribute('data-step-state')).toBe('done');
    expect(badge1.textContent).toBe('✓');
    expect(badge2.getAttribute('data-step-state')).toBe('active');
    expect(badge2.textContent).toBe('2');
    expect(badge3.getAttribute('data-step-state')).toBe('upcoming');
  });
});

describe('Anti-regression', () => {
  it('no "Sign in" or "EN" text on Corner/Sound/Session', () => {
    for (const s of ['corner', 'sound', 'session'] as const) {
      useStore.getState().setScreen(s);
      const { unmount } = render(<App />);
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
      expect(screen.queryByText('EN')).not.toBeInTheDocument();
      unmount();
    }
  });
});
