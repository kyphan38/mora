import { formatTime, remainingSec, type TimerState } from './timer';

export const EV = {
  TOGGLE: 'mora://toggle', // widget/hotkey -> main
  STOP: 'mora://stop',     // widget -> main
} as const;

export interface TickPayload {
  running: boolean;
  remainingSec: number;    // -1 means "no active session"
  taskName: string;        // '' when none
  mode: 'countdown' | 'countup';
}

export function trayTitle(running: boolean, remainingSec: number): string {
  if (remainingSec < 0) {
    return 'mora';
  }
  const formatted = formatTime(remainingSec);
  if (running) {
    return `● ${formatted}`;
  }
  return formatted;
}

export function buildTick(timer: TimerState | null, taskName: string): TickPayload {
  if (!timer) {
    return {
      running: false,
      remainingSec: -1,
      taskName: '',
      mode: 'countdown',
    };
  }
  return {
    running: timer.running,
    remainingSec: remainingSec(timer),
    taskName,
    mode: timer.mode,
  };
}


