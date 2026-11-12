/** Sequence of L symbol indices, each in 0..K-1. */
export type Code = readonly number[];

export interface Feedback {
  /** Right symbol in the right position. */
  exact: number;
  /** Right symbol in the wrong position. */
  misplaced: number;
}

export type AlphabetKind = 'digits' | 'colors' | 'letters';

export interface PuzzleParams {
  /** L: code length (3–6). */
  length: number;
  /** K: number of distinct symbols. */
  alphabetSize: number;
  allowRepeats: boolean;
  /** Presentation only; the engine works on symbol indices. */
  alphabet: AlphabetKind;
}

/** A shown guess with its Mastermind feedback. */
export interface GuessClue {
  kind: 'guess';
  guess: Code;
  feedback: Feedback;
}

/**
 * Discriminated union on `kind`. v1 only has guess clues; the extended clues of
 * spec §7 (sum, parity, position…) become new members here, and the exhaustive
 * switch in `compileClue` forces every consumer to handle them.
 */
export type Clue = GuessClue;

export type Tier = 1 | 2 | 3 | 4 | 5;

export type Technique =
  | 'elimination'
  | 'positional-exclusion'
  | 'simple-count'
  | 'fixation'
  | 'only-position'
  | 'symbols-complete'
  | 'clue-consistency'
  | 'clue-crossing'
  | 'hypothesis';

export interface Cell {
  position: number;
  symbol: number;
}

export interface StepEffect {
  /** Values removed from position domains. */
  removed: Cell[];
  /** Positions that became fixed to a single symbol. */
  placed: Cell[];
  /** Symbols newly known to be in the code. */
  symbolsIn: number[];
  /** Symbols newly known to be absent from the code. */
  symbolsOut: number[];
}

export interface SolveStep {
  technique: Technique;
  tier: Tier;
  /** Indices into the clue list the solver was given. */
  clueIds: number[];
  effect: StepEffect;
  /** T5 only: the assumption that led to a contradiction. */
  hypothesis?: Cell;
}

export interface SolveResult {
  status: 'solved' | 'blocked';
  solution: Code | null;
  steps: SolveStep[];
}

export interface Grade {
  maxTier: Tier;
  stepsAtMaxTier: number;
  totalSteps: number;
  clueCount: number;
  difficultyScore: number;
}

export type BandId = 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert' | 'master';

export interface Puzzle {
  id: string;
  /** Seed of the successful attempt: reproduces this puzzle on its own. */
  seed: number;
  band: BandId;
  params: PuzzleParams;
  clues: Clue[];
  solution: Code;
  grade: Grade;
}
