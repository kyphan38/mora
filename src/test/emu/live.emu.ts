// Live timer across devices (npm run test:emu).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { useAuth, signIn, startAuth } from '../../platform/auth';
import { startLiveSync } from '../../platform/liveSync';
import type { LiveTimer } from '../../core/liveModel';

const cfg = { apiKey: 'demo-key', authDomain: 'demo-mora.firebaseapp.com', projectId: 'demo-mora', appId: 'demo-app' };
const st = () => useStore.getState();

async function waitFor(check: () => boolean | Promise<boolean>, ms = 10_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timed out');
}

let uid = '';
let phone: { db: Firestore; app: ReturnType<typeof initializeApp> };
let stop = () => {};

beforeAll(async () => {
  startAuth();
  await signIn();
  await waitFor(() => useAuth.getState().status === 'signed-in');
  uid = useAuth.getState().user!.uid;
  const app = initializeApp(cfg, 'phone');
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-dev@mora.test', email: 'dev@mora.test', email_verified: true })));
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8180);
  phone = { db, app };
  await setDoc(doc(db, 'users', uid, 'live', 'current'), { deviceId: 'nobody', sessionActive: false, phase: 'focus', isRunning: false, elapsedBase: 0, anchorAt: null, durationSec: 1500, durationLabel: '25 min', lastFocusSec: 0, longBreak: false, cycleCount: 0, focusStartedAt: null, event: null });
  st().addTask('Read');
  stop = startLiveSync(uid);
});

afterAll(async () => {
  stop();
  await deleteApp(phone.app);
});

const shared = async () => (await getDoc(doc(phone.db, 'users', uid, 'live', 'current'))).data() as LiveTimer;

describe('live timer (emulator)', () => {
  it('play on this device is shared with an anchor', async () => {
    st().startFocus();
    st().setIsRunning(true);
    await waitFor(async () => (await shared()).isRunning === true);
    const l = await shared();
    expect(l.sessionActive).toBe(true);
    expect(l.anchorAt).toBeTypeOf('number');
  });

  it('pause on the phone pauses here at the same second', async () => {
    const l = await shared();
    await setDoc(doc(phone.db, 'users', uid, 'live', 'current'), { ...l, deviceId: 'phone', isRunning: false, anchorAt: null, elapsedBase: 42 });
    await waitFor(() => st().isRunning === false);
    expect(st().elapsedSec).toBe(42);
    expect(st().liveFollower).toBe(true);
  });

  it('acting here again takes the lead and writes', async () => {
    st().setIsRunning(true);
    await waitFor(async () => {
      const l = await shared();
      return l.isRunning === true && l.deviceId !== 'phone';
    });
    expect(st().liveFollower).toBe(false);
  });
});
