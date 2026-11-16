
import type { Slice, HistorySlice } from '../types';

export const historySlice: Slice<HistorySlice> = (set, get) => ({
  sessions: [],
  clearSessions: () => set({ sessions: [] }),
  setSessionNote: (id, note) =>
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, note: note.trim().slice(0, 500) || undefined } : x)),
    })),
  updateSession: (id, patch) =>
    set((s) => ({
      sessions: s.sessions.map((x) => {
        if (x.id !== id) return x;
        const taskName = patch.taskName?.trim() || x.taskName;
        const minutes = patch.minutes !== undefined && patch.minutes >= 1 ? Math.round(patch.minutes) : x.minutes;
        return { ...x, taskName, minutes };
      }),
    })),
  removeSession: (id) => {
    const found = get().sessions.find((x) => x.id === id);
    if (found) set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    return found;
  },
  restoreSession: (session) =>
    set((s) =>
      s.sessions.some((x) => x.id === session.id)
        ? {}
        : { sessions: [...s.sessions, session].sort((a, b) => b.endedAt - a.endedAt) },
    ),
  dailyGoalMin: 0,
  setDailyGoal: (minutes) => set({ dailyGoalMin: Math.max(0, Math.round(minutes)) }),
});
