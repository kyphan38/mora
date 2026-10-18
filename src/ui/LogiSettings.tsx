import { useStore } from '../store/useStore';
import { formatClock } from '../core/format';
import { Words, Label } from './Words';

/** Live link to logi: each run of the clock shows up in logi as it happens. */
export function LogiSettings() {
  const enabled = useStore((s) => s.logi.enabled);
  const setLogi = useStore((s) => s.setLogi);
  const status = useStore((s) => s.logiStatus);

  const line =
    status.state === 'error'
      ? status.message
      : status.at
        ? `last sent ${formatClock(status.at)}`
        : 'runs show up in logi as they happen';

  return (
    <section>
      <Label>send to logi</Label>
      <Words
        label="Send to logi"
        options={[
          { value: 'off', label: 'off' },
          { value: 'on', label: 'on' },
        ]}
        value={enabled ? 'on' : 'off'}
        onChange={(v) => setLogi({ enabled: v === 'on' })}
      />
      {enabled && (
        <p className={`fade-in mt-3 font-mono text-[12px] ${status.state === 'error' ? 'text-ink' : 'text-faint'}`} data-testid="logi-status">
          {line}
        </p>
      )}
    </section>
  );
}
