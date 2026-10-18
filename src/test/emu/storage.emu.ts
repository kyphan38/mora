// Storage + scene listing rules against the emulators (npm run test:emu).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, setDoc, doc } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, ref, uploadBytes, getBytes } from 'firebase/storage';

const cfg = { apiKey: 'demo-key', authDomain: 'demo-mora.firebaseapp.com', projectId: 'demo-mora', storageBucket: 'demo-mora.appspot.com', appId: 'demo-app' };

async function client(name: string, email: string) {
  const app = initializeApp(cfg, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: `sub-${email}`, email, email_verified: true })));
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8180);
  const storage = getStorage(app);
  connectStorageEmulator(storage, '127.0.0.1', 9399);
  return { app, db, storage, uid: cred.user.uid };
}

let owner: Awaited<ReturnType<typeof client>>;
let stranger: Awaited<ReturnType<typeof client>>;
const mp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);

beforeAll(async () => {
  owner = await client('owner-s', 'dev@mora.test');
  stranger = await client('stranger-s', 'someone@example.com');
});

afterAll(async () => {
  await deleteApp(owner.app);
  await deleteApp(stranger.app);
});

describe('storage rules (emulator)', () => {
  it('the owner uploads and reads their scene; type and folder are checked', async () => {
    const path = `users/${owner.uid}/scenes/t1.mp4`;
    await uploadBytes(ref(owner.storage, path), mp4, { contentType: 'video/mp4' });
    expect((await getBytes(ref(owner.storage, path))).byteLength).toBe(mp4.length);
    await expect(uploadBytes(ref(owner.storage, `users/${owner.uid}/scenes/x.exe`), mp4, { contentType: 'application/octet-stream' })).rejects.toThrow();
  });

  it('nobody writes defaults; anyone may read them', async () => {
    await expect(uploadBytes(ref(owner.storage, 'defaults/scenes/new.mp4'), mp4, { contentType: 'video/mp4' })).rejects.toThrow();
  });

  it('another account cannot read or write the files of the owner', async () => {
    await expect(getBytes(ref(stranger.storage, `users/${owner.uid}/scenes/t1.mp4`))).rejects.toThrow();
    await expect(uploadBytes(ref(stranger.storage, `users/${stranger.uid}/scenes/a.mp4`), mp4, { contentType: 'video/mp4' })).rejects.toThrow();
  });

  it('scene listings must point into the folder of the owner', async () => {
    const good = { name: 'Train', videoUrl: 'https://x/v', imageUrl: 'https://x/i', videoPath: `users/${owner.uid}/scenes/t1.mp4`, imagePath: `users/${owner.uid}/scenes/t1.jpg`, createdAt: 1 };
    await setDoc(doc(owner.db, 'users', owner.uid, 'scenes', 't1'), good);
    await expect(setDoc(doc(owner.db, 'users', owner.uid, 'scenes', 't2'), { ...good, videoPath: 'users/other/scenes/t2.mp4' })).rejects.toThrow();
  });
});
