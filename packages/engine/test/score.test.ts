import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { score } from '../src/score';
import { clueHolds } from '../src/clues';
import { arbCode } from './helpers';

const arbPair = fc
  .record({ L: fc.integer({ min: 1, max: 6 }), K: fc.integer({ min: 2, max: 10 }) })
  .chain(({ L, K }) => fc.tuple(arbCode(L, K), arbCode(L, K), fc.constant(K)));

describe('score', () => {
  it('handles the textbook cases', () => {
    expect(score([4, 5, 9], [7, 3, 8])).toEqual({ exact: 0, misplaced: 0 });
    expect(score([4, 5, 9], [2, 8, 9])).toEqual({ exact: 1, misplaced: 0 });
    expect(score([4, 5, 9], [9, 4, 2])).toEqual({ exact: 0, misplaced: 2 });
    expect(score([4, 5, 9], [9, 4, 5])).toEqual({ exact: 0, misplaced: 3 });
  });

  it('is correct with repeated symbols', () => {
    expect(score([1, 1, 2, 2], [1, 2, 1, 2])).toEqual({ exact: 2, misplaced: 2 });
    expect(score([1, 1, 1, 2], [2, 2, 2, 1])).toEqual({ exact: 0, misplaced: 2 });
    expect(score([1, 1, 3, 4], [1, 5, 1, 1])).toEqual({ exact: 1, misplaced: 1 });
    expect(score([0, 0, 0], [0, 1, 2])).toEqual({ exact: 1, misplaced: 0 });
  });

  it('rejects mismatched lengths', () => {
    expect(() => score([1, 2], [1, 2, 3])).toThrow();
  });

  it('exact + misplaced ≤ L, both non-negative', () => {
    fc.assert(
      fc.property(arbPair, ([a, b]) => {
        const f = score(a, b);
        expect(f.exact).toBeGreaterThanOrEqual(0);
        expect(f.misplaced).toBeGreaterThanOrEqual(0);
        expect(f.exact + f.misplaced).toBeLessThanOrEqual(a.length);
      }),
    );
  });

  it('is symmetric: score(a, b) = score(b, a)', () => {
    fc.assert(
      fc.property(arbPair, ([a, b]) => {
        expect(score(a, b)).toEqual(score(b, a));
      }),
    );
  });

  it('score(x, x) = { L, 0 }', () => {
    fc.assert(
      fc.property(arbPair, ([a]) => {
        expect(score(a, a)).toEqual({ exact: a.length, misplaced: 0 });
      }),
    );
  });

  it('exact = L only for identical codes', () => {
    fc.assert(
      fc.property(arbPair, ([a, b]) => {
        expect(score(a, b).exact === a.length).toBe(a.join() === b.join());
      }),
    );
  });

  it('compiled matchers agree with score', () => {
    fc.assert(
      fc.property(arbPair, arbPair, ([a, b, K], [, , seedish]) => {
        const params = {
          length: a.length,
          alphabetSize: K,
          allowRepeats: true,
          alphabet: 'digits' as const,
        };
        const truth = score(a, b);
        expect(clueHolds({ kind: 'guess', guess: b, feedback: truth }, a, params)).toBe(true);
        const wrong = { exact: truth.exact, misplaced: truth.misplaced + 1 + (seedish % 2) };
        expect(clueHolds({ kind: 'guess', guess: b, feedback: wrong }, a, params)).toBe(false);
      }),
    );
  });
});
