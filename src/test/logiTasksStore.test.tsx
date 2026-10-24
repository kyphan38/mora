import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { setLogiTickHandler, useStore } from '../store/useStore';
import { logiTaskId, type LogiRoutine } from '../core/logiTasks';
import { TaskList } from '../ui/TaskList';

const DAY = '2026-10-24';
const routine: LogiRoutine = {
  date: DAY,
  items: [
    { id: 'a', text: 'Read', group: 'Morning', minutes: 50, category: 'learn', done: false },
    { id: 'b', text: 'Gym', group: 'Evening', minutes: 90, category: 'fitness', done: false },
  ],
};

beforeEach(() => useStore.setState(useStore.getInitialState()));
afterEach(() => setLogiTickHandler(null));

describe('logi tasks in the store', () => {
  it('a planned length can be typed at the end of a name', () => {
    useStore.getState().addTask('Write 25m');
    useStore.getState().addTask('Run 1.5h');
    useStore.getState().addTask('Read 3 chapters');
    expect(useStore.getState().tasks.map((t) => [t.name, t.min])).toEqual([
      ['Write', 25],
      ['Run', 90],
      ['Read 3 chapters', undefined],
    ]);
  });

  it('ticks on logi tasks are sent; own tasks are not', () => {
    const sent = vi.fn();
    setLogiTickHandler(sent);
    useStore.getState().addTask('Own');
    useStore.getState().applyLogiRoutine(routine);
    useStore.getState().toggleTask(useStore.getState().tasks[0].id);
    useStore.getState().toggleTask(logiTaskId(DAY, 'a'));
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0][0]).toMatchObject({ done: true, logi: { itemId: 'a' } });
  });

  it('removing or clearing a logi task hides it for today; undo brings it back', () => {
    useStore.getState().applyLogiRoutine(routine);
    const a = useStore.getState().tasks[0];
    useStore.getState().removeTask(a.id);
    useStore.getState().applyLogiRoutine(routine);
    expect(useStore.getState().tasks.map((t) => t.name)).toEqual(['Gym']);
    useStore.getState().restoreTask(a, 0);
    expect(useStore.getState().logiHidden).toEqual([]);

    useStore.getState().toggleTask(logiTaskId(DAY, 'b'));
    useStore.getState().clearCompletedTasks();
    useStore.getState().applyLogiRoutine({ ...routine, items: routine.items.map((i) => ({ ...i, done: i.id === 'b' })) });
    expect(useStore.getState().tasks.map((t) => t.name)).toEqual(['Read']);
  });

  it('startTask moves the task first and sets the clock to its length', () => {
    useStore.getState().addTask('Own');
    useStore.getState().applyLogiRoutine(routine);
    useStore.getState().startTask(logiTaskId(DAY, 'b'));
    expect(useStore.getState().tasks[0].name).toBe('Gym');
    expect(useStore.getState().setup.durationSec).toBe(90 * 60);
  });
});

describe('task sheet', () => {
  it('shows progress, planned time and where a task came from', () => {
    useStore.getState().addTask('Own');
    useStore.getState().applyLogiRoutine(routine);
    useStore.getState().toggleTask(useStore.getState().tasks[0].id);
    render(<TaskList />);
    expect(screen.getByTestId('task-summary').textContent).toContain('1 of 3 done');
    expect(screen.getByLabelText('Planned time left').textContent).toBe('2h 20m left');
    expect(screen.getByTestId('task-progress').style.transform).toBe(`scaleX(${1 / 3})`);
    expect(screen.getAllByTestId('task-meta').map((m) => m.textContent)).toEqual([
      'learn',
      'now learn · 50m · logi · Morning',
      'fitness · 1h 30m · logi · Evening',
    ]);
  });

  it('start calls back while the clock waits, and hides while it runs', () => {
    const onStart = vi.fn();
    useStore.getState().applyLogiRoutine(routine);
    const { rerender } = render(<TaskList onStart={onStart} />);
    fireEvent.click(screen.getByLabelText('Start Gym'));
    expect(onStart).toHaveBeenCalledWith(logiTaskId(DAY, 'b'));
    act(() => useStore.setState({ isRunning: true }));
    rerender(<TaskList onStart={onStart} />);
    expect(screen.queryByLabelText('Start Gym')).toBeNull();
  });
});
