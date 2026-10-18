import { slug } from '../core/soundFormat';
import { mediaUrl } from './sceneManifest';

// Default sounds live in Cloud Storage (defaults/audio/), like the scenes.
export const ambientUrl = (name: string) => mediaUrl(`defaults/audio/ambient/${slug(name)}.mp3`);
export const musicUrl = (name: string) => mediaUrl(`defaults/audio/music/${slug(name)}.mp3`);
