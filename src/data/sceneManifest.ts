// Default scenes live in Cloud Storage (defaults/scenes/, public read).
// Without a bucket configured (tests, a bare checkout) the old /scenes/ paths are used.
const BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;

export function mediaUrl(path: string): string {
  if (!BUCKET) return `/${path.replace(/^defaults\//, '')}`;
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

export const sceneUrl = (id: string) => mediaUrl(`defaults/scenes/${id}.jpg`);
export const sceneVideoUrl = (id: string) => mediaUrl(`defaults/scenes/${id}.mp4`);
