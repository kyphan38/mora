import { describe, it, expect, beforeEach } from 'vitest';
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

  // Zone 2: the clock runs with no task
  describe('Timer with no task', () => {
    it('tickSession counts time with no task picked and does not pick one', () => {
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
      expect(state.activeTaskId).toBeNull();
    });
  });

  // Zone 3: a task is current only when picked
  describe('Picked task lifecycle', () => {
    it('addTask does not pick the new task', () => {
      useStore.getState().addTask('Solo Task');
      expect(useStore.getState().tasks[0].name).toBe('Solo Task');
      expect(useStore.getState().activeTaskId).toBeNull();
    });

    it('pickTask picks a task; the same id again unpicks it', () => {
      const store = useStore.getState();
      store.addTask('Task 1');
      store.addTask('Task 2');
      const [, t2] = useStore.getState().tasks;
      store.pickTask(t2.id);
      expect(useStore.getState().activeTaskId).toBe(t2.id);
      expect(useStore.getState().activeTask()?.id).toBe(t2.id);
      store.pickTask(t2.id);
      expect(useStore.getState().activeTaskId).toBeNull();
    });

    it('completing the picked task leaves no task picked (no jump to the next one)', () => {
      const store = useStore.getState();
      store.addTask('Task 1');
      store.addTask('Task 2');
      const [t1] = useStore.getState().tasks;
      store.pickTask(t1.id);
      store.toggleTask(t1.id);
      expect(useStore.getState().tasks[0].done).toBe(true);
      expect(useStore.getState().activeTaskId).toBeNull();
    });

    it('deleting the picked task leaves no task picked', () => {
      const store = useStore.getState();
      store.addTask('Task A');
      store.addTask('Task B');
      const [tA] = useStore.getState().tasks;
      store.pickTask(tA.id);
      store.removeTask(tA.id);
      expect(useStore.getState().tasks.length).toBe(1);
      expect(useStore.getState().activeTaskId).toBeNull();
    });

    it('finishing or deleting the last task keeps the clock running', () => {
      const store = useStore.getState();
      store.addTask('Final Task');
      const task = useStore.getState().tasks[0];
      store.pickTask(task.id);
      useStore.setState({ isRunning: true, sessionActive: true });
      store.toggleTask(task.id);
      expect(useStore.getState().isRunning).toBe(true);
      expect(useStore.getState().sessionActive).toBe(true);

      useStore.setState(useStore.getInitialState());
      store.addTask('Final Task 2');
      const task2 = useStore.getState().tasks[0];
      useStore.setState({ isRunning: true, sessionActive: true });
      store.removeTask(task2.id);
      expect(useStore.getState().isRunning).toBe(true);
      expect(useStore.getState().sessionActive).toBe(true);
    });
  });

  // Zone 4: UI Event Handlers (Escape Key and Duration Resets)
  describe('UI Event Handlers (Escape Key and Duration Resets)', () => {
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
