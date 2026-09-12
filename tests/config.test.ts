import { describe, expect, it } from 'vitest';

import { DROP_WEIGHTS, FRUIT_TIERS, LAYOUT, MAX_TIER, PHYSICS } from '../src/game/config';

describe('fruit tier table', () => {
  it('grows monotonically in radius', () => {
    for (let t = 1; t <= MAX_TIER; t += 1) {
      expect(FRUIT_TIERS[t].radius).toBeGreaterThan(FRUIT_TIERS[t - 1].radius);
    }
  });

  it('grows monotonically in score above tier 0', () => {
    for (let t = 2; t <= MAX_TIER; t += 1) {
      expect(FRUIT_TIERS[t].score).toBeGreaterThan(FRUIT_TIERS[t - 1].score);
    }
  });

  it('never awards points for tier 0, which cannot be created by a merge', () => {
    expect(FRUIT_TIERS[0].score).toBe(0);
  });

  it('gives every tier a distinct name and colour', () => {
    expect(new Set(FRUIT_TIERS.map((f) => f.name)).size).toBe(FRUIT_TIERS.length);
    expect(new Set(FRUIT_TIERS.map((f) => f.color)).size).toBe(FRUIT_TIERS.length);
  });
});

describe('layout', () => {
  it('fits the largest fruit inside the playfield', () => {
    const innerWidth = LAYOUT.wallRight - LAYOUT.wallLeft;
    expect(FRUIT_TIERS[MAX_TIER].radius * 2).toBeLessThan(innerWidth);
  });

  it('leaves room to drop above the danger line', () => {
    expect(LAYOUT.dropY).toBeLessThan(LAYOUT.dangerY);
  });

  it('keeps the playfield inside the canvas', () => {
    expect(LAYOUT.wallLeft).toBeGreaterThan(0);
    expect(LAYOUT.wallRight).toBeLessThan(LAYOUT.width);
    expect(LAYOUT.floorY).toBeLessThan(LAYOUT.height);
  });
});

describe('drop weights', () => {
  it('covers a prefix of the ladder and stays well below the top', () => {
    expect(DROP_WEIGHTS.length).toBeGreaterThan(0);
    expect(DROP_WEIGHTS.length).toBeLessThan(MAX_TIER);
  });

  it('is strictly positive so no listed tier is unreachable', () => {
    for (const w of DROP_WEIGHTS) {
      expect(w).toBeGreaterThan(0);
    }
  });
});

describe('physics constants', () => {
  it('keeps restitution low enough for the pile to settle', () => {
    expect(PHYSICS.restitution).toBeLessThanOrEqual(0.2);
  });
});
