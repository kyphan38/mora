import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { FocusView } from '../ui/FocusView';
import { taskToDoc, tasksFromDocs } from '../core/syncModel';

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState(useStore.getInitialState());
  useStore.getState().addTask('Task A');
  useStore.getState().pickTask(useStore.getState().tasks[0].id);
  useStore.getState().startFocus();
  useStore.getState().setIsRunning(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('next step (M1)', () => {
  it('asks after a hold-stop and shows it under the task', () => {
    render(<FocusView />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Stop' }), { button: 0, pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    const input = screen.getByTestId('next-step');
    fireEvent.change(input, { target: { value: 'write the intro' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('task-next').textContent).toBe('next: write the intro');
    expect(useStore.getState().tasks[0].next).toBe('write the intro');
  });

  it('is cleared when the task is done', () => {
    const id = useStore.getState().tasks[0].id;
    useStore.getState().setTaskNext(id, 'outline');
    useStore.getState().toggleTask(id);
    expect(useStore.getState().tasks[0].next).toBeUndefined();
  });

  it('syncs through Firestore docs', () => {
    const t = { ...useStore.getState().tasks[0], next: 'outline' };
    const back = tasksFromDocs([{ id: t.id, data: taskToDoc(t, 0) }]);
    expect(back[0].next).toBe('outline');
  });
});
