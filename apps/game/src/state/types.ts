import type { Cell, Code, PuzzleParams } from '@ctc/engine';

/** One cell of the notes grid (position × symbol). */
export type Mark = 'unknown' | 'excluded' | 'confirmed';

/** Everything undo/redo covers: lock entry, notes, exhausted clues, acknowledged hints. */
export interface Board {
  /** One entry per lock slot; null = empty. */
  readonly lock: readonly (number | null)[];
  /** notes[position][symbol]. */
  readonly notes: readonly (readonly Mark[])[];
  /** Per clue: the player marked it as fully used. */
  readonly exhausted: readonly boolean[];
  /**
   * Solver step indices the player acknowledged through a hint whose conclusion the
   * notes cannot show ("the 5 is in the code"). See hints/select.ts.
   */
  readonly acknowledged: readonly number[];
}

export type SubmitResult = 'right' | 'wrong' | 'incomplete';

export interface GameState {
  readonly params: PuzzleParams;
  readonly solution: Code;
  readonly board: Board;
  /** Selected lock slot (not part of undo history). */
  readonly selected: number;
  readonly past: readonly Board[];
  readonly future: readonly Board[];
  readonly startedAt: number;
  readonly solvedAt: number | null;
  readonly wrongSubmissions: number;
  readonly hintsUsed: number;
  readonly lastSubmit: SubmitResult | null;
}

/** A batch of note changes applied as one undoable action (used by hints). */
export interface NotesPatch {
  readonly exclude?: readonly Cell[];
  readonly confirm?: readonly Cell[];
  /** Cells reset to unknown (fixing a mistake). */
  readonly reset?: readonly Cell[];
  readonly acknowledge?: number;
}

export type Action =
  | { type: 'select'; slot: number }
  | { type: 'move'; delta: number }
  | { type: 'input'; symbol: number }
  /** Clears the selected slot; on an empty slot, moves left and clears that one. */
  | { type: 'erase' }
  | { type: 'cycleNote'; position: number; symbol: number }
  | { type: 'setNote'; position: number; symbol: number; mark: Mark }
  /** Excludes a symbol in every position; if it already is, clears it everywhere. */
  | { type: 'strikeSymbol'; symbol: number }
  | { type: 'toggleExhausted'; clue: number }
  | { type: 'applyNotes'; patch: NotesPatch }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'submit'; now: number }
  | { type: 'useHint' };
