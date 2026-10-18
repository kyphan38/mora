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

import { useStore } from '../store/useStore';

describe('removed scenes', () => {
  it('a saved scene that no longer exists falls back to a current one', () => {
    useStore.getState().hydrate({
      corner: { id: 'scene_971b43', name: 'Cozy Garden Cafe', description: '', ambient: 'Wind', gradient: '' },
    });
    expect(CORNERS.map((c) => c.id)).toContain(useStore.getState().corner?.id);
  });
});
