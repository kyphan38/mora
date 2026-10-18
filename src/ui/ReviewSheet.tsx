import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { breakForSeconds, NEXT_DURATIONS } from '../core/pomodoro';
import { Sheet } from './Sheet';
import { Words } from './Words';

const WORD = 'text-[14px] text-faint transition-colors hover:text-ink';

/** Shown when a focus block ends. A choice is required, so it does not close on its own. */
export function ReviewSheet({ open }: { open: boolean }) {
  const active = useStore((s) => s.tasks.find((t) => !t.done));
  const lastFocusSec = useStore((s) => s.lastFocusSec);
  const durationSec = useStore((s) => s.setup.durationSec);
  const reviewMarkDone = useStore((s) => s.reviewMarkDone);
  const startBreak = useStore((s) => s.startBreak);
  const focusAgain = useStore((s) => s.focusAgain);
  const stopAllSessions = useStore((s) => s.stopAllSessions);
  const [markedDone, setMarkedDone] = useState(false);
  const [pickDuration, setPickDuration] = useState(false);
  useEffect(() => {
    if (open) {
      setMarkedDone(false);
      setPickDuration(false);
    }
  }, [open]);

  const breakMin = Math.round(breakForSeconds(lastFocusSec) / 60);
  const line = markedDone ? (active ? `Next: ${active.name}` : 'All tasks done') : (active?.name ?? 'Task completed');

  return (
    <Sheet open={open} label="Session complete" testId="review-sheet">
      <h2 className="text-[17px] font-medium">Session complete</h2>
      <p className="mt-1 truncate text-[15px] text-muted">{line}</p>

      {!markedDone && active && (
        <div className="mt-5 flex items-baseline gap-4">
          <button
            type="button"
            className="text-[14px] text-ink"
            onClick={() => {
              reviewMarkDone(true);
              setMarkedDone(true);
            }}
            data-testid="review-mark-done"
          >
            Mark done
          </button>
          <button type="button" className={WORD} onClick={() => reviewMarkDone(false)} data-testid="review-keep-working">
            Keep working
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={startBreak}
          className="rounded-full bg-ink px-5 py-2 text-[14px] text-bg transition-opacity hover:opacity-85"
          data-testid="review-take-break"
        >
          Take a break · {breakMin}m
        </button>
        {active && (
          <button type="button" className={WORD} onClick={() => setPickDuration((v) => !v)} data-testid="review-focus-again">
            Focus again
          </button>
        )}
        <button type="button" className={WORD} onClick={stopAllSessions} data-testid="review-stop">
          Stop
        </button>
      </div>

      {pickDuration && (
        <div className="fade-in mt-4">
          <Words
            label="Next duration"
            options={NEXT_DURATIONS.map((d) => ({ value: d.seconds, label: d.label }))}
            value={durationSec}
            onChange={focusAgain}
          />
        </div>
      )}
    </Sheet>
  );
}
