import type { ClueGenOptions } from './clueGen';
import type { AlphabetKind, BandId, PuzzleParams, Tier } from './types';

export interface BandVariant {
  params: PuzzleParams;
  weight: number;
}

export interface BandConfig {
  id: BandId;
  /** Parameter sets this band draws from (seeded, weighted). */
  variants: readonly BandVariant[];
  /** Accepted range for the hardest technique the solver needs. */
  minTier: Tier;
  maxTier: Tier;
  minClues: number;
  maxClues: number;
  /** 'pedagogical' = in the order the solver first uses each clue (tutorial). */
  clueOrder: 'shuffled' | 'pedagogical';
  clueGen: ClueGenOptions;
}

function p(
  length: number,
  alphabetSize = 10,
  allowRepeats = false,
  alphabet: AlphabetKind = 'digits',
): PuzzleParams {
  return { length, alphabetSize, allowRepeats, alphabet };
}

const gen = (sharedWeights: number[], extra: Partial<ClueGenOptions> = {}): ClueGenOptions => ({
  sharedWeights,
  maxZeroClues: 1,
  maxRawClues: 14,
  repeatGuessChance: 0.35,
  startWithZeroClue: false,
  ...extra,
});

/** Difficulty bands (spec §6). Values calibrated in M2 — see docs/arquitetura.md. */
export const BANDS: Record<BandId, BandConfig> = {
  tutorial: {
    id: 'tutorial',
    variants: [{ params: p(3), weight: 1 }],
    minTier: 1,
    maxTier: 2,
    minClues: 5,
    maxClues: 6,
    clueOrder: 'pedagogical',
    clueGen: gen([2, 4, 3, 1], { startWithZeroClue: true }),
  },
  easy: {
    id: 'easy',
    variants: [{ params: p(3), weight: 1 }],
    minTier: 2,
    maxTier: 2,
    minClues: 4,
    maxClues: 6,
    clueOrder: 'shuffled',
    clueGen: gen([1, 4, 4, 1]),
  },
  medium: {
    id: 'medium',
    variants: [
      { params: p(3), weight: 1 },
      { params: p(4), weight: 1 },
    ],
    minTier: 3,
    maxTier: 3,
    minClues: 4,
    maxClues: 6,
    clueOrder: 'shuffled',
    clueGen: gen([1, 4, 4, 1]),
  },
  hard: {
    id: 'hard',
    variants: [{ params: p(4), weight: 1 }],
    minTier: 4,
    maxTier: 4,
    minClues: 4,
    maxClues: 5,
    clueOrder: 'shuffled',
    clueGen: gen([1, 4, 4, 2]),
  },
  expert: {
    id: 'expert',
    variants: [{ params: p(5), weight: 1 }],
    minTier: 4,
    maxTier: 5,
    minClues: 5,
    maxClues: 7,
    clueOrder: 'shuffled',
    clueGen: gen([1, 3, 4, 3, 1]),
  },
  master: {
    id: 'master',
    variants: [
      { params: p(5, 10, true), weight: 3 },
      { params: p(6, 6, true, 'colors'), weight: 2 },
    ],
    minTier: 5,
    maxTier: 5,
    minClues: 5,
    maxClues: 8,
    clueOrder: 'shuffled',
    clueGen: gen([1, 3, 4, 3, 1], { repeatGuessChance: 0.1, maxZeroClues: 0 }),
  },
};

export const BAND_IDS: readonly BandId[] = ['tutorial', 'easy', 'medium', 'hard', 'expert', 'master'];
