import { BAND_IDS, isUtcDate, type BandId } from '@ctc/engine';
import type { Board, Mark } from '../state';
import type { DailyRecord, FreeStats, GameSource, LevelRecord, Progress, SavedGame } from './types';

/**
 * Versioned storage schema. The whole progress lives in one localStorage entry,
 * `ctc:v1`, as JSON. Reading is tolerant: anything malformed (garbage, an older or
 * newer version, missing or partial fields) falls back to defaults field by field,
 * and the parser never throws.
 */
export const STORAGE_KEY = 'ctc:v1';

export function emptyProgress(): Progress {
  const free = {} as Record<BandId, FreeStats>;
  for (const band of BAND_IDS) free[band] = { solved: 0 };
  return { version: 1, campaign: {}, daily: {}, free, current: null };
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isMs = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const LEVEL_ID = /^[a-z]+-\d{2}$/;
const FREE_REF = /^[a-z]+:\d{1,10}$/;
const MARKS: readonly Mark[] = ['unknown', 'excluded', 'confirmed'];
const SOURCES: readonly GameSource[] = ['campaign', 'daily', 'free'];

/** Own enumerable entries whose key passes `keyOk`; values parsed by `parse` (null = drop). */
function parseMap<T>(value: unknown, keyOk: (k: string) => boolean, parse: (v: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(value)) return out;
  for (const [key, raw] of Object.entries(value)) {
    if (!keyOk(key)) continue;
    const parsed = parse(raw);
    if (parsed !== null) out[key] = parsed;
  }
  return out;
}

function parseLevel(v: unknown): LevelRecord | null {
  if (!isObj(v) || v.solved !== true) return null;
  return {
    solved: true,
    clean: v.clean === true,
    bestTimeMs: isMs(v.bestTimeMs) ? v.bestTimeMs : null,
  };
}

function parseDaily(v: unknown): DailyRecord | null {
  if (!isObj(v) || !isMs(v.timeMs)) return null;
  const hints = isCount(v.hints) ? v.hints : 0;
  const wrong = isCount(v.wrong) ? v.wrong : 0;
  return { timeMs: v.timeMs, hints, wrong, clean: v.clean === true && hints === 0 && wrong === 0 };
}

function parseFree(v: unknown): Record<BandId, FreeStats> {
  const free = emptyProgress().free;
  if (!isObj(v)) return free;
  for (const band of BAND_IDS) {
    const entry = v[band];
    if (isObj(entry) && isCount(entry.solved)) free[band] = { solved: entry.solved };
  }
  return free;
}

/** Shape check only; dimensions are checked against the puzzle when resuming. */
export function parseBoard(v: unknown): Board | null {
  if (!isObj(v)) return null;
  const { lock, notes, exhausted, acknowledged } = v;
  if (!Array.isArray(lock) || !lock.every((x) => x === null || isCount(x))) return null;
  if (!Array.isArray(notes)) return null;
  if (!notes.every((row) => Array.isArray(row) && row.every((m) => MARKS.includes(m as Mark)))) return null;
  if (!Array.isArray(exhausted) || !exhausted.every((x) => typeof x === 'boolean')) return null;
  const ack = Array.isArray(acknowledged) ? acknowledged.filter(isCount) : [];
  return {
    lock: lock as (number | null)[],
    notes: notes as Mark[][],
    exhausted: exhausted as boolean[],
    acknowledged: [...new Set(ack)],
  };
}

function refOk(source: GameSource, ref: unknown): ref is string {
  if (typeof ref !== 'string') return false;
  switch (source) {
    case 'campaign':
      return LEVEL_ID.test(ref);
    case 'daily':
      return isUtcDate(ref);
    case 'free':
      return FREE_REF.test(ref);
  }
}

export function parseSavedGame(v: unknown): SavedGame | null {
  if (!isObj(v)) return null;
  const source = SOURCES.find((s) => s === v.source);
  if (!source || !refOk(source, v.ref)) return null;
  const board = parseBoard(v.board);
  if (!board) return null;
  return {
    source,
    ref: v.ref as string,
    board,
    selected: isCount(v.selected) ? v.selected : 0,
    wrongSubmissions: isCount(v.wrongSubmissions) ? v.wrongSubmissions : 0,
    hintsUsed: isCount(v.hintsUsed) ? v.hintsUsed : 0,
    elapsedMs: isMs(v.elapsedMs) ? v.elapsedMs : 0,
  };
}

/** Never throws. Accepts the raw stored string (or null when nothing is stored). */
export function parseProgress(text: string | null | undefined): Progress {
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    return emptyProgress();
  }
  if (!isObj(raw) || raw.version !== 1) return emptyProgress();
  return {
    version: 1,
    campaign: parseMap(raw.campaign, (k) => LEVEL_ID.test(k), parseLevel),
    daily: parseMap(raw.daily, isUtcDate, parseDaily),
    free: parseFree(raw.free),
    current: parseSavedGame(raw.current),
  };
}

export function serializeProgress(progress: Progress): string {
  return JSON.stringify(progress);
}
