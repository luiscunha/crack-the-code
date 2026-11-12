import { generatePuzzle } from './generator';
import { deriveSeed } from './rng';
import type { BandId, Puzzle } from './types';

/**
 * Daily Vault (spec §8): the same puzzle for everyone on a given UTC day.
 * Everything here is a pure function of a `YYYY-MM-DD` string; the caller decides
 * what "today" is (the engine never reads the clock).
 */

const MS_PER_DAY = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** First Daily Vault (#1). */
export const DAILY_EPOCH = '2026-11-12';
export const DAILY_BASE_SEED = 0xc0ffee;

/** Days since 1970-01-01 for a UTC date `YYYY-MM-DD`. Throws on malformed or impossible dates. */
export function utcDayIndex(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Expected a UTC date YYYY-MM-DD, got "${date}"`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  // Date.UTC rolls over (2026-02-30 → March 2); reject anything that does not round-trip.
  if (utcDateFromDayIndex(ms / MS_PER_DAY) !== date) throw new Error(`Invalid date "${date}"`);
  return ms / MS_PER_DAY;
}

/** Inverse of `utcDayIndex`. */
export function utcDateFromDayIndex(day: number): string {
  const t = new Date(day * MS_PER_DAY);
  const y = String(t.getUTCFullYear()).padStart(4, '0');
  const mo = String(t.getUTCMonth() + 1).padStart(2, '0');
  const d = String(t.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** `true` for a well-formed, existing UTC date. */
export function isUtcDate(date: string): boolean {
  try {
    utcDayIndex(date);
    return true;
  } catch {
    return false;
  }
}

/** `date` shifted by `days` (may be negative). */
export function addUtcDays(date: string, days: number): string {
  return utcDateFromDayIndex(utcDayIndex(date) + days);
}

/** Daily Vault number: 2026-11-12 is #1, the next day #2. Earlier dates give ≤ 0. */
export function dailyNumber(date: string): number {
  return utcDayIndex(date) - utcDayIndex(DAILY_EPOCH) + 1;
}

/** By UTC weekday, index 0 = Sunday. */
const WEEKDAY_BANDS: readonly BandId[] = [
  'master', // Sun
  'easy', // Mon
  'medium', // Tue
  'medium', // Wed
  'hard', // Thu
  'hard', // Fri
  'expert', // Sat
];

/** 0 = Sunday … 6 = Saturday. 1970-01-01 was a Thursday. */
export function utcWeekday(date: string): number {
  return (((utcDayIndex(date) + 4) % 7) + 7) % 7;
}

/** Band of the day: Mon easy, Tue/Wed medium, Thu/Fri hard, Sat expert, Sun master. */
export function dailyBand(date: string): BandId {
  return WEEKDAY_BANDS[utcWeekday(date)] as BandId;
}

export function dailySeed(number: number): number {
  return deriveSeed(DAILY_BASE_SEED, number);
}

/**
 * The puzzle of the day. `generatePuzzle` already tries 20 derived attempts; in the
 * (practically impossible) case they all fail, further seeds derived from the day's
 * seed are tried in a fixed order, so the result is deterministic and always exists.
 */
export function dailyPuzzle(date: string): Puzzle {
  const number = dailyNumber(date);
  const band = dailyBand(date);
  const seed = dailySeed(number);
  for (let k = 0; ; k++) {
    const result = generatePuzzle(band, k === 0 ? seed : deriveSeed(seed, 1000 + k));
    if (result) return result.puzzle;
  }
}
