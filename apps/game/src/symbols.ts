import type { Code, PuzzleParams } from '@ctc/engine';

/** Color index → CSS color and a letter with a readable ink (the letter is shown for color-blind players). */
export const COLORS: readonly { css: string; ink: string; letter: string }[] = [
  { css: '#d7263d', ink: '#fff', letter: 'R' },
  { css: '#2e9e44', ink: '#fff', letter: 'G' },
  { css: '#2f6fde', ink: '#fff', letter: 'B' },
  { css: '#f2c230', ink: '#1d1d22', letter: 'Y' },
  { css: '#f07b1d', ink: '#1d1d22', letter: 'O' },
  { css: '#8e44c9', ink: '#fff', letter: 'P' },
  { css: '#f4f4f0', ink: '#1d1d22', letter: 'W' },
  { css: '#1d1d22', ink: '#fff', letter: 'K' },
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Short glyph for a symbol: the digit, the color's letter or the letter. */
export function glyph(symbol: number, params: PuzzleParams): string {
  switch (params.alphabet) {
    case 'digits':
      return String(symbol);
    case 'colors':
      return COLORS[symbol]?.letter ?? '?';
    case 'letters':
      return LETTERS[symbol] ?? '?';
  }
}

export function glyphs(code: Code, params: PuzzleParams): string {
  return code.map((s) => glyph(s, params)).join('');
}

/** Symbol typed by a keyboard key, or null. */
export function symbolForKey(key: string, params: PuzzleParams): number | null {
  const upper = key.toUpperCase();
  for (let s = 0; s < params.alphabetSize; s++) {
    if (glyph(s, params) === upper) return s;
  }
  return null;
}
