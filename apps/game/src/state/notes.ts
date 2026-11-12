import type { PuzzleParams } from '@ctc/engine';
import type { Mark } from './types';

type Notes = readonly (readonly Mark[])[];

export function markAt(notes: Notes, position: number, symbol: number): Mark {
  return notes[position]?.[symbol] ?? 'unknown';
}

/** The confirmed symbol at a position, or null. */
export function confirmedAt(notes: Notes, position: number): number | null {
  const i = notes[position]?.indexOf('confirmed') ?? -1;
  return i >= 0 ? i : null;
}

/**
 * True when the notes rule out `symbol` at `position`: excluded there, another symbol
 * confirmed there, or (without repeats) the symbol confirmed somewhere else.
 */
export function isRuledOut(
  notes: Notes,
  params: PuzzleParams,
  position: number,
  symbol: number,
): boolean {
  const mark = markAt(notes, position, symbol);
  if (mark === 'excluded') return true;
  if (mark === 'confirmed') return false;
  if (confirmedAt(notes, position) !== null) return true;
  if (!params.allowRepeats) {
    for (let p = 0; p < params.length; p++) {
      if (p !== position && markAt(notes, p, symbol) === 'confirmed') return true;
    }
  }
  return false;
}

/** True when the notes rule `symbol` out of every position (shown struck in the clues). */
export function isSymbolOut(notes: Notes, params: PuzzleParams, symbol: number): boolean {
  for (let p = 0; p < params.length; p++) {
    if (!isRuledOut(notes, params, p, symbol)) return false;
  }
  return true;
}

export function nextMark(mark: Mark): Mark {
  switch (mark) {
    case 'unknown':
      return 'excluded';
    case 'excluded':
      return 'confirmed';
    case 'confirmed':
      return 'unknown';
  }
}
