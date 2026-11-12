import type { PuzzleParams } from '@ctc/engine';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  elapsedMs,
  isClean,
  isRuledOut,
  isSymbolOut,
  newGame,
  reduce,
  sameBoard,
  type Action,
  type GameState,
} from '../src/state';

const params: PuzzleParams = { length: 3, alphabetSize: 10, allowRepeats: false, alphabet: 'digits' };

function game(): GameState {
  return newGame({ params, solution: [7, 8, 9], clueCount: 5, startedAt: 1000 });
}

function run(state: GameState, actions: Action[]): GameState {
  return actions.reduce(reduce, state);
}

const type = (...symbols: number[]): Action[] => symbols.map((symbol) => ({ type: 'input', symbol }));

describe('lock entry', () => {
  it('types into the selected slot and advances', () => {
    const s = run(game(), type(1, 2));
    expect(s.board.lock).toEqual([1, 2, null]);
    expect(s.selected).toBe(2);
  });

  it('stays on the last slot and ignores symbols outside the alphabet', () => {
    const s = run(game(), [...type(1, 2, 3, 4), { type: 'input', symbol: 10 }]);
    expect(s.board.lock).toEqual([1, 2, 4]);
    expect(s.selected).toBe(2);
  });

  it('erases like backspace and moves within bounds', () => {
    let s = run(game(), type(1, 2));
    s = reduce(s, { type: 'erase' });
    expect(s.board.lock).toEqual([1, null, null]);
    expect(s.selected).toBe(1);
    s = run(s, [{ type: 'move', delta: -5 }]);
    expect(s.selected).toBe(0);
    s = run(s, [{ type: 'select', slot: 2 }, { type: 'move', delta: 3 }]);
    expect(s.selected).toBe(2);
  });
});

describe('notes', () => {
  it('cycles unknown → excluded → confirmed → unknown', () => {
    const cycle: Action = { type: 'cycleNote', position: 1, symbol: 4 };
    let s = game();
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      s = reduce(s, cycle);
      seen.push(s.board.notes[1]?.[4] ?? '');
    }
    expect(seen).toEqual(['excluded', 'confirmed', 'unknown']);
  });

  it('strikes a symbol everywhere and toggles it back', () => {
    let s = reduce(game(), { type: 'strikeSymbol', symbol: 3 });
    expect(s.board.notes.map((row) => row[3])).toEqual(['excluded', 'excluded', 'excluded']);
    expect(isSymbolOut(s.board.notes, params, 3)).toBe(true);
    s = reduce(s, { type: 'strikeSymbol', symbol: 3 });
    expect(s.board.notes.map((row) => row[3])).toEqual(['unknown', 'unknown', 'unknown']);
  });

  it('derives ruled-out cells from confirmations', () => {
    const s = reduce(game(), { type: 'setNote', position: 0, symbol: 7, mark: 'confirmed' });
    expect(isRuledOut(s.board.notes, params, 0, 2)).toBe(true); // position taken
    expect(isRuledOut(s.board.notes, params, 1, 7)).toBe(true); // no repeats
    expect(isRuledOut(s.board.notes, params, 1, 2)).toBe(false);
    const repeats = { ...params, allowRepeats: true };
    expect(isRuledOut(s.board.notes, repeats, 1, 7)).toBe(false);
  });

  it('toggles exhausted clues', () => {
    const s = run(game(), [
      { type: 'toggleExhausted', clue: 2 },
      { type: 'toggleExhausted', clue: 9 },
    ]);
    expect(s.board.exhausted).toEqual([false, false, true, false, false]);
  });

  it('applies a patch as a single undoable action', () => {
    const s = reduce(game(), {
      type: 'applyNotes',
      patch: {
        exclude: [{ position: 0, symbol: 1 }],
        confirm: [{ position: 2, symbol: 9 }],
        acknowledge: 4,
      },
    });
    expect(s.board.notes[0]?.[1]).toBe('excluded');
    expect(s.board.notes[2]?.[9]).toBe('confirmed');
    expect(s.board.acknowledged).toEqual([4]);
    expect(s.past).toHaveLength(1);
    expect(sameBoard(reduce(s, { type: 'undo' }).board, game().board)).toBe(true);
  });
});

