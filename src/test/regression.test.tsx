import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Room from '../screens/Room';
import { useStore } from '../store/useStore';

describe('Regression Audits', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
  });

  // Zone 1: Deterministic Reordering & Boundary Constraints
  describe('Deterministic Reordering & Boundary Constraints', () => {
    it('reorderTasks accurately swaps adjacent item array indices in the state', () => {
      const store = useStore.getState();
      store.addTask('Task 1');
      store.addTask('Task 2');
      store.addTask('Task 3');
      const t1 = useStore.getState().tasks[0];
      const t2 = useStore.getState().tasks[1];
      const t3 = useStore.getState().tasks[2];

      useStore.getState().reorderTasks(0, 1);
      expect(useStore.getState().tasks[0].id).toBe(t2.id);
      expect(useStore.getState().tasks[1].id).toBe(t1.id);
      expect(useStore.getState().tasks[2].id).toBe(t3.id);
    });

    it('moving the 1st item "Up" or the last item "Down" safely short-circuits with zero mutation', () => {
      const store = useStore.getState();
      store.addTask('Task A');
      store.addTask('Task B');
      const originalTasks = [...useStore.getState().tasks];

      // Move 1st item Up
      useStore.getState().reorderTasks(0, -1);
      expect(useStore.getState().tasks).toEqual(originalTasks);

      // Move 2nd item Down (out of bounds)
      useStore.getState().reorderTasks(1, 2);
      expect(useStore.getState().tasks).toEqual(originalTasks);
    });
  });

  // Zone 2: Timer State Self-Healing
  describe('Timer State Self-Healing', () => {
    it('tickSession auto-resolves activeTaskId to the first eligible task and increments elapsedSec if activeTaskId was null', () => {
      useStore.setState({
        tasks: [
          { id: 't1', name: 'Task 1', done: false, createdAt: 100 },
          { id: 't2', name: 'Task 2', done: false, createdAt: 101 },
        ],
        activeTaskId: null,
        isRunning: true,
        phase: 'focus',
        elapsedSec: 0,
      });

      useStore.getState().tickSession();
      const state = useStore.getState();
      expect(state.elapsedSec).toBe(1);
      expect(state.activeTaskId).toBe('t1');
    });
  });

  // Zone 3: Active Task Lifecycle Synchronization
  describe('Active Task Lifecycle Synchronization', () => {
    it('addTask auto-assigns itself as active if no task is currently active', () => {
      expect(useStore.getState().activeTaskId).toBeNull();
      useStore.getState().addTask('Solo Task');
      expect(useStore.getState().activeTaskId).not.toBeNull();
      expect(useStore.getState().tasks[0].name).toBe('Solo Task');
      expect(useStore.getState().activeTaskId).toBe(useStore.getState().tasks[0].id);
    });

    it('completing (toggleTask) the active task automatically shifts focus to the next available incomplete task', () => {
      const store = useStore.getState();
      store.addTask('Task 1');
      store.addTask('Task 2');
      const [t1, t2] = useStore.getState().tasks;
      expect(useStore.getState().activeTaskId).toBe(t1.id);

      // Complete Task 1
      store.toggleTask(t1.id);
      expect(useStore.getState().tasks[0].done).toBe(true);
      expect(useStore.getState().activeTaskId).toBe(t2.id);
    });

    it('deleting (removeTask) the active task automatically shifts focus to the next available incomplete task', () => {
      const store = useStore.getState();
      store.addTask('Task A');
      store.addTask('Task B');
      const [tA, tB] = useStore.getState().tasks;
      expect(useStore.getState().activeTaskId).toBe(tA.id);

      // Remove Task A
      store.removeTask(tA.id);
      expect(useStore.getState().tasks.length).toBe(1);
      expect(useStore.getState().activeTaskId).toBe(tB.id);
    });

    it('completing/deleting the last task safely auto-pauses the session (isRunning: false, sessionActive: false)', () => {
      const store = useStore.getState();
      store.addTask('Final Task');
      const task = useStore.getState().tasks[0];
      useStore.setState({ isRunning: true, sessionActive: true });

      // Complete last task
      store.toggleTask(task.id);
      expect(useStore.getState().isRunning).toBe(false);
      expect(useStore.getState().sessionActive).toBe(false);

      // Reset and add another
      useStore.setState(useStore.getInitialState());
      store.addTask('Final Task 2');
      const task2 = useStore.getState().tasks[0];
      useStore.setState({ isRunning: true, sessionActive: true });

      // Remove last task
      store.removeTask(task2.id);
      expect(useStore.getState().isRunning).toBe(false);
      expect(useStore.getState().sessionActive).toBe(false);
    });
  });

  // Zone 4: UI Event Handlers (Escape Key and Duration Resets)
  describe('UI Event Handlers (Escape Key and Duration Resets)', () => {
    it('pressing Escape key closes the settings panel layout state', () => {
      useStore.setState({
        tasks: [{ id: 't1', name: 'Task 1', done: false, createdAt: 100 }],
        activeTaskId: 't1',
        screen: 'room',
      });

      render(<Room />);

      // Settings initially closed
      expect(screen.queryByTestId('room-settings-panel')).not.toBeInTheDocument();

      // Open settings
      const toggleBtn = screen.getByTestId('room-settings-toggle');
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('room-settings-panel')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(screen.queryByTestId('room-settings-panel')).not.toBeInTheDocument();
    });

    it('selecting a new duration setting instantly overrides and resets countdown tracking references', () => {
      useStore.setState({
        elapsedSec: 450,
        setup: { durationLabel: '25 min', durationSec: 1500 },
      });

      useStore.getState().setDuration('50 min');
      const state = useStore.getState();
      expect(state.setup.durationLabel).toBe('50 min');
      expect(state.setup.durationSec).toBe(3000);
      expect(state.elapsedSec).toBe(0); // Instantly overrides and resets countdown tracking references
    });
  });
});
