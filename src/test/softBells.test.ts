import { describe, expect, it } from 'vitest';
import { BELLS_END, SOFT_BELLS } from '../core/softBells';

describe('soft bells (M9)', () => {
  it('rings three times, each louder', () => {
    expect(SOFT_BELLS).toHaveLength(3);
    for (let i = 1; i < SOFT_BELLS.length; i++) {
      expect(SOFT_BELLS[i].gain).toBeGreaterThan(SOFT_BELLS[i - 1].gain);
      expect(SOFT_BELLS[i].at).toBeGreaterThan(SOFT_BELLS[i - 1].at);
    }
  });
  it('stays quiet and ends in about 6-7 seconds', () => {
    expect(Math.max(...SOFT_BELLS.map((b) => b.gain))).toBeLessThanOrEqual(0.15);
    expect(BELLS_END).toBeGreaterThan(5.5);
    expect(BELLS_END).toBeLessThan(7.5);
  });
});
