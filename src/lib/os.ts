import { isTauri } from './persistence';
import { EV } from './osFormat';

export interface OsBridge {
  updateTray(title: string): Promise<void>;
  showWidget(): Promise<void>;
  hideWidget(): Promise<void>;
  emit(event: string, payload?: unknown): Promise<void>;
  onEvent(event: string, cb: (payload: any) => void): Promise<() => void>; // returns unlisten
  registerHotkey(accelerator: string, cb: () => void): Promise<void>;
  unregisterHotkey(accelerator: string): Promise<void>;
}

export const noopOsBridge: OsBridge = {
  updateTray: async () => {},
  showWidget: async () => {},
  hideWidget: async () => {},
  emit: async () => {},
  onEvent: async () => () => {},
  registerHotkey: async () => {},
  unregisterHotkey: async () => {},
};

let trayPromise: Promise<any> | null = null;

export function createOsBridge(): OsBridge {
  if (!isTauri()) {
    return noopOsBridge;
  }

  return {
    async updateTray(title: string) {
      if (!trayPromise) {
        trayPromise = (async () => {
          try {
            const { TrayIcon } = await import('@tauri-apps/api/tray');
            const { Menu } = await import('@tauri-apps/api/menu');
            const { MenuItem } = await import('@tauri-apps/api/menu/menuItem');
            const { PredefinedMenuItem } = await import('@tauri-apps/api/menu/predefinedMenuItem');
            const { emit } = await import('@tauri-apps/api/event');
            const { Window } = await import('@tauri-apps/api/window');

            let tray = await TrayIcon.getById('mora');
            if (!tray) {
              const toggleItem = await MenuItem.new({
                id: 'toggle',
                text: 'Resume/Pause',
                action: async () => {
                  await emit(EV.TOGGLE);
                },
              });

              const openItem = await MenuItem.new({
                id: 'open',
                text: 'Open mora',
                action: async () => {
                  const main = await Window.getByLabel('main');
                  if (main) {
                    await main.show();
                    await main.setFocus();
                  }
                },
              });

              const quitItem = await PredefinedMenuItem.new({
                item: 'Quit',
              });

              const menu = await Menu.new({
                items: [toggleItem, openItem, quitItem],
              });

              tray = await TrayIcon.new({
                id: 'mora',
                menu,
                tooltip: 'mora',
              });
            }
            return tray;
          } catch (err) {
            console.error('Failed to create tray icon:', err);
            return null;
          }
        })();
      }

      const tray = await trayPromise;
      if (tray) {
        await tray.setTitle(title);
      }
    },

    async showWidget() {},
    async hideWidget() {},

    async emit(event: string, payload?: unknown) {
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit(event, payload);
      } catch (err) {
        console.error('Failed to emit event:', err);
      }
    },

    async onEvent(event: string, cb: (payload: any) => void) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen(event, (e) => {
          cb(e.payload);
        });
        return unlisten;
      } catch (err) {
        console.error('Failed to register event listener:', err);
        return () => {};
      }
    },

    async registerHotkey(accelerator: string, cb: () => void) {
      try {
        const { register } = await import('@tauri-apps/plugin-global-shortcut');
        await register(accelerator, (event) => {
          if (event.state === 'Pressed') {
            cb();
          }
        });
      } catch (err) {
        console.error('Failed to register hotkey:', err);
      }
    },

    async unregisterHotkey(accelerator: string) {
      try {
        const { unregister } = await import('@tauri-apps/plugin-global-shortcut');
        await unregister(accelerator);
      } catch (err) {
        console.error('Failed to unregister hotkey:', err);
      }
    },
  };
}
