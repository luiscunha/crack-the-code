import type { PuzzleParams } from '@ctc/engine';
import { glyph } from '../symbols';
import { en } from './en';
import type { Locale, Messages } from './messages';
import { pt } from './pt';

export type { Locale, Messages } from './messages';

export const LOCALES: Record<Locale, Messages> = { 'pt-PT': pt, en };
export const DEFAULT_LOCALE: Locale = 'pt-PT';

export function isLocale(value: unknown): value is Locale {
  return value === 'pt-PT' || value === 'en';
}

/** Accepts "en", "pt", "pt-PT"… */
export function parseLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.startsWith('en')) return 'en';
  if (v.startsWith('pt')) return 'pt-PT';
  return null;
}

/** Name a player reads or hears for a symbol: the digit, the color name, the letter. */
export function symbolName(m: Messages, symbol: number, params: PuzzleParams): string {
  if (params.alphabet === 'colors') return m.colorNames[symbol] ?? glyph(symbol, params);
  return glyph(symbol, params);
}
