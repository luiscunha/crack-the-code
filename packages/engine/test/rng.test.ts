import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { deriveSeed, mulberry32, randInt, shuffle, weightedIndex } from '../src/rng';

describe('mulberry32', () => {
  it('matches the reference sequence for seed 1 (cross-platform determinism)', () => {
    const rng = mulberry32(1);
    const first = [rng(), rng(), rng()].map((x) => Math.floor(x * 4294967296));
    expect(first).toEqual([2693262067, 11749833, 2265367787]);
  });

  it('same seed gives the same sequence, values in [0, 1)', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const a = mulberry32(seed);
        const b = mulberry32(seed);
        for (let i = 0; i < 20; i++) {
          const x = a();
          expect(x).toBe(b());
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(1);
        }
      }),
    );
  });
});

describe('rng helpers', () => {
  it('randInt stays in range', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 1, max: 1000 }), (seed, n) => {
        const v = randInt(mulberry32(seed), n);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(n);
      }),
    );
  });

  it('shuffle is a permutation', () => {
    fc.assert(
      fc.property(fc.integer(), fc.array(fc.integer()), (seed, items) => {
        const out = shuffle(mulberry32(seed), [...items]);
        expect([...out].sort((a, b) => a - b)).toEqual([...items].sort((a, b) => a - b));
      }),
    );
  });

  it('weightedIndex never picks a zero-weight entry', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      expect(weightedIndex(rng, [0, 3, 0, 1])).toSatisfy((x: number) => x === 1 || x === 3);
    }
  });

  it('deriveSeed is deterministic and spreads indices', () => {
    const seeds = new Set<number>();
    for (let i = 0; i < 1000; i++) seeds.add(deriveSeed(42, i));
    expect(seeds.size).toBe(1000);
    expect(deriveSeed(42, 3)).toBe(deriveSeed(42, 3));
  });
});
