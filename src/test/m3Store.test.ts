import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';
import { longBreakForSeconds, breakForSeconds } from '../core/pomodoro';
import { sessionTimer } from '../core/sessionTimer';
import { toPersisted } from '../platform/persistence';

const st = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

function finishBlock(sec = 1500) {
  useStore.setState({ elapsedSec: sec });
  st().enterReview();
}

describe('long break', () => {
  it('is three normal breaks, between 15 and 30 minutes', () => {
    expect(longBreakForSeconds(1500)).toBe(900);
    expect(longBreakForSeconds(3000)).toBe(1800);
    expect(longBreakForSeconds(7200)).toBe(1800);
  });

  it('comes after the fourth finished block and resets the cycle', () => {
    st().addTask('A');
    st().setDuration('25 min');
    st().startFocus();
    for (let i = 0; i < 3; i++) {
      finishBlock();
      expect(st().longBreak).toBe(false);
      st().startBreak();
      st().finishBreak();
    }
    finishBlock();
    expect(st().longBreak).toBe(true);
    st().startBreak();
    expect(st().cycleCount).toBe(0);
    expect(sessionTimer(st()).totalSec).toBe(900);
    st().tickSession(899);
    expect(st().phase).toBe('break');
    st().tickSession(1);
    expect(st().phase).toBe('focus');
    expect(st().longBreak).toBe(false);
  });

  it('short blocks do not count toward the cycle', () => {
    st().addTask('A');
    st().startFocus();
    finishBlock(30);
    expect(st().cycleCount).toBe(0);
    expect(sessionTimer({ ...st(), phase: 'break' }).totalSec).toBe(breakForSeconds(st().lastFocusSec));
  });
});

describe('tasks', () => {
  it('"name ~3" sets an estimate; blocks count finished blocks', () => {
    st().addTask('Write report ~3');
    expect(st().tasks[0]).toMatchObject({ name: 'Write report', est: 3, kind: 'learn' });
    st().startFocus();
    finishBlock();
    expect(st().tasks[0].blocks).toBe(1);
  });

  it('kind is copied onto the logged session', () => {
    st().addTask('Ship');
    st().setTaskKind(st().tasks[0].id, 'work');
    st().startFocus();
    finishBlock();
    expect(st().sessions[0].kind).toBe('work');
  });
});

describe('custom duration', () => {
  it('sets any minute count and reuses known labels', () => {
    st().setCustomDuration(40);
    expect(st().setup).toEqual({ durationLabel: '40 min', durationSec: 2400 });
    st().setCustomDuration(25);
    expect(st().setup.durationLabel).toBe('25 min');
    st().setCustomDuration(0);
    expect(st().setup.durationSec).toBe(1500);
  });
});

describe('notes', () => {
  it('park, turn into a task, remove', () => {
    st().addNote('  call mom ');
    st().addNote('   ');
    expect(st().notes.map((n) => n.text)).toEqual(['call mom']);
    st().noteToTask(st().notes[0].id);
    expect(st().notes).toEqual([]);
    expect(st().tasks[0].name).toBe('call mom');
    st().addNote('x');
    st().removeNote(st().notes[0].id);
    expect(st().notes).toEqual([]);
  });
});

describe('sessions', () => {
  it('review remembers the logged session for its note', () => {
    st().addTask('A');
    st().startFocus();
    finishBlock();
    const id = st().lastSessionId!;
    st().setSessionNote(id, 'outline done');
    expect(st().sessions[0].note).toBe('outline done');
  });

  it('edit, remove and restore in order', () => {
    useStore.setState({
      sessions: [
        { id: 'b', taskName: 'B', minutes: 20, startedAt: 0, endedAt: 2000, corner: '', ambient: '' },
        { id: 'a', taskName: 'A', minutes: 10, startedAt: 0, endedAt: 1000, corner: '', ambient: '' },
      ],
    });
    st().updateSession('b', { taskName: ' B2 ', minutes: 33 });
    expect(st().sessions[0]).toMatchObject({ taskName: 'B2', minutes: 33 });
    st().updateSession('b', { taskName: '  ', minutes: 0 });
    expect(st().sessions[0]).toMatchObject({ taskName: 'B2', minutes: 33 });
    const removed = st().removeSession('b')!;
    expect(st().sessions.map((x) => x.id)).toEqual(['a']);
    st().restoreSession(removed);
    expect(st().sessions.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('persistence', () => {
  it('keeps notes, cycle, goal and mute', () => {
    st().addNote('n');
    useStore.setState({ cycleCount: 2, longBreak: true, dailyGoalMin: 240, muted: true });
    const p = toPersisted(st());
    expect(p).toMatchObject({ cycleCount: 2, longBreak: true, dailyGoalMin: 240, muted: true });
    useStore.setState(useStore.getInitialState());
    st().hydrate(p);
    expect(st().notes.length).toBe(1);
    expect(st().dailyGoalMin).toBe(240);
    expect(st().muted).toBe(true);
  });
});
