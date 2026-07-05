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

  it('dragging and dropping reorders tasks in UI', () => {
    useStore.getState().setScreen('session');
    useStore.getState().addTask('Task A');
    useStore.getState().addTask('Task B');

    render(<App />);

    const rows = document.querySelectorAll('.task-row');
    expect(rows.length).toBe(2);

    // Mock dataTransfer object
    const dataTransfer = {
      setData: (type: string, val: string) => {
        dataTransfer.data[type] = val;
      },
      getData: (type: string) => {
        return dataTransfer.data[type];
      },
      data: {} as Record<string, string>,
      effectAllowed: ''
    };

    // Drag Task A (index 0) and drop onto Task B (index 1)
    fireEvent.dragStart(rows[0], { dataTransfer });
    fireEvent.dragOver(rows[1], { dataTransfer });
    fireEvent.drop(rows[1], { dataTransfer });

    expect(useStore.getState().tasks.map(t => t.name)).toEqual(['Task B', 'Task A']);
  });
});
