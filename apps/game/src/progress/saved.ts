import type { Puzzle } from '@ctc/engine';
import { elapsedMs, newGame, type GameState } from '../state';
import type { GameSource, SavedGame } from './types';

/** Snapshot of an unsolved game for resuming (board, counters, time played so far). */
export function snapshotGame(state: GameState, source: GameSource, ref: string, now: number): SavedGame {
  return {
    source,
    ref,
    board: state.board,
    selected: state.selected,
    wrongSubmissions: state.wrongSubmissions,
    hintsUsed: state.hintsUsed,
    elapsedMs: elapsedMs(state, now),
  };
}

/**
 * Rebuilds a game from a snapshot. The clock continues: `startedAt` is moved back by
 * the time already played. Returns null when the snapshot does not fit the puzzle
 * (different length, alphabet or clue count — e.g. data from another version).
 */
export function restoreGame(saved: SavedGame, puzzle: Puzzle, now: number): GameState | null {
  const { params } = puzzle;
  const { board } = saved;
  if (board.lock.length !== params.length) return null;
  if (board.lock.some((v) => v !== null && v >= params.alphabetSize)) return null;
  if (board.notes.length !== params.length) return null;
  if (board.notes.some((row) => row.length !== params.alphabetSize)) return null;
  if (board.exhausted.length !== puzzle.clues.length) return null;
  const game = newGame({
    params,
    solution: puzzle.solution,
    clueCount: puzzle.clues.length,
    startedAt: now - saved.elapsedMs,
  });
  return {
    ...game,
    board,
    selected: Math.min(saved.selected, params.length - 1),
    wrongSubmissions: saved.wrongSubmissions,
    hintsUsed: saved.hintsUsed,
  };
}
