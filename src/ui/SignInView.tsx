import { useEffect, useState } from 'react';
import { useAuth, signIn } from '../platform/auth';
import { Ring } from './Ring';

const pad = (n: number) => String(n).padStart(2, '0');

/** The same clock, showing the time of day; one button to sign in. */
export function SignInView() {
  const { status, error, busy } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  const dayProgress = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const loading = status === 'loading';

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-5" data-testid="sign-in">
      <Ring progress={dayProgress}>
        <p className="font-mono text-[11px] tracking-[0.1em] text-faint uppercase">mora</p>
        <div className="digits mt-2 text-[clamp(52px,15vw,84px)] leading-none font-extralight">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </div>
        <p className="mt-3 text-[12px] text-faint">{loading ? <span className="breathe">loading</span> : 'A quiet focus timer'}</p>
      </Ring>

      <div className="flex min-h-20 flex-col items-center gap-3">
        {!loading && (
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={busy}
            className="fade-in rounded-full bg-ink px-6 py-2.5 text-[14px] text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in with Google'}
          </button>
        )}
        {error && <p className="max-w-xs text-center text-[13px] text-ink">{error}</p>}
      </div>
    </main>
  );
}
