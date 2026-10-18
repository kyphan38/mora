import { describe, it, expect } from 'vitest';
import { CORNERS } from '../data/corners';
import { AMBIENTS } from '../data/sound';

describe('corner data', () => {
  it('every corner has its own description', () => {
    for (const c of CORNERS) expect(c.description.length).toBeGreaterThan(0);
    expect(new Set(CORNERS.map((c) => c.description)).size).toBe(CORNERS.length);
  });

  it('every paired ambient exists in AMBIENTS', () => {
    for (const c of CORNERS) expect(AMBIENTS).toContain(c.ambient);
  });
});
