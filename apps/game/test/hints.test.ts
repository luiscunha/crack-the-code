import { BAND_IDS, generatePuzzle, type BandId, type Puzzle, type Technique } from '@ctc/engine';
import { describe, expect, it } from 'vitest';
import { explainHint, nextHint, solverSteps, type Hint } from '../src/hints';
import { LOCALES } from '../src/i18n';
import type { HintContext } from '../src/i18n/messages';
import { confirmedAt, emptyBoard, reduce, newGame, type Board, type GameState } from '../src/state';

function puzzleFor(band: BandId, seed: number): Puzzle {
  const result = generatePuzzle(band, seed);
  if (!result) throw new Error(`no puzzle for ${band}/${seed}`);
  return result.puzzle;
}

function start(puzzle: Puzzle): GameState {
  return newGame({
    params: puzzle.params,
    solution: puzzle.solution,
    clueCount: puzzle.clues.length,
    startedAt: 0,
  });
}

function apply(state: GameState, hint: Hint): GameState {
  if (hint.kind === 'done') return state;
  return reduce(state, { type: 'applyNotes', patch: hint.patch });
}

const TECHNIQUES: Technique[] = [
  'elimination',
  'positional-exclusion',
  'simple-count',
  'fixation',
  'only-position',
  'symbols-complete',
  'clue-consistency',
  'clue-crossing',
  'hypothesis',
];

/** Placeholders that leaked, or an empty conclusion ("…: ."). */
const BAD_TEXT = /undefined|NaN|null|\[object|[:,] \.|\s{2}/;

describe('hints', () => {
  const tutorial = puzzleFor('tutorial', 1);

  it('first tutorial hint explains the (0,0) clue 326 in pt-PT', () => {
    expect(tutorial.solution).toEqual([7, 8, 9]);
    const hint = nextHint(tutorial, solverSteps(tutorial), emptyBoard(tutorial.params, 5));
    expect(hint.kind).toBe('step');
    if (hint.kind !== 'step') return;
    expect(hint.step.technique).toBe('elimination');
    expect(hint.clueIds).toEqual([0]);
    const text = explainHint(hint, tutorial, LOCALES['pt-PT']);
    expect(text).toBe(
      'A pista 326 (n.º 1) diz que nada está certo: o 3, o 2 e o 6 saem do código.',
    );
    expect(explainHint(hint, tutorial, LOCALES.en)).toBe(
      'Clue 326 (#1) says nothing is right: 3, 2 and 6 are not in the code.',
    );
  });

  it('focused T3/T4 hints group the removals of one symbol', () => {
    // medium seed 1 (1637): one clue-consistency step on 2957 removes a dozen cells.
    const puzzle = puzzleFor('medium', 1);
    const steps = solverSteps(puzzle);
    let state = start(puzzle);
    let grouped = 0;
    for (let i = 0; i < 60; i++) {
      const hint = nextHint(puzzle, steps, state.board);
      if (hint.kind === 'done') break;
      if (hint.kind === 'step' && hint.step.tier >= 3 && hint.focus.removed.length > 0) {
        expect(new Set(hint.focus.removed.map((c) => c.symbol)).size).toBe(1);
        if (hint.focus.removed.length > 1) {
          grouped++;
          expect(explainHint(hint, puzzle, LOCALES['pt-PT'])).toMatch(/não está nas posições \d(, \d)* e \d/);
        }
      }
      state = apply(state, hint);
    }
    expect(grouped).toBeGreaterThan(0);
  });

  it('adapts to the notes: a deduction already made is skipped', () => {
    const steps = solverSteps(tutorial);
    let state = start(tutorial);
    for (const s of [3, 2, 6]) state = reduce(state, { type: 'strikeSymbol', symbol: s });
    const hint = nextHint(tutorial, steps, state.board);
    expect(hint.kind === 'step' && hint.stepIndex).toBeGreaterThan(0);
  });

  it('points out a note that contradicts the solution, and Apply clears it', () => {
    const steps = solverSteps(tutorial);
    let state = reduce(start(tutorial), { type: 'setNote', position: 0, symbol: 1, mark: 'confirmed' });
    const hint = nextHint(tutorial, steps, state.board);
    expect(hint.kind).toBe('mistake');
    expect(explainHint(hint, tutorial, LOCALES['pt-PT'])).toContain('o 1 na posição 1');
    state = apply(state, hint);
    expect(nextHint(tutorial, steps, state.board).kind).toBe('step');
  });

  it('every technique has a template in both locales', () => {
    const ctx: HintContext = {
      refs: ['123 (n.º 1)', '456 (n.º 2)'],
      exact: 1,
      total: 2,
      length: 3,
      placed: [{ symbol: '7', position: 1 }],
      out: ['4'],
      in: ['5'],
      removed: [{ symbol: '2', position: 3 }],
      counts: [{ symbol: '8', min: 2, max: 2 }],
      hypothesis: { symbol: '9', position: 2 },
    };
    for (const m of Object.values(LOCALES)) {
      for (const t of TECHNIQUES) {
        const text = m.hints.techniques[t](ctx);
        expect(text.length).toBeGreaterThan(20);
        expect(text).not.toMatch(BAD_TEXT);
      }
    }
  });
});

/** Applies hints until the hint says "done"; returns the final board and the hints seen. */
function playWithHints(puzzle: Puzzle): { board: Board; hints: Hint[] } {
  const steps = solverSteps(puzzle);
  let state = start(puzzle);
  const hints: Hint[] = [];
  for (let i = 0; i < 2000; i++) {
    const hint = nextHint(puzzle, steps, state.board);
    hints.push(hint);
    if (hint.kind === 'done') return { board: state.board, hints };
    const next = apply(state, hint);
    // Every applied hint must change the notes, or the loop would never end.
    expect(next.board).not.toEqual(state.board);
    state = next;
  }
  throw new Error('hints did not converge');
}

describe('applying every hint solves the puzzle', () => {
  const seeds = [1, 2, 3];
  for (const band of BAND_IDS) {
    it(`${band}: notes reach the solution`, () => {
      for (const seed of seeds) {
        const puzzle = puzzleFor(band, seed);
        const { board, hints } = playWithHints(puzzle);
        const confirmed = puzzle.solution.map((_, p) => confirmedAt(board.notes, p));
        expect(confirmed).toEqual([...puzzle.solution]);
        for (const hint of hints) {
          expect(hint.kind).not.toBe('mistake');
          for (const m of Object.values(LOCALES)) {
            const text = explainHint(hint, puzzle, m);
            expect(text.length).toBeGreaterThan(10);
            expect(text).not.toMatch(BAD_TEXT);
          }
        }
      }
    });
  }
});
