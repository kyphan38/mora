import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Sheet } from './Sheet';

/** Park a thought without leaving the block. It waits in the task sheet. */
export function NoteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addNote = useStore((s) => s.addNote);
  const [text, setText] = useState('');

  return (
    <Sheet open={open} label="Park a thought" onClose={onClose} testId="note-sheet">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addNote(text);
          setText('');
          onClose();
        }}
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Park a thought, then back to focus…"
          aria-label="Park a thought"
          className="w-full border-b border-line bg-transparent py-2 text-[15px] placeholder:text-faint focus:border-line-strong"
        />
      </form>
    </Sheet>
  );
}
