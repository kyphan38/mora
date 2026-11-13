import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';

function seedRoom() {
  const store = useStore.getState();
  store.setCorner({
    id: 'da-lat-misty-dawn',
    name: 'Da Lat Misty Dawn',
    description: 'Cool and serene.',
    ambient: 'Wind',
    gradient: 'linear-gradient(135deg,#7c8994,#49545f)',
  });
  store.addTask('Task A');
  store.addTask('Task B');
  store.pickTask(useStore.getState().tasks[0].id);
  store.setScreen('focus');
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('store - activeTask', () => {
  it('returns the picked task while it is undone, else nothing', () => {
    useStore.getState().addTask('X');
    useStore.getState().addTask('Y');
    expect(useStore.getState().activeTask()).toBeUndefined();
    const id = useStore.getState().tasks[1].id;
    useStore.getState().pickTask(id);
    expect(useStore.getState().activeTask()?.name).toBe('Y');
    useStore.getState().toggleTask(id);
    expect(useStore.getState().activeTask()).toBeUndefined();
  });
});

describe('store - completeActive', () => {
  it('logs a session and marks task done', () => {
    seedRoom();
    const store = useStore.getState();
    store.completeActive(3000);
    const s = useStore.getState();
    expect(s.sessions.length).toBe(1);
    expect(s.sessions[0].taskName).toBe('Task A');
    expect(s.sessions[0].minutes).toBe(50);
    expect(s.sessions[0].corner).toBe('Da Lat Misty Dawn');
    expect(s.sessions[0].ambient).toBe('Wind');
    expect(s.tasks[0].done).toBe(true);
    expect(s.activeTask()).toBeUndefined();
  });

  it('minutes round; blocks under a minute are not logged', () => {
    seedRoom();
    useStore.getState().completeActive(30);
    expect(useStore.getState().sessions.length).toBe(0);

    // Complete second task
    useStore.getState().completeActive(727);
    expect(useStore.getState().sessions[0].minutes).toBe(12);
  });

  it('with no task picked, logs a Focus block and marks nothing done', () => {
    seedRoom();
    useStore.getState().completeActive(100);
    expect(useStore.getState().sessions.length).toBe(1);
    // Now no task is picked
    useStore.getState().completeActive(100);
    const s = useStore.getState();
    expect(s.sessions.length).toBe(2);
    expect(s.sessions[0].taskName).toBe('Focus');
    expect(s.tasks[1].done).toBe(false);
  });
});

describe('store - stopActive', () => {
  it('>=60s logs partial without completing', () => {
    seedRoom();
    const result = useStore.getState().stopActive(120);
    expect(result).toBe(true);
    const s = useStore.getState();
    expect(s.sessions.length).toBe(1);
    expect(s.tasks[0].done).toBe(false);
    expect(s.activeTask()?.name).toBe('Task A');
  });

  it('<60s logs nothing', () => {
    seedRoom();
    const result = useStore.getState().stopActive(30);
    expect(result).toBe(false);
    expect(useStore.getState().sessions.length).toBe(0);
  });
});

describe('store - toggleTask', () => {
  it('flips done; a done task is no longer picked, even when undone again', () => {
    seedRoom();
    const id = useStore.getState().tasks[0].id;
    useStore.getState().toggleTask(id);
    expect(useStore.getState().tasks[0].done).toBe(true);
    expect(useStore.getState().activeTask()).toBeUndefined();
    // Toggle back
    useStore.getState().toggleTask(id);
    expect(useStore.getState().tasks[0].done).toBe(false);
    expect(useStore.getState().activeTask()).toBeUndefined();
  });
});
