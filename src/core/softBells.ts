// M9: the end-of-block sound. Three soft bells over about 6 seconds, the
// first very quiet and each a little louder, so the end never startles. Pure.

export interface Bell {
  /** Seconds after the start. */
  at: number;
  /** Peak gain, 0..1. */
  gain: number;
  /** Seconds the bell rings out. */
  ring: number;
}

export const SOFT_BELLS: readonly Bell[] = [
  { at: 0, gain: 0.03, ring: 2.4 },
  { at: 2, gain: 0.07, ring: 2.6 },
  { at: 4, gain: 0.13, ring: 2.8 },
];

/** When the last bell has faded, in seconds. */
export const BELLS_END = Math.max(...SOFT_BELLS.map((b) => b.at + b.ring));

/** Music and ambient sit at this share of their level under the bells. */
export const DUCK = 0.3;

/** Each bell is two notes: E5 then A5 a little later, like the old chime. */
export const BELL_NOTES: readonly { freq: number; delay: number }[] = [
  { freq: 659.25, delay: 0 },
  { freq: 880, delay: 0.12 },
];
