import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { breakForSeconds, NEXT_DURATIONS } from '../lib/pomodoro';
import { useStore } from '../store/useStore';
import App from '../App';

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
  store.startFocus();
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('breakForSeconds mapping', () => {
  it('25 min (1500s) → 5 min (300s)', () => {
    expect(breakForSeconds(1500)).toBe(300);
  });

  it('50 min (3000s) → 10 min (600s)', () => {
    expect(breakForSeconds(3000)).toBe(600);
  });

  it('1.5h (5400s) → 15 min (900s)', () => {
    expect(breakForSeconds(5400)).toBe(900);
  });

  it('2h (7200s) → 20 min (1200s)', () => {
    expect(breakForSeconds(7200)).toBe(1200);
  });

  it('Count Up (0) → 10 min (600s)', () => {
    expect(breakForSeconds(0)).toBe(600);
  });

  it('fallback: unknown duration uses ratio clamped 5–20 min', () => {
    // 10 min focus → 10/5 = 2 → clamped to 5 min
    expect(breakForSeconds(600)).toBe(300);
    // 100 min focus → 100/5 = 20 → 20 min
    expect(breakForSeconds(6000)).toBe(1200);
    // 200 min focus → 200/5 = 40 → clamped to 20 min
    expect(breakForSeconds(12000)).toBe(1200);
  });
});

describe('NEXT_DURATIONS', () => {
  it('contains 25m, 50m, 1.5h, 2h options', () => {
    expect(NEXT_DURATIONS).toEqual([
      { label: '25 min', seconds: 1500 },
      { label: '50 min', seconds: 3000 },
      { label: '1.5h', seconds: 5400 },
      { label: '2h', seconds: 7200 },
    ]);
  });
});

describe('enterReview', () => {
  it('sets phase to review and pauses when autoContinue is off', () => {
    seedRoom();
    useStore.getState().setIsRunning(true);
    useStore.setState({ elapsedSec: 100 });

    useStore.getState().enterReview();

    const state = useStore.getState();
    expect(state.phase).toBe('review');
    expect(state.isRunning).toBe(false);
    expect(state.lastFocusSec).toBe(3000); // durationSec from setup
  });

  it('uses elapsedSec as lastFocusSec for count-up mode', () => {
    seedRoom();
    useStore.setState({ setup: { durationLabel: 'Count Up', durationSec: 0 }, elapsedSec: 1234 });

    useStore.getState().enterReview();

    expect(useStore.getState().lastFocusSec).toBe(1234);
  });
});

describe('reviewMarkDone', () => {
  it('true: logs session and marks task done', () => {
    seedRoom();
    useStore.setState({ elapsedSec: 3000, lastFocusSec: 3000 });
    useStore.getState().enterReview();

    useStore.getState().reviewMarkDone(true);

    const state = useStore.getState();
    expect(state.sessions.length).toBe(1);
    expect(state.sessions[0].taskName).toBe('Task A');
    expect(state.tasks[0].done).toBe(true);
    expect(state.activeTaskId).toBe(state.tasks[1].id); // Task B
  });

  it('false: keeps current task, no session logged', () => {
    seedRoom();
    useStore.setState({ elapsedSec: 3000, lastFocusSec: 3000 });
    useStore.getState().enterReview();

    const activeIdBefore = useStore.getState().activeTaskId;
    useStore.getState().reviewMarkDone(false);

    const state = useStore.getState();
    expect(state.sessions.length).toBe(0);
    expect(state.tasks[0].done).toBe(false);
    expect(state.activeTaskId).toBe(activeIdBefore);
  });
});

describe('startBreak', () => {
  it('sets phase to break and starts running', () => {
    seedRoom();
    useStore.getState().enterReview();

    useStore.getState().startBreak();

    const state = useStore.getState();
    expect(state.phase).toBe('break');
    expect(state.elapsedSec).toBe(0);
    expect(state.isRunning).toBe(true);
  });
});

describe('finishBreak', () => {
  it('returns to focus phase paused when autoContinue is off', () => {
    seedRoom();
    useStore.getState().enterReview();
    useStore.getState().startBreak();

    useStore.getState().finishBreak();

    const state = useStore.getState();
    expect(state.phase).toBe('focus');
    expect(state.elapsedSec).toBe(0);
    expect(state.isRunning).toBe(false);
  });

  it('auto-starts next focus when autoContinue is on', () => {
    seedRoom();
    useStore.getState().setAutoContinue(true);
    useStore.getState().enterReview(); // auto: skips review, goes to break
    // enterReview with autoContinue logs session + enters break
    expect(useStore.getState().phase).toBe('break');

    useStore.getState().finishBreak();

    const state = useStore.getState();
    expect(state.phase).toBe('focus');
    expect(state.isRunning).toBe(true);
  });
});

