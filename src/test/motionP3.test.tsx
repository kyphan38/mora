import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { FocusView } from '../ui/FocusView';
import { RollingDigits } from '../ui/RollingDigits';
import { SceneLayer } from '../ui/SceneLayer';
import { formatTime } from '../core/timer';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('breath guide', () => {
  it('shows only in a break', () => {
    useStore.getState().addTask('Task A');
    const { unmount } = render(<FocusView />);
    expect(screen.queryByTestId('breath')).toBeNull();
    unmount();
    useStore.setState({ phase: 'break' });
    render(<FocusView />);
    expect(screen.getByTestId('breath')).toBeInTheDocument();
  });
});

describe('rolling digits', () => {
  it('keeps the whole time readable when it changes', () => {
    const { rerender } = render(<RollingDigits text="25:00" />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    rerender(<RollingDigits text="24:59" />);
    expect(screen.getByText('24:59')).toBeInTheDocument();
    expect(formatTime(1499)).toBe('24:59');
  });

  it('rolls a minute digit but not seconds', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { rerender, container } = render(<RollingDigits text="25:00" />);
    rerender(<RollingDigits text="24:59" />);
    // Only the units-of-minutes digit rolls (5 -> 4); seconds change at once.
    expect(container.querySelectorAll('.digit-out')).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelectorAll('.digit-out')).toHaveLength(0);
  });
});

describe('scene layer', () => {
  it('renders without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(
      <SceneLayer
        corner={{ id: 'a', name: 'A', description: '', ambient: '', gradient: 'linear-gradient(#000,#111)' }}
        visible
      />,
    );
    expect(screen.getByTestId('room-scene-bg')).toBeInTheDocument();
  });
});
