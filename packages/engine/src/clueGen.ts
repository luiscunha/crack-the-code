import { hasUniqueSolution } from './bruteforce';
import { compileClue } from './clues';
import { randInt, shuffle, weightedIndex, type Rng } from './rng';
import { score } from './score';
import { allCodes } from './space';
import type { Clue, Code, GuessClue, PuzzleParams } from './types';

/** Aesthetic knobs of the clue generator (spec §4), configurable per band. */
export interface ClueGenOptions {
  /** sharedWeights[i] = weight of a guess that shares i symbols with the secret. */
  sharedWeights: readonly number[];
  /** Maximum number of clues with feedback (0,0). */
  maxZeroClues: number;
  /** Give up when more raw clues than this are needed to reach uniqueness. */
  maxRawClues: number;
  /** Probability that a guess may repeat symbols (only when the params allow repeats). */
  repeatGuessChance: number;
}

export const DEFAULT_CLUE_GEN: ClueGenOptions = {
  sharedWeights: [1, 4, 4, 1],
  maxZeroClues: 1,
  maxRawClues: 14,
  repeatGuessChance: 0.35,
};

export function randomCode(params: PuzzleParams, rng: Rng): number[] {
  const { length: L, alphabetSize: K, allowRepeats } = params;
  if (allowRepeats) return Array.from({ length: L }, () => randInt(rng, K));
  const symbols = shuffle(
    rng,
    Array.from({ length: K }, (_, i) => i),
  );
  return symbols.slice(0, L);
}

/** Builds a guess that shares about `shared` symbols with the secret, in random positions. */
function makeGuess(
  params: PuzzleParams,
  secret: Code,
  shared: number,
  allowRepeatedSymbols: boolean,
  rng: Rng,
): number[] {
  const { length: L, alphabetSize: K } = params;
  const inSecret = new Set(secret);
  const outside: number[] = [];
  for (let s = 0; s < K; s++) if (!inSecret.has(s)) outside.push(s);
  shuffle(rng, outside);

  const fromSecret = shuffle(rng, [...secret]);
  if (!allowRepeatedSymbols) {
    // Distinct symbols only: drop duplicated secret symbols from the pool.
    const seen = new Set<number>();
    for (let i = fromSecret.length - 1; i >= 0; i--) {
      const s = fromSecret[i] as number;
      if (seen.has(s)) fromSecret.splice(i, 1);
      else seen.add(s);
    }
  }

  // Not enough outside symbols to fill the rest ⇒ share more.
  let n = Math.min(shared, fromSecret.length);
  if (!allowRepeatedSymbols) n = Math.max(n, L - outside.length);
  n = Math.min(n, fromSecret.length, L);

  const guess = fromSecret.slice(0, n);
  for (let i = 0; guess.length < L; i++) {
    if (outside.length > 0) {
      guess.push(
        allowRepeatedSymbols
          ? (outside[randInt(rng, outside.length)] as number)
          : (outside[i % outside.length] as number),
      );
    } else {
      guess.push(randInt(rng, K));
    }
  }
  return shuffle(rng, guess);
}

/**
 * Spec §4 steps 2–3: add informative guess clues until the secret is the only
 * candidate left. Returns null when the aesthetic limits cannot be met.
 */
export function generateClues(
  params: PuzzleParams,
  secret: Code,
  options: ClueGenOptions,
  rng: Rng,
): GuessClue[] | null {
  const space = allCodes(params);
  const L = space.length;
  let cands = new Int32Array(space.count);
  for (let i = 0; i < cands.length; i++) cands[i] = i;
  let remaining = cands.length;

  const clues: GuessClue[] = [];
  const seen = new Set<string>();
  let zeroClues = 0;
  const weights = options.sharedWeights.slice(0, L + 1);

  for (let tries = 0; remaining > 1; tries++) {
    if (tries > 400) return null;
    const shared = weightedIndex(rng, weights);
    const repeatOk = params.allowRepeats && rng() < options.repeatGuessChance;
    const guess = makeGuess(params, secret, shared, repeatOk, rng);
    const key = guess.join(',');
    if (seen.has(key)) continue;
    const feedback = score(secret, guess);
    if (feedback.exact === L) continue;
    const isZero = feedback.exact === 0 && feedback.misplaced === 0;
    if (isZero && zeroClues >= options.maxZeroClues) continue;

    const clue: GuessClue = { kind: 'guess', guess, feedback };
    const matches = compileClue(clue, params);
    const next = new Int32Array(remaining);
    let kept = 0;
    for (let i = 0; i < remaining; i++) {
      const idx = cands[i] as number;
      if (matches(space.data, idx * L)) next[kept++] = idx;
    }
    if (kept === remaining) continue; // tells nothing new
    seen.add(key);
    cands = next;
    remaining = kept;
    clues.push(clue);
    if (isZero) zeroClues++;
    if (clues.length > options.maxRawClues) return null;
  }
  return clues;
}

/**
 * Spec §4 step 4: visit the clues in seeded random order and drop each one whose
 * removal keeps the solution unique (and passes the optional `keep` predicate).
 * Never goes below `minClues`.
 */
export function minimizeClues<T extends Clue>(
  params: PuzzleParams,
  clues: readonly T[],
  rng: Rng,
  minClues = 0,
  accept: (trial: readonly T[]) => boolean = () => true,
): T[] {
  let current = [...clues];
  const order = shuffle(rng, [...clues]);
  for (const clue of order) {
    if (current.length <= minClues) break;
    const trial = current.filter((c) => c !== clue);
    if (!hasUniqueSolution(params, trial)) continue;
    if (!accept(trial)) continue;
    current = trial;
  }
  return current;
}
