import { compileClue } from './clues';
import { allCodes, codeAt } from './space';
import type { Clue, Code, PuzzleParams } from './types';

/**
 * Oracle: every code of the space consistent with all clues.
 * `limit` stops the scan early (use 2 to test uniqueness).
 */
export function candidates(
  params: PuzzleParams,
  clues: readonly Clue[],
  limit = Number.POSITIVE_INFINITY,
): Code[] {
  const space = allCodes(params);
  const matchers = clues.map((c) => compileClue(c, params));
  const L = space.length;
  const data = space.data;
  const out: Code[] = [];
  scan: for (let i = 0; i < space.count; i++) {
    const off = i * L;
    for (let m = 0; m < matchers.length; m++) {
      if (!(matchers[m] as (typeof matchers)[number])(data, off)) continue scan;
    }
    out.push(codeAt(space, i));
    if (out.length >= limit) break;
  }
  return out;
}

/** Number of consistent codes, capped at `limit`. */
export function countCandidates(
  params: PuzzleParams,
  clues: readonly Clue[],
  limit = Number.POSITIVE_INFINITY,
): number {
  const space = allCodes(params);
  const matchers = clues.map((c) => compileClue(c, params));
  const L = space.length;
  const data = space.data;
  let n = 0;
  scan: for (let i = 0; i < space.count; i++) {
    const off = i * L;
    for (let m = 0; m < matchers.length; m++) {
      if (!(matchers[m] as (typeof matchers)[number])(data, off)) continue scan;
    }
    if (++n >= limit) break;
  }
  return n;
}

export function hasUniqueSolution(params: PuzzleParams, clues: readonly Clue[]): boolean {
  return countCandidates(params, clues, 2) === 1;
}
