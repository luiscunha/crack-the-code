import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { candidates } from '../src/bruteforce';
import { DEFAULT_CLUE_GEN, generateClues, minimizeClues, randomCode } from '../src/clueGen';
import { gradeSteps } from '../src/grade';
import { mulberry32 } from '../src/rng';
import { solve, TECHNIQUE_TIER } from '../src/solver';
import type { Tier } from '../src/types';
import { arbParams, clue, DIGITS3, REFERENCE_042, REFERENCE_459 } from './helpers';

describe('human solver — reference examples', () => {
  it('solves 459 without going past T2', () => {
    const result = solve(DIGITS3, REFERENCE_459);
    expect(result.status).toBe('solved');
    expect(result.solution).toEqual([4, 5, 9]);
    expect(gradeSteps(result.steps, 5).maxTier).toBe(2);
    // The (0,0) clue is used first, as elimination.
    expect(result.steps[0]).toMatchObject({ technique: 'elimination', tier: 1, clueIds: [0] });
    expect(result.steps[0]?.effect.symbolsOut).toEqual([3, 7, 8]);
  });

  it('solves 042', () => {
    const result = solve(DIGITS3, REFERENCE_042);
    expect(result.status).toBe('solved');
    expect(result.solution).toEqual([0, 4, 2]);
  });

  it('reports blocked when the clues do not pin a single code', () => {
    const result = solve(DIGITS3, [clue('738', 0, 0)]);
    expect(result.status).toBe('blocked');
    expect(result.solution).toBeNull();
  });

  it('reports blocked on contradictory clues instead of inventing a solution', () => {
    const result = solve(DIGITS3, [clue('123', 0, 0), clue('123', 1, 0)]);
    expect(result.status).toBe('blocked');
  });

  it('respects maxTier', () => {
    const capped = solve(DIGITS3, REFERENCE_459, { maxTier: 1 });
    expect(capped.status).toBe('blocked');
    expect(capped.steps.every((s) => s.tier === 1)).toBe(true);
  });
});

describe('human solver — properties', () => {
  const arbCase = fc.tuple(arbParams, fc.integer(), fc.boolean());

  function build(params: (typeof arbParams extends fc.Arbitrary<infer P> ? P : never), seed: number, minimize: boolean) {
    const rng = mulberry32(seed);
    const secret = randomCode(params, rng);
    const raw = generateClues(params, secret, DEFAULT_CLUE_GEN, rng);
    if (!raw) return null;
    return { secret, clues: minimize ? minimizeClues(params, raw, rng) : raw };
  }

  it('whenever it solves, the solution is the brute-force one', () => {
    let solvedCount = 0;
    fc.assert(
      fc.property(arbCase, ([params, seed, minimize]) => {
        const built = build(params, seed, minimize);
        fc.pre(built !== null);
        const result = solve(params, built!.clues);
        if (result.status === 'solved') {
          solvedCount++;
          expect(candidates(params, built!.clues)).toEqual([result.solution]);
          expect(result.solution).toEqual(built!.secret);
        } else {
          expect(result.solution).toBeNull();
        }
      }),
      { numRuns: 200 },
    );
    expect(solvedCount).toBeGreaterThan(100);
  });

  it('every step is sound: it never removes the truth nor places a wrong symbol', () => {
    fc.assert(
      fc.property(arbCase, ([params, seed, minimize]) => {
        const built = build(params, seed, minimize);
        fc.pre(built !== null);
        const { secret, clues } = built!;
        for (const step of solve(params, clues).steps) {
          expect(step.tier).toBe(TECHNIQUE_TIER[step.technique]);
          for (const id of step.clueIds) expect(id).toBeLessThan(clues.length);
          for (const c of step.effect.removed) expect(secret[c.position]).not.toBe(c.symbol);
          for (const c of step.effect.placed) expect(secret[c.position]).toBe(c.symbol);
          for (const s of step.effect.symbolsIn) expect(secret).toContain(s);
          for (const s of step.effect.symbolsOut) expect(secret).not.toContain(s);
          const e = step.effect;
          expect(
            e.removed.length + e.placed.length + e.symbolsIn.length + e.symbolsOut.length + e.counts.length,
          ).toBeGreaterThan(0);
          for (const c of e.counts) {
            const actual = secret.filter((s) => s === c.symbol).length;
            expect(actual).toBeGreaterThanOrEqual(c.min);
            expect(actual).toBeLessThanOrEqual(c.max);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('a lower maxTier never solves more, and the grade is the lowest tier that solves', () => {
    fc.assert(
      fc.property(arbCase, ([params, seed, minimize]) => {
        const built = build(params, seed, minimize);
        fc.pre(built !== null);
        const full = solve(params, built!.clues);
        fc.pre(full.status === 'solved');
        const maxTier = gradeSteps(full.steps, built!.clues.length).maxTier;
        for (let t = 1; t <= 5; t++) {
          const capped = solve(params, built!.clues, { maxTier: t as Tier });
          expect(capped.status).toBe(t >= maxTier ? 'solved' : 'blocked');
          expect(capped.steps.every((s) => s.tier <= t)).toBe(true);
        }
      }),
      { numRuns: 60 },
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(arbCase, ([params, seed, minimize]) => {
        const built = build(params, seed, minimize);
        fc.pre(built !== null);
        expect(solve(params, built!.clues)).toEqual(solve(params, built!.clues));
      }),
      { numRuns: 40 },
    );
  });
});

describe('grading', () => {
  it('summarises the steps', () => {
    const result = solve(DIGITS3, REFERENCE_459);
    const grade = gradeSteps(result.steps, 5);
    expect(grade.clueCount).toBe(5);
    expect(grade.totalSteps).toBe(result.steps.length);
    expect(grade.stepsAtMaxTier).toBe(result.steps.filter((s) => s.tier === grade.maxTier).length);
    expect(grade.difficultyScore).toBeGreaterThanOrEqual(100);
    expect(grade.difficultyScore).toBeLessThan(200);
  });
});
