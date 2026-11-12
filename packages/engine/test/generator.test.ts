import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { BAND_IDS, BANDS } from '../src/bands';
import { candidates } from '../src/bruteforce';
import { generateAttempt, generatePuzzle } from '../src/generator';
import { gradeSteps } from '../src/grade';
import { score } from '../src/score';
import { solve } from '../src/solver';
import { isValidCode } from '../src/space';
import type { BandId, Puzzle } from '../src/types';

const PER_BAND = 500;

function checkPuzzle(puzzle: Puzzle, band: BandId): void {
  const config = BANDS[band];
  const { params, clues, solution, grade } = puzzle;

  // Rule 1: exactly one solution, verified by brute force.
  expect(candidates(params, clues)).toEqual([solution]);

  // Rule 2: the human solver solves it and agrees with brute force.
  const solved = solve(params, clues);
  expect(solved.status).toBe('solved');
  expect(solved.solution).toEqual(solution);

  // Rule 5: the stored grade is the solver's, and it fits the band.
  expect(grade).toEqual(gradeSteps(solved.steps, clues.length));
  expect(grade.maxTier).toBeGreaterThanOrEqual(config.minTier);
  expect(grade.maxTier).toBeLessThanOrEqual(config.maxTier);
  expect(clues.length).toBeGreaterThanOrEqual(config.minClues);
  expect(clues.length).toBeLessThanOrEqual(config.maxClues);

  // Shape and aesthetics.
  expect(puzzle.band).toBe(band);
  expect(config.variants.map((v) => v.params)).toContainEqual(params);
  expect(isValidCode(solution, params)).toBe(true);
  let zeroClues = 0;
  for (const clue of clues) {
    expect(clue.kind).toBe('guess');
    expect(clue.feedback).toEqual(score(solution, clue.guess));
    expect(clue.feedback.exact).toBeLessThan(params.length);
    if (clue.feedback.exact + clue.feedback.misplaced === 0) zeroClues++;
  }
  expect(zeroClues).toBeLessThanOrEqual(1);
}

describe('band generator', () => {
  for (const band of BAND_IDS) {
    it(`${band}: ${PER_BAND} puzzles — unique, solver = brute force, inside the band, ≥ 95% success`, () => {
      let produced = 0;
      for (let seed = 0; seed < PER_BAND; seed++) {
        const result = generatePuzzle(band, seed);
        if (!result) continue;
        produced++;
        expect(result.attempts).toBeLessThanOrEqual(20);
        checkPuzzle(result.puzzle, band);
      }
      expect(produced / PER_BAND).toBeGreaterThanOrEqual(0.95);
    });
  }

  it('is deterministic: same seed and band ⇒ same puzzle', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BAND_IDS), fc.integer(), (band, seed) => {
        const a = generatePuzzle(band, seed);
        const b = generatePuzzle(band, seed);
        expect(a).toEqual(b);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }),
      { numRuns: 40 },
    );
  });

  it('a puzzle is reproducible from its own stored seed and survives JSON', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BAND_IDS), fc.integer(), (band, seed) => {
        const result = generatePuzzle(band, seed);
        fc.pre(result !== null);
        const { puzzle } = result!;
        expect(generateAttempt(band, puzzle.seed)).toEqual(puzzle);
        expect(JSON.parse(JSON.stringify(puzzle))).toEqual(puzzle);
      }),
      { numRuns: 40 },
    );
  });

  it('pins known puzzles so cross-platform drift is caught', () => {
    const tutorial = generatePuzzle('tutorial', 1)!.puzzle;
    expect(tutorial.solution).toEqual([7, 8, 9]);
    expect(tutorial.clues.map((c) => c.guess.join(''))).toEqual(['326', '860', '894', '687', '706']);
  });

  it('tutorial puzzles open with a "nothing is right" clue', () => {
    for (let seed = 0; seed < 50; seed++) {
      const result = generatePuzzle('tutorial', seed);
      if (!result) continue;
      expect(result.puzzle.clues[0]?.feedback).toEqual({ exact: 0, misplaced: 0 });
    }
  });
});
