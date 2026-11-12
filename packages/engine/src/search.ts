import { compileTracker } from './clues';
import type { Clue, PuzzleParams } from './types';

/**
 * Number of codes consistent with all clues (capped at `limit`), by depth-first
 * search that abandons a prefix as soon as any clue becomes unsatisfiable.
 * Same answer as the brute-force `countCandidates`, orders of magnitude fewer
 * nodes — used where uniqueness is tested many times (minimisation).
 * Positions are assigned left to right, as the trackers assume.
 */
export function countSolutions(
  params: PuzzleParams,
  clues: readonly Clue[],
  limit = Number.POSITIVE_INFINITY,
): number {
  const { length: L, alphabetSize: K, allowRepeats } = params;
  const counts = new Uint8Array(K);
  const trackers = clues.map((c) => compileTracker(c, params, counts));
  const n = trackers.length;
  let found = 0;

  const visit = (p: number): void => {
    for (let s = 0; s < K && found < limit; s++) {
      if (!allowRepeats && counts[s]) continue;
      let ok = true;
      for (let c = 0; c < n; c++) {
        if (!(trackers[c] as (typeof trackers)[number]).push(p, s)) ok = false;
      }
      if (ok) {
        if (p === L - 1) {
          found++;
        } else {
          counts[s]!++;
          visit(p + 1);
          counts[s]!--;
        }
      }
      for (let c = 0; c < n; c++) (trackers[c] as (typeof trackers)[number]).pop(p, s);
    }
  };
  visit(0);
  return found;
}

export function isUnique(params: PuzzleParams, clues: readonly Clue[]): boolean {
  return countSolutions(params, clues, 2) === 1;
}
