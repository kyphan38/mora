import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { TaskList } from '../ui/TaskList';
import { FocusView } from '../ui/FocusView';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('task strike', () => {
  it('draws the line when a task is ticked', () => {
    useStore.getState().addTask('Write');
    render(<TaskList />);
    const strike = screen.getByTestId('strike');
    expect(strike.getAttribute('data-on')).toBe('false');
    fireEvent.click(screen.getByLabelText('Toggle Write'));
    expect(screen.getByTestId('strike').getAttribute('data-on')).toBe('true');
    expect(screen.getByTestId('strike').getAttribute('data-instant')).toBe('false');
    expect(screen.getByText('Write').className).not.toContain('line-through');
  });

  it('shows a finished task already struck, without animation', () => {
    useStore.getState().addTask('Done one');
    useStore.getState().toggleTask(useStore.getState().tasks[0].id);
    render(<TaskList />);
    const strike = screen.getByTestId('strike');
    expect(strike.getAttribute('data-on')).toBe('true');
    expect(strike.getAttribute('data-instant')).toBe('true');
  });
});

describe('ring settle', () => {
  it('ripples once when a focus block ends', () => {
    useStore.getState().addTask('Task A');
    render(<FocusView />);
    expect(screen.queryByTestId('ring-settle')).toBeNull();
    useStore.getState().startFocus();
    useStore.getState().setIsRunning(true);
    act(() => useStore.getState().enterReview());
    expect(useStore.getState().phase).toBe('review');
    expect(screen.getByTestId('ring-settle')).toBeInTheDocument();
  });
});
