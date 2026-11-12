import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BANDS } from '@ctc/engine';
import { describe, expect, it } from 'vitest';
import { buildCampaign, serializeCampaign, validateLevel, WORLDS, type CampaignData } from '../src/campaignBuild';

const JSON_PATH = resolve(import.meta.dirname, '../../../apps/game/src/data/campaign.json');
const committed = readFileSync(JSON_PATH, 'utf8');
const data = JSON.parse(committed) as CampaignData;

describe('campaign.json', () => {
  it('matches a fresh regeneration (run `pnpm --filter cli campaign` after engine changes)', () => {
    // Compare text after normalising line endings (git on Windows may check out CRLF).
    expect(committed.replace(/\r\n/g, '\n')).toBe(serializeCampaign(buildCampaign()));
  });

  it('has 5 worlds × 12 levels with the planned bands, ids and order', () => {
    expect(data.worlds.map((w) => w.id)).toEqual(WORLDS.map((w) => w.id));
    for (const [w, world] of data.worlds.entries()) {
      expect(world.levels).toHaveLength(12);
      const bands = WORLDS[w]!.bands.flatMap(({ band, count }) => new Array<string>(count).fill(band));
      expect(world.levels.map((l) => l.band)).toEqual(bands);
      world.levels.forEach((level, i) => {
        expect(level.index).toBe(i);
        expect(level.world).toBe(world.id);
        expect(level.id).toBe(`${world.id}-${String(i + 1).padStart(2, '0')}`);
        expect(level.puzzle.band).toBe(level.band);
        const config = BANDS[level.band];
        expect(level.puzzle.grade.maxTier).toBeGreaterThanOrEqual(config.minTier);
        expect(level.puzzle.grade.maxTier).toBeLessThanOrEqual(config.maxTier);
      });
    }
  });

  it('every level is unique by brute force and solved by the human solver', () => {
    for (const level of data.worlds.flatMap((w) => w.levels)) {
      expect(validateLevel(level.puzzle), level.id).toBeNull();
    }
  });

  it('no two levels share a solution or a clue set', () => {
    const levels = data.worlds.flatMap((w) => w.levels);
    const solutions = new Set(levels.map((l) => `${l.puzzle.params.alphabet}:${l.puzzle.solution.join('')}`));
    const clueSets = new Set(levels.map((l) => JSON.stringify(l.puzzle.clues)));
    expect(solutions.size).toBe(levels.length);
    expect(clueSets.size).toBe(levels.length);
  });
});