describe('focusAgain', () => {
  it('sets new duration and resets to focus', () => {
    seedRoom();
    useStore.getState().enterReview();

    useStore.getState().focusAgain(1500);

    const state = useStore.getState();
    expect(state.phase).toBe('focus');
    expect(state.setup.durationSec).toBe(1500);
    expect(state.setup.durationLabel).toBe('25 min');
    expect(state.elapsedSec).toBe(0);
    expect(state.isRunning).toBe(false);
  });
});

describe('stopAllSessions', () => {
  it('stops focus and navigates to history', () => {
    seedRoom();
    useStore.getState().setIsRunning(true);
    useStore.setState({ elapsedSec: 120 });

    useStore.getState().stopAllSessions();

    const state = useStore.getState();
    expect(state.sessionActive).toBe(false);
    expect(state.isRunning).toBe(false);
    expect(state.screen).toBe('history');
    expect(state.phase).toBe('focus');
  });
});

describe('autoContinue path', () => {
  it('skips review: focus → break → focus automatically', () => {
    seedRoom();
    useStore.getState().setAutoContinue(true);
    useStore.getState().setIsRunning(true);

    // Trigger enterReview (simulates countdown reaching 0)
    useStore.getState().enterReview();

    // Should skip review and go directly to break
    let state = useStore.getState();
    expect(state.phase).toBe('break');
    expect(state.isRunning).toBe(true);
    expect(state.sessions.length).toBe(1); // Task A logged
    expect(state.tasks[0].done).toBe(true);

    // Finish break → auto-starts next focus
    useStore.getState().finishBreak();
    state = useStore.getState();
    expect(state.phase).toBe('focus');
    expect(state.isRunning).toBe(true);
    expect(state.activeTaskId).toBe(state.tasks[1].id); // Task B
  });

  it('stops when no undone tasks remain', () => {
    seedRoom();
    useStore.getState().setAutoContinue(true);

    // Complete Task A
    useStore.getState().enterReview();
    // Now in break with Task B as next
    useStore.getState().finishBreak();
    // Now focusing on Task B

    // Complete Task B
    useStore.getState().enterReview();
    // No more tasks → should stop
    const state = useStore.getState();
    expect(state.sessionActive).toBe(false);
    expect(state.isRunning).toBe(false);
    expect(state.phase).toBe('focus');
    expect(state.sessions.length).toBe(2);
  });
});

describe('break phase in tickSession', () => {
  it('counts down and auto-finishes break', () => {
    seedRoom();
    // Set up break phase with a 3-second duration
    useStore.setState({
      phase: 'break',
      lastFocusSec: 1500, // → breakForSeconds = 300
      elapsedSec: 298,
      isRunning: true,
    });

    useStore.getState().tickSession(); // 299
    expect(useStore.getState().phase).toBe('break');

    useStore.getState().tickSession(); // 300 → finishBreak
    expect(useStore.getState().phase).toBe('focus');
    expect(useStore.getState().isRunning).toBe(false);
  });
});

describe('Room review-phase render', () => {
  it('renders review sheet with correct elements', () => {
    seedRoom();
    useStore.getState().setScreen('room');
    useStore.setState({ phase: 'review', lastFocusSec: 3000 });

    render(<App />);

    expect(screen.getByTestId('review-sheet')).toBeInTheDocument();
    expect(screen.getByText('Session complete')).toBeInTheDocument();
    expect(screen.getByTestId('review-mark-done')).toBeInTheDocument();
    expect(screen.getByTestId('review-keep-working')).toBeInTheDocument();
    expect(screen.getByTestId('review-take-break')).toBeInTheDocument();
    expect(screen.getByTestId('review-focus-again')).toBeInTheDocument();
    expect(screen.getByTestId('review-stop')).toBeInTheDocument();
    // Break duration label: 3000s focus → 600s break → 10m
    expect(screen.getByText('Take a break · 10m')).toBeInTheDocument();
  });
});
