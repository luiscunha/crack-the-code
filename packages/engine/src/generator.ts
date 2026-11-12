import { BANDS, type BandConfig } from './bands';
import { candidates } from './bruteforce';
import { generateClues, minimizeClues, randomCode } from './clueGen';
import { gradeSteps } from './grade';
import { deriveSeed, mulberry32, shuffle, weightedIndex } from './rng';
import { solve } from './solver';
import type { BandId, Clue, Puzzle, SolveResult } from './types';

function sameCode(a: ArrayLike<number> | null, b: ArrayLike<number>): boolean {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isZeroClue(clue: Clue): boolean {
  return clue.kind === 'guess' && clue.feedback.exact === 0 && clue.feedback.misplaced === 0;
}

/** Orders the clues by the moment the solver first needs each one. */
function pedagogicalOrder<T extends Clue>(clues: readonly T[], result: SolveResult): T[] {
  const order: number[] = [];
  for (const step of result.steps) {
    for (const id of step.clueIds) if (!order.includes(id)) order.push(id);
  }
  for (let i = 0; i < clues.length; i++) if (!order.includes(i)) order.push(i);
  return order.map((i) => clues[i] as T);
}

/**
 * One deterministic generation attempt (spec §4). Returns null when the result
 * falls outside the band; callers retry with a derived seed.
 */
export function generateAttempt(band: BandConfig | BandId, seed: number): Puzzle | null {
  const config = typeof band === 'string' ? BANDS[band] : band;
  const rng = mulberry32(seed);
  const variant = config.variants[weightedIndex(rng, config.variants.map((v) => v.weight))];
  if (!variant) return null;
  const params = variant.params;
  const { maxTier } = config;

  const secret = randomCode(params, rng);
  const raw = generateClues(params, secret, config.clueGen, rng);
  if (!raw || raw.length < config.minClues) return null;
  // Tier-aware minimisation: a clue only goes if the puzzle stays unique AND within the
  // band's tier. With maxTier 5 there is no ceiling to protect, so the solver runs once at the end.
  const capped = maxTier < 5;
  // Bands that open with a "nothing is right" clue keep it: it is the first lesson.
  const zeroClues = config.clueGen.startWithZeroClue ? raw.filter(isZeroClue).length : 0;
  const withinTier = (trial: readonly Clue[]): boolean =>
    trial.filter(isZeroClue).length >= zeroClues &&
    solve(params, trial, { maxTier }).status === 'solved';
  // Removing clues never makes a puzzle easier: if the full set is already too hard, give up.
  if (capped && !withinTier(raw)) return null;
  let clues: Clue[] = minimizeClues(
    params,
    raw,
    rng,
    config.minClues,
    capped ? withinTier : undefined,
  );
  if (clues.length > config.maxClues) return null;

  shuffle(rng, clues);
  if (config.clueOrder === 'pedagogical') {
    // "Nothing is right" first, then the order in which the solver needs each clue.
    clues.sort((a, b) => Number(isZeroClue(b)) - Number(isZeroClue(a)));
    clues = pedagogicalOrder(clues, solve(params, clues, { maxTier }));
  }

  const result = solve(params, clues, { maxTier });
  if (result.status !== 'solved') return null;
  const grade = gradeSteps(result.steps, clues.length);
  if (grade.maxTier < config.minTier) return null;

  // Final validation: brute force agrees with the solver and with the secret.
  const found = candidates(params, clues, 2);
  if (found.length !== 1 || !sameCode(found[0] ?? null, secret)) return null;
  if (!sameCode(result.solution, secret)) return null;

  return {
    id: `${config.id}-${(seed >>> 0).toString(16).padStart(8, '0')}`,
    seed: seed >>> 0,
    band: config.id,
    params,
    clues,
    solution: secret,
    grade,
  };
}

export interface GenerationResult {
  puzzle: Puzzle;
  /** Number of attempts used (1 = first try). */
  attempts: number;
}

/** Retries `generateAttempt` with seeds derived from `seed` until one fits the band. */
export function generatePuzzle(
  band: BandConfig | BandId,
  seed: number,
  maxAttempts = 20,
): GenerationResult | null {
  for (let i = 0; i < maxAttempts; i++) {
    const puzzle = generateAttempt(band, deriveSeed(seed, i));
    if (puzzle) return { puzzle, attempts: i + 1 };
  }
  return null;
}
