import { BANDS, generatePuzzle, type BandId, type Puzzle } from '@ctc/engine';

export interface BandReport {
  band: BandId;
  count: number;
  successes: number;
  successRate: number;
  meanAttempts: number;
  tierCounts: Record<number, number>;
  clueCounts: Record<number, number>;
  lengthCounts: Record<number, number>;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  scoreMin: number;
  scoreMedian: number;
  scoreMax: number;
  puzzles: Puzzle[];
}

function percentile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1);
  return sorted[Math.max(0, index)] as number;
}

function bump(counts: Record<number, number>, key: number): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

/** Generates `count` puzzles (seeds seed, seed+1, …) and measures the band. */
export function measureBand(
  band: BandId,
  count: number,
  seed: number,
  maxAttempts = 20,
): BandReport {
  const times: number[] = [];
  const scores: number[] = [];
  const tierCounts: Record<number, number> = {};
  const clueCounts: Record<number, number> = {};
  const lengthCounts: Record<number, number> = {};
  const puzzles: Puzzle[] = [];
  let attempts = 0;

  // Warm-up: fills the code-space cache and lets the JIT settle before timing.
  for (let i = 0; i < 5; i++) generatePuzzle(BANDS[band], 0x7fffffff - i, maxAttempts);

  for (let i = 0; i < count; i++) {
    const t0 = performance.now();
    const result = generatePuzzle(BANDS[band], seed + i, maxAttempts);
    times.push(performance.now() - t0);
    if (!result) continue;
    puzzles.push(result.puzzle);
    attempts += result.attempts;
    bump(tierCounts, result.puzzle.grade.maxTier);
    bump(clueCounts, result.puzzle.clues.length);
    bump(lengthCounts, result.puzzle.params.length);
    scores.push(result.puzzle.grade.difficultyScore);
  }

  times.sort((a, b) => a - b);
  scores.sort((a, b) => a - b);
  return {
    band,
    count,
    successes: puzzles.length,
    successRate: count ? puzzles.length / count : 0,
    meanAttempts: puzzles.length ? attempts / puzzles.length : 0,
    tierCounts,
    clueCounts,
    lengthCounts,
    p50Ms: percentile(times, 0.5),
    p95Ms: percentile(times, 0.95),
    maxMs: times[times.length - 1] ?? 0,
    scoreMin: scores[0] ?? 0,
    scoreMedian: percentile(scores, 0.5),
    scoreMax: scores[scores.length - 1] ?? 0,
    puzzles,
  };
}

function distribution(counts: Record<number, number>, total: number, prefix: string): string {
  const keys = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);
  if (keys.length === 0) return '—';
  return keys
    .map((k) => `${prefix}${k}: ${(((counts[k] as number) / total) * 100).toFixed(1)}%`)
    .join('  ');
}

export function formatReport(r: BandReport): string {
  const ok = r.successRate >= 0.95 && r.p95Ms < 200;
  return [
    `── ${r.band} ${'─'.repeat(Math.max(0, 50 - r.band.length))}`,
    `  sucesso (≤20 tentativas): ${(r.successRate * 100).toFixed(1)}%  (${r.successes}/${r.count}), média ${r.meanAttempts.toFixed(2)} tentativas`,
    `  tiers:      ${distribution(r.tierCounts, r.successes, 'T')}`,
    `  nº pistas:  ${distribution(r.clueCounts, r.successes, '')}`,
    `  comprimento: ${distribution(r.lengthCounts, r.successes, 'L')}`,
    `  dificuldade: min ${r.scoreMin}  mediana ${r.scoreMedian}  máx ${r.scoreMax}`,
    `  tempo:      p50 ${r.p50Ms.toFixed(1)} ms   p95 ${r.p95Ms.toFixed(1)} ms   máx ${r.maxMs.toFixed(1)} ms`,
    `  critérios §6 (≥95% e p95 < 200 ms): ${ok ? 'CUMPRE' : 'NÃO CUMPRE'}`,
  ].join('\n');
}
