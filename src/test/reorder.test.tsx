import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useStore } from '../store/useStore';
import App from '../App';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('reorderTasks store action', () => {
  it('reorderTasks moves a task from index a to b', () => {
    const store = useStore.getState();
    store.addTask('Task 1');
    store.addTask('Task 2');
    store.addTask('Task 3');

    expect(useStore.getState().tasks.map(t => t.name)).toEqual(['Task 1', 'Task 2', 'Task 3']);

    // Move index 0 to index 2
    useStore.getState().reorderTasks(0, 2);
    expect(useStore.getState().tasks.map(t => t.name)).toEqual(['Task 2', 'Task 3', 'Task 1']);

    // Move index 1 to index 0
    useStore.getState().reorderTasks(1, 0);
    expect(useStore.getState().tasks.map(t => t.name)).toEqual(['Task 3', 'Task 2', 'Task 1']);
  });

  it('clicking the Up/Down buttons reorders tasks in UI', () => {
    useStore.getState().setScreen('session');
    useStore.getState().addTask('Task A');
    useStore.getState().addTask('Task B');

    render(<App />);

    const rows = document.querySelectorAll('.task-row');
    expect(rows.length).toBe(2);

    // Move Task B (index 1) up above Task A (index 0)
    const moveUpBtn = document.querySelector('[data-testid="task-move-up-1"]');
    expect(moveUpBtn).not.toBeNull();
    fireEvent.click(moveUpBtn as Element);

    expect(useStore.getState().tasks.map(t => t.name)).toEqual(['Task B', 'Task A']);

    // Move Task B (now index 0) back down below Task A
    const moveDownBtn = document.querySelector('[data-testid="task-move-down-0"]');
    expect(moveDownBtn).not.toBeNull();
    fireEvent.click(moveDownBtn as Element);

    expect(useStore.getState().tasks.map(t => t.name)).toEqual(['Task A', 'Task B']);
  });
});
