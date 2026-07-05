import { slug } from '../lib/soundFormat';

export const sceneUrl = (name: string) => `/scenes/${slug(name)}.jpg`;
export const sceneVideoUrl = (name: string) => `/scenes/${slug(name)}.mp4`;
