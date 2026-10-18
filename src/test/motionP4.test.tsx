import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { CORNERS } from '../data/corners';
import { FocusView } from '../ui/FocusView';
import { TaskList } from '../ui/TaskList';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

const pt = (x: number, y = 0) => ({ button: 0, pointerId: 1, clientX: x, clientY: y });
function swipe(el: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(el, pt(from));
  fireEvent.pointerMove(el, pt((from + to) / 2));
  fireEvent.pointerMove(el, pt(to));
  fireEvent.pointerUp(el, pt(to));
}

describe('restoreTask', () => {
  it('puts a removed task back at its place', () => {
    const st = () => useStore.getState();
    ['A', 'B', 'C'].forEach((n) => st().addTask(n));
    const b = st().tasks[1];
    st().removeTask(b.id);
    st().restoreTask(b, 1);
    expect(st().tasks.map((t) => t.name)).toEqual(['A', 'B', 'C']);
    st().restoreTask(b, 0);
    expect(st().tasks).toHaveLength(3);
  });
});

describe('scene swipe', () => {
  function seed() {
    useStore.getState().addTask('Task A');
    useStore.getState().setCorner(CORNERS[0]);
    useStore.getState().setRoomBackground('scene');
  }

  it('swipe left goes to the next scene, right to the previous', () => {
    seed();
    render(<FocusView />);
    const card = screen.getByTestId('room-timer-card');
    swipe(card, 200, 100);
    expect(useStore.getState().corner?.id).toBe(CORNERS[1].id);
    swipe(card, 100, 200);
    expect(useStore.getState().corner?.id).toBe(CORNERS[0].id);
  });

  it('a short swipe does nothing; ] and [ step with the keyboard', () => {
    seed();
    render(<FocusView />);
    swipe(screen.getByTestId('room-timer-card'), 200, 170);
    expect(useStore.getState().corner?.id).toBe(CORNERS[0].id);
    fireEvent.keyDown(window, { key: ']' });
    expect(useStore.getState().corner?.id).toBe(CORNERS[1].id);
    fireEvent.keyDown(window, { key: '[' });
    expect(useStore.getState().corner?.id).toBe(CORNERS[0].id);
  });

  it('does nothing without a scene background', () => {
    useStore.getState().addTask('Task A');
    useStore.getState().setCorner(CORNERS[0]);
    useStore.getState().setRoomBackground('color');
    render(<FocusView />);
    fireEvent.keyDown(window, { key: ']' });
    expect(useStore.getState().corner?.id).toBe(CORNERS[0].id);
  });
});

describe('last minute', () => {
  const run = (elapsedSec: number) => {
    useStore.getState().addTask('Task A');
    useStore.setState({
      setup: { durationLabel: '2 min', durationSec: 120 },
      elapsedSec,
      isRunning: true,
      sessionActive: true,
    });
    render(<FocusView />);
    return screen.getByTestId('ring-progress').getAttribute('stroke-width');
  };

  it('thickens the arc in the last 60 seconds', () => {
    expect(run(70)).toBe('1.4');
  });

  it('keeps it thin before that', () => {
    expect(run(30)).toBe('0.9');
  });
});

describe('swipe a task row', () => {
  const rowOf = (name: string) => screen.getByText(name).closest('.touch-pan-y') as HTMLElement;

  it('right = done, left = delete with undo', () => {
    ['A', 'B', 'C'].forEach((n) => useStore.getState().addTask(n));
    render(<TaskList />);
    swipe(rowOf('A'), 0, 100);
    expect(useStore.getState().tasks[0].done).toBe(true);

    swipe(rowOf('B'), 100, 0);
    expect(useStore.getState().tasks.map((t) => t.name)).toEqual(['A', 'C']);
    fireEvent.click(screen.getByRole('button', { name: 'undo' }));
    expect(useStore.getState().tasks.map((t) => t.name)).toEqual(['A', 'B', 'C']);
  });

  it('a short drag or a vertical drag does nothing', () => {
    useStore.getState().addTask('A');
    render(<TaskList />);
    swipe(rowOf('A'), 0, 40);
    fireEvent.pointerDown(rowOf('A'), pt(0, 0));
    fireEvent.pointerMove(rowOf('A'), pt(10, 90));
    fireEvent.pointerUp(rowOf('A'), pt(100, 90));
    expect(useStore.getState().tasks[0].done).toBe(false);
  });
});
