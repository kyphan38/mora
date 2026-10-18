import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../hooks/usePresence';

const EXIT_MS = 200;

/**
 * Bottom sheet on phones, a centered panel on wide screens. Slides in and out.
 * Esc or a tap outside closes it, unless `onClose` is omitted (a choice is required).
 */
export function Sheet({
  open,
  label,
  onClose,
  children,
  testId,
}: {
  open: boolean;
  label: string;
  onClose?: () => void;
  children: ReactNode;
  testId?: string;
}) {
  const { mounted, leaving } = usePresence(open, EXIT_MS);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center md:items-center ${leaving ? 'pointer-events-none' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={leaving || undefined}
    >
      <div className={`absolute inset-0 bg-black/30 ${leaving ? 'fade-out' : 'fade-in'}`} onClick={onClose} aria-hidden="true" />
      <div
        className={`relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-[10px] border border-line bg-surface px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] backdrop-blur-xl md:rounded-[10px] md:pb-5 ${leaving ? 'sheet-down' : 'sheet-up'}`}
        data-testid={leaving ? undefined : testId}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
