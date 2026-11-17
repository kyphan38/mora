// M10: scenes that fit the time of day. Pure.

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** morning 05-11, afternoon 11-17, evening 17-21, night 21-05 (local hour). */
export function dayPartOf(hour: number): DayPart {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

const M: DayPart = 'morning';
const A: DayPart = 'afternoon';
const E: DayPart = 'evening';
const N: DayPart = 'night';

/** Hand tags for the default scenes, from their names. A scene may fit two parts. */
export const SCENE_PARTS: Record<string, readonly DayPart[]> = {
  scene_887eec: [E, N], // quiet reading jazz
  scene_e3f92c: [E, N], // fireplace lounge
  scene_0a850b: [E, N], // evening living room
  scene_850ce5: [M, A], // window corner
  scene_185b83: [A, E], // warm cafe jazz
  scene_2459b0: [A], // porch, slow afternoon
  scene_072605: [E, N], // cabin, fire on
  scene_6be729: [E], // ocean sunset
  scene_8fcbb2: [M, A], // alpine lake chalet
  scene_5eefed: [M, A], // mountain road
  scene_b4529d: [M], // misty valley lake
  scene_61ddfb: [N], // night city
  scene_e7db50: [N], // night coffee kiosk
  scene_85308c: [M], // spring park path
  scene_579866: [A], // valley drive
  scene_1cbf6f: [M, A], // glacier lake
  scene_8e6788: [E, N], // dim reading hall
  scene_8b843c: [M], // walking toward mountains
  scene_7eb481: [A], // bright mountain terrace
  scene_a33260: [A, E], // warm-lit coffee stall
  scene_b088d1: [M, A], // alpine village
  scene_2ccd1e: [N], // late desk lamp
  scene_5b831a: [M, A], // garden kiosk
  scene_5df6fd: [M], // coffee bags, white shelf
  scene_72bf2a: [M, A], // minimal coffee bar
  scene_16902e: [A], // dolomite meadows
  scene_12f142: [E, N], // evening coffee window
  scene_2182a9: [M], // lakeside village
  scene_1a56c6: [M], // misty pine forest
  scene_209863: [M], // corner bakery
  scene_17dc86: [M], // flower shop morning
  scene_56d7f9: [A], // jungle waterfall
  scene_f29f23: [A], // park afternoon
  scene_3d442a: [E], // cafe window evening
};

/** Own uploads and untagged scenes fit every part. */
export function fits(id: string, part: DayPart): boolean {
  const parts = SCENE_PARTS[id];
  return !parts || parts.includes(part);
}

/**
 * A random scene that fits, other than the current one when possible.
 * Null when none fits (then the scene stays).
 */
export function pickForPart<T extends { id: string }>(list: readonly T[], part: DayPart, currentId: string | null, rand: () => number = Math.random): T | null {
  const fit = list.filter((c) => fits(c.id, part));
  if (fit.length === 0) return null;
  const pool = fit.length > 1 ? fit.filter((c) => c.id !== currentId) : fit;
  return pool[Math.floor(rand() * pool.length)] ?? null;
}
