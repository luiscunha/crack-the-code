import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCampaign, serializeCampaign } from './campaignBuild';

// pnpm --filter cli campaign — regenerates apps/game/src/data/campaign.json
const CAMPAIGN_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../apps/game/src/data/campaign.json',
);

const started = performance.now();
const data = buildCampaign();
mkdirSync(dirname(CAMPAIGN_PATH), { recursive: true });
writeFileSync(CAMPAIGN_PATH, serializeCampaign(data));

for (const world of data.worlds) {
  const scores = world.levels.map((l) => l.puzzle.grade.difficultyScore);
  const clues = world.levels.map((l) => l.puzzle.clues.length);
  const bands = [...new Set(world.levels.map((l) => l.band))].join('+');
  const variants = [...new Set(world.levels.map((l) => `L${l.puzzle.params.length}${l.puzzle.params.alphabet === 'colors' ? 'c' : ''}`))].join('/');
  console.log(
    `${world.id.padEnd(7)} ${bands.padEnd(14)} ${variants.padEnd(8)} score ${Math.min(...scores)}–${Math.max(...scores)}  clues ${Math.min(...clues)}–${Math.max(...clues)}  seeds ${world.levels.map((l) => l.seed).join(',')}`,
  );
}
console.log(`\n${CAMPAIGN_PATH}  (${(performance.now() - started).toFixed(0)} ms)`);
