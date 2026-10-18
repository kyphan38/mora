import { useState } from 'react';
import { useStore } from '../store/useStore';
import { DURATIONS } from '../data/durations';
import { Words } from './Words';

const CUSTOM = '__custom__';

/** Preset durations as words, plus "custom" to type any number of minutes. */
export function DurationPicker() {
  const setup = useStore((s) => s.setup);
  const setDuration = useStore((s) => s.setDuration);
  const setCustomDuration = useStore((s) => s.setCustomDuration);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const isPreset = DURATIONS.some((d) => d.label === setup.durationLabel);
  const options = [
    ...DURATIONS.map((d) => ({ value: d.label, label: d.label === 'Count Up' ? 'count up' : d.label })),
    ...(isPreset ? [] : [{ value: setup.durationLabel, label: setup.durationLabel }]),
    { value: CUSTOM, label: 'custom' },
  ];

  if (typing) {
    return (
      <form
        className="fade-in flex items-baseline gap-2 text-[14px]"
        onSubmit={(e) => {
          e.preventDefault();
          setCustomDuration(Number(draft));
          setTyping(false);
        }}
      >
        <input
          autoFocus
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={() => setTyping(false)}
          onKeyDown={(e) => e.key === 'Escape' && setTyping(false)}
          aria-label="Minutes"
          className="w-12 border-b border-line-strong bg-transparent text-center"
        />
        <span className="text-faint">min</span>
      </form>
    );
  }

  return (
    <Words
      label="Duration"
      options={options}
      value={setup.durationLabel}
      onChange={(v) => {
        if (v === CUSTOM) {
          setDraft(String(Math.round(setup.durationSec / 60) || ''));
          setTyping(true);
        } else if (DURATIONS.some((d) => d.label === v)) setDuration(v);
      }}
    />
  );
}
