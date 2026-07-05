import { useEffect, useRef } from 'react';
import { type TimerState } from '../lib/timer';
import { type OsBridge, createOsBridge } from '../lib/os';
import { EV, buildTick, trayTitle } from '../lib/osFormat';

export function useOsSync(args: {
  bridge?: OsBridge;
  onToggle: () => void;
  onStop: () => void;
}): { pushTick: (timer: TimerState | null, taskName: string) => void } {
  const bridge = args.bridge ?? createOsBridge();

  const onToggleRef = useRef(args.onToggle);
  const onStopRef = useRef(args.onStop);

  // Keep refs up-to-date to avoid stale closures
  onToggleRef.current = args.onToggle;
  onStopRef.current = args.onStop;

  useEffect(() => {
    let active = true;
    let unlistenToggle: (() => void) | null = null;
    let unlistenStop: (() => void) | null = null;
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

      try {
        const unlistenS = await bridge.onEvent(EV.STOP, () => {
          if (active) onStopRef.current();
        });
        if (!active) {
          unlistenS();
        } else {
          unlistenStop = unlistenS;
        }
      } catch (err) {
        console.error('useOsSync listen STOP failed:', err);
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
      if (unlistenStop) {
        unlistenStop();
      }
    };
  }, [bridge]);

  const pushTick = (timer: TimerState | null, taskName: string) => {
    const p = buildTick(timer, taskName);
    const title = trayTitle(p.running, p.remainingSec);

    bridge.updateTray(title).catch(console.error);
  };

  return { pushTick };
}
