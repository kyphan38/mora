import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOsSync } from '../hooks/useOsSync';
import { type OsBridge } from '../lib/os';
import { EV } from '../lib/osFormat';
import { type TimerState } from '../lib/timer';

class MockOsBridge implements OsBridge {
  updateTray = vi.fn().mockResolvedValue(undefined);
  showWidget = vi.fn().mockResolvedValue(undefined);
  hideWidget = vi.fn().mockResolvedValue(undefined);
  emit = vi.fn().mockResolvedValue(undefined);

  onEventHandlers: Record<string, (payload: any) => void> = {};
  onEvent = vi.fn().mockImplementation(async (event: string, cb: (payload: any) => void) => {
    this.onEventHandlers[event] = cb;
    return () => {
      delete this.onEventHandlers[event];
    };
  });

  hotkeyHandler: (() => void) | null = null;
  registerHotkey = vi.fn().mockImplementation(async (_accelerator: string, cb: () => void) => {
    this.hotkeyHandler = cb;
  });
  unregisterHotkey = vi.fn().mockResolvedValue(undefined);
}

function SyncTestComponent({
  bridge,
  onToggle,
  onStop,
  timer,
  taskName,
}: {
  bridge: OsBridge;
  onToggle: () => void;
  onStop: () => void;
  timer: TimerState | null;
  taskName: string;
}) {
  const { pushTick } = useOsSync({ bridge, onToggle, onStop });
  return (
    <button onClick={() => pushTick(timer, taskName)}>
      Push Tick
    </button>
  );
}

describe('useOsSync integration (widget-free)', () => {
  it('pushTick running -> updateTray with dot, emit TICK', async () => {
    const bridge = new MockOsBridge();
    const timer: TimerState = {
      mode: 'countdown',
      totalSec: 3000,
      elapsedSec: 500,
      running: true,
    };

    const { getByText } = render(
      <SyncTestComponent
        bridge={bridge}
        onToggle={vi.fn()}
        onStop={vi.fn()}
        timer={timer}
        taskName="Coding"
      />
    );

    fireEvent.click(getByText('Push Tick'));

    expect(bridge.updateTray).toHaveBeenCalledWith('● 41:40');
    expect(bridge.showWidget).not.toHaveBeenCalled();
    expect(bridge.hideWidget).not.toHaveBeenCalled();
  });

  it('pushTick paused -> updateTray without dot', async () => {
    const bridge = new MockOsBridge();
    const timer: TimerState = {
      mode: 'countdown',
      totalSec: 3000,
      elapsedSec: 500,
      running: false,
    };

    const { getByText } = render(
      <SyncTestComponent
        bridge={bridge}
        onToggle={vi.fn()}
        onStop={vi.fn()}
        timer={timer}
        taskName="Coding"
      />
    );

    fireEvent.click(getByText('Push Tick'));

    expect(bridge.updateTray).toHaveBeenCalledWith('41:40');
    expect(bridge.showWidget).not.toHaveBeenCalled();
    expect(bridge.hideWidget).not.toHaveBeenCalled();
  });

  it('pushTick(null, "") -> updateTray "mora"', async () => {
    const bridge = new MockOsBridge();

    const { getByText } = render(
      <SyncTestComponent
        bridge={bridge}
        onToggle={vi.fn()}
        onStop={vi.fn()}
        timer={null}
        taskName=""
      />
    );

    fireEvent.click(getByText('Push Tick'));

    expect(bridge.updateTray).toHaveBeenCalledWith('mora');
    expect(bridge.showWidget).not.toHaveBeenCalled();
    expect(bridge.hideWidget).not.toHaveBeenCalled();
  });

  it('hotkey registered', () => {
    const bridge = new MockOsBridge();
    render(
      <SyncTestComponent
        bridge={bridge}
        onToggle={vi.fn()}
        onStop={vi.fn()}
        timer={null}
        taskName=""
      />
    );

    expect(bridge.registerHotkey).toHaveBeenCalledWith('CmdOrCtrl+Shift+M', expect.any(Function));
  });

  it('remote TOGGLE triggers onToggle', async () => {
    const bridge = new MockOsBridge();
    const onToggle = vi.fn();
    render(
      <SyncTestComponent
        bridge={bridge}
        onToggle={onToggle}
        onStop={vi.fn()}
        timer={null}
        taskName=""
      />
    );

    await waitFor(() => {
      expect(bridge.onEventHandlers[EV.TOGGLE]).toBeDefined();
    });

    bridge.onEventHandlers[EV.TOGGLE](null);
    expect(onToggle).toHaveBeenCalled();
  });

  it('remote STOP triggers onStop', async () => {
    const bridge = new MockOsBridge();
    const onStop = vi.fn();
    render(
      <SyncTestComponent
        bridge={bridge}
        onToggle={vi.fn()}
        onStop={onStop}
        timer={null}
        taskName=""
      />
    );

    await waitFor(() => {
      expect(bridge.onEventHandlers[EV.STOP]).toBeDefined();
    });

    bridge.onEventHandlers[EV.STOP](null);
    expect(onStop).toHaveBeenCalled();
  });

  it('cleanup unlistens and unregisters hotkey', async () => {
    const bridge = new MockOsBridge();
    const { unmount } = render(
      <SyncTestComponent
        bridge={bridge}
        onToggle={vi.fn()}
        onStop={vi.fn()}
        timer={null}
        taskName=""
      />
    );

    await waitFor(() => {
      expect(bridge.onEventHandlers[EV.TOGGLE]).toBeDefined();
    });

    unmount();

    expect(bridge.unregisterHotkey).toHaveBeenCalledWith('CmdOrCtrl+Shift+M');
  });
});
