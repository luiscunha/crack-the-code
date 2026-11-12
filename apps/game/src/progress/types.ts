import type { BandId } from '@ctc/engine';
import type { Board } from '../state';

/** Best result on one campaign level. Only levels the player solved are stored. */
export interface LevelRecord {
  solved: boolean;
  /** Solved at least once with no wrong submission and no hint. */
  clean: boolean;
  bestTimeMs: number | null;
}

/** The first solve of one day's Daily Vault (what the share string shows). */
export interface DailyRecord {
  timeMs: number;
  hints: number;
  wrong: number;
  clean: boolean;
}

export interface FreeStats {
  solved: number;
}

export type GameSource = 'campaign' | 'daily' | 'free';

/**
 * The puzzle in progress, to resume after a reload. `ref` identifies the puzzle:
 * campaign → level id ("safe-03"), daily → date ("2026-11-12"), free → "band:seed".
 * Undo history is not kept.
 */
export interface SavedGame {
  source: GameSource;
  ref: string;
  board: Board;
  selected: number;
  wrongSubmissions: number;
  hintsUsed: number;
  /** Time played so far; resuming continues the clock from here. */
  elapsedMs: number;
}

/** Everything stored under `ctc:v1`. */
export interface Progress {
  version: 1;
  /** By level id. */
  campaign: Record<string, LevelRecord>;
  /** By UTC date YYYY-MM-DD. */
  daily: Record<string, DailyRecord>;
  free: Record<BandId, FreeStats>;
  current: SavedGame | null;
}

/** Result of a solved game, as recorded. */
export interface GameResult {
  timeMs: number;
  hints: number;
  wrong: number;
  clean: boolean;
}
