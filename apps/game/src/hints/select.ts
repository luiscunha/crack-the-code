import {
  solve,
  type Cell,
  type Puzzle,
  type PuzzleParams,
  type SolveStep,
  type SymbolCount,
} from '@ctc/engine';
import { isRuledOut, isSymbolOut, markAt, type Board, type NotesPatch } from '../state';

/** The part of a step the hint talks about (and "Apply" writes into the notes). */
export interface Focus {
  placed: Cell[];
  out: number[];
  in: number[];
  removed: Cell[];
  /** With repeats: occurrence bounds worth saying ("exactly two 3s"). */
  counts: SymbolCount[];
}

export type Hint =
  | {
      kind: 'step';
      stepIndex: number;
      step: SolveStep;
      focus: Focus;
      /** Clues and note cells to highlight. */
      clueIds: number[];
      cells: Cell[];
      patch: NotesPatch;
    }
  | { kind: 'mistake'; cell: Cell; cells: Cell[]; clueIds: number[]; patch: NotesPatch }
  | { kind: 'done'; cells: Cell[]; clueIds: number[] };

/** Solver steps for a puzzle: computed once, then every hint is picked from them. */
export function solverSteps(puzzle: Puzzle): SolveStep[] {
  return solve(puzzle.params, puzzle.clues).steps;
}

/** Steps whose techniques produce one big block of removals; hinted one deduction at a time. */
const FOCUSED = new Set<SolveStep['technique']>(['clue-consistency', 'clue-crossing']);

function columnCells(params: PuzzleParams, symbol: number): Cell[] {
  return Array.from({ length: params.length }, (_, position) => ({ position, symbol }));
}

/** Parts of a step's conclusion the notes do not show yet. */
function unreflected(step: SolveStep, board: Board, params: PuzzleParams): Focus {
  const { notes } = board;
  const { effect } = step;
  const placed = effect.placed.filter((c) => markAt(notes, c.position, c.symbol) !== 'confirmed');
  const out = effect.symbolsOut.filter((s) => !isSymbolOut(notes, params, s));
  // Removals that follow from the placed cells or the symbols going out are not repeated.
  const removed = effect.removed.filter(
    (c) =>
      !isRuledOut(notes, params, c.position, c.symbol) &&
      !out.includes(c.symbol) &&
      !placed.some(
        (p) => p.position === c.position || (!params.allowRepeats && p.symbol === c.symbol),
      ),
  );
  // "In" cannot be written into the notes; it is kept only to phrase the hint.
  const inCode = effect.symbolsIn.filter((s) => !placed.some((p) => p.symbol === s));
  return { placed, out, in: inCode, removed, counts: [] };
}

/** A step the notes cannot show at all ("the 5 is in the code"; counts with repeats). */
function isInformational(step: SolveStep): boolean {
  const { effect } = step;
  return effect.removed.length === 0 && effect.placed.length === 0 && effect.symbolsOut.length === 0;
}

function informationalSeen(step: SolveStep, index: number, board: Board, params: PuzzleParams): boolean {
  if (board.acknowledged.includes(index)) return true;
  const { symbolsIn } = step.effect;
  if (symbolsIn.length === 0) return false;
  return symbolsIn.every((s) => {
    for (let p = 0; p < params.length; p++) if (markAt(board.notes, p, s) === 'confirmed') return true;
    return false;
  });
}

/** One concrete deduction: a placed cell, else a symbol out/in, else one removed cell or count. */
function narrow(focus: Focus): Focus {
  const none: Focus = { placed: [], out: [], in: [], removed: [], counts: [] };
  if (focus.placed[0]) return { ...none, placed: [focus.placed[0]] };
  if (focus.out[0] !== undefined) return { ...none, out: [focus.out[0]] };
  if (focus.in[0] !== undefined) return { ...none, in: [focus.in[0]] };
  if (focus.removed[0]) return { ...none, removed: [focus.removed[0]] };
  if (focus.counts[0]) return { ...none, counts: [focus.counts[0]] };
  return focus;
}

function patchFor(focus: Focus, board: Board, params: PuzzleParams): NotesPatch {
  const exclude: Cell[] = [...focus.removed];
  for (const s of focus.out) {
    for (const c of columnCells(params, s)) {
      if (markAt(board.notes, c.position, c.symbol) !== 'excluded') exclude.push(c);
    }
  }
  return { exclude, confirm: focus.placed };
}

function highlightCells(focus: Focus, params: PuzzleParams, step?: SolveStep): Cell[] {
  const cells = [...focus.placed, ...focus.removed];
  for (const s of focus.out) cells.push(...columnCells(params, s));
  if (step?.hypothesis) cells.push(step.hypothesis);
  return cells;
}

/** A note that contradicts the solution, if any (checked before any deduction). */
function findMistake(board: Board, puzzle: Puzzle): Cell | null {
  const { params, solution } = puzzle;
  for (let p = 0; p < params.length; p++) {
    for (let s = 0; s < params.alphabetSize; s++) {
      const mark = markAt(board.notes, p, s);
      const isSolution = solution[p] === s;
      if ((mark === 'confirmed' && !isSolution) || (mark === 'excluded' && isSolution)) {
        return { position: p, symbol: s };
      }
    }
  }
  return null;
}

/**
 * The hint for the current notes: a mistake to fix first, else the first solver step
 * whose conclusion the notes do not reflect yet, else "done".
 */
export function nextHint(puzzle: Puzzle, steps: readonly SolveStep[], board: Board): Hint {
  const { params } = puzzle;
  const mistake = findMistake(board, puzzle);
  if (mistake) {
    return { kind: 'mistake', cell: mistake, cells: [mistake], clueIds: [], patch: { reset: [mistake] } };
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as SolveStep;
    if (isInformational(step)) {
      if (informationalSeen(step, i, board, params)) continue;
      const counts = params.allowRepeats
        ? step.effect.counts.filter((c) => c.max > 0 && (c.min > 1 || c.max < params.length))
        : [];
      const info: Focus = {
        placed: [],
        out: [],
        in: step.effect.symbolsIn.filter((s) => !counts.some((c) => c.symbol === s)),
        removed: [],
        counts,
      };
      const focus = FOCUSED.has(step.technique) ? narrow(info) : info;
      return {
        kind: 'step',
        stepIndex: i,
        step,
        focus,
        clueIds: step.clueIds,
        cells: [],
        patch: { acknowledge: i },
      };
    }
    const all = unreflected(step, board, params);
    if (all.placed.length + all.out.length + all.removed.length === 0) continue;
    // Narrowed hints must name something Apply can write, so "in" is left out there.
    const focus = FOCUSED.has(step.technique) ? narrow({ ...all, in: [] }) : all;
    return {
      kind: 'step',
      stepIndex: i,
      step,
      focus,
      clueIds: step.clueIds,
      cells: highlightCells(focus, params, step),
      patch: patchFor(focus, board, params),
    };
  }
  return { kind: 'done', cells: [], clueIds: [] };
}

/** Identity of a hint, to avoid counting the same hint twice when re-opened. */
export function hintKey(hint: Hint): string {
  switch (hint.kind) {
    case 'step':
      return `step:${hint.stepIndex}:${JSON.stringify(hint.focus)}`;
    case 'mistake':
      return `mistake:${hint.cell.position}:${hint.cell.symbol}`;
    case 'done':
      return 'done';
  }
}
