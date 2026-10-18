import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { createMemoryAdapter, toPersisted, PERSIST_VERSION } from '../platform/persistence';
import { initPersistence } from '../platform/persist';
import { noopAudioEngine } from '../platform/audio';
import App from '../App';

function seed(durationLabel = '25 min') {
  const s = useStore.getState();
  s.addTask('Task A');
  s.addTask('Task B');
  s.setDuration(durationLabel);
  s.startFocus();
}

const st = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('wall-clock timer', () => {
  it('catches up after a long gap (throttled interval or sleep)', () => {
    seed();
    st().setIsRunning(true);
    const t0 = st().runSyncAt!;
    st().syncClock(t0 + 600_000);
    expect(st().elapsedSec).toBe(600);
  });

  it('keeps the sub-second remainder between syncs', () => {
    seed();
    st().setIsRunning(true);
    const t0 = st().runSyncAt!;
    st().syncClock(t0 + 1500);
    st().syncClock(t0 + 3000);
    expect(st().elapsedSec).toBe(3);
  });

  it('a gap past the end opens review and records a natural end', () => {
    seed();
    st().setIsRunning(true);
    st().syncClock(st().runSyncAt! + 2_000_000);
    expect(st().phase).toBe('review');
    expect(st().lastEvent?.kind).toBe('focus-done');
    expect(st().lastEvent?.taskName).toBe('Task A');
    expect(st().sessions[0].minutes).toBe(25);
  });

  it('does nothing while paused', () => {
    seed();
    st().syncClock(Date.now() + 60_000);
    expect(st().elapsedSec).toBe(0);
  });
});

describe('time stays with the right task', () => {
  it('ticking the active task done logs its time and restarts the clock', () => {
    seed();
    st().setIsRunning(true);
    useStore.setState({ elapsedSec: 300 });
    st().toggleTask(st().tasks[0].id);
    expect(st().sessions.length).toBe(1);
    expect(st().sessions[0].taskName).toBe('Task A');
    expect(st().elapsedSec).toBe(0);
    expect(st().isRunning).toBe(true);
  });

  it('moving another task to the top closes the current block', () => {
    seed();
    useStore.setState({ elapsedSec: 300 });
    st().reorderTasks(1, 0);
    expect(st().sessions[0].taskName).toBe('Task A');
    expect(st().elapsedSec).toBe(0);
  });

  it('removing the active task discards its time', () => {
    seed();
    useStore.setState({ elapsedSec: 300 });
    st().removeTask(st().tasks[0].id);
    expect(st().sessions.length).toBe(0);
    expect(st().elapsedSec).toBe(0);
  });

  it('edits that keep the same active task leave the clock alone', () => {
    seed();
    useStore.setState({ elapsedSec: 300 });
    st().addTask('Task C');
    st().toggleTask(st().tasks[1].id);
    expect(st().elapsedSec).toBe(300);
    expect(st().sessions.length).toBe(0);
  });
});

describe('review and break', () => {
  it('a block is logged once, whatever the user picks next', () => {
    seed();
    useStore.setState({ elapsedSec: 900 });
    st().enterReview();
    expect(st().sessions.length).toBe(1);
    st().stopAllSessions();
    expect(st().sessions.length).toBe(1);
  });

  it('enterReview is ignored outside the focus phase', () => {
    seed();
    useStore.setState({ elapsedSec: 900 });
    st().enterReview();
    st().enterReview();
    expect(st().sessions.length).toBe(1);
  });

  it('stopping during a break does not log break time as focus', () => {
    seed();
    st().enterReview();
    st().startBreak();
    useStore.setState({ elapsedSec: 200 });
    st().stopFocus();
    expect(st().sessions.length).toBe(0);
  });

  it('the hotkey toggle is ignored on the review sheet', () => {
    seed();
    st().enterReview();
    st().togglePlay();
    expect(st().isRunning).toBe(false);
  });

  it('a manual break end with no tasks left ends the session', () => {
    seed();
    st().enterReview();
    st().reviewMarkDone(true);
    useStore.setState({ tasks: st().tasks.map((t) => ({ ...t, done: true })) });
    st().startBreak();
    st().finishBreak();
    expect(st().sessionActive).toBe(false);
  });

  it('a natural break end records an event; skipping does not', () => {
    seed();
    st().enterReview();
    st().startBreak();
    st().finishBreak();
    expect(st().lastEvent).toBeNull();
    st().enterReview();
    st().startBreak();
    st().tickSession(300);
    expect(st().lastEvent?.kind).toBe('break-done');
  });
});

