import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, shouldPlayAudio } from '../store/useStore';
import { toPersisted } from '../platform/persistence';

describe('session runtime store logic', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
  });

  it('startFocus sets sessionActive, activeTaskId=first undone, screen=focus, elapsed 0, isRunning false', () => {
    const store = useStore.getState();
    store.addTask('Task A');
    store.addTask('Task B');

    useStore.getState().startFocus();

    const state = useStore.getState();
    expect(state.sessionActive).toBe(true);
    expect(state.screen).toBe('focus');
    expect(state.elapsedSec).toBe(0);
    expect(state.isRunning).toBe(false);
    expect(state.activeTaskId).toBe(state.tasks[0].id);
  });

  it('tickSession increments elapsed only when running; does nothing when paused', () => {
    const store = useStore.getState();
    store.addTask('Task A');
    store.startFocus();

    // Paused initially
    useStore.getState().tickSession();
    expect(useStore.getState().elapsedSec).toBe(0);

    // Running
    useStore.getState().setIsRunning(true);
    useStore.getState().tickSession();
    expect(useStore.getState().elapsedSec).toBe(1);

    // Paused again
    useStore.getState().setIsRunning(false);
    useStore.getState().tickSession();
    expect(useStore.getState().elapsedSec).toBe(1);
  });

  it('tickSession completes at durationSec', () => {
    const store = useStore.getState();
    store.addTask('Task A');
    store.setDuration('50 min'); // sets durationSec to 3000
    // Manually force durationSec to 3 for testing
    useStore.setState({ setup: { durationLabel: '3 sec', durationSec: 3 } });

    useStore.getState().startFocus();
    useStore.getState().setIsRunning(true);

    useStore.getState().tickSession(); // 1
    useStore.getState().tickSession(); // 2
    expect(useStore.getState().sessions.length).toBe(0);

    useStore.getState().tickSession(); // 3 -> triggers enterReview

    const state = useStore.getState();
    // Now enters review phase instead of auto-completing
    expect(state.phase).toBe('review');
    expect(state.isRunning).toBe(false);
    expect(state.sessions.length).toBe(0); // not logged until reviewMarkDone
  });

  it('stopFocus clears sessionActive/elapsed and applies partial-log rule', () => {
    const store = useStore.getState();
    store.addTask('Task A');
    store.startFocus();

    // Less than 60 seconds -> no session logged
    useStore.setState({ elapsedSec: 45 });
    useStore.getState().stopFocus();
    expect(useStore.getState().sessionActive).toBe(false);
    expect(useStore.getState().elapsedSec).toBe(0);
    expect(useStore.getState().sessions.length).toBe(0);

    // Reset and try with >= 60 seconds
    store.startFocus();
    useStore.setState({ elapsedSec: 75 });
    useStore.getState().stopFocus();
    expect(useStore.getState().sessionActive).toBe(false);
    expect(useStore.getState().elapsedSec).toBe(0);
    expect(useStore.getState().sessions.length).toBe(1);
    expect(useStore.getState().sessions[0].minutes).toBe(1); // 75s rounds to 1 min
  });

  it('shouldPlayAudio follows the timer on every screen', () => {
    expect(shouldPlayAudio({ isRunning: true })).toBe(true);
    expect(shouldPlayAudio({ isRunning: false })).toBe(false);
  });

  it('runtime persists via toPersisted and hydrate', () => {
    const state = {
      ...useStore.getInitialState(),
      tasks: [{ id: 'task-123', name: 'Saved task', done: false, createdAt: 1 }],
      elapsedSec: 15,
      isRunning: true,
      sessionActive: true,
      activeTaskId: 'task-123',
    };

    const persisted = toPersisted(state);
    expect(persisted.elapsedSec).toBe(15);
    expect(persisted.isRunning).toBe(true);
    expect(persisted.sessionActive).toBe(true);
    expect(persisted.activeTaskId).toBe('task-123');

    // hydrate
    useStore.getState().hydrate(persisted);
    const updated = useStore.getState();
    expect(updated.elapsedSec).toBe(15);
    expect(updated.isRunning).toBe(true);
    expect(updated.sessionActive).toBe(true);
    expect(updated.activeTaskId).toBe('task-123');
  });

  it('navigate focus->history->focus preserves elapsed', () => {
    useStore.setState({
      tasks: [{ id: 't1', name: 'Preserve Task', done: false, createdAt: 1000 }],
      activeTaskId: 't1',
      elapsedSec: 120,
      isRunning: true,
      sessionActive: true,
    });

    useStore.getState().setScreen('history');
    expect(useStore.getState().elapsedSec).toBe(120);

    useStore.getState().setScreen('focus');
    expect(useStore.getState().elapsedSec).toBe(120);
    expect(useStore.getState().isRunning).toBe(true);
  });
});
