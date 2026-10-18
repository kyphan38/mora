import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';

const st = () => useStore.getState();
const key = (k: string) => fireEvent.keyDown(window, { key: k });

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  };
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  vi.stubGlobal('localStorage', memoryStorage());
});

describe('shortcuts', () => {
  it('space plays and pauses, enter finishes the block', () => {
    st().addTask('A');
    render(<App />);
    key(' ');
    expect(st().isRunning).toBe(true);
    key(' ');
    expect(st().isRunning).toBe(false);
    act(() => useStore.setState({ elapsedSec: 120 }));
    key('Enter');
    expect(st().phase).toBe('review');
  });

  it('are ignored while typing', () => {
    st().addTask('A');
    render(<App />);
    fireEvent.click(screen.getByTestId('tasks-toggle-btn'));
    const input = screen.getByLabelText('Add a task');
    fireEvent.keyDown(input, { key: ' ' });
    expect(st().isRunning).toBe(false);
  });

  it('z enters zen and hides the bar; exit zen brings it back', () => {
    st().addTask('A');
    render(<App />);
    key('z');
    expect(screen.queryByLabelText('History')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('exit zen'));
    expect(screen.getByLabelText('History')).toBeInTheDocument();
  });

  it('q parks a thought; it shows in the task sheet and becomes a task', () => {
    render(<App />);
    key('q');
    const input = screen.getByPlaceholderText(/Park a thought/);
    fireEvent.change(input, { target: { value: 'buy milk' } });
    fireEvent.submit(input.closest('form')!);
    expect(st().notes.map((n) => n.text)).toEqual(['buy milk']);
    expect(screen.getByTestId('tasks-toggle-btn').textContent).toContain('1 parked');
    fireEvent.click(screen.getByTestId('tasks-toggle-btn'));
    fireEvent.click(screen.getByText('make task'));
    expect(st().tasks.map((t) => t.name)).toEqual(['buy milk']);
  });

  it('m mutes', () => {
    render(<App />);
    key('m');
    expect(st().muted).toBe(true);
  });
});

describe('focus screen', () => {
  it('custom duration accepts typed minutes', () => {
    st().addTask('A');
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'custom' }));
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '40' } });
    fireEvent.submit(screen.getByLabelText('Minutes').closest('form')!);
    expect(st().setup.durationSec).toBe(2400);
    expect(screen.getByRole('radio', { name: '40 min' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the estimate under the clock', () => {
    st().addTask('Write ~3');
    render(<App />);
    expect(screen.getByText(/Time left · 0\/3/)).toBeInTheDocument();
  });

  it('long break is named on the clock', () => {
    st().addTask('A');
    useStore.setState({ phase: 'break', longBreak: true, lastFocusSec: 1500, sessionActive: true });
    render(<App />);
    expect(screen.getByText('long break')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('task kind toggles between learn and work', () => {
    st().addTask('A');
    render(<App />);
    fireEvent.click(screen.getByTestId('tasks-toggle-btn'));
    fireEvent.click(screen.getByLabelText('Kind of A: learn'));
    expect(st().tasks[0].kind).toBe('work');
  });

  it('review note is saved on the logged session', () => {
    st().addTask('A');
    st().startFocus();
    act(() => {
      useStore.setState({ elapsedSec: 600 });
      st().enterReview();
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Session note'), { target: { value: 'draft done' } });
    expect(st().sessions[0].note).toBe('draft done');
  });

  it('sound sheet mute words', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    fireEvent.click(screen.getByRole('radio', { name: 'off' }));
    expect(st().muted).toBe(true);
  });
});

describe('history', () => {
  const now = Date.now();
  const seed = () =>
    useStore.setState({
      screen: 'history',
      dailyGoalMin: 60,
      sessions: [
        { id: 'a', taskName: 'Read', minutes: 30, startedAt: now - 1, endedAt: now, corner: '', ambient: '', note: 'ch 3' },
        { id: 'b', taskName: 'Ship', minutes: 40, startedAt: now - 86_400_001, endedAt: now - 86_400_000, corner: '', ambient: '', kind: 'work' },
      ],
    });

  it('shows goal, streak, week totals and notes', () => {
    seed();
    render(<App />);
    expect(screen.getByText(/\/ 1h 0m/)).toBeInTheDocument();
    expect(screen.getByTestId('streak').textContent).toContain('2 days in a row');
    expect(screen.getByText(/learn 30m · work 40m/)).toBeInTheDocument();
    expect(screen.getByText('ch 3')).toBeInTheDocument();
  });

  it('edit a row', () => {
    seed();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Edit Read'));
    fireEvent.change(screen.getByLabelText('Task name'), { target: { value: 'Read book' } });
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '45' } });
    fireEvent.click(screen.getByText('save'));
    expect(st().sessions[0]).toMatchObject({ taskName: 'Read book', minutes: 45 });
  });

  it('delete with undo', () => {
    seed();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Delete Read'));
    expect(st().sessions.map((s) => s.id)).toEqual(['b']);
    fireEvent.click(screen.getByText('undo'));
    expect(st().sessions.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('export csv makes a file', () => {
    seed();
    const create = vi.fn(() => 'blob:x');
    vi.stubGlobal('URL', { ...URL, createObjectURL: create, revokeObjectURL: vi.fn() });
    render(<App />);
    fireEvent.click(screen.getByText('csv'));
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('settings', () => {
  it('daily goal words', () => {
    useStore.setState({ screen: 'settings' });
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: '4h' }));
    expect(st().dailyGoalMin).toBe(240);
  });
});
