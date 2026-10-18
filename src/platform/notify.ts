import { isTauri } from './persistence';

export interface NotifyBridge {
  notify(title: string, body: string): Promise<void>;
}

export const noopNotifyBridge: NotifyBridge = {
  notify: async () => {},
};

export function createNotifyBridge(): NotifyBridge {
  if (isTauri()) {
    return {
      async notify(title: string, body: string) {
        try {
          const { isPermissionGranted, requestPermission, sendNotification } = await import(
            '@tauri-apps/plugin-notification'
          );
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
          }
          if (permissionGranted) {
            sendNotification({ title, body });
          }
        } catch (err) {
          console.error('Tauri notification failed:', err);
        }
      },
    };
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    return {
      async notify(title: string, body: string) {
        try {
          new Notification(title, { body });
        } catch (err) {
          console.error('Browser Notification failed:', err);
        }
      },
    };
  }

  return noopNotifyBridge;
}
