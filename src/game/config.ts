/**
 * Single source of truth for every tunable number in the game.
 *
 * Nothing here imports Phaser. Balance changes happen in this file and nowhere
 * else — if a magic number appears in a scene, it belongs here instead.
 */

export interface FruitTier {
  /** Korean display name. */
  readonly name: string;
  /** Body radius in logical (480x800) pixels. */
  readonly radius: number;
  /** Fill colour as a 0xRRGGBB integer. */
  readonly color: number;
  /** Points awarded when a merge *creates* this tier. Tier 0 is never created. */
  readonly score: number;
}

/**
 * Progression ladder, smallest to largest. Scores are triangular numbers, so
 * each rung is worth meaningfully more than the sum of casual play below it.
 */
export const FRUIT_TIERS: readonly FruitTier[] = [
  { name: '체리', radius: 14, color: 0xe8384f, score: 0 },
  { name: '딸기', radius: 19, color: 0xf06292, score: 1 },
  { name: '포도', radius: 25, color: 0x9575cd, score: 3 },
  { name: '한라봉', radius: 31, color: 0xffb74d, score: 6 },
  { name: '오렌지', radius: 38, color: 0xff9800, score: 10 },
  { name: '사과', radius: 46, color: 0xef5350, score: 15 },
  { name: '배', radius: 54, color: 0xc0ca33, score: 21 },
  { name: '복숭아', radius: 63, color: 0xffab91, score: 28 },
  { name: '파인애플', radius: 73, color: 0xfdd835, score: 36 },
  { name: '멜론', radius: 84, color: 0xaed581, score: 45 },
  { name: '수박', radius: 96, color: 0x2e7d32, score: 55 },
] as const;

export const MAX_TIER = FRUIT_TIERS.length - 1;

/** Bonus for clearing a pair of max-tier fruits off the board. */
export const MAX_TIER_CLEAR_SCORE = 100;

/**
 * Relative spawn weights for the tiers a player can drop (tiers 0..4).
 * Weighted toward the small end so the board fills with mergeable material
 * rather than immediately clogging with oranges.
 */
export const DROP_WEIGHTS: readonly number[] = [30, 28, 22, 13, 7];

/** Logical canvas size. All game coordinates are in this space. */
export const LAYOUT = {
  width: 480,
  height: 800,
  /** Inner playfield edges. */
  wallLeft: 40,
  wallRight: 440,
  floorY: 780,
  wallThickness: 40,
  /** Y at which a held fruit hovers before release. */
  dropY: 96,
  /** Crossing this line for `dangerGraceMs` ends the run. */
  dangerY: 168,
} as const;

export const PHYSICS = {
  gravityY: 1.1,
  /** Above ~0.2 the pile never settles and fruit jitters forever. */
  restitution: 0.12,
  friction: 0.35,
  frictionStatic: 0.55,
  density: 0.001,
  /** Fruit dropped within this window of the last one is ignored. */
  dropCooldownMs: 380,
  /** How long a fruit may sit above the danger line before the run ends. */
  dangerGraceMs: 1400,
  /** Matter body speed below which a fruit counts as settled rather than falling. */
  settleSpeed: 0.7,
} as const;
