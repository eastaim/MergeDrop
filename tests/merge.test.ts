import { describe, expect, it } from 'vitest';

import { DROP_WEIGHTS, FRUIT_TIERS, MAX_TIER, MAX_TIER_CLEAR_SCORE } from '../src/game/config';
import {
  canMerge,
  highestTier,
  isValidTier,
  pickDropTier,
  resolveMerge,
  tierRadius,
} from '../src/game/merge';

describe('isValidTier', () => {
  it('accepts every index in the ladder', () => {
    for (let t = 0; t <= MAX_TIER; t += 1) {
      expect(isValidTier(t)).toBe(true);
    }
  });

  it('rejects out-of-range, fractional and non-finite tiers', () => {
    for (const bad of [-1, MAX_TIER + 1, 1.5, NaN, Infinity]) {
      expect(isValidTier(bad)).toBe(false);
    }
  });
});

describe('canMerge', () => {
  it('merges equal tiers', () => {
    expect(canMerge(0, 0)).toBe(true);
    expect(canMerge(MAX_TIER, MAX_TIER)).toBe(true);
  });

  it('refuses unequal tiers', () => {
    expect(canMerge(0, 1)).toBe(false);
    expect(canMerge(4, 2)).toBe(false);
  });

  it('refuses invalid tiers even when they are equal', () => {
    expect(canMerge(-1, -1)).toBe(false);
    expect(canMerge(MAX_TIER + 1, MAX_TIER + 1)).toBe(false);
  });
});

describe('resolveMerge', () => {
  it('returns null when the pair does not merge', () => {
    expect(resolveMerge(1, 2)).toBeNull();
    expect(resolveMerge(-1, -1)).toBeNull();
  });

  it('promotes to the next tier and awards that tier score', () => {
    for (let t = 0; t < MAX_TIER; t += 1) {
      expect(resolveMerge(t, t)).toEqual({
        kind: 'promote',
        tier: t + 1,
        score: FRUIT_TIERS[t + 1].score,
      });
    }
  });

  it('clears the board pair instead of promoting past the ladder', () => {
    expect(resolveMerge(MAX_TIER, MAX_TIER)).toEqual({
      kind: 'clear',
      score: MAX_TIER_CLEAR_SCORE,
    });
  });

  it('never produces a tier above MAX_TIER', () => {
    for (let t = 0; t <= MAX_TIER; t += 1) {
      const outcome = resolveMerge(t, t);
      if (outcome?.kind === 'promote') {
        expect(outcome.tier).toBeLessThanOrEqual(MAX_TIER);
      }
    }
  });
});

describe('tierRadius', () => {
  it('matches the tier table', () => {
    expect(tierRadius(0)).toBe(FRUIT_TIERS[0].radius);
    expect(tierRadius(MAX_TIER)).toBe(FRUIT_TIERS[MAX_TIER].radius);
  });

  it('throws rather than returning undefined for a bad tier', () => {
    expect(() => tierRadius(MAX_TIER + 1)).toThrow(RangeError);
  });
});

describe('pickDropTier', () => {
  it('only ever returns a droppable tier', () => {
    for (let i = 0; i < 1000; i += 1) {
      const tier = pickDropTier(i / 1000);
      expect(tier).toBeGreaterThanOrEqual(0);
      expect(tier).toBeLessThan(DROP_WEIGHTS.length);
    }
  });

  it('maps the bottom of the range to tier 0 and the top to the last tier', () => {
    expect(pickDropTier(0)).toBe(0);
    expect(pickDropTier(0.999999)).toBe(DROP_WEIGHTS.length - 1);
  });

  it('honours the configured weights', () => {
    const total = DROP_WEIGHTS.reduce((a, b) => a + b, 0);
    const counts = new Array<number>(DROP_WEIGHTS.length).fill(0);
    const samples = 10_000;
    for (let i = 0; i < samples; i += 1) {
      counts[pickDropTier(i / samples)] += 1;
    }
    DROP_WEIGHTS.forEach((weight, tier) => {
      // Sampling the range uniformly reproduces the weights almost exactly.
      expect(counts[tier] / samples).toBeCloseTo(weight / total, 2);
    });
  });

  it('rejects values outside [0, 1)', () => {
    expect(() => pickDropTier(1)).toThrow(RangeError);
    expect(() => pickDropTier(-0.1)).toThrow(RangeError);
    expect(() => pickDropTier(NaN)).toThrow(RangeError);
  });
});

describe('highestTier', () => {
  it('returns 0 for an empty board', () => {
    expect(highestTier([])).toBe(0);
  });

  it('ignores invalid entries', () => {
    expect(highestTier([1, 99, 3, -5])).toBe(3);
  });
});
