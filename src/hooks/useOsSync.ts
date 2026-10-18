import { useCallback, useEffect, useRef } from 'react';
import { type TimerState } from '../lib/timer';
import { type OsBridge, createOsBridge } from '../lib/os';
import { EV, buildTick, trayTitle } from '../lib/osFormat';

export function useOsSync(args: {
  bridge?: OsBridge;
  onToggle: () => void;
}): { pushTick: (timer: TimerState | null, taskName: string) => void } {
  const bridge = args.bridge ?? createOsBridge();

  const onToggleRef = useRef(args.onToggle);

  // Keep refs up-to-date to avoid stale closures
  onToggleRef.current = args.onToggle;

  useEffect(() => {
    let active = true;
    let unlistenToggle: (() => void) | null = null;
    let hotkeyRegistered = false;

    const setup = async () => {
      if (!active) return;

      try {
        await bridge.registerHotkey('CmdOrCtrl+Shift+M', () => {
          if (active) onToggleRef.current();
        });
        if (!active) {
          await bridge.unregisterHotkey('CmdOrCtrl+Shift+M');
        } else {
          hotkeyRegistered = true;
        }
      } catch (err) {
        console.error('useOsSync registerHotkey failed:', err);
      }

      try {
        const unlistenT = await bridge.onEvent(EV.TOGGLE, () => {
          if (active) onToggleRef.current();
        });
        if (!active) {
          unlistenT();
        } else {
          unlistenToggle = unlistenT;
        }
      } catch (err) {
        console.error('useOsSync listen TOGGLE failed:', err);
      }
    };

    setup();

    return () => {
      active = false;
      if (hotkeyRegistered) {
        bridge.unregisterHotkey('CmdOrCtrl+Shift+M').catch(console.error);
      }
      if (unlistenToggle) {
        unlistenToggle();
      }
    };
  }, [bridge]);

  const lastTitleRef = useRef<string | null>(null);
  const pushTick = useCallback((timer: TimerState | null, taskName: string) => {
    const p = buildTick(timer, taskName);
    const title = trayTitle(p.running, p.remainingSec);
    if (title === lastTitleRef.current) return;
    lastTitleRef.current = title;
    bridge.updateTray(title).catch(console.error);
  }, [bridge]);

  return { pushTick };
}
