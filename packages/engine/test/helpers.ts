import fc from 'fast-check';
import type { GuessClue, PuzzleParams } from '../src/types';

export const DIGITS3: PuzzleParams = {
  length: 3,
  alphabetSize: 10,
  allowRepeats: false,
  alphabet: 'digits',
};

/** "738", 0, 0 → guess clue. */
export function clue(guess: string, exact: number, misplaced: number): GuessClue {
  return { kind: 'guess', guess: [...guess].map(Number), feedback: { exact, misplaced } };
}

export const REFERENCE_459 = [
  clue('738', 0, 0),
  clue('289', 1, 0),
  clue('215', 0, 1),
  clue('942', 0, 2),
  clue('784', 0, 1),
];

export const REFERENCE_042 = [
  clue('682', 1, 0),
  clue('614', 0, 1),
  clue('206', 0, 2),
  clue('738', 0, 0),
  clue('780', 0, 1),
];

/** Arbitrary parameter sets small enough for fast property tests. */
export const arbParams: fc.Arbitrary<PuzzleParams> = fc
  .record({
    length: fc.integer({ min: 3, max: 5 }),
    alphabetSize: fc.integer({ min: 6, max: 10 }),
    allowRepeats: fc.boolean(),
  })
  .map((p) => ({ ...p, alphabet: 'digits' as const }));

export function arbCode(length: number, alphabetSize: number): fc.Arbitrary<number[]> {
  return fc.array(fc.integer({ min: 0, max: alphabetSize - 1 }), {
    minLength: length,
    maxLength: length,
  });
}
