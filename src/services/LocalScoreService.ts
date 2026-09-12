import type { LeaderboardEntry, ScoreService } from './ScoreService';

const BEST_KEY = 'mergedrop.best';

/**
 * Browser-local implementation: personal best only, no global ranking.
 *
 * Every storage access is guarded — private browsing, disabled site data, and
 * embedded contexts can all make localStorage throw rather than return null.
 * A storage failure must never break the game, so reads fall back to 0.
 */
export class LocalScoreService implements ScoreService {
  async getBest(): Promise<number> {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      const value = Number(raw);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  async submit(score: number): Promise<boolean> {
    const best = await this.getBest();
    if (score <= best) return false;
    try {
      localStorage.setItem(BEST_KEY, String(score));
    } catch {
      // Storage unavailable — the run still counted for this session.
    }
    return true;
  }

  async getLeaderboard(): Promise<readonly LeaderboardEntry[]> {
    return [];
  }
}
