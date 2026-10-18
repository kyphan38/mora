// Default scenes live in Cloud Storage (defaults/scenes/, public read).
// Without a bucket configured (tests, a bare checkout) the old /scenes/ paths are used.
const BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;

export function mediaUrl(path: string): string {
  if (!BUCKET) return `/${path.replace(/^defaults\//, '')}`;
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

export const sceneUrl = (id: string) => mediaUrl(`defaults/scenes/${id}.jpg`);
export const sceneVideoUrl = (id: string) => mediaUrl(`defaults/scenes/${id}.mp4`);

import type { Corner, UserScene } from '../types';

/** Image and video for any scene: uploaded ones carry their own URLs. */
export const sceneImage = (c: Corner) => c.image ?? sceneUrl(c.id);
export const sceneVideo = (c: Corner) => c.video ?? sceneVideoUrl(c.id);

export const USER_SCENE_PREFIX = 'u_';

export function cornerFromUserScene(s: UserScene): Corner {
  return {
    id: USER_SCENE_PREFIX + s.id,
    name: s.name,
    description: '',
    ambient: 'Wind',
    gradient: 'linear-gradient(135deg, #3a3a3a, #1a1a1a)',
    video: s.videoUrl,
    image: s.imageUrl,
  };
}
