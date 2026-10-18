import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';
import { formatMinutes, formatClock, isToday, dayLabel } from '../core/format';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('History helpers', () => {
  it('formatMinutes', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h 0m');
    expect(formatMinutes(90)).toBe('1h 30m');
  });

  it('formatClock', () => {
    // Build a date at a known hour/minute in the local timezone
    const d = new Date();
    d.setHours(14, 5, 0, 0);
    expect(formatClock(d.getTime())).toBe('14:05');
  });

  it('isToday / dayLabel for today', () => {
    const now = Date.now();
    expect(isToday(now)).toBe(true);
    expect(dayLabel(now)).toBe('Today');
  });

  it('dayLabel for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    expect(dayLabel(yesterday.getTime())).toBe('Yesterday');
  });

  it('dayLabel for older date', () => {
    const old = new Date(2024, 0, 15, 12, 0, 0); // Jan 15 2024
    expect(dayLabel(old.getTime())).toBe('2024-01-15');
  });
});

function seedSessions() {
  const now = Date.now();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(12, 0, 0, 0);

  useStore.setState({
    ...useStore.getInitialState(),
    screen: 'history',
    sessions: [
      {
        id: 's1', taskName: 'Read chapter', minutes: 50,
        startedAt: now - 3000 * 1000, endedAt: now,
        corner: 'Da Lat', ambient: 'Wind',
      },
      {
        id: 's2', taskName: 'Write notes', minutes: 25,
        startedAt: yesterday.getTime() - 1500 * 1000, endedAt: yesterday.getTime(),
        corner: 'Cabin', ambient: 'Fireplace',
      },
    ],
  });
}

describe('History screen', () => {
  it('groups sessions by day, newest first', () => {
    seedSessions();
    render(<App />);
    const items = screen.getAllByText(/Read chapter|Write notes/);
    expect(items.map((i) => i.textContent)).toEqual(['Read chapter', 'Write notes']);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('today stats count only today', () => {
    seedSessions();
    render(<App />);
    expect(screen.getByTestId('sessions-today').textContent).toBe('1');
    expect(screen.getByTestId('focused-today').textContent).toBe('50m');
  });

  it('empty state', () => {
    useStore.setState({ screen: 'history' });
    render(<App />);
    expect(screen.getByText('No sessions yet.')).toBeInTheDocument();
  });
});

describe('History anti-regression', () => {
  it('no Sign in or EN on History', () => {
    useStore.getState().setScreen('history');
    render(<App />);
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    expect(screen.queryByText('EN')).not.toBeInTheDocument();
  });
});
