import type { Cell, Code, PuzzleParams } from '@ctc/engine';
import { markAt, nextMark } from './notes';
import type { Action, Board, GameState, Mark, NotesPatch } from './types';

export interface NewGameInput {
  params: PuzzleParams;
  solution: Code;
  clueCount: number;
  startedAt: number;
}

export function emptyBoard(params: PuzzleParams, clueCount: number): Board {
  return {
    lock: new Array<number | null>(params.length).fill(null),
    notes: Array.from({ length: params.length }, () =>
      new Array<Mark>(params.alphabetSize).fill('unknown'),
    ),
    exhausted: new Array<boolean>(clueCount).fill(false),
    acknowledged: [],
  };
}

export function newGame({ params, solution, clueCount, startedAt }: NewGameInput): GameState {
  return {
    params,
    solution,
    board: emptyBoard(params, clueCount),
    selected: 0,
    past: [],
    future: [],
    startedAt,
    solvedAt: null,
    wrongSubmissions: 0,
    hintsUsed: 0,
    lastSubmit: null,
  };
}

export function isSolved(state: GameState): boolean {
  return state.solvedAt !== null;
}

/** Milliseconds played; stops counting once solved. */
export function elapsedMs(state: GameState, now: number): number {
  return Math.max(0, (state.solvedAt ?? now) - state.startedAt);
}

/** Solved without any wrong submission and without hints. */
export function isClean(state: GameState): boolean {
  return isSolved(state) && state.wrongSubmissions === 0 && state.hintsUsed === 0;
}

function sameArray<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export function sameBoard(a: Board, b: Board): boolean {
  return (
    sameArray(a.lock, b.lock) &&
    sameArray(a.exhausted, b.exhausted) &&
    sameArray(a.acknowledged, b.acknowledged) &&
    a.notes.length === b.notes.length &&
    a.notes.every((row, p) => sameArray(row, b.notes[p] ?? []))
  );
}

/** Records `board` as the new present, unless nothing changed (no empty history entries). */
function commit(state: GameState, board: Board): GameState {
  if (sameBoard(board, state.board)) return state;
  return { ...state, board, past: [...state.past, state.board], future: [] };
}

function withNotes(board: Board, cells: readonly Cell[], mark: Mark): Board {
  if (cells.length === 0) return board;
  const notes = board.notes.map((row) => row.slice());
  for (const { position, symbol } of cells) {
    const row = notes[position];
    if (row && symbol >= 0 && symbol < row.length) row[symbol] = mark;
  }
  return { ...board, notes };
}

function applyPatch(board: Board, patch: NotesPatch): Board {
  let next = withNotes(board, patch.reset ?? [], 'unknown');
  next = withNotes(next, patch.exclude ?? [], 'excluded');
  next = withNotes(next, patch.confirm ?? [], 'confirmed');
  const ack = patch.acknowledge;
  if (ack !== undefined && !next.acknowledged.includes(ack)) {
    next = { ...next, acknowledged: [...next.acknowledged, ack] };
  }
  return next;
}

function clampSlot(state: GameState, slot: number): number {
  return Math.min(state.params.length - 1, Math.max(0, slot));
}

function setLock(board: Board, slot: number, value: number | null): Board {
  const lock = board.lock.slice();
  lock[slot] = value;
  return { ...board, lock };
}

function submit(state: GameState, now: number): GameState {
  if (isSolved(state)) return state;
  const { lock } = state.board;
  if (lock.some((v) => v === null)) return { ...state, lastSubmit: 'incomplete' };
  if (lock.every((v, i) => v === state.solution[i])) {
    return { ...state, solvedAt: now, lastSubmit: 'right' };
  }
  return { ...state, wrongSubmissions: state.wrongSubmissions + 1, lastSubmit: 'wrong' };
}

/** Pure reducer: never mutates `state`, never reads the clock. */
export function reduce(state: GameState, action: Action): GameState {
  const { board, params } = state;
  switch (action.type) {
    case 'select':
      return { ...state, selected: clampSlot(state, action.slot) };
    case 'move':
      return { ...state, selected: clampSlot(state, state.selected + action.delta) };
    case 'input': {
      if (!Number.isInteger(action.symbol) || action.symbol < 0) return state;
      if (action.symbol >= params.alphabetSize) return state;
      const next = commit(state, setLock(board, state.selected, action.symbol));
      return { ...next, selected: clampSlot(state, state.selected + 1) };
    }
    case 'erase': {
      if (board.lock[state.selected] !== null) {
        return commit(state, setLock(board, state.selected, null));
      }
      const slot = clampSlot(state, state.selected - 1);
      return { ...commit(state, setLock(board, slot, null)), selected: slot };
    }
    case 'cycleNote': {
      const mark = nextMark(markAt(board.notes, action.position, action.symbol));
      return commit(state, withNotes(board, [action], mark));
    }
    case 'setNote':
      return commit(state, withNotes(board, [action], action.mark));
    case 'strikeSymbol': {
      const cells: Cell[] = [];
      for (let p = 0; p < params.length; p++) cells.push({ position: p, symbol: action.symbol });
      const struck = cells.every((c) => markAt(board.notes, c.position, c.symbol) === 'excluded');
      return commit(state, withNotes(board, cells, struck ? 'unknown' : 'excluded'));
    }
    case 'toggleExhausted': {
      if (action.clue < 0 || action.clue >= board.exhausted.length) return state;
      const exhausted = board.exhausted.slice();
      exhausted[action.clue] = !exhausted[action.clue];
      return commit(state, { ...board, exhausted });
    }
    case 'applyNotes':
      return commit(state, applyPatch(board, action.patch));
    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        board: previous,
        past: state.past.slice(0, -1),
        future: [state.board, ...state.future],
      };
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { ...state, board: next, past: [...state.past, state.board], future: rest };
    }
    case 'submit':
      return submit(state, action.now);
    case 'useHint':
      return { ...state, hintsUsed: state.hintsUsed + 1 };
  }
}

export function canUndo(state: GameState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: GameState): boolean {
  return state.future.length > 0;
}
