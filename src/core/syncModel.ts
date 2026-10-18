// Pure helpers for syncing the store with Firestore: doc shapes, diffs, merge.
// No Firebase here, so the rules of sync are easy to test.

import type { Note, Session, SoundConfig, SessionSetup, Task } from '../types';

export type Doc = Record<string, unknown>;

const MAX_NAME = 200;
const MAX_NOTE = 500;

/** Firestore rejects undefined; drop those keys. */
function clean(d: Doc): Doc {
  return Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined));
}

// ---- tasks: array order lives in `order` ----

export function taskToDoc(t: Task, order: number): Doc {
  return clean({
    name: t.name.slice(0, MAX_NAME),
    done: t.done,
    createdAt: t.createdAt,
    order,
    kind: t.kind,
    est: t.est,
    blocks: t.blocks,
  });
}

export function tasksFromDocs(docs: { id: string; data: Doc }[]): Task[] {
  return docs
    .map(({ id, data }) => ({ id, data }))
    .sort((a, b) => Number(a.data.order ?? 0) - Number(b.data.order ?? 0))
    .map(({ id, data }) =>
      clean({
        id,
        name: String(data.name ?? ''),
        done: data.done === true,
        createdAt: Number(data.createdAt ?? 0),
        kind: data.kind === 'work' ? 'work' : data.kind === 'learn' ? 'learn' : undefined,
        est: typeof data.est === 'number' ? data.est : undefined,
        blocks: typeof data.blocks === 'number' ? data.blocks : undefined,
      }) as unknown as Task,
    );
}

// ---- sessions: newest first ----

export function sessionToDoc(s: Session): Doc {
  return clean({
    taskName: s.taskName.slice(0, MAX_NAME),
    minutes: Math.min(600, Math.max(1, Math.round(s.minutes))),
    startedAt: Math.round(s.startedAt),
    endedAt: Math.round(Math.max(s.endedAt, s.startedAt)),
    corner: s.corner,
    ambient: s.ambient,
    kind: s.kind,
    note: s.note?.slice(0, MAX_NOTE),
  });
}

export function sessionsFromDocs(docs: { id: string; data: Doc }[]): Session[] {
  return docs
    .map(({ id, data }) =>
      clean({
        id,
        taskName: String(data.taskName ?? ''),
        minutes: Number(data.minutes ?? 0),
        startedAt: Number(data.startedAt ?? 0),
        endedAt: Number(data.endedAt ?? 0),
        corner: String(data.corner ?? ''),
        ambient: String(data.ambient ?? ''),
        kind: data.kind === 'work' ? 'work' : data.kind === 'learn' ? 'learn' : undefined,
        note: typeof data.note === 'string' ? data.note : undefined,
      }) as unknown as Session,
    )
    .sort((a, b) => b.endedAt - a.endedAt);
}

// ---- notes: oldest first ----

export function noteToDoc(n: Note): Doc {
  return { text: n.text.slice(0, MAX_NOTE), createdAt: n.createdAt };
}

export function notesFromDocs(docs: { id: string; data: Doc }[]): Note[] {
  return docs
    .map(({ id, data }) => ({ id, text: String(data.text ?? ''), createdAt: Number(data.createdAt ?? 0) }))
    .sort((a, b) => a.createdAt - b.createdAt);
}

// ---- prefs: one doc; device-only things (custom track, mute, theme, logi token) stay local ----

export interface SyncedPrefs {
  sound: Omit<SoundConfig, 'customTrackId'>;
  setup: SessionSetup;
  roomBackground: 'color' | 'scene';
  cornerId: string | null;
  autoContinue: boolean;
  dailyGoalMin: number;
  logiEnabled: boolean;
  logiUrl: string;
}

export function prefsToDoc(p: SyncedPrefs): Doc {
  return clean({ ...p, sound: { ...p.sound } });
}

// ---- diff: which docs to write or delete so Firestore matches the store ----

/** Stable string for comparing docs (key order does not matter). */
export function fingerprint(d: Doc): string {
  return JSON.stringify(d, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Doc).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

export function diffDocs(
  local: Map<string, Doc>,
  remote: Map<string, string>,
): { writes: [string, Doc][]; deletes: string[] } {
  const writes: [string, Doc][] = [];
  for (const [id, doc] of local) if (remote.get(id) !== fingerprint(doc)) writes.push([id, doc]);
  const deletes = [...remote.keys()].filter((id) => !local.has(id));
  return { writes, deletes };
}

/** First sync on a device: keep everything from both sides; remote wins on the same id. */
export function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const ids = new Set(remote.map((x) => x.id));
  return [...remote, ...local.filter((x) => !ids.has(x.id))];
}
