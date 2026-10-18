export interface NotifyBridge {
  notify(title: string, body: string): Promise<void>;
}

export const noopNotifyBridge: NotifyBridge = {
  notify: async () => {},
};

export function createNotifyBridge(): NotifyBridge {
  if (typeof Notification !== 'undefined') {
    return {
      // Permission is read at send time: it is usually granted after this bridge is made.
      async notify(title: string, body: string) {
        if (Notification.permission !== 'granted') return;
        try {
          // iOS home-screen apps only show notifications through the service worker.
          const reg = await navigator.serviceWorker?.getRegistration?.();
          if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png' });
          else new Notification(title, { body });
        } catch (err) {
          console.error('Browser Notification failed:', err);
        }
      },
    };
  }

  return noopNotifyBridge;
}
