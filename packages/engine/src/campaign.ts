import type { BandId, Puzzle } from './types';

/**
 * Campaign model (spec §8, docs/arquitetura.md M4). Levels are generated offline by
 * the CLI (`pnpm --filter cli campaign`) and shipped as JSON; the game only reads them.
 */

export type WorldId = 'locker' | 'safe' | 'bank' | 'museum' | 'casino';

export interface WorldConfig {
  id: WorldId;
  /** Bands in play order and how many levels each contributes. */
  bands: readonly { band: BandId; count: number }[];
}

/** Five worlds × 12 levels. Display names live in the game's i18n. */
export const WORLDS: readonly WorldConfig[] = [
  { id: 'locker', bands: [{ band: 'tutorial', count: 6 }, { band: 'easy', count: 6 }] },
  { id: 'safe', bands: [{ band: 'medium', count: 12 }] },
  { id: 'bank', bands: [{ band: 'hard', count: 12 }] },
  { id: 'museum', bands: [{ band: 'expert', count: 12 }] },
  { id: 'casino', bands: [{ band: 'master', count: 12 }] },
];

export interface CampaignLevel {
  /** Stable id used in progress and links, e.g. "safe-03". */
  id: string;
  world: WorldId;
  /** 0-based position inside the world. */
  index: number;
  band: BandId;
  /** Seed given to generatePuzzle (puzzle.seed is the successful attempt's). */
  seed: number;
  puzzle: Puzzle;
}

export interface CampaignWorld {
  id: WorldId;
  levels: CampaignLevel[];
}

export interface CampaignData {
  version: 1;
  worlds: CampaignWorld[];
}
