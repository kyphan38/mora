// Cloud sync between the store and Firestore (users/{uid}/...).
//
// Firestore -> store: onSnapshot listeners apply other devices' changes.
// store -> Firestore: when synced data changes, only docs whose content
// differs from the last known remote copy are written; missing ones are
// deleted. Writes go through Firestore's offline cache, so they work
// without a network and sync later.
//
// First sync on a device keeps both sides (merge by id); after that the
// cloud is the source of truth, so a delete on one device sticks.

import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { useStore } from '../store/useStore';
import { CORNERS } from '../data/corners';
import { cornerFromUserScene, USER_SCENE_PREFIX } from '../data/sceneManifest';
import {
  diffDocs,
  fingerprint,
  mergeById,
  noteToDoc,
  notesFromDocs,
  prefsToDoc,
  sessionToDoc,
  sessionsFromDocs,
  taskToDoc,
  tasksFromDocs,
  userScenesFromDocs,
  type Doc,
  type SyncedPrefs,
} from '../core/syncModel';

type Kind = 'tasks' | 'sessions' | 'notes';
type State = ReturnType<typeof useStore.getState>;

const WRITE_DEBOUNCE_MS = 400;
const mergedKey = (uid: string) => `mora.synced.${uid}`;

function wasMerged(uid: string): boolean {
  try {
    return localStorage.getItem(mergedKey(uid)) === '1';
  } catch {
    return false;
  }
}

function markMerged(uid: string): void {
  try {
    localStorage.setItem(mergedKey(uid), '1');
  } catch {
    // Private mode: the merge simply runs again next time (it only adds).
  }
}

function localDocs(s: State, kind: Kind): Map<string, Doc> {
  if (kind === 'tasks') return new Map(s.tasks.map((t, i) => [t.id, taskToDoc(t, i)]));
  if (kind === 'sessions') return new Map(s.sessions.map((x) => [x.id, sessionToDoc(x)]));
  return new Map(s.notes.map((n) => [n.id, noteToDoc(n)]));
}

function localPrefs(s: State): SyncedPrefs {
  const { customTrackId: _device, ...sound } = s.sound;
  return {
    sound,
    setup: s.setup,
    roomBackground: s.roomBackground,
    cornerId: s.corner?.id ?? null,
    autoContinue: s.autoContinue,
    dailyGoalMin: s.dailyGoalMin,
    logiEnabled: s.logi.enabled,
    logiUrl: s.logi.url,
    hiddenScenes: s.hiddenScenes,
  };
}

const withoutStamp = (d: DocumentData): Doc => {
  const { updatedAt: _stamp, ...rest } = d;
  return rest;
};

