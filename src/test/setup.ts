import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Most tests are about the app behind the sign-in gate: start signed in and
// never touch Firebase. auth.test.tsx uses the real module with Firebase mocked.
vi.mock('../platform/auth', async () => {
  const { create } = await import('zustand');
  const useAuth = create(() => ({
    status: 'signed-in' as const,
    user: { uid: 'test-uid', email: 'dev@mora.test' },
    error: null as string | null,
    busy: false,
  }));
  return {
    useAuth,
    startAuth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    isAllowed: (e: string) => e === 'dev@mora.test',
  };
});

// jsdom has no PointerEvent, so button/clientX/pointerId would be dropped.
if (typeof window !== 'undefined' && !('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill, configurable: true });
}
