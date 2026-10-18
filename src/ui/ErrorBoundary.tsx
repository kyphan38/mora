import { Component, type ReactNode } from 'react';

/** A render error shows one quiet line and a reload, instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[mora] render failed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center" role="alert">
        <p className="text-sm text-muted">Something went wrong.</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="rounded-full border border-line px-5 py-2 text-sm text-ink hover:bg-surface-2"
        >
          Reload
        </button>
      </main>
    );
  }
}
