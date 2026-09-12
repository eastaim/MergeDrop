/**
 * Merge rules. Pure functions only — this module must never import Phaser, so
 * the entire rule set stays testable without booting a game.
 *
 * Scenes are responsible for physics and rendering; they hand collision facts
 * to these functions and act on the returned outcome.
 */

import { DROP_WEIGHTS, FRUIT_TIERS, MAX_TIER, MAX_TIER_CLEAR_SCORE } from './config';

/** What a collision between two fruits should do. */
export type MergeOutcome =
  /** Both fruits are replaced by one fruit of `tier`, worth `score`. */
  | { readonly kind: 'promote'; readonly tier: number; readonly score: number }
  /** Both fruits are removed and nothing spawns (two max-tier fruits met). */
  | { readonly kind: 'clear'; readonly score: number };

export function isValidTier(tier: number): boolean {
  return Number.isInteger(tier) && tier >= 0 && tier <= MAX_TIER;
}

/** Two fruits merge only when they are the same, valid tier. */
export function canMerge(a: number, b: number): boolean {
  return isValidTier(a) && isValidTier(b) && a === b;
}

/**
 * Resolve a collision. Returns `null` when the pair does not merge, so callers
 * can treat "no merge" and "merge" through one branch.
 */
export function resolveMerge(a: number, b: number): MergeOutcome | null {
  if (!canMerge(a, b)) return null;
  if (a === MAX_TIER) {
    return { kind: 'clear', score: MAX_TIER_CLEAR_SCORE };
  }
  const tier = a + 1;
  return { kind: 'promote', tier, score: FRUIT_TIERS[tier].score };
}

export function tierRadius(tier: number): number {
  if (!isValidTier(tier)) {
    throw new RangeError(`tier out of range: ${tier}`);
  }
  return FRUIT_TIERS[tier].radius;
}

/**
 * Pick the next droppable tier from a uniform random value in [0, 1).
 *
 * Taking the random number as an argument rather than calling Math.random()
 * keeps this deterministic and testable; the caller owns the RNG.
 */
export function pickDropTier(random: number): number {
  if (!(random >= 0 && random < 1)) {
    throw new RangeError(`random must be in [0, 1): ${random}`);
  }
  const total = DROP_WEIGHTS.reduce((sum, w) => sum + w, 0);
  let threshold = random * total;
  for (let tier = 0; tier < DROP_WEIGHTS.length; tier += 1) {
    threshold -= DROP_WEIGHTS[tier];
    if (threshold < 0) return tier;
  }
  // Unreachable for valid input; guards against float drift at the top of the range.
  return DROP_WEIGHTS.length - 1;
}

/** Largest tier the player has reached, used for the progress indicator. */
export function highestTier(tiers: readonly number[]): number {
  return tiers.reduce((max, t) => (isValidTier(t) && t > max ? t : max), 0);
}
