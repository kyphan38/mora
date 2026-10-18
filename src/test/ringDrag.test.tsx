import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { FocusView } from '../ui/FocusView';
import { minutesAt, nextDragMinutes } from '../ui/Ring';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('minutesAt', () => {
  it('reads 0 at the top, then clockwise', () => {
    expect(minutesAt(100, 0, 100, 100)).toBe(0);
    expect(minutesAt(200, 100, 100, 100)).toBe(30);
    expect(minutesAt(100, 200, 100, 100)).toBe(60);
    expect(minutesAt(0, 100, 100, 100)).toBe(90);
  });
});

describe('nextDragMinutes', () => {
  it('does not jump across the top', () => {
    expect(nextDragMinutes(115, 5)).toBe(120);
    expect(nextDragMinutes(10, 110)).toBe(5);
    expect(nextDragMinutes(40, 45)).toBe(45);
  });
});

describe('ring slider', () => {
  it('arrow keys change the minutes by 5', () => {
    useStore.getState().addTask('Task A');
    render(<FocusView />);
    const before = useStore.getState().setup.durationSec;
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Focus minutes' }), { key: 'ArrowRight' });
    expect(useStore.getState().setup.durationSec).toBe(before + 300);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
    expect(useStore.getState().setup.durationSec).toBe(before);
  });

  it('drags on the band but not in the middle', () => {
    useStore.getState().addTask('Task A');
    render(<FocusView />);
    const slider = screen.getByRole('slider');
    slider.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON() {} });
    const pt = { button: 0, pointerId: 1 };
    // Middle: ignored.
    fireEvent.pointerDown(slider, { ...pt, clientX: 100, clientY: 90 });
    expect(screen.getByTestId('ring-handle').getAttribute('r')).toBe('1.4');
    // Right edge of the band = 30 minutes.
    fireEvent.pointerDown(slider, { ...pt, clientX: 197, clientY: 100 });
    expect(useStore.getState().setup.durationSec).toBe(30 * 60);
    expect(screen.getByTestId('ring-handle').getAttribute('r')).toBe('2.2');
    // Bottom = 60 minutes.
    fireEvent.pointerMove(slider, { ...pt, clientX: 100, clientY: 197 });
    expect(useStore.getState().setup.durationSec).toBe(60 * 60);
    fireEvent.pointerUp(slider, pt);
    expect(screen.getByTestId('ring-handle').getAttribute('r')).toBe('1.4');
  });

  it('is gone while the clock runs', () => {
    useStore.getState().addTask('Task A');
    useStore.getState().startFocus();
    useStore.getState().setIsRunning(true);
    render(<FocusView />);
    expect(screen.queryByRole('slider')).toBeNull();
  });
});