/** Starts syncing for this account. Returns a stop function. */
export function startSync(uid: string, onReady?: () => void): () => void {
  const db = getDb();
  const base = ['users', uid] as const;
  const remote: Record<Kind, Map<string, string>> = { tasks: new Map(), sessions: new Map(), notes: new Map() };
  let remotePrefs: string | null = null;
  const seen = { tasks: false, sessions: false, notes: false, prefs: false };
  const firstMerge = !wasMerged(uid);
  let applying = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const allSeen = () => seen.tasks && seen.sessions && seen.notes && seen.prefs;

  const apply = (fn: () => void) => {
    applying = true;
    try {
      fn();
    } finally {
      applying = false;
    }
  };

  // Firestore allows 500 writes per batch; stay below it.
  const BATCH_MAX = 400;

  /** Writes local changes now. Remote maps are updated synchronously, so a
   *  snapshot handled right after sees them as already sent. */
  const push = () => {
    if (stopped || !allSeen()) return;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const s = useStore.getState();
    const now = Date.now();
    const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
    for (const kind of ['tasks', 'sessions', 'notes'] as Kind[]) {
      const { writes, deletes } = diffDocs(localDocs(s, kind), remote[kind]);
      for (const [id, d] of writes) {
        ops.push((b) => b.set(doc(db, ...base, kind, id), { ...d, updatedAt: now }));
        remote[kind].set(id, fingerprint(d));
      }
      for (const id of deletes) {
        ops.push((b) => b.delete(doc(db, ...base, kind, id)));
        remote[kind].delete(id);
      }
    }
    const prefs = prefsToDoc(localPrefs(s));
    if (fingerprint(prefs) !== remotePrefs) {
      ops.push((b) => b.set(doc(db, ...base, 'prefs', 'main'), { ...prefs, updatedAt: now }));
      remotePrefs = fingerprint(prefs);
    }
    for (let i = 0; i < ops.length; i += BATCH_MAX) {
      const batch = writeBatch(db);
      ops.slice(i, i + BATCH_MAX).forEach((op) => op(batch));
      // Resolves when the server confirms; the local cache updates at once.
      batch.commit().catch((err) => console.warn('[sync] write failed', err));
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, WRITE_DEBOUNCE_MS);
  };

  const finishFirst = () => {
    if (!allSeen()) return;
    if (firstMerge) markMerged(uid);
    onReady?.();
    schedule();
  };

  const listen = (kind: Kind) =>
    onSnapshot(collection(db, ...base, kind), (snap: QuerySnapshot<DocumentData>) => {
      // Send unsent local edits first, or this snapshot would overwrite them.
      if (timer) push();
      const docs = snap.docs.map((d) => ({ id: d.id, data: withoutStamp(d.data()) }));
      remote[kind] = new Map(docs.map(({ id, data }) => [id, fingerprint(data)]));
      const first = !seen[kind];
      seen[kind] = true;
      const s = useStore.getState();
      apply(() => {
        if (kind === 'tasks') {
          const incoming = tasksFromDocs(docs);
          s.applyRemote({ tasks: first && firstMerge ? mergeById(s.tasks, incoming) : incoming });
        } else if (kind === 'sessions') {
          const incoming = sessionsFromDocs(docs);
          const next = first && firstMerge ? mergeById(s.sessions, incoming).sort((a, b) => b.endedAt - a.endedAt) : incoming;
          s.applyRemote({ sessions: next });
        } else {
          const incoming = notesFromDocs(docs);
          s.applyRemote({ notes: first && firstMerge ? mergeById(s.notes, incoming) : incoming });
        }
      });
      if (first) finishFirst();
      else schedule();
    });

  const findCorner = (id: string) => {
    const s = useStore.getState();
    const own = s.userScenes.find((u) => USER_SCENE_PREFIX + u.id === id);
    return own ? cornerFromUserScene(own) : (CORNERS.find((c) => c.id === id) ?? s.corner);
  };

  const unsubs = [
    // Uploaded scenes: read-only mirror (uploads and deletes write directly).
    onSnapshot(collection(db, ...base, 'scenes'), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as Doc }));
      apply(() => useStore.getState().applyRemote({ userScenes: userScenesFromDocs(docs) }));
    }),
    listen('tasks'),
    listen('sessions'),
    listen('notes'),
    onSnapshot(doc(db, ...base, 'prefs', 'main'), (snap) => {
      if (timer) push();
      const first = !seen.prefs;
      seen.prefs = true;
      if (snap.exists()) {
        const d = withoutStamp(snap.data()) as unknown as SyncedPrefs;
        remotePrefs = fingerprint(d as unknown as Doc);
        apply(() =>
          useStore.getState().applyRemote({
            prefs: {
              sound: d.sound,
              setup: d.setup,
              roomBackground: d.roomBackground,
              corner: d.cornerId ? findCorner(d.cornerId) : null,
              autoContinue: d.autoContinue,
              dailyGoalMin: d.dailyGoalMin,
              logi: { enabled: d.logiEnabled, url: d.logiUrl },
              hiddenScenes: Array.isArray(d.hiddenScenes) ? d.hiddenScenes : [],
            },
          }),
        );
      }
      // No doc yet: the first push uploads this device's settings.
      if (first) finishFirst();
    }),
  ];

  // Local edits -> cloud. Only synced fields matter; the clock ticks often.
  const unsubStore = useStore.subscribe((s, prev) => {
    if (applying || !allSeen()) return;
    if (
      s.tasks !== prev.tasks ||
      s.sessions !== prev.sessions ||
      s.notes !== prev.notes ||
      s.sound !== prev.sound ||
      s.setup !== prev.setup ||
      s.roomBackground !== prev.roomBackground ||
      s.corner !== prev.corner ||
      s.autoContinue !== prev.autoContinue ||
      s.dailyGoalMin !== prev.dailyGoalMin ||
      s.hiddenScenes !== prev.hiddenScenes ||
      s.logi !== prev.logi
    ) {
      schedule();
    }
  });

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    unsubs.forEach((u) => u());
    unsubStore();
  };
}
