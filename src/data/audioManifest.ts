import { slug } from '../lib/soundFormat';

export const ambientUrl = (name: string) => `/audio/ambient/${slug(name)}.mp3`;
export const musicUrl = (name: string) => `/audio/music/${slug(name)}.mp3`;
