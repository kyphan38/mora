import { useAuth, signIn } from '../platform/auth';
import { missingConfig } from '../platform/firebase';

/** The shared ws/app sign-in screen (same layout as hodi, legi, fina, logi). */
export function SignInView() {
  const { status, error, busy } = useAuth();
  const missing = missingConfig();

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-8 px-5 pb-[12dvh] text-center"
      data-testid="sign-in"
    >
      <div className="flex flex-col items-center gap-4">
        <img src="/branding/mora-icon.svg" alt="" width={40} height={40} />
        <div>
          <h1 className="text-xl font-medium tracking-tight">mora</h1>
          <p className="mt-1 text-sm text-faint">A quiet focus timer.</p>
        </div>
      </div>

      {missing.length > 0 ? (
        <p className="max-w-xs text-sm text-muted">
          Firebase is not configured yet. Fill <code className="font-mono text-xs">.env.local</code> using{' '}
          <code className="font-mono text-xs">.env.example</code>.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void signIn()}
          disabled={status === 'loading' || busy}
          className="w-full max-w-xs rounded-full border border-line px-4 py-3 text-sm text-ink transition-colors hover:bg-surface-2 disabled:opacity-40"
        >
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
      )}

      {error && (
        <p role="alert" className="max-w-xs text-sm text-muted">
          {error}
        </p>
      )}
    </main>
  );
}
