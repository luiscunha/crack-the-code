import type { Cell, Puzzle } from '@ctc/engine';
import type { Messages } from '../i18n';
import type { Action, GameState } from '../state';

/** What each component needs to (re)paint itself. */
export interface View {
  state: GameState;
  /** Clue indices and note cells the open hint points at. */
  highlightClues: ReadonlySet<number>;
  highlightCells: readonly Cell[];
}

export interface ComponentContext {
  puzzle: Puzzle;
  m: Messages;
  dispatch: (action: Action) => void;
}

export interface Component {
  el: HTMLElement;
  update: (view: View) => void;
}
