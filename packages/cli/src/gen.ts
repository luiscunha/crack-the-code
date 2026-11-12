import { intArg, parseArgs, parseBands } from './args';
import { formatReport, measureBand } from './report';

// pnpm --filter cli gen --band medium --count 1000 --seed 1
const args = parseArgs(process.argv.slice(2));
const bands = parseBands(args.band);
const count = intArg(args.count, 1000);
const seed = intArg(args.seed, 1);

console.log(`Relatório de geração — ${count} puzzles por banda, seed ${seed}\n`);
let allOk = true;
for (const band of bands) {
  const report = measureBand(band, count, seed);
  console.log(formatReport(report));
  console.log();
  if (report.successRate < 0.95 || report.p95Ms >= 200) allOk = false;
}
console.log(allOk ? 'Todas as bandas cumprem os critérios.' : 'Há bandas fora dos critérios.');
