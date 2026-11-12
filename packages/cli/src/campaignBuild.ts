import { candidates, generatePuzzle, solve, type BandId, type Puzzle } from '@ctc/engine';

/** Campaign worlds (docs/arquitetura.md, M4). Names live in the game's i18n. */
export const WORLDS: readonly { id: string; bands: readonly { band: BandId; count: number }[] }[] = [
  { id: 'locker', bands: [{ band: 'tutorial', count: 6 }, { band: 'easy', count: 6 }] },
  { id: 'safe', bands: [{ band: 'medium', count: 12 }] },
  { id: 'bank', bands: [{ band: 'hard', count: 12 }] },
  { id: 'museum', bands: [{ band: 'expert', count: 12 }] },
  { id: 'casino', bands: [{ band: 'master', count: 12 }] },
];

/**
 * Requested seeds are tried in order from a fixed base per band (1000, 2000, …):
 * readable, stable, and a new seed only enters if an earlier one is rejected.
 */
export const SEED_BASE: Record<BandId, number> = {
  tutorial: 1000,
  easy: 2000,
  medium: 3000,
  hard: 4000,
  expert: 5000,
  master: 6000,
};

export interface CampaignLevel {
  /** Stable id used in progress and links, e.g. "safe-03". */
  id: string;
  world: string;
  /** 0-based position inside the world. */
  index: number;
  band: BandId;
  /** Seed given to generatePuzzle (puzzle.seed is the successful attempt's). */
  seed: number;
  puzzle: Puzzle;
}

export interface CampaignData {
  version: 1;
  worlds: { id: string; levels: CampaignLevel[] }[];
}

function sameCode(a: readonly number[] | null | undefined, b: readonly number[]): boolean {
  return !!a && a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Rule 1 and rule 2: unique by brute force, solved by the human solver with the same answer. */
export function validateLevel(puzzle: Puzzle): string | null {
  const found = candidates(puzzle.params, puzzle.clues, 2);
  if (found.length !== 1 || !sameCode(found[0], puzzle.solution)) return 'not unique';
  const solved = solve(puzzle.params, puzzle.clues);
  if (solved.status !== 'solved' || !sameCode(solved.solution, puzzle.solution)) return 'solver failed';
  return null;
}

const solutionKey = (p: Puzzle): string => `${p.params.alphabet}${p.params.length}:${p.solution.join('')}`;
const cluesKey = (p: Puzzle): string =>
  p.clues
    .map((c) => `${c.guess.join('')}/${c.feedback.exact}${c.feedback.misplaced}`)
    .sort()
    .join(',');

/** Deterministic: the same engine always yields the same campaign. */
export function buildCampaign(): CampaignData {
  const solutions = new Set<string>();
  const clueSets = new Set<string>();
  const worlds = WORLDS.map((world) => {
    const groups = world.bands.map(({ band, count }) => {
      const picked: { seed: number; puzzle: Puzzle }[] = [];
      for (let seed = SEED_BASE[band]; picked.length < count; seed++) {
        if (seed >= SEED_BASE[band] + 1000) throw new Error(`Not enough ${band} puzzles`);
        const result = generatePuzzle(band, seed);
        if (!result) continue;
        const { puzzle } = result;
        if (solutions.has(solutionKey(puzzle)) || clueSets.has(cluesKey(puzzle))) continue;
        const problem = validateLevel(puzzle);
        if (problem) throw new Error(`${band} seed ${seed}: ${problem}`);
        solutions.add(solutionKey(puzzle));
        clueSets.add(cluesKey(puzzle));
        picked.push({ seed, puzzle });
      }
      // Within a band: shorter codes first (medium: L3 before L4; master: digits L5 before
      // colors L6), then by difficultyScore. Stable sort, so ties keep seed order.
      return picked.sort(
        (a, b) =>
          a.puzzle.params.length - b.puzzle.params.length ||
          a.puzzle.grade.difficultyScore - b.puzzle.grade.difficultyScore,
      );
    });
    // Bands stay in world order (Locker: the six tutorials, then the six easy ones).
    const levels = groups.flat().map(({ seed, puzzle }, index): CampaignLevel => ({
      id: `${world.id}-${String(index + 1).padStart(2, '0')}`,
      world: world.id,
      index,
      band: puzzle.band,
      seed,
      puzzle,
    }));
    return { id: world.id, levels };
  });
  return { version: 1, worlds };
}

/** Compact JSON: one level per line, so diffs stay readable. */
export function serializeCampaign(data: CampaignData): string {
  const worlds = data.worlds.map(
    (w) =>
      `    {"id":${JSON.stringify(w.id)},"levels":[\n` +
      w.levels.map((l) => `      ${JSON.stringify(l)}`).join(',\n') +
      `\n    ]}`,
  );
  return `{\n  "version":${data.version},\n  "worlds":[\n${worlds.join(',\n')}\n  ]\n}\n`;
}