describe('session details', () => {
  it('start time is the first play, not end minus elapsed', () => {
    seed();
    const before = Date.now();
    st().setIsRunning(true);
    const startedAt = st().focusStartedAt!;
    st().setIsRunning(false);
    st().setIsRunning(true);
    expect(st().focusStartedAt).toBe(startedAt);
    useStore.setState({ elapsedSec: 600 });
    st().stopFocus();
    expect(st().sessions[0].startedAt).toBeGreaterThanOrEqual(before);
    expect(st().sessions[0].startedAt).toBe(startedAt);
  });

  it('changing duration mid-session keeps progress', () => {
    seed();
    useStore.setState({ elapsedSec: 400 });
    st().setDuration('50 min');
    expect(st().elapsedSec).toBe(400);
    expect(st().setup.durationSec).toBe(3000);
  });
});

describe('restore', () => {
  it('hydrate heals an activeTaskId that points at a done task and restores the phase', () => {
    st().hydrate({
      tasks: [
        { id: 'a', name: 'A', done: true, createdAt: 1 },
        { id: 'b', name: 'B', done: false, createdAt: 2 },
      ],
      activeTaskId: 'a',
      phase: 'break',
      lastFocusSec: 1500,
    });
    expect(st().activeTaskId).toBe('b');
    expect(st().phase).toBe('break');
    expect(st().lastFocusSec).toBe(1500);
  });

  it('phase fields round-trip through persistence', () => {
    seed();
    useStore.setState({ phase: 'break', lastFocusSec: 3000, focusStartedAt: 42 });
    const p = toPersisted(st());
    expect(p.phase).toBe('break');
    expect(p.lastFocusSec).toBe(3000);
    expect(p.focusStartedAt).toBe(42);
  });

  it('a saved running session comes back paused', async () => {
    const adapter = createMemoryAdapter({
      version: PERSIST_VERSION,
      tasks: [{ id: 't1', name: 'T', done: false, createdAt: 1 }],
      sessions: [],
      sound: { ambient: 'Rain', musicStyle: 'Lo-fi', ambientVolume: 50, musicVolume: 30, customTrackId: null },
      setup: { durationLabel: '25 min', durationSec: 1500 },
      corner: null,
      isRunning: true,
      sessionActive: true,
      elapsedSec: 100,
    });
    const h = await initPersistence(adapter, { debounceMs: 0 });
    expect(st().isRunning).toBe(false);
    expect(st().elapsedSec).toBe(100);
    h.unsubscribe();
  });

  it('clock-only changes are not written every second', async () => {
    const adapter = createMemoryAdapter(null);
    const save = vi.spyOn(adapter, 'save');
    const h = await initPersistence(adapter, { debounceMs: 0 });
    useStore.setState({ elapsedSec: 1 });
    useStore.setState({ elapsedSec: 2 });
    useStore.setState({ elapsedSec: 3 });
    expect(save.mock.calls.length).toBeLessThanOrEqual(1);
    st().addTask('Real change');
    expect(save.mock.calls.length).toBeGreaterThanOrEqual(1);
    h.unsubscribe();
  });
});

describe('app-level runtime', () => {
  it('chimes on a natural phase end', () => {
    const chime = vi.spyOn(noopAudioEngine, 'chime');
    render(<App />);
    act(() => {
      useStore.setState({ lastEvent: { kind: 'focus-done', taskName: 'X', at: Date.now() } });
    });
    expect(chime).toHaveBeenCalledTimes(1);
    chime.mockRestore();
  });
});
