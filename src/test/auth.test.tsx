import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.unmock('../platform/auth');

type Cb = (u: { uid: string; email: string } | null) => void;
const fa = vi.hoisted(() => ({
  listener: null as null | ((u: { uid: string; email: string } | null) => void),
  signOut: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
    static credential() {
      return {};
    }
  },
  getRedirectResult: () => Promise.resolve(null),
  onAuthStateChanged: (_a: unknown, cb: Cb) => {
    fa.listener = cb;
    return () => {};
  },
  signInWithCredential: vi.fn(),
  signInWithPopup: fa.signInWithPopup,
  signInWithRedirect: fa.signInWithRedirect,
  signOut: fa.signOut,
}));

vi.mock('../platform/firebase', () => ({
  USE_EMULATORS: false,
  allowedEmail: 'me@example.com',
  missingConfig: () => [],
  getAuthClient: () => ({ config: { authDomain: 'kyphan38-mora-app.firebaseapp.com' } }),
}));

import App from '../App';
import { useAuth } from '../platform/auth';

beforeEach(() => {
  fa.signOut.mockReset();
  fa.signInWithPopup.mockReset().mockResolvedValue(undefined);
});

describe('sign-in gate (web)', () => {
  it('shows the clock sign-in until the allowed account is known', async () => {
    render(<App />);
    expect(screen.getByTestId('sign-in')).toBeInTheDocument();
    await act(async () => fa.listener!({ uid: 'u1', email: 'Me@Example.com' }));
    expect(screen.queryByTestId('sign-in')).not.toBeInTheDocument();
    expect(screen.getByTestId('room-timer-card')).toBeInTheDocument();
  });

  it('another account is signed out with a clear line', async () => {
    render(<App />);
    await act(async () => fa.listener!({ uid: 'u2', email: 'stranger@example.com' }));
    expect(fa.signOut).toHaveBeenCalled();
    expect(screen.getByText('This account cannot use mora.')).toBeInTheDocument();
  });

  it('the button signs in with a popup on desktop browsers', async () => {
    act(() => useAuth.setState({ status: 'signed-out', user: null }));
    render(<App />);
    await act(async () => fireEvent.click(screen.getByText('Continue with Google')));
    expect(fa.signInWithPopup).toHaveBeenCalledTimes(1);
  });
});

describe('desktop (Tauri)', () => {
  it('skips sign-in: the local app opens directly', () => {
    act(() => useAuth.setState({ status: 'signed-out', user: null }));
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    render(<App />);
    expect(screen.getByTestId('room-timer-card')).toBeInTheDocument();
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  });
});
