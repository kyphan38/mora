// Cloud Functions client, loaded on demand.
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { firebaseApp, USE_EMULATORS } from './firebase';

let fns: Functions | null = null;

/** Cloud Functions, same region as functions/src/index.ts. */
export function getFunctionsClient(): Functions {
  if (fns) return fns;
  fns = getFunctions(firebaseApp(), 'asia-southeast1');
  if (USE_EMULATORS) connectFunctionsEmulator(fns, '127.0.0.1', 5101);
  return fns;
}

