// Firestore client, in its own module so the sign-in screen never downloads
// it; sync code imports it on demand.
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { firebaseApp, USE_EMULATORS } from './firebase';

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (db) return db;
  const fb = firebaseApp();
  try {
    // Offline-first: writes land on the device at once and sync later.
    db = initializeFirestore(fb, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  } catch {
    // Private mode blocks IndexedDB: keep a memory cache.
    try {
      db = initializeFirestore(fb, { localCache: memoryLocalCache(), ignoreUndefinedProperties: true });
    } catch {
      db = getFirestore(fb);
    }
  }
  if (USE_EMULATORS) connectFirestoreEmulator(db, '127.0.0.1', 8180);
  return db;
}

