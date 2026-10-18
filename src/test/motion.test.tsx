import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
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

describe('sheet swipe down', () => {
  const pt = (y: number) => ({ button: 0, pointerId: 1, clientX: 50, clientY: y });
  function setup(onClose: () => void) {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('max-width'),
      addEventListener() {},
      removeEventListener() {},
    }));
    render(
      <Sheet open label="Test" onClose={onClose}>
        <p>body</p>
      </Sheet>,
    );
    const handle = screen.getByTestId('sheet-handle');
    const panel = handle.parentElement as HTMLElement;
    panel.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 400, right: 300, bottom: 400, x: 0, y: 0, toJSON() {} });
    return { handle, panel };
  }

  it('closes when dragged far enough', () => {
    const onClose = vi.fn();
    const { handle } = setup(onClose);
    fireEvent.pointerDown(handle, pt(100));
    fireEvent.pointerMove(handle, pt(400));
    fireEvent.pointerUp(handle, pt(400));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('springs back after a short drag', () => {
    const onClose = vi.fn();
    const { handle, panel } = setup(onClose);
    fireEvent.pointerDown(handle, pt(100));
    fireEvent.pointerMove(handle, pt(140));
    fireEvent.pointerUp(handle, pt(140));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(panel.style.transform).toBe('translateY(0)');
  });

  it('has no handle without onClose', () => {
    render(
      <Sheet open label="Test">
        <p>body</p>
      </Sheet>,
    );
    expect(screen.queryByTestId('sheet-handle')).toBeNull();
  });
});
