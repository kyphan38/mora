// The running timer shared across devices (Firestore users/{uid}/live/current).
// Elapsed time is stored at an anchor moment, so devices compute the same
// clock without writing every second.

export type Phase = 'focus' | 'break' | 'review';

export interface LiveTimer {
  deviceId: string;
  sessionActive: boolean;
  phase: Phase;
  isRunning: boolean;
  /** Seconds elapsed at anchorAt. */
  elapsedBase: number;
  /** Wall-clock ms the elapsed count started from; null while paused. */
  anchorAt: number | null;
  durationSec: number;
  durationLabel: string;
  lastFocusSec: number;
  longBreak: boolean;
  cycleCount: number;
  focusStartedAt: number | null;
  /** A natural phase end, so other devices can chime too. */
  event: { kind: 'focus-done' | 'break-done'; taskName: string; at: number } | null;
  /** Id of the current run (Play to Pause); logi keeps one record per run. */
  runId: string | null;
  taskName: string;
  taskKind: 'learn' | 'work';
  /** Wall-clock ms of the action that wrote this. */
  at: number;
  /** Set by the server when logi stopped the run, so it is not sent back. */
  stoppedBy?: 'logi' | null;
}

export interface RuntimeSlice {
  sessionActive: boolean;
  phase: Phase;
  isRunning: boolean;
  elapsedSec: number;
  runSyncAt: number | null;
  setup: { durationSec: number; durationLabel: string };
  lastFocusSec: number;
  longBreak: boolean;
  cycleCount: number;
  focusStartedAt: number | null;
  lastEvent: LiveTimer['event'];
  runId: string | null;
  tasks: { name: string; done: boolean; kind?: 'learn' | 'work' }[];
}

/** Snapshot of this device's timer, anchored at `now`. */
export function toLive(s: RuntimeSlice, deviceId: string, now: number): LiveTimer {
  const active = s.tasks.find((t) => !t.done);
  // Sub-second progress since the last whole-second sync counts too.
  const extra = s.isRunning && s.runSyncAt !== null ? Math.max(0, now - s.runSyncAt) / 1000 : 0;
  return {
    deviceId,
    sessionActive: s.sessionActive,
    phase: s.phase,
    isRunning: s.isRunning,
    elapsedBase: s.elapsedSec + extra,
    anchorAt: s.isRunning ? now : null,
    durationSec: s.setup.durationSec,
    durationLabel: s.setup.durationLabel,
    lastFocusSec: s.lastFocusSec,
    longBreak: s.longBreak,
    cycleCount: s.cycleCount,
    focusStartedAt: s.focusStartedAt,
    event: s.lastEvent,
    runId: s.runId,
    taskName: active?.name ?? '',
    taskKind: active?.kind ?? 'learn',
    at: now,
    stoppedBy: null,
  };
}

/** Elapsed seconds (fractional) for a shared timer at `now`. */
export function liveElapsed(l: LiveTimer, now: number): number {
  if (!l.isRunning || l.anchorAt === null) return l.elapsedBase;
  return l.elapsedBase + Math.max(0, now - l.anchorAt) / 1000;
}

/** The fields that only change through user actions or phase ends (not clock ticks). */
export function actionKey(s: RuntimeSlice): string {
  return JSON.stringify([
    s.sessionActive,
    s.phase,
    s.isRunning,
    s.setup.durationSec,
    s.lastFocusSec,
    s.longBreak,
    s.cycleCount,
    s.focusStartedAt,
    s.lastEvent?.at ?? null,
    s.runId,
    s.tasks.find((t) => !t.done)?.name ?? null,
    // A reset or a jump (not a +1 tick) is an action too.
    s.isRunning ? null : s.elapsedSec,
  ]);
}

/** How long a following device waits past the end before finishing the block itself. */
export const TAKEOVER_SEC = 10;
