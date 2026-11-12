import type { CampaignData } from '@ctc/engine';
import json from './campaign.json';

/**
 * The 60 campaign levels, generated offline by `pnpm --filter cli campaign` and
 * validated there (brute force + solver). Imported statically: no generation on open.
 */
export const CAMPAIGN = json as unknown as CampaignData;
