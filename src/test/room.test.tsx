import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
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
  store.setScreen('room');
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('store - activeTask', () => {
  it('returns first not-done task', () => {
    useStore.getState().addTask('X');
    useStore.getState().addTask('Y');
    expect(useStore.getState().activeTask()?.name).toBe('X');
    const id = useStore.getState().tasks[0].id;
    useStore.getState().toggleTask(id);
    expect(useStore.getState().activeTask()?.name).toBe('Y');
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
    expect(s.activeTask()?.name).toBe('Task B');
  });

  it('minutes rounds and min 1', () => {
    seedRoom();
    useStore.getState().completeActive(30);
    expect(useStore.getState().sessions[0].minutes).toBe(1);

    // Complete second task
    useStore.getState().completeActive(727);
    expect(useStore.getState().sessions[0].minutes).toBe(12);
  });

  it('no-op when no active task', () => {
    seedRoom();
    // Complete both
    useStore.getState().completeActive(100);
    useStore.getState().completeActive(100);
    expect(useStore.getState().sessions.length).toBe(2);
    // Now no active
    useStore.getState().completeActive(100);
    expect(useStore.getState().sessions.length).toBe(2);
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
  it('flips done and changes active', () => {
    seedRoom();
    const id = useStore.getState().tasks[0].id;
    useStore.getState().toggleTask(id);
    expect(useStore.getState().tasks[0].done).toBe(true);
    expect(useStore.getState().activeTask()?.name).toBe('Task B');
    // Toggle back
    useStore.getState().toggleTask(id);
    expect(useStore.getState().tasks[0].done).toBe(false);
    expect(useStore.getState().activeTask()?.name).toBe('Task A');
  });
});

describe('Room screen', () => {
  it('renders active task name and Play button', () => {
    seedRoom();
    render(<App />);
    // Task A appears in both timer card and task list
    expect(screen.getAllByText('Task A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('clicking Play sets pill to Focusing, Pause to Paused', () => {
    seedRoom();
    render(<App />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Play'));
    expect(screen.getByText('Focusing')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Pause'));
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('Complete now click logs session and advances', () => {
    seedRoom();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Complete now'));
    const s = useStore.getState();
    expect(s.sessions.length).toBe(1);
    expect(s.tasks[0].done).toBe(true);
    // Task B now active - appears in timer heading and task list
    expect(screen.getAllByText('Task B').length).toBeGreaterThanOrEqual(1);
  });

  it('all tasks done shows All done and hides Play', () => {
    seedRoom();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Complete now'));
    fireEvent.click(screen.getByLabelText('Complete now'));
    expect(screen.getByText('All done')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByLabelText('Play')).not.toBeInTheDocument();
  });

  it('adding a task in the room updates store and list', () => {
    seedRoom();
    render(<App />);
    const input = screen.getByPlaceholderText('Add a task…');
    fireEvent.change(input, { target: { value: 'Task C' } });
    fireEvent.click(screen.getByText('Add'));
    expect(useStore.getState().tasks.length).toBe(3);
    expect(screen.getAllByText('Task C').length).toBeGreaterThanOrEqual(1);
  });
});

describe('Room anti-regression', () => {
  it('no Sign in or EN text on Room', () => {
    seedRoom();
    render(<App />);
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    expect(screen.queryByText('EN')).not.toBeInTheDocument();
  });
});
