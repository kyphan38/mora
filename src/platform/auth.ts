// Google sign-in, single allowed account. Used only on web/PWA.

import { create } from 'zustand';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { allowedEmail, getAuthClient, missingConfig, USE_EMULATORS } from './firebase';

export type AuthState = {
  status: 'loading' | 'signed-out' | 'signed-in';
  user: { uid: string; email: string } | null;
  error: string | null;
  busy: boolean;
};

export const useAuth = create<AuthState>(() => ({ status: 'loading', user: null, error: null, busy: false }));

const NOT_ALLOWED = 'This account cannot use mora.';
const GENERIC = 'Sign-in did not work. Try again.';

export function isAllowed(email: string | null | undefined): boolean {
  return !!email && !!allowedEmail && email.trim().toLowerCase() === allowedEmail;
}

/** iPhone, iPad (iPadOS says "Macintosh") or a home-screen app: popups are unreliable there. */
function prefersRedirect(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone =
    matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || standalone;
}

function provider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
}

let started = false;

/** Starts listening once. Safe to call from several places. */
export function startAuth(): void {
  if (started) return;
  started = true;
  if (missingConfig().length) {
    useAuth.setState({ status: 'signed-out', error: `Missing config: ${missingConfig().join(', ')}` });
    return;
  }
  const auth = getAuthClient();
  getRedirectResult(auth).catch(() => {
    // onAuthStateChanged still reports the user; nothing to show here.
  });
  onAuthStateChanged(auth, async (u: User | null) => {
    if (u && !isAllowed(u.email)) {
      useAuth.setState({ status: 'signed-out', user: null, error: NOT_ALLOWED });
      await fbSignOut(auth);
      return;
    }
    useAuth.setState({
      status: u ? 'signed-in' : 'signed-out',
      user: u ? { uid: u.uid, email: u.email ?? '' } : null,
      ...(u ? { error: null } : {}),
    });
  });
}

export async function signIn(): Promise<void> {
  useAuth.setState({ error: null, busy: true });
  const auth = getAuthClient();
  try {
    if (USE_EMULATORS) {
      // The emulator accepts an unsigned fake Google token.
      const token = JSON.stringify({ sub: 'dev-mora', email: allowedEmail, email_verified: true });
      await signInWithCredential(auth, GoogleAuthProvider.credential(token));
      return;
    }
    // Redirect only works when the handler is on this domain (vercel.json proxy).
    if (auth.config.authDomain === window.location.host && prefersRedirect()) {
      await signInWithRedirect(auth, provider());
      return;
    }
    await signInWithPopup(auth, provider());
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider()).catch(() => useAuth.setState({ error: GENERIC }));
      return;
    }
    useAuth.setState({
      error:
        code === 'auth/network-request-failed'
          ? 'No connection. Try again when online.'
          : code === 'auth/unauthorized-domain'
            ? 'This address is not allowed in Firebase.'
            : GENERIC,
    });
  } finally {
    useAuth.setState({ busy: false });
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(getAuthClient());
}
