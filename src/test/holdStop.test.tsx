import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { FocusView } from '../ui/FocusView';

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState(useStore.getInitialState());
  useStore.getState().addTask('Task A');
  useStore.getState().startFocus();
  useStore.getState().setIsRunning(true);
});

afterEach(() => {
  vi.useRealTimers();
});

const down = (el: HTMLElement) => fireEvent.pointerDown(el, { button: 0, pointerId: 1 });

describe('hold to stop', () => {
  it('stops after holding 800ms', () => {
    render(<FocusView />);
    down(screen.getByRole('button', { name: 'Stop' }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(useStore.getState().sessionActive).toBe(false);
  });

  it('a quick tap does not stop and shows the hint', () => {
    render(<FocusView />);
    const stop = screen.getByRole('button', { name: 'Stop' });
    down(stop);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(stop, { button: 0, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useStore.getState().sessionActive).toBe(true);
    expect(screen.getByText('hold')).toBeInTheDocument();
  });

  it('leaving the button cancels without a hint', () => {
    render(<FocusView />);
    const stop = screen.getByRole('button', { name: 'Stop' });
    down(stop);
    fireEvent.pointerLeave(stop);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useStore.getState().sessionActive).toBe(true);
    expect(screen.queryByText('hold')).toBeNull();
  });

  it('a keyboard click stops at once', () => {
    render(<FocusView />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(useStore.getState().sessionActive).toBe(false);
  });

  it('a mouse click alone does not stop', () => {
    render(<FocusView />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }), { detail: 1 });
    expect(useStore.getState().sessionActive).toBe(true);
  });
});
