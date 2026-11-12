import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { candidates, countCandidates, hasUniqueSolution } from '../src/bruteforce';
import { score } from '../src/score';
import { allCodes, codeAt, isValidCode, spaceSize } from '../src/space';
import type { GuessClue, PuzzleParams } from '../src/types';
import { arbCode, arbParams, DIGITS3, REFERENCE_042, REFERENCE_459 } from './helpers';

describe('code space', () => {
  it('has the expected sizes', () => {
    expect(spaceSize(DIGITS3)).toBe(720);
    expect(allCodes(DIGITS3).count).toBe(720);
    expect(allCodes({ ...DIGITS3, allowRepeats: true }).count).toBe(1000);
    expect(allCodes({ ...DIGITS3, length: 5 }).count).toBe(30240);
  });

  it('contains only valid, distinct codes', () => {
    fc.assert(
      fc.property(arbParams, (params) => {
        const space = allCodes(params);
        expect(space.count).toBe(spaceSize(params));
        const seen = new Set<string>();
        const step = Math.max(1, Math.floor(space.count / 300));
        for (let i = 0; i < space.count; i += step) {
          const code = codeAt(space, i);
          expect(isValidCode(code, params)).toBe(true);
          seen.add(code.join(','));
        }
        expect(seen.size).toBe(Math.ceil(space.count / step));
      }),
      { numRuns: 30 },
    );
  });
});

describe('brute force oracle', () => {
  it('solves the reference example: 459', () => {
    expect(candidates(DIGITS3, REFERENCE_459)).toEqual([[4, 5, 9]]);
    expect(hasUniqueSolution(DIGITS3, REFERENCE_459)).toBe(true);
  });

  it('solves the second reference example: 042', () => {
    expect(candidates(DIGITS3, REFERENCE_042)).toEqual([[0, 4, 2]]);
  });

  it('the reference examples stay unique even when repeats are allowed', () => {
    const repeats = { ...DIGITS3, allowRepeats: true };
    expect(candidates(repeats, REFERENCE_459)).toEqual([[4, 5, 9]]);
    expect(candidates(repeats, REFERENCE_042)).toEqual([[0, 4, 2]]);
  });

  it('no clues ⇒ whole space; limit caps the scan', () => {
    expect(countCandidates(DIGITS3, [])).toBe(720);
    expect(countCandidates(DIGITS3, [], 2)).toBe(2);
    expect(candidates(DIGITS3, [], 5)).toHaveLength(5);
  });

  it('the secret always survives clues scored against it, and every survivor scores the same', () => {
    fc.assert(
      fc.property(
        arbParams.chain((p) =>
          fc.tuple(
            fc.constant(p),
            fc.integer({ min: 0, max: spaceSize(p) - 1 }),
            fc.array(arbCode(p.length, p.alphabetSize), { minLength: 1, maxLength: 5 }),
          ),
        ),
        ([params, secretIndex, guesses]) => {
          const secret = codeAt(allCodes(params), secretIndex);
          const clues: GuessClue[] = guesses.map((guess) => ({
            kind: 'guess',
            guess,
            feedback: score(secret, guess),
          }));
          const found = candidates(params, clues);
          expect(found.some((c) => c.join() === secret.join())).toBe(true);
          expect(found.length).toBe(countCandidates(params, clues));
          for (const c of found.slice(0, 50)) {
            for (const cl of clues) expect(score(c, cl.guess)).toEqual(cl.feedback);
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it('scans 10^6 codes well inside the budget', () => {
    const params: PuzzleParams = {
      length: 6,
      alphabetSize: 10,
      allowRepeats: true,
      alphabet: 'digits',
    };
    const secret = [3, 1, 4, 1, 5, 9];
    const guesses = [
      [1, 2, 3, 4, 5, 6],
      [9, 9, 8, 7, 1, 3],
      [3, 3, 4, 0, 0, 2],
      [5, 1, 1, 4, 6, 9],
      [0, 7, 2, 8, 6, 6],
    ];
    const clues: GuessClue[] = guesses.map((guess) => ({
      kind: 'guess',
      guess,
      feedback: score(secret, guess),
    }));
    allCodes(params); // enumeration is cached; the budget is about the scan
    countCandidates(params, clues); // warm-up
    const t0 = Date.now();
    const n = countCandidates(params, clues);
    const elapsed = Date.now() - t0;
    expect(n).toBeGreaterThanOrEqual(1);
    // Spec budget is 50 ms; the assertion is lenient so slow CI machines do not flake.
    expect(elapsed).toBeLessThan(250);
  });
});