describe('undo / redo', () => {
  it('does not record no-op actions', () => {
    const s = run(game(), [{ type: 'erase' }, { type: 'select', slot: 2 }, { type: 'undo' }]);
    expect(canUndo(s)).toBe(false);
  });

  it('undoes and redoes a sequence', () => {
    let s = run(game(), [...type(1, 2), { type: 'cycleNote', position: 0, symbol: 0 }]);
    s = run(s, [{ type: 'undo' }, { type: 'undo' }]);
    expect(s.board.lock).toEqual([1, null, null]);
    expect(s.board.notes[0]?.[0]).toBe('unknown');
    expect(canRedo(s)).toBe(true);
    s = reduce(s, { type: 'redo' });
    expect(s.board.lock).toEqual([1, 2, null]);
    s = reduce(s, { type: 'input', symbol: 5 });
    expect(canRedo(s)).toBe(false);
  });

  const action: fc.Arbitrary<Action> = fc.oneof(
    fc.record({ type: fc.constant('select' as const), slot: fc.integer({ min: -1, max: 3 }) }),
    fc.record({ type: fc.constant('move' as const), delta: fc.integer({ min: -2, max: 2 }) }),
    fc.record({ type: fc.constant('input' as const), symbol: fc.integer({ min: 0, max: 10 }) }),
    fc.constant({ type: 'erase' as const }),
    fc.record({
      type: fc.constant('cycleNote' as const),
      position: fc.integer({ min: 0, max: 2 }),
      symbol: fc.integer({ min: 0, max: 9 }),
    }),
    fc.record({ type: fc.constant('strikeSymbol' as const), symbol: fc.integer({ min: 0, max: 9 }) }),
    fc.record({ type: fc.constant('toggleExhausted' as const), clue: fc.integer({ min: 0, max: 4 }) }),
    fc.constant({ type: 'undo' as const }),
    fc.constant({ type: 'redo' as const }),
    fc.constant({ type: 'useHint' as const }),
  );

  it('undoing everything returns the initial board (property)', () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 60 }), (actions) => {
        const start = game();
        let s = run(start, actions);
        while (canUndo(s)) s = reduce(s, { type: 'undo' });
        expect(s.board).toEqual(start.board);
        // ...and redoing everything returns to the tip of the history.
        let end = run(start, actions);
        while (canRedo(end)) end = reduce(end, { type: 'redo' });
        while (canRedo(s)) s = reduce(s, { type: 'redo' });
        expect(s.board).toEqual(end.board);
      }),
    );
  });

  it('never mutates the previous state (property)', () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 30 }), (actions) => {
        const start = game();
        const snapshot = JSON.stringify(start);
        run(start, actions);
        expect(JSON.stringify(start)).toBe(snapshot);
      }),
    );
  });
});

describe('validation', () => {
  it('ignores incomplete codes without counting them', () => {
    const s = run(game(), [...type(7, 8), { type: 'submit', now: 2000 }]);
    expect(s.lastSubmit).toBe('incomplete');
    expect(s.wrongSubmissions).toBe(0);
  });

  it('counts wrong answers without penalty, then solves', () => {
    let s = run(game(), [...type(7, 8, 1), { type: 'submit', now: 2000 }]);
    expect(s.lastSubmit).toBe('wrong');
    expect(s.wrongSubmissions).toBe(1);
    expect(s.solvedAt).toBeNull();
    s = run(s, [{ type: 'erase' }, { type: 'input', symbol: 9 }, { type: 'submit', now: 5000 }]);
    expect(s.lastSubmit).toBe('right');
    expect(s.solvedAt).toBe(5000);
    expect(elapsedMs(s, 99_999)).toBe(4000);
    expect(isClean(s)).toBe(false);
    expect(reduce(s, { type: 'submit', now: 6000 })).toBe(s);
  });

  it('is clean only without wrong answers and hints', () => {
    const clean = run(game(), [...type(7, 8, 9), { type: 'submit', now: 3000 }]);
    expect(isClean(clean)).toBe(true);
    const hinted = run(game(), [{ type: 'useHint' }, ...type(7, 8, 9), { type: 'submit', now: 3000 }]);
    expect(hinted.hintsUsed).toBe(1);
    expect(isClean(hinted)).toBe(false);
  });

  it('keeps counters outside the undo history', () => {
    const s = run(game(), [
      ...type(1, 2, 3),
      { type: 'submit', now: 2000 },
      { type: 'useHint' },
      { type: 'undo' },
    ]);
    expect(s.wrongSubmissions).toBe(1);
    expect(s.hintsUsed).toBe(1);
  });

  it('measures elapsed time from the given start', () => {
    expect(elapsedMs(game(), 4500)).toBe(3500);
  });
});
