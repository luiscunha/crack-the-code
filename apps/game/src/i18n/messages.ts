import type { BandId } from '@ctc/engine';
import type { Mark } from '../state';

export type Locale = 'pt-PT' | 'en';

/**
 * Every UI string. Both locales are typed as `Messages`, so a missing or extra key
 * in either one is a compile error.
 */
export interface Messages {
  appTitle: string;
  tagline: string;
  langToggle: string;
  langToggleLabel: string;
  colorNames: readonly string[];
  /** Plain-language list: "a, b e c". */
  list: (items: readonly string[]) => string;
  bands: Record<BandId, { name: string; description: string }>;
  home: {
    chooseBand: string;
    newPuzzle: string;
    generating: string;
    failed: string;
    params: (length: number, kind: string, repeats: boolean) => string;
    alphabetDigits: string;
    alphabetColors: (count: number) => string;
  };
  puzzle: {
    back: string;
    seed: (seed: number) => string;
    timerLabel: string;
    cluesTitle: string;
    clueNumber: (n: number) => string;
    feedback: (exact: number, misplaced: number) => string;
    clueToggleLabel: (n: number, exhausted: boolean) => string;
    exhaustedHelp: string;
    lockTitle: string;
    slotLabel: (position: number, symbol: string | null) => string;
    keypadTitle: string;
    keyLabel: (symbol: string) => string;
    keypadHelp: string;
    erase: string;
    notesTitle: string;
    notesHelp: string;
    position: (n: number) => string;
    noteLabel: (position: number, symbol: string, mark: Mark) => string;
    strikeLabel: (symbol: string, struck: boolean) => string;
    undo: string;
    redo: string;
    hint: string;
    validate: string;
    incomplete: string;
    wrong: string;
  };
  hintPanel: {
    title: string;
    apply: string;
    close: string;
  };
  success: {
    title: string;
    time: string;
    hints: string;
    wrong: string;
    clean: string;
    again: string;
    home: string;
  };
}
