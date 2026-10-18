import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';
import { blockFromSession, isPermanentReject, mergeOutbox } from '../core/logiLink';
import type { Session } from '../types';

const st = () => useStore.getState();
const session = (over: Partial<Session> = {}): Session => ({
  id: 'abc-1',
  taskName: 'Read',
  minutes: 25,
  startedAt: Date.now() - 40 * 60_000,
  endedAt: Date.now(),
  corner: '',
  ambient: '',
  kind: 'work',
  ...over,
});

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  vi.stubGlobal('localStorage', memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('logi link: pure parts', () => {
  it('a block counts focused minutes back from the end', () => {
    const s = session();
    expect(blockFromSession(s)).toEqual({ id: 'abc-1', kind: 'work', label: 'Read', startAt: s.endedAt - 1500_000, endAt: s.endedAt });
    expect(blockFromSession(session({ kind: undefined })).kind).toBe('learn');
  });

  it('only write failures are retried', () => {
    expect(isPermanentReject('write-failed')).toBe(false);
    expect(isPermanentReject('too-old')).toBe(true);
  });

  it('merge skips blocks already queued', () => {
    const b = blockFromSession(session());
    expect(mergeOutbox([b], [b, { ...b, id: 'x' }]).map((x) => x.id)).toEqual(['abc-1', 'x']);
  });
});

describe('logi link: sending', () => {
  function enable() {
    st().setLogi({ enabled: true, token: 'secret', url: 'https://logi.test/' });
  }

  it('a new session is queued, sent with the token, and leaves the queue', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accepted: ['abc-1'], rejected: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    enable();
    render(<App />);
    act(() => useStore.setState({ sessions: [session()] }));
    expect(st().outbox.map((b) => b.id)).toEqual(['abc-1']);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 3000 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://logi.test/api/ingest/mora');
    expect(init.headers.Authorization).toBe('Bearer secret');
    expect(JSON.parse(init.body).blocks[0].label).toBe('Read');
    await waitFor(() => expect(st().outbox).toEqual([]));
    expect(st().logiStatus.state).toBe('ok');
  });

  it('old sessions loaded from storage are not queued', () => {
    enable();
    render(<App />);
    act(() => useStore.setState({ sessions: [session({ endedAt: Date.now() - 3 * 3600_000 })] }));
    expect(st().outbox).toEqual([]);
  });

  it('nothing is queued while the link is off', () => {
    render(<App />);
    act(() => useStore.setState({ sessions: [session()] }));
    expect(st().outbox).toEqual([]);
  });

  it('a rejected token keeps the queue and says so', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    enable();
    render(<App />);
    act(() => useStore.setState({ sessions: [session()] }));
    await waitFor(() => expect(st().logiStatus.message).toBe('token rejected'), { timeout: 3000 });
    expect(st().outbox.length).toBe(1);
  });

  it('a network error keeps the queue for a retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    enable();
    render(<App />);
    act(() => useStore.setState({ sessions: [session()] }));
    await waitFor(() => expect(st().logiStatus.message).toBe('offline, will retry'), { timeout: 3000 });
    expect(st().outbox.length).toBe(1);
  });

  it('settings: turn on, add token, queue the last 7 days', () => {
    useStore.setState({
      screen: 'settings',
      sessions: [session({ id: 'new', endedAt: Date.now() - 86_400_000 }), session({ id: 'old', endedAt: Date.now() - 9 * 86_400_000 })],
    });
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<App />);
    const ons = screen.getAllByRole('radio', { name: 'on' });
    fireEvent.click(ons[ons.length - 1]);
    expect(st().logi.enabled).toBe(true);
    expect(screen.getByTestId('logi-status').textContent).toBe('add the token to start');
    fireEvent.change(screen.getByLabelText('logi token'), { target: { value: ' tok ' } });
    expect(st().logi.token).toBe('tok');
    fireEvent.click(screen.getByText('also send the last 7 days'));
    expect(st().outbox.map((b) => b.id)).toEqual(['new']);
    expect(screen.getByText('1 queued')).toBeInTheDocument();
  });
});
