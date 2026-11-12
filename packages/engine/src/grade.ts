import type { Grade, SolveStep, Tier } from './types';

/**
 * Numeric difficulty. The tier dominates (100 points per tier); inside a tier,
 * puzzles that need the hardest technique more often, or more steps overall, rank higher.
 */
export function difficultyScore(maxTier: Tier, stepsAtMaxTier: number, totalSteps: number): number {
  return (maxTier - 1) * 100 + Math.min(60, 10 * stepsAtMaxTier) + Math.min(39, totalSteps);
}

/** Spec §5: difficulty is the hardest technique the solver needed. */
export function gradeSteps(steps: readonly SolveStep[], clueCount: number): Grade {
  let maxTier: Tier = 1;
  for (const step of steps) if (step.tier > maxTier) maxTier = step.tier;
  let stepsAtMaxTier = 0;
  for (const step of steps) if (step.tier === maxTier) stepsAtMaxTier++;
  return {
    maxTier,
    stepsAtMaxTier,
    totalSteps: steps.length,
    clueCount,
    difficultyScore: difficultyScore(maxTier, stepsAtMaxTier, steps.length),
  };
}
