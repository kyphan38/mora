// Shares the running timer across devices through users/{uid}/live/current.
// Writes happen on actions only (play, pause, done, phase changes), never on
// clock ticks; every device computes the clock from the stored anchor.

import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { useStore } from '../store/useStore';
import { actionKey, toLive, type LiveTimer, type RuntimeSlice } from '../core/liveModel';
import { uid as newId } from '../core/uid';

const WRITE_DEBOUNCE_MS = 300;
const DEVICE_KEY = 'mora.deviceId';

/** A random id per device, so a device can tell its own writes apart. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return memoryId;
  }
}
const memoryId = newId();

function slice(s: ReturnType<typeof useStore.getState>): RuntimeSlice {
  return {
    sessionActive: s.sessionActive,
    phase: s.phase,
    isRunning: s.isRunning,
    elapsedSec: s.elapsedSec,
    runSyncAt: s.runSyncAt,
    setup: s.setup,
    lastFocusSec: s.lastFocusSec,
    longBreak: s.longBreak,
    cycleCount: s.cycleCount,
    focusStartedAt: s.focusStartedAt,
    lastEvent: s.lastEvent,
  };
}

export function startLiveSync(uid: string): () => void {
  const me = deviceId();
  const ref = doc(getDb(), 'users', uid, 'live', 'current');
  let lastKey = actionKey(slice(useStore.getState()));
  let applying = false;
  let seen = false;
  // An action taken before the first snapshot arrives must win over it.
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const write = () => {
    timer = null;
    const s = useStore.getState();
    const live = toLive(slice(s), me, Date.now());
    setDoc(ref, { ...live, updatedAt: serverTimestamp() }).catch((err) => console.warn('[live] write failed', err));
  };

  const unsubDoc = onSnapshot(ref, (snap) => {
    const first = !seen;
    seen = true;
    // Our own write echoing back (local cache) or nothing shared yet.
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists()) {
      if (first && (dirty || useStore.getState().sessionActive)) write();
      return;
    }
    if (first && dirty) {
      write();
      return;
    }
    const l = snap.data() as LiveTimer;
    if (l.deviceId === me) return;
    applying = true;
    try {
      useStore.getState().applyLive(l);
      lastKey = actionKey(slice(useStore.getState()));
    } finally {
      applying = false;
    }
  });

  const unsubStore = useStore.subscribe((s) => {
    if (applying) return;
    const key = actionKey(slice(s));
    if (key === lastKey) return;
    lastKey = key;
    if (!seen) {
      dirty = true;
      return;
    }
    // Acting here makes this device the one that logs the block.
    if (s.liveFollower) s.leadLive();
    if (timer) clearTimeout(timer);
    timer = setTimeout(write, WRITE_DEBOUNCE_MS);
  });

  return () => {
    if (timer) {
      clearTimeout(timer);
      write();
    }
    unsubDoc();
    unsubStore();
  };
}
