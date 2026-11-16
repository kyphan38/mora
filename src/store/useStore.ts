import { create } from 'zustand';

import type { AppStore } from './types';
import { soundSlice } from './slices/sound';
import { scenesSlice } from './slices/scenes';
import { tasksSlice } from './slices/tasks';
import { timerSlice } from './slices/timer';
import { historySlice } from './slices/history';
import { linkSlice } from './slices/link';

export type { AppStore, Phase, LogiLink } from './types';
export { currentTask, NO_TASK_NAME, setLogiTickHandler } from './helpers';

export const useStore = create<AppStore>()((...a) => ({
  ...soundSlice(...a),
  ...scenesSlice(...a),
  ...tasksSlice(...a),
  ...timerSlice(...a),
  ...historySlice(...a),
  ...linkSlice(...a),
}));

// Sound follows the timer on every screen; previews in Room settings call the engine directly.
export const shouldPlayAudio = (state: { isRunning: boolean }) => state.isRunning;
