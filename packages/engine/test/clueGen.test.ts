import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { candidates, hasUniqueSolution } from '../src/bruteforce';
import { DEFAULT_CLUE_GEN, generateClues, minimizeClues, randomCode } from '../src/clueGen';
import { mulberry32 } from '../src/rng';
import { isValidCode } from '../src/space';
import type { GuessClue, PuzzleParams } from '../src/types';
import { arbParams } from './helpers';

function build(params: PuzzleParams, seed: number) {
  const rng = mulberry32(seed);
  const secret = randomCode(params, rng);
  const raw = generateClues(params, secret, DEFAULT_CLUE_GEN, rng);
  const clues = raw ? minimizeClues(params, raw, rng) : null;
  return { secret, raw, clues };
}

const isZero = (c: GuessClue) => c.feedback.exact === 0 && c.feedback.misplaced === 0;

describe('clue generation', () => {
  it('randomCode respects the parameters', () => {
    fc.assert(
      fc.property(arbParams, fc.integer(), (params, seed) => {
        expect(isValidCode(randomCode(params, mulberry32(seed)), params)).toBe(true);
      }),
    );
  });

  it('every generated clue set has exactly one solution: the secret', () => {
    fc.assert(
      fc.property(arbParams, fc.integer(), (params, seed) => {
        const { secret, raw, clues } = build(params, seed);
        fc.pre(raw !== null && clues !== null);
        expect(candidates(params, raw!)).toEqual([secret]);
        expect(candidates(params, clues!)).toEqual([secret]);
      }),
      { numRuns: 150 },
    );
  });

  it('is deterministic: same seed and params ⇒ same puzzle', () => {
    fc.assert(
      fc.property(arbParams, fc.integer(), (params, seed) => {
        expect(build(params, seed)).toEqual(build(params, seed));
      }),
      { numRuns: 60 },
    );
  });

  it('respects the aesthetic rules', () => {
    fc.assert(
      fc.property(arbParams, fc.integer(), (params, seed) => {
        const { raw } = build(params, seed);
        fc.pre(raw !== null);
        expect(raw!.filter(isZero).length).toBeLessThanOrEqual(DEFAULT_CLUE_GEN.maxZeroClues);
        const guesses = new Set<string>();
        for (const c of raw!) {
          expect(c.feedback.exact).toBeLessThan(params.length);
          expect(c.guess).toHaveLength(params.length);
          if (!params.allowRepeats) expect(isValidCode(c.guess, params)).toBe(true);
          guesses.add(c.guess.join(','));
        }
        expect(guesses.size).toBe(raw!.length);
      }),
      { numRuns: 100 },
    );
  });

  it('minimisation leaves no redundant clue and honours minClues', () => {
    fc.assert(
      fc.property(arbParams, fc.integer(), (params, seed) => {
        const { raw, clues } = build(params, seed);
        fc.pre(raw !== null && clues !== null);
        for (const c of clues!) {
          expect(hasUniqueSolution(params, clues!.filter((x) => x !== c))).toBe(false);
        }
        const floor = Math.min(raw!.length, clues!.length + 1);
        const kept = minimizeClues(params, raw!, mulberry32(seed), floor);
        expect(kept.length).toBeGreaterThanOrEqual(floor);
        expect(hasUniqueSolution(params, kept)).toBe(true);
      }),
      { numRuns: 60 },
    );
  });

  it('almost always succeeds with the default options', () => {
    const params: PuzzleParams = {
      length: 4,
      alphabetSize: 10,
      allowRepeats: false,
      alphabet: 'digits',
    };
    let ok = 0;
    for (let seed = 0; seed < 200; seed++) if (build(params, seed).raw) ok++;
    expect(ok).toBeGreaterThanOrEqual(190);
  });
});
