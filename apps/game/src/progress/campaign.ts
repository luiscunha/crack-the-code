import type { CampaignData, CampaignLevel, CampaignWorld } from '@ctc/engine';
import type { Progress } from './types';

/** A world opens when the previous one has at least this many levels solved. */
export const WORLD_UNLOCK_SOLVED = 9;

export type LevelStatus = 'locked' | 'open' | 'solved' | 'clean';

/** Why something is locked: a world needs more solves in the previous one; a level needs the previous level. */
export type LockReason =
  | { kind: 'world'; previous: CampaignWorld; missing: number }
  | { kind: 'level'; previous: CampaignLevel };

export function isLevelSolved(progress: Progress, levelId: string): boolean {
  return progress.campaign[levelId]?.solved === true;
}

export function solvedInWorld(progress: Progress, world: CampaignWorld): number {
  return world.levels.filter((l) => isLevelSolved(progress, l.id)).length;
}

export function campaignSolved(campaign: CampaignData, progress: Progress): number {
  return campaign.worlds.reduce((n, w) => n + solvedInWorld(progress, w), 0);
}

export function campaignTotal(campaign: CampaignData): number {
  return campaign.worlds.reduce((n, w) => n + w.levels.length, 0);
}

export function worldLockReason(campaign: CampaignData, progress: Progress, worldIndex: number): LockReason | null {
  const previous = campaign.worlds[worldIndex - 1];
  if (!previous) return null;
  const missing = WORLD_UNLOCK_SOLVED - solvedInWorld(progress, previous);
  return missing > 0 ? { kind: 'world', previous, missing } : null;
}

export function isWorldUnlocked(campaign: CampaignData, progress: Progress, worldIndex: number): boolean {
  return worldLockReason(campaign, progress, worldIndex) === null;
}

/** First world and first level open; level i opens when level i-1 is solved. */
export function levelLockReason(campaign: CampaignData, progress: Progress, level: CampaignLevel): LockReason | null {
  const worldIndex = campaign.worlds.findIndex((w) => w.id === level.world);
  const world = worldLockReason(campaign, progress, worldIndex);
  if (world) return world;
  const previous = campaign.worlds[worldIndex]?.levels[level.index - 1];
  if (previous && !isLevelSolved(progress, previous.id)) return { kind: 'level', previous };
  return null;
}

export function levelStatus(campaign: CampaignData, progress: Progress, level: CampaignLevel): LevelStatus {
  const record = progress.campaign[level.id];
  if (record?.solved) return record.clean ? 'clean' : 'solved';
  return levelLockReason(campaign, progress, level) ? 'locked' : 'open';
}

export function findLevel(campaign: CampaignData, id: string): CampaignLevel | null {
  for (const world of campaign.worlds) {
    const level = world.levels.find((l) => l.id === id);
    if (level) return level;
  }
  return null;
}

/** The next level in the same world, or null at the end of the world. */
export function nextLevel(campaign: CampaignData, level: CampaignLevel): CampaignLevel | null {
  const world = campaign.worlds.find((w) => w.id === level.world);
  return world?.levels[level.index + 1] ?? null;
}
