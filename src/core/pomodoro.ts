/**
 * Pomodoro break-scaling helper.
 *
 * Maps focus session duration to an appropriate break length.
 * Specific well-known durations get explicit mappings;
 * everything else uses a proportional formula clamped to 5–20 min.
 */

/** Break duration in seconds for a given focus duration in seconds. */
export function breakForSeconds(focusSec: number): number {
  // Count Up (0) → 10 min default break
  if (focusSec === 0) return 600;

  const known: Record<number, number> = {
    1500: 300,   // 25m → 5m
    3000: 600,   // 50m → 10m
    5400: 900,   // 1.5h → 15m
    7200: 1200,  // 2h → 20m
  };
  if (known[focusSec] !== undefined) return known[focusSec];

  // Fallback: ratio-based, clamped 5–20 min
  const focusMin = focusSec / 60;
  const breakMin = Math.min(20, Math.max(5, Math.round(focusMin / 5)));
  return breakMin * 60;
}

/** Duration options available in the "Focus again" picker (no Count Up). */
export const NEXT_DURATIONS: { label: string; seconds: number }[] = [
  { label: '25 min', seconds: 1500 },
  { label: '50 min', seconds: 3000 },
  { label: '1.5h', seconds: 5400 },
  { label: '2h', seconds: 7200 },
];
