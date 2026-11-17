import { useState } from 'react';
import { useStore } from '../store/useStore';

/**
 * M1: one line for what to do first next time on this task. Saves as you
 * type; shown again under the task name before the next Play.
 */
export function NextStepInput({ taskId, autoFocus = false, onDone }: { taskId: string; autoFocus?: boolean; onDone?: () => void }) {
  const setTaskNext = useStore((s) => s.setTaskNext);
  // Starts empty: writing a new one replaces the old one.
  const [text, setText] = useState('');
  return (
    <input
      value={text}
      autoFocus={autoFocus}
      maxLength={200}
      onChange={(e) => {
        setText(e.target.value);
        setTaskNext(taskId, e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') onDone?.();
      }}
      placeholder="Next step (optional)"
      aria-label="Next step"
      data-testid="next-step"
      className="w-full border-b border-line bg-transparent py-2 text-[14px] placeholder:text-faint focus:border-line-strong"
    />
  );
}
