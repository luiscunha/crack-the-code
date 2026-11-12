import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { countCandidates } from '../src/bruteforce';
import { score } from '../src/score';
import { countSolutions, isUnique } from '../src/search';
import { allCodes, codeAt, spaceSize } from '../src/space';
import type { GuessClue } from '../src/types';
import { arbCode, arbParams, DIGITS3, REFERENCE_042, REFERENCE_459 } from './helpers';

describe('pruned search', () => {
  it('agrees with the oracle on the reference examples', () => {
    expect(countSolutions(DIGITS3, REFERENCE_459)).toBe(1);
    expect(countSolutions(DIGITS3, REFERENCE_042)).toBe(1);
    expect(isUnique(DIGITS3, REFERENCE_459)).toBe(true);
    // The classic puzzle is not minimal: it stays unique without the (0,0) clue.
    expect(isUnique(DIGITS3, REFERENCE_459.slice(1))).toBe(true);
    expect(isUnique(DIGITS3, REFERENCE_459.slice(0, 2))).toBe(false);
    expect(countSolutions(DIGITS3, [])).toBe(720);
    expect(countSolutions(DIGITS3, [], 2)).toBe(2);
  });

  it('counts exactly what brute force counts, for consistent and arbitrary clue sets', () => {
    fc.assert(
      fc.property(
        arbParams.chain((p) =>
          fc.tuple(
            fc.constant(p),
            fc.integer({ min: 0, max: spaceSize(p) - 1 }),
            fc.array(arbCode(p.length, p.alphabetSize), { minLength: 0, maxLength: 5 }),
            fc.boolean(),
            fc.integer({ min: 0, max: 2 }),
          ),
        ),
        ([params, secretIndex, guesses, truthful, noise]) => {
          const secret = codeAt(allCodes(params), secretIndex);
          const clues: GuessClue[] = guesses.map((guess, i) => {
            const feedback = score(secret, guess);
            // Untruthful sets exercise the zero-solution and odd-feedback paths.
            if (!truthful && i === 0) feedback.misplaced = (feedback.misplaced + noise) % (params.length + 1);
            return { kind: 'guess', guess, feedback };
          });
          expect(countSolutions(params, clues)).toBe(countCandidates(params, clues));
          expect(countSolutions(params, clues, 2)).toBe(countCandidates(params, clues, 2));
        },
      ),
      { numRuns: 150 },
    );
  });
});
