/**
 * Score persistence boundary.
 *
 * The game never touches localStorage, fetch, or any backend directly — it only
 * knows this interface. Adding a global leaderboard later means writing one new
 * implementation (Supabase, Cloudflare Workers, AWS API Gateway, NCP — the game
 * does not care) and changing the single injection site in `main.ts`.
 */

export interface LeaderboardEntry {
  readonly name: string;
  readonly score: number;
}

export interface ScoreService {
  /** Personal best. Returns 0 when there is no record yet. */
  getBest(): Promise<number>;

  /**
   * Record a finished run. Returns true when it beat the previous best, so the
   * UI can celebrate without recomputing.
   */
  submit(score: number): Promise<boolean>;

  /**
   * Global ranking, best first. Local-only implementations return an empty
   * array — callers must handle that rather than assuming a populated board.
   */
  getLeaderboard(limit: number): Promise<readonly LeaderboardEntry[]>;
}
