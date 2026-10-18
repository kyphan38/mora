import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Sheet } from '../ui/Sheet';

function stubMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('sheet exit motion', () => {
  it('stays mounted while it slides out, then unmounts', () => {
    vi.useFakeTimers();
    stubMotion(false);
    const { rerender } = render(<Sheet open label="Test"><p>body</p></Sheet>);
    expect(screen.getByText('body')).toBeInTheDocument();
    rerender(<Sheet open={false} label="Test"><p>body</p></Sheet>);
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(document.querySelector('.sheet-down')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });

  it('closes at once when the user asks for reduced motion', () => {
    stubMotion(true);
    const { rerender } = render(<Sheet open label="Test"><p>body</p></Sheet>);
    rerender(<Sheet open={false} label="Test"><p>body</p></Sheet>);
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });
});
