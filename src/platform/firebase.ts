// Firebase client (web and PWA only; the Tauri build stays local and never loads it).
// Lazy: nothing runs on import, so tests and the desktop build need no config.
//
// VITE_USE_EMULATORS=1 talks to the local Auth/Firestore emulators with the
// fake project 'demo-mora', so development never touches real data.

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const env = import.meta.env;
export const USE_EMULATORS = env.VITE_USE_EMULATORS === '1';

/**
 * On the real domain, authDomain is the app's own host (vercel.json proxies
 * /__/auth to firebaseapp.com). With firebaseapp.com, Safari on iPhone and
 * iPad treats the handler as third-party and sign-in never reports back.
 * localhost and *.vercel.app previews keep the firebaseapp.com domain.
 */
function resolveAuthDomain(): string | undefined {
  const fallback = env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  if (typeof window === 'undefined') return fallback;
  const { protocol, host, hostname } = window.location;
  if (protocol !== 'https:' || hostname.endsWith('.vercel.app')) return fallback;
  return host;
}

function realConfig() {
  return {
    apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: resolveAuthDomain(),
    projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  };
}

const emulatorConfig = { apiKey: 'demo-key', authDomain: 'demo-mora.firebaseapp.com', projectId: 'demo-mora', appId: 'demo-app' };

/** Config keys that are missing (empty = ready). The sign-in screen shows it. */
export function missingConfig(): string[] {
  if (USE_EMULATORS) return [];
  return Object.entries(realConfig())
    .filter(([, v]) => !v)
    .map(([k]) => k);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function firebaseApp(): FirebaseApp {
  if (app) return app;
  const missing = missingConfig();
  if (missing.length) throw new Error(`[firebase] missing config: ${missing.join(', ')}`);
  app = getApps().length ? getApp() : initializeApp(USE_EMULATORS ? emulatorConfig : realConfig());
  return app;
}

export function getAuthClient(): Auth {
  if (auth) return auth;
  auth = getAuth(firebaseApp());
  if (USE_EMULATORS) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  return auth;
}

export function getDb(): Firestore {
  if (db) return db;
  const fb = firebaseApp();
  try {
    // Offline-first: writes land on the device at once and sync later.
    db = initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    // Private mode blocks IndexedDB: keep a memory cache.
    try {
      db = initializeFirestore(fb, { localCache: memoryLocalCache() });
    } catch {
      db = getFirestore(fb);
    }
  }
  if (USE_EMULATORS) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return db;
}

/** The one account allowed to use mora. Only a readable early check; firestore.rules is the guard. */
export const allowedEmail = ((env.VITE_ALLOWED_USER_EMAIL as string | undefined) || (USE_EMULATORS ? 'dev@mora.test' : ''))
  .trim()
  .toLowerCase();
