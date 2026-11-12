import type { Clue, GuessClue, PuzzleParams } from './types';

/** Tests the code stored at `buf[offset .. offset+L)` against a clue, without allocating. */
export type ClueMatcher = (buf: ArrayLike<number>, offset: number) => boolean;

function compileGuess(clue: GuessClue, params: PuzzleParams): ClueMatcher {
  const L = params.length;
  const guess = Uint8Array.from(clue.guess);
  const wantExact = clue.feedback.exact;
  const wantCommon = clue.feedback.exact + clue.feedback.misplaced;
  const guessCount = new Uint8Array(params.alphabetSize);
  for (let i = 0; i < L; i++) guessCount[guess[i] as number]!++;
  const used = new Uint8Array(params.alphabetSize);

  return (buf, offset) => {
    let exact = 0;
    for (let i = 0; i < L; i++) if (buf[offset + i] === guess[i]) exact++;
    if (exact !== wantExact) return false;
    let common = 0;
    for (let i = 0; i < L; i++) {
      const s = buf[offset + i] as number;
      if ((used[s] as number) < (guessCount[s] as number)) {
        used[s]!++;
        common++;
      }
    }
    for (let i = 0; i < L; i++) used[buf[offset + i] as number] = 0;
    return common === wantCommon;
  };
}

export function compileClue(clue: Clue, params: PuzzleParams): ClueMatcher {
  switch (clue.kind) {
    case 'guess':
      return compileGuess(clue, params);
    default: {
      const unreachable: never = clue.kind;
      throw new Error(`Unknown clue kind: ${String(unreachable)}`);
    }
  }
}

/** True when `code` is consistent with `clue`. */
export function clueHolds(clue: Clue, code: ArrayLike<number>, params: PuzzleParams): boolean {
  return compileClue(clue, params)(code, 0);
}

/**
 * Incremental view of a clue for depth-first searches that build a code one
 * position at a time. `push` records "position p holds symbol s" and tells whether
 * the clue can still be satisfied; every `push` must be undone with `pop`.
 *
 * `counts[s]` (shared with the search) is the number of times s was already
 * assigned, not counting the symbol being pushed or popped.
 */
export interface ClueTracker {
  push(position: number, symbol: number): boolean;
  pop(position: number, symbol: number): void;
}

function trackGuess(clue: GuessClue, params: PuzzleParams, counts: Uint8Array): ClueTracker {
  const L = params.length;
  const guess = Uint8Array.from(clue.guess);
  const wantExact = clue.feedback.exact;
  const wantCommon = clue.feedback.exact + clue.feedback.misplaced;
  const guessCount = new Uint8Array(params.alphabetSize);
  for (let i = 0; i < L; i++) guessCount[guess[i] as number]!++;
  let exact = 0;
  let common = 0;
  return {
    push(position, symbol) {
      if (guess[position] === symbol) exact++;
      if ((counts[symbol] as number) < (guessCount[symbol] as number)) common++;
      const left = L - 1 - position;
      return (
        exact <= wantExact &&
        common <= wantCommon &&
        exact + left >= wantExact &&
        common + left >= wantCommon
      );
    },
    pop(position, symbol) {
      if (guess[position] === symbol) exact--;
      if ((counts[symbol] as number) < (guessCount[symbol] as number)) common--;
    },
  };
}

export function compileTracker(clue: Clue, params: PuzzleParams, counts: Uint8Array): ClueTracker {
  switch (clue.kind) {
    case 'guess':
      return trackGuess(clue, params, counts);
    default: {
      const unreachable: never = clue.kind;
      throw new Error(`Unknown clue kind: ${String(unreachable)}`);
    }
  }
}
