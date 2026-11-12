import { BAND_IDS } from '@ctc/engine';
import { describe, expect, it } from 'vitest';
import { LOCALES, parseLocale, symbolName } from '../src/i18n';

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('i18n', () => {
  it('both locales have exactly the same keys', () => {
    expect(keys(LOCALES.en).sort()).toEqual(keys(LOCALES['pt-PT']).sort());
  });

  it('names every band in both locales', () => {
    for (const m of Object.values(LOCALES)) {
      for (const band of BAND_IDS) {
        expect(m.bands[band].name).not.toBe('');
        expect(m.bands[band].description).not.toBe('');
      }
    }
  });

  it('parses locale codes', () => {
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('EN-gb')).toBe('en');
    expect(parseLocale('pt')).toBe('pt-PT');
    expect(parseLocale('fr')).toBeNull();
    expect(parseLocale(null)).toBeNull();
  });

  it('names colors by locale and digits as digits', () => {
    const colors = { length: 6, alphabetSize: 6, allowRepeats: true, alphabet: 'colors' as const };
    expect(symbolName(LOCALES['pt-PT'], 0, colors)).toBe('vermelho');
    expect(symbolName(LOCALES.en, 2, colors)).toBe('blue');
    const digits = { ...colors, alphabet: 'digits' as const, alphabetSize: 10 };
    expect(symbolName(LOCALES.en, 7, digits)).toBe('7');
  });

  it('phrases clue feedback', () => {
    expect(LOCALES['pt-PT'].puzzle.feedback(1, 2)).toBe('1 certo no lugar · 2 fora do lugar');
    expect(LOCALES['pt-PT'].puzzle.feedback(0, 0)).toBe('nada certo');
    expect(LOCALES.en.puzzle.feedback(2, 0)).toBe('2 in place · 0 misplaced');
  });
});
