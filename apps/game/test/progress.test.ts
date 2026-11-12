import { generatePuzzle, type CampaignData, type Puzzle, type WorldId } from '@ctc/engine';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  campaignSolved,
  currentStreak,
  emptyProgress,
  findLevel,
  gameResult,
  levelLockReason,
  levelStatus,
  maxStreak,
  nextLevel,
  parseProgress,
  recordCampaign,
  recordDaily,
  recordFree,
  restoreGame,
  serializeProgress,
  setCurrent,
  snapshotGame,
  type GameResult,
  type Progress,
} from '../src/progress';
import { elapsedMs, newGame, reduce, sameBoard, type Action, type GameState } from '../src/state';

const dummy = generatePuzzle('tutorial', 1)!.puzzle;
const WORLD_IDS: WorldId[] = ['locker', 'safe', 'bank'];
const campaign: CampaignData = {
  version: 1,
  worlds: WORLD_IDS.map((world) => ({
    id: world,
    levels: Array.from({ length: 12 }, (_, index) => ({
      id: `${world}-${String(index + 1).padStart(2, '0')}`,
      world,
      index,
      band: 'tutorial' as const,
      seed: index,
      puzzle: dummy,
    })),
  })),
};
const level = (id: string) => findLevel(campaign, id)!;
const result = (over: Partial<GameResult> = {}): GameResult => ({ timeMs: 60_000, hints: 0, wrong: 0, clean: true, ...over });

function solve(progress: Progress, ids: string[], r: GameResult = result()): Progress {
  return ids.reduce((p, id) => recordCampaign(p, id, r), progress);
}
const first = (world: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => `${world}-${String(i + 1).padStart(2, '0')}`);

describe('storage schema ctc:v1', () => {
  it('falls back to defaults on garbage, other versions and wrong types — never throws', () => {
    const empty = emptyProgress();
    for (const text of [null, '', 'not json', '42', '[]', 'null', '{"version":2}', '{"campaign":{}}', '{"version":"1"}']) {
      expect(parseProgress(text)).toEqual(empty);
    }
  });

  it('keeps the valid parts of partial or corrupted data', () => {
    const p = parseProgress(
      JSON.stringify({
        version: 1,
        campaign: {
          'locker-01': { solved: true, clean: true, bestTimeMs: 1234 },
          'locker-02': { solved: true, bestTimeMs: 'fast' },
          'locker-03': { solved: false },
          __proto__x: { solved: true },
          'bad id': { solved: true },
        },
        daily: {
          '2026-11-12': { timeMs: 90_000, hints: 1, wrong: 0, clean: true },
          '2026-02-30': { timeMs: 1 },
          '2026-11-13': { hints: 2 },
        },
        free: { easy: { solved: 3 }, hard: { solved: -1 }, bogus: { solved: 9 } },
        current: { source: 'daily', ref: 'nope', board: {} },
      }),
    );
    expect(p.campaign).toEqual({
      'locker-01': { solved: true, clean: true, bestTimeMs: 1234 },
      'locker-02': { solved: true, clean: false, bestTimeMs: null },
    });
    // A record with hints can't be clean, whatever the stored flag says.
    expect(p.daily).toEqual({ '2026-11-12': { timeMs: 90_000, hints: 1, wrong: 0, clean: false } });
    expect(p.free.easy.solved).toBe(3);
    expect(p.free.hard.solved).toBe(0);
    expect(p.current).toBeNull();
  });

  it('round-trips arbitrary progress through JSON', () => {
    const arbResult = fc.record({
      timeMs: fc.nat(),
      hints: fc.nat(20),
      wrong: fc.nat(20),
      clean: fc.boolean(),
    });
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.constantFrom(...first('locker', 12), ...first('safe', 12)), arbResult)),
        fc.array(fc.tuple(fc.integer({ min: 20_400, max: 21_000 }), arbResult)),
        fc.array(fc.constantFrom('tutorial', 'easy', 'medium', 'hard', 'expert', 'master' as const)),
        (levels, days, bands) => {
          let p = emptyProgress();
          for (const [id, r] of levels) p = recordCampaign(p, id, r);
          for (const [day, r] of days) {
            const date = new Date(day * 86_400_000).toISOString().slice(0, 10);
            p = recordDaily(p, date, { ...r, clean: r.clean && r.hints === 0 && r.wrong === 0 });
          }
          for (const b of bands) p = recordFree(p, b);
          expect(parseProgress(serializeProgress(p))).toEqual(p);
        },
      ),
    );
  });
});

describe('campaign records and unlocks', () => {
  it('keeps the best result per level', () => {
    let p = recordCampaign(emptyProgress(), 'locker-01', result({ timeMs: 50_000, clean: false }));
    p = recordCampaign(p, 'locker-01', result({ timeMs: 70_000, clean: true }));
    p = recordCampaign(p, 'locker-01', result({ timeMs: 40_000, clean: false }));
    expect(p.campaign['locker-01']).toEqual({ solved: true, clean: true, bestTimeMs: 40_000 });
  });

  it('opens the first level only, then each level after the previous one', () => {
    let p = emptyProgress();
    expect(levelStatus(campaign, p, level('locker-01'))).toBe('open');
    expect(levelStatus(campaign, p, level('locker-02'))).toBe('locked');
    expect(levelLockReason(campaign, p, level('locker-02'))).toEqual({ kind: 'level', previous: level('locker-01') });
    p = recordCampaign(p, 'locker-01', result({ clean: false }));
    expect(levelStatus(campaign, p, level('locker-01'))).toBe('solved');
    expect(levelStatus(campaign, p, level('locker-02'))).toBe('open');
    p = recordCampaign(p, 'locker-02', result());
    expect(levelStatus(campaign, p, level('locker-02'))).toBe('clean');
  });

  it('opens a world when the previous one has 9 of 12 solved', () => {
    let p = solve(emptyProgress(), first('locker', 8));
    const reason = levelLockReason(campaign, p, level('safe-01'));
    expect(reason?.kind).toBe('world');
    expect(reason?.kind === 'world' && reason.missing).toBe(1);
    p = solve(p, ['locker-09']);
    expect(levelStatus(campaign, p, level('safe-01'))).toBe('open');
    expect(levelStatus(campaign, p, level('safe-02'))).toBe('locked');
    expect(levelStatus(campaign, p, level('bank-01'))).toBe('locked');
    expect(campaignSolved(campaign, p)).toBe(9);
  });

  it('a world stays open once its prerequisite is met, independent of later worlds', () => {
    const p = solve(emptyProgress(), [...first('locker', 9), ...first('safe', 9)]);
    expect(levelStatus(campaign, p, level('bank-01'))).toBe('open');
  });

  it('finds the next level within a world', () => {
    expect(nextLevel(campaign, level('locker-01'))?.id).toBe('locker-02');
    expect(nextLevel(campaign, level('locker-12'))).toBeNull();
    expect(findLevel(campaign, 'nope-01')).toBeNull();
  });
});

