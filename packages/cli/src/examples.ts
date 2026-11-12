import { generatePuzzle, solve } from '@ctc/engine';
import { intArg, parseArgs, parseBands } from './args';
import { describeParams, formatClue, formatCode, formatStep } from './format';

// pnpm --filter cli examples --band all --count 3 --seed 1
const args = parseArgs(process.argv.slice(2));
const bands = parseBands(args.band);
const count = intArg(args.count, 3);
const seed = intArg(args.seed, 1);

for (const band of bands) {
  console.log(`\n════ ${band.toUpperCase()} ════`);
  for (let i = 0; i < count; i++) {
    const result = generatePuzzle(band, seed + i);
    if (!result) {
      console.log(`\n(seed ${seed + i}: sem puzzle em 20 tentativas)`);
      continue;
    }
    const { puzzle } = result;
    const { grade } = puzzle;
    console.log(`\n${puzzle.id} — ${describeParams(puzzle.params)}`);
    puzzle.clues.forEach((clue, n) => console.log(`  ${n + 1}) ${formatClue(clue, puzzle.params)}`));
    console.log(`  Solução: ${formatCode(puzzle.solution, puzzle.params)}`);
    console.log(
      `  Grade: T${grade.maxTier} (${grade.stepsAtMaxTier} passos no tier máx., ${grade.totalSteps} no total), dificuldade ${grade.difficultyScore}`,
    );
    console.log('  Passos do solver:');
    const solved = solve(puzzle.params, puzzle.clues);
    solved.steps.forEach((step, n) => console.log(`   ${formatStep(step, n, puzzle)}`));
  }
}
