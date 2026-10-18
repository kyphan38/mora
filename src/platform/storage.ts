// Cloud Storage client (scene uploads), loaded on demand.
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseApp, USE_EMULATORS } from './firebase';

let storage: FirebaseStorage | null = null;

export function getStorageClient(): FirebaseStorage {
  if (storage) return storage;
  storage = getStorage(firebaseApp());
  if (USE_EMULATORS) connectStorageEmulator(storage, '127.0.0.1', 9399);
  return storage;
}

