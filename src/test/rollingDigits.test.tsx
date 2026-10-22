import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RollingDigits } from '../ui/RollingDigits';

const shown = (c: HTMLElement) => c.querySelector('[aria-hidden="true"]')!.textContent;

describe('RollingDigits', () => {
  it('shows only the current time while the length changes (no stale digits)', () => {
    const { container, rerender } = render(<RollingDigits text="45:00" roll={false} />);
    for (const t of ['50:00', '1:05:00', '55:00', '1:55:00', '29:00', '45:00']) {
      rerender(<RollingDigits text={t} roll={false} />);
      expect(shown(container)).toBe(t);
    }
  });
});
