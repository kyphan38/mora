export function volumeToGain(v: number): number {
  const clamped = Math.max(0, Math.min(100, v));
  return clamped / 100;
}

export interface NotificationPayload {
  title: string;
  body: string;
}

export function sessionCompleteNotification(taskName: string): NotificationPayload {
  const trimmed = taskName.trim();
  return {
    title: 'Session complete',
    body: trimmed ? `${trimmed} · nice work` : 'Nice work',
  };
}

export function slug(name: string): string {
  const result = name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return result === 'lo-fi' ? 'lofi' : result;
}
