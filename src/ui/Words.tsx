import { Fragment } from 'react';

/** A row of plain words joined by "·": the current one is ink, the others faint. */
export function Words<T extends string | number>({
  options,
  value,
  onChange,
  label,
  nowrap = false,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  /** One line only: a little smaller and tighter on narrow phones instead of wrapping. */
  nowrap?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline ${nowrap ? 'whitespace-nowrap text-[13px] min-[400px]:text-[14px]' : 'flex-wrap gap-y-1 text-[14px]'}`}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o, i) => (
        <Fragment key={String(o.value)}>
          {i > 0 && (
            <span className={`${nowrap ? 'px-1 min-[400px]:px-1.5' : 'px-1.5'} text-faint`} aria-hidden="true">
              ·
            </span>
          )}
          <button
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`py-1 transition-colors ${o.value === value ? 'text-ink' : 'text-faint hover:text-ink'}`}
          >
            {o.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

/** A small section label above a group of controls. */
export function Label({ children }: { children: string }) {
  return <h3 className="mb-2 font-mono text-[11px] tracking-[0.08em] text-faint uppercase">{children}</h3>;
}
