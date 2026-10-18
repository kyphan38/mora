import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatClock } from '../core/format';
import { queueRecentSessions } from '../hooks/useLogiSync';
import { isTauri } from '../platform/persistence';
import { Words, Label } from './Words';

const FIELD = 'w-full border-b border-line bg-transparent py-1.5 font-mono text-[13px] placeholder:text-faint focus:border-line-strong';

/** Send finished blocks to logi as learn/work time. */
export function LogiSettings() {
  const logi = useStore((s) => s.logi);
  const setLogi = useStore((s) => s.setLogi);
  const waiting = useStore((s) => s.outbox.length);
  const status = useStore((s) => s.logiStatus);
  const [backfill, setBackfill] = useState<string | null>(null);
  // The desktop build has no account: it sends itself with a token.
  const desktop = isTauri();

  let line = '';
  if (desktop) {
    line = waiting > 0 ? `${waiting} waiting` : 'all sent';
    if (status.state === 'sending') line = 'sending…';
    else if (status.state === 'error') line = `${status.message}${waiting ? ` · ${waiting} waiting` : ''}`;
    else if (status.state === 'ok') line = `${line} · ${formatClock(status.at)}${status.message ? ` · ${status.message}` : ''}`;
    if (!logi.token) line = 'add the token to start';
  } else if (status.state === 'error') line = status.message;
  else if (status.at) line = `last sent ${formatClock(status.at)}`;
  else line = 'new sessions go to logi';

  const sendRecent = async () => {
    if (desktop) {
      setBackfill(`${queueRecentSessions()} queued`);
      return;
    }
    setBackfill('sending…');
    try {
      const [{ httpsCallable }, { getFunctionsClient }] = await Promise.all([import('firebase/functions'), import('../platform/functions')]);
      const res = await httpsCallable<void, { queued: number; sent: number }>(getFunctionsClient(), 'sendRecentToLogi')();
      setBackfill(`${res.data.sent} sent`);
    } catch {
      setBackfill('could not send, try later');
    }
  };

  return (
    <section>
      <Label>send to logi</Label>
      <Words
        label="Send to logi"
        options={[
          { value: 'off', label: 'off' },
          { value: 'on', label: 'on' },
        ]}
        value={logi.enabled ? 'on' : 'off'}
        onChange={(v) => setLogi({ enabled: v === 'on' })}
      />
      {logi.enabled && (
        <div className="fade-in mt-3 space-y-3">
          {desktop && (
            <>
              <input
                value={logi.url}
                onChange={(e) => setLogi({ url: e.target.value.trim() })}
                aria-label="logi address"
                placeholder="https://logi.kyphan38.com"
                className={FIELD}
              />
              <input
                type="password"
                autoComplete="off"
                value={logi.token}
                onChange={(e) => setLogi({ token: e.target.value.trim() })}
                aria-label="logi token"
                placeholder="token (MORA_INGEST_TOKEN in logi)"
                className={FIELD}
              />
            </>
          )}
          <p className={`font-mono text-[12px] ${status.state === 'error' ? 'text-ink' : 'text-faint'}`} data-testid="logi-status">
            {line}
          </p>
          <button type="button" className="text-[12px] text-faint hover:text-ink" onClick={() => void sendRecent()}>
            {backfill ?? 'also send the last 7 days'}
          </button>
        </div>
      )}
    </section>
  );
}
