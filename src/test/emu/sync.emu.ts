// Runs with: npm run test:emu (Auth + Firestore emulators, project demo-mora).
// "Other device" = a second Firebase client signed in as the same account.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { useAuth, signIn, startAuth } from '../../platform/auth';
import { startSync } from '../../platform/sync';

const PROJECT = 'demo-mora';
const cfg = { apiKey: 'demo-key', authDomain: 'demo-mora.firebaseapp.com', projectId: PROJECT, appId: 'demo-app' };
const st = () => useStore.getState();

async function waitFor(check: () => boolean | Promise<boolean>, ms = 10_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timed out');
}

async function client(name: string, email: string): Promise<{ app: FirebaseApp; db: Firestore; uid: string }> {
  const app = initializeApp(cfg, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  const token = JSON.stringify({ sub: `sub-${email}`, email, email_verified: true });
  const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8180);
  return { app, db, uid: cred.user.uid };
}

let uid = '';
let other: { app: FirebaseApp; db: Firestore; uid: string };
let stop: () => void = () => {};

beforeAll(async () => {
  await fetch(`http://127.0.0.1:8180/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9199/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });

  // This device: some local data from before sync existed.
  st().addTask('Local task');
  useStore.setState({
    sessions: [{ id: 'local-s1', taskName: 'Local task', minutes: 25, startedAt: 1_000, endedAt: 1_500_000, corner: '', ambient: '' }],
  });
  st().addNote('local note');

  startAuth();
  await signIn();
  await waitFor(() => useAuth.getState().status === 'signed-in');
  uid = useAuth.getState().user!.uid;
  other = await client('other', 'dev@mora.test');
  expect(other.uid).toBe(uid);
});

afterAll(async () => {
  stop();
  await deleteApp(other.app);
});

const ids = async (kind: string) => (await getDocs(collection(other.db, 'users', uid, kind))).docs.map((d) => d.id);

describe('cloud sync (emulator)', () => {
  it('first sync uploads the data already on this device', async () => {
    let ready = false;
    stop = startSync(uid, () => (ready = true));
    await waitFor(() => ready);
    const taskId = st().tasks[0].id;
    await waitFor(async () => (await ids('tasks')).includes(taskId));
    await waitFor(async () => (await ids('sessions')).includes('local-s1'));
    await waitFor(async () => (await ids('notes')).length === 1);
    await waitFor(async () => (await getDoc(doc(other.db, 'users', uid, 'prefs', 'main'))).exists());
  });

  it('a task added on another device shows up here', async () => {
    await setDoc(doc(other.db, 'users', uid, 'tasks', 'from-phone'), {
      name: 'From phone', done: false, order: 5, createdAt: Date.now(), updatedAt: Date.now(),
    });
    await waitFor(() => st().tasks.some((t) => t.id === 'from-phone'));
  });

  it('local edits and deletes reach the cloud', async () => {
    const local = st().tasks.find((t) => t.name === 'Local task')!;
    st().toggleTask(local.id);
    await waitFor(async () => (await getDoc(doc(other.db, 'users', uid, 'tasks', local.id))).data()?.done === true);
    st().removeTask(local.id);
    await waitFor(async () => !(await ids('tasks')).includes(local.id));
  });

  it('a delete on another device sticks here', async () => {
    await deleteDoc(doc(other.db, 'users', uid, 'tasks', 'from-phone'));
    await waitFor(() => !st().tasks.some((t) => t.id === 'from-phone'));
  });

  it('settings sync both ways, including the chosen cloud track', async () => {
    useStore.setState({ sound: { ...st().sound, customTrackId: 'device-track' } });
    st().setDailyGoal(120);
    await waitFor(async () => (await getDoc(doc(other.db, 'users', uid, 'prefs', 'main'))).data()?.dailyGoalMin === 120);
    const remote = (await getDoc(doc(other.db, 'users', uid, 'prefs', 'main'))).data()!;
    expect(remote.sound.customTrackId).toBe('device-track');
    await setDoc(doc(other.db, 'users', uid, 'prefs', 'main'), { ...remote, autoContinue: true, updatedAt: Date.now() });
    await waitFor(() => st().autoContinue === true);
    expect(st().sound.customTrackId).toBe('device-track');
  });

  it('a session logged here is stored with its note', async () => {
    useStore.setState({
      sessions: [{ id: 's-new', taskName: 'Write', minutes: 30, startedAt: Date.now() - 1_800_000, endedAt: Date.now(), corner: '', ambient: '', kind: 'work' }, ...st().sessions],
    });
    st().setSessionNote('s-new', 'draft done');
    await waitFor(async () => (await getDoc(doc(other.db, 'users', uid, 'sessions', 's-new'))).data()?.note === 'draft done');
  });

  it('rules: another Google account reads nothing', async () => {
    const stranger = await client('stranger', 'someone@example.com');
    await expect(getDocs(collection(stranger.db, 'users', uid, 'tasks'))).rejects.toThrow();
    await expect(getDocs(collection(stranger.db, 'users', stranger.uid, 'tasks'))).rejects.toThrow();
    await deleteApp(stranger.app);
  });
});
