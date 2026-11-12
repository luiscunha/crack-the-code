import type { Feedback } from './types';

/**
 * Standard Mastermind scoring, correct with repeated symbols.
 * exact = positions that match; misplaced = Σ_symbol min(count in secret, count in guess) − exact.
 */
export function score(secret: ArrayLike<number>, guess: ArrayLike<number>): Feedback {
  const n = secret.length;
  if (guess.length !== n) throw new Error('score: secret and guess must have the same length');
  let exact = 0;
  let common = 0;
  // Small maps beat typed arrays here: n ≤ 6 and the alphabet size is not known.
  const counts = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const s = secret[i] as number;
    if (s === guess[i]) exact++;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  for (let i = 0; i < n; i++) {
    const g = guess[i] as number;
    const c = counts.get(g);
    if (c !== undefined && c > 0) {
      common++;
      counts.set(g, c - 1);
    }
  }
  return { exact, misplaced: common - exact };
}
