import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, shouldPlayAudio } from '../store/useStore';
import { toPersisted } from '../lib/persistence';
import { render, screen, fireEvent } from '@testing-library/react';
import Landing from '../screens/Landing';

describe('session runtime store logic', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
  });

  it('startFocus sets sessionActive, activeTaskId=first undone, screen=room, elapsed 0, isRunning false', () => {
    const store = useStore.getState();
    store.addTask('Task A');
    store.addTask('Task B');

    useStore.getState().startFocus();

    const state = useStore.getState();
    expect(state.sessionActive).toBe(true);
    expect(state.screen).toBe('room');
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

  it('completeCurrent logs + advances + resets', () => {
    const store = useStore.getState();
    store.addTask('Task A');
    store.addTask('Task B');
    store.startFocus();
    useStore.setState({ elapsedSec: 10 });

    useStore.getState().completeCurrent();

    const state = useStore.getState();
    expect(state.sessions.length).toBe(1);
    expect(state.tasks[0].done).toBe(true);
    expect(state.tasks[1].done).toBe(false);
    expect(state.activeTaskId).toBe(state.tasks[1].id);
    expect(state.elapsedSec).toBe(0);
    expect(state.isRunning).toBe(false);
    expect(state.sessionActive).toBe(true);
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

  it('shouldPlayAudio selector maps correctly', () => {
    // sound/session -> audioActive
    expect(shouldPlayAudio({ screen: 'sound', audioActive: true, isRunning: false })).toBe(true);
    expect(shouldPlayAudio({ screen: 'sound', audioActive: false, isRunning: true })).toBe(false);
    expect(shouldPlayAudio({ screen: 'session', audioActive: true, isRunning: false })).toBe(true);

    // room -> isRunning
    expect(shouldPlayAudio({ screen: 'room', audioActive: false, isRunning: true })).toBe(true);
    expect(shouldPlayAudio({ screen: 'room', audioActive: true, isRunning: false })).toBe(false);

    // landing -> false
    expect(shouldPlayAudio({ screen: 'landing', audioActive: true, isRunning: true })).toBe(false);
  });

  it('runtime persists via toPersisted and hydrate', () => {
    const state = {
      ...useStore.getInitialState(),
      elapsedSec: 15,
      isRunning: true,
      sessionActive: true,
      activeTaskId: 'task-123',
      audioActive: true,
    };

    const persisted = toPersisted(state);
    expect(persisted.elapsedSec).toBe(15);
    expect(persisted.isRunning).toBe(true);
    expect(persisted.sessionActive).toBe(true);
    expect(persisted.activeTaskId).toBe('task-123');
    expect(persisted.audioActive).toBe(true);

    // hydrate
    useStore.getState().hydrate(persisted);
    const updated = useStore.getState();
    expect(updated.elapsedSec).toBe(15);
    expect(updated.isRunning).toBe(true);
    expect(updated.sessionActive).toBe(true);
    expect(updated.activeTaskId).toBe('task-123');
    expect(updated.audioActive).toBe(true);
  });

  it('Landing shows Resume when sessionActive and hides it otherwise', () => {
    useStore.setState({
      sessionActive: true,
      tasks: [{ id: 't1', name: 'Resume Task', done: false, createdAt: 1000 }],
      activeTaskId: 't1',
    });

    const { rerender } = render(<Landing />);
    expect(screen.getByText('Continue a previous session')).toBeInTheDocument();
    expect(screen.getByText('Resume')).toBeInTheDocument();

    // Click Resume -> changes screen to room
    fireEvent.click(screen.getByText('Resume'));
    expect(useStore.getState().screen).toBe('room');

    // Reset and click dismiss -> stopFocus
    useStore.setState({ sessionActive: true, screen: 'landing' });
    rerender(<Landing />);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(useStore.getState().sessionActive).toBe(false);
  });

  it('navigate room->landing->room preserves elapsed', () => {
    useStore.setState({
      tasks: [{ id: 't1', name: 'Preserve Task', done: false, createdAt: 1000 }],
      activeTaskId: 't1',
      elapsedSec: 120,
      isRunning: true,
      sessionActive: true,
    });

    useStore.getState().setScreen('landing');
    expect(useStore.getState().elapsedSec).toBe(120);

    useStore.getState().setScreen('room');
    expect(useStore.getState().elapsedSec).toBe(120);
    expect(useStore.getState().isRunning).toBe(true);
  });
});
