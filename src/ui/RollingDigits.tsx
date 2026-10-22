import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../hooks/usePresence';

const ROLL_MS = 280;

function Digit({ ch, roll }: { ch: string; roll: boolean }) {
  const [old, setOld] = useState<string | null>(null);
  const prev = useRef(ch);

  useEffect(() => {
    if (prev.current === ch) return;
    const from = prev.current;
    prev.current = ch;
    if (!roll || reducedMotion()) {
      setOld(null);
      return;
    }
    setOld(from);
  }, [ch, roll]);

  // Own effect, so a re-render that changes `roll` cannot cancel the clean-up
  // and leave the old digit stuck on screen.
  useEffect(() => {
    if (old === null) return;
    const t = setTimeout(() => setOld(null), ROLL_MS);
    return () => clearTimeout(t);
  }, [old]);

  return (
    <span className="relative inline-block">
      <span className={old === null ? undefined : 'digit-in'}>{ch}</span>
      {old !== null && <span className="digit-out absolute inset-0">{old}</span>}
    </span>
  );
}

/**
 * Shows a time like 24:59. Hour and minute digits roll when they change; the
 * last two digits (seconds) do not. Screen readers get the whole string once.
 */
export function RollingDigits({ text, roll = true }: { text: string; roll?: boolean }) {
  const chars = [...text];
  // The last colon and everything after it is the seconds.
  const secondsFrom = text.lastIndexOf(':');
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="whitespace-nowrap">
        {chars.map((c, i) => {
          // Keyed from the right so a new hour digit does not shift the others.
          // The prefix keeps keys unique: a plain number for both kinds made
          // React keep stale spans, and the clock showed piles of digits.
          const key = chars.length - i;
          return c === ':' || i >= secondsFrom ? (
            <span key={`s${key}`}>{c}</span>
          ) : (
            <Digit key={`d${key}`} ch={c} roll={roll} />
          );
        })}
      </span>
    </>
  );
}