describe('daily history and streaks', () => {
  const days = (...dates: string[]): Progress =>
    dates.reduce((p, d) => recordDaily(p, d, result()), emptyProgress());

  it('keeps the first solve of a day', () => {
    let p = recordDaily(emptyProgress(), '2026-11-12', result({ timeMs: 1000 }));
    p = recordDaily(p, '2026-11-12', result({ timeMs: 500 }));
    expect(p.daily['2026-11-12']?.timeMs).toBe(1000);
  });

  it('counts consecutive days ending today or yesterday', () => {
    const p = days('2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-11-25');
    expect(currentStreak(p, '2026-12-01')).toBe(4);
    expect(currentStreak(p, '2026-12-02')).toBe(4); // today not played yet
    expect(currentStreak(p, '2026-12-03')).toBe(0);
    expect(currentStreak(emptyProgress(), '2026-12-01')).toBe(0);
  });

  it('max streak is the longest run, across month boundaries', () => {
    expect(maxStreak(emptyProgress())).toBe(0);
    expect(maxStreak(days('2026-11-12'))).toBe(1);
    expect(maxStreak(days('2026-11-29', '2026-11-30', '2026-12-01', '2026-12-05', '2026-12-06'))).toBe(3);
  });
});

describe('saved game', () => {
  const puzzle: Puzzle = generatePuzzle('medium', 7)!.puzzle;
  const { params } = puzzle;
  const K = params.alphabetSize;
  const L = params.length;
  const arbAction: fc.Arbitrary<Action> = fc.oneof(
    fc.record({ type: fc.constant('select' as const), slot: fc.nat(L - 1) }),
    fc.record({ type: fc.constant('input' as const), symbol: fc.nat(K - 1) }),
    fc.constant({ type: 'erase' as const }),
    fc.record({ type: fc.constant('cycleNote' as const), position: fc.nat(L - 1), symbol: fc.nat(K - 1) }),
    fc.record({ type: fc.constant('strikeSymbol' as const), symbol: fc.nat(K - 1) }),
    fc.record({ type: fc.constant('toggleExhausted' as const), clue: fc.nat(puzzle.clues.length - 1) }),
    fc.record({ type: fc.constant('applyNotes' as const), patch: fc.record({ acknowledge: fc.nat(20) }) }),
    fc.constant({ type: 'undo' as const }),
    fc.constant({ type: 'useHint' as const }),
    fc.constant({ type: 'submit' as const, now: 5_000 }),
  );

  it('round-trips through storage: board, selection, counters and clock', () => {
    fc.assert(
      fc.property(fc.array(arbAction, { maxLength: 40 }), fc.nat(10_000_000), fc.nat(10_000_000), (actions, played, later) => {
        const start = newGame({ params, solution: puzzle.solution, clueCount: puzzle.clues.length, startedAt: 1_000 });
        const state: GameState = actions.reduce(reduce, start);
        fc.pre(state.solvedAt === null);
        const now = 1_000 + played;
        const saved = snapshotGame(state, 'daily', '2026-11-12', now);
        const stored = parseProgress(serializeProgress(setCurrent(emptyProgress(), saved)));
        expect(stored.current).toEqual(saved);
        const resumedAt = 99_000_000;
        const restored = restoreGame(stored.current!, puzzle, resumedAt)!;
        expect(sameBoard(restored.board, state.board)).toBe(true);
        expect(restored.selected).toBe(state.selected);
        expect(restored.wrongSubmissions).toBe(state.wrongSubmissions);
        expect(restored.hintsUsed).toBe(state.hintsUsed);
        // The clock continues from the time already played.
        expect(elapsedMs(restored, resumedAt + later)).toBe(played + later);
      }),
      { numRuns: 200 },
    );
  });

  it('refuses a snapshot that does not fit the puzzle', () => {
    const other = generatePuzzle('master', 3)!.puzzle;
    const state = newGame({ params: other.params, solution: other.solution, clueCount: other.clues.length, startedAt: 0 });
    expect(restoreGame(snapshotGame(state, 'free', 'master:3', 10), puzzle, 20)).toBeNull();
  });

  it('records a solved game as a result', () => {
    let state = newGame({ params, solution: puzzle.solution, clueCount: puzzle.clues.length, startedAt: 1_000 });
    for (const symbol of puzzle.solution) state = reduce(state, { type: 'input', symbol });
    state = reduce(state, { type: 'submit', now: 152_000 });
    expect(gameResult(state)).toEqual({ timeMs: 151_000, hints: 0, wrong: 0, clean: true });
  });
});
