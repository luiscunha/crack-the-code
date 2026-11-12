import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { BANDS } from '../src/bands';
import { candidates } from '../src/bruteforce';
import {
  addUtcDays,
  dailyBand,
  dailyNumber,
  dailyPuzzle,
  dailySeed,
  isUtcDate,
  utcDateFromDayIndex,
  utcDayIndex,
  utcWeekday,
} from '../src/daily';
import { deriveSeed } from '../src/rng';
import { solve } from '../src/solver';

describe('daily vault', () => {
  it('numbers days from 2026-11-12 = #1, across month and year ends', () => {
    expect(dailyNumber('2026-11-12')).toBe(1);
    expect(dailyNumber('2026-11-13')).toBe(2);
    expect(dailyNumber('2026-12-01')).toBe(20);
    expect(dailyNumber('2027-01-01')).toBe(51);
    expect(dailyNumber('2028-03-01')).toBe(dailyNumber('2028-02-29') + 1);
    expect(dailyNumber('2026-11-11')).toBe(0);
  });

  it('parses dates strictly', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-01', '26-11-12', '', '2026-11-12T00:00Z']) {
      expect(isUtcDate(bad)).toBe(false);
      expect(() => utcDayIndex(bad)).toThrow();
    }
    expect(isUtcDate('2028-02-29')).toBe(true);
    expect(addUtcDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addUtcDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('day index round-trips', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 80_000 }), (day) => {
        expect(utcDayIndex(utcDateFromDayIndex(day))).toBe(day);
      }),
    );
  });

  it('maps UTC weekdays to bands', () => {
    // 2026-11-16 is a Monday.
    expect(utcWeekday('2026-11-16')).toBe(1);
    const week = Array.from({ length: 7 }, (_, i) => dailyBand(addUtcDays('2026-11-16', i)));
    expect(week).toEqual(['easy', 'medium', 'medium', 'hard', 'hard', 'expert', 'master']);
    expect(dailyBand('2026-11-12')).toBe('hard'); // Thursday
  });

  it('seeds derive from 0xC0FFEE and the day number', () => {
    expect(dailySeed(1)).toBe(deriveSeed(0xc0ffee, 1));
    expect(dailySeed(2)).not.toBe(dailySeed(1));
  });

  it('is deterministic', () => {
    expect(dailyPuzzle('2026-11-17')).toEqual(dailyPuzzle('2026-11-17'));
  });

  it('pins three days so cross-platform drift is caught', () => {
    const pinned: [string, string, string][] = [
      ['2026-11-12', 'hard-fc2a2b2e', '3745'],
      ['2026-11-15', 'master-f5da121c', '312224'],
      ['2026-11-16', 'easy-50164496', '927'],
    ];
    for (const [date, id, solution] of pinned) {
      const puzzle = dailyPuzzle(date);
      expect(puzzle.id).toBe(id);
      expect(puzzle.solution.join('')).toBe(solution);
    }
  });

  it('every weekday produces a valid puzzle with a unique solution', () => {
    for (let i = 0; i < 7; i++) {
      const date = addUtcDays('2026-11-16', i);
      const puzzle = dailyPuzzle(date);
      const config = BANDS[dailyBand(date)];
      expect(puzzle.band).toBe(config.id);
      expect(candidates(puzzle.params, puzzle.clues)).toEqual([puzzle.solution]);
      const solved = solve(puzzle.params, puzzle.clues);
      expect(solved.status).toBe('solved');
      expect(solved.solution).toEqual(puzzle.solution);
      expect(puzzle.grade.maxTier).toBeGreaterThanOrEqual(config.minTier);
      expect(puzzle.grade.maxTier).toBeLessThanOrEqual(config.maxTier);
    }
  });
});
