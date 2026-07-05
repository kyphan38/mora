import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';
import { formatMinutes, formatClock, isToday, dayLabel } from '../screens/History';

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
  it('renders sessions from store in newest-first order', () => {
    seedSessions();
    render(<App />);
    expect(screen.getByText('Read chapter')).toBeInTheDocument();
    expect(screen.getByText('Write notes')).toBeInTheDocument();
    // Newest first: Read chapter before Write notes in the DOM
    const items = screen.getAllByText(/Read chapter|Write notes/);
    expect(items[0].textContent).toBe('Read chapter');
    expect(items[1].textContent).toBe('Write notes');
  });

  it('today stats correct', () => {
    seedSessions();
    render(<App />);
    // 1 session today, 50 minutes
    expect(screen.getByText('Sessions today')).toBeInTheDocument();
    expect(screen.getByText('Focused today')).toBeInTheDocument();
    // "50m" appears in stat card and in the session row - use getAllByText
    expect(screen.getAllByText('50m').length).toBeGreaterThanOrEqual(1);
    // The stat value for sessions today is "1"
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('empty state', () => {
    useStore.getState().setScreen('history');
    render(<App />);
    expect(screen.getByText('No sessions yet.')).toBeInTheDocument();
  });

  it('Clear empties sessions', () => {
    seedSessions();
    render(<App />);
    expect(screen.getByText('Read chapter')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear'));
    expect(useStore.getState().sessions.length).toBe(0);
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
