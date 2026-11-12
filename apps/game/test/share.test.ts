import type { PuzzleParams } from '@ctc/engine';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '../src/i18n';
import { shareText } from '../src/share';

const digits4: PuzzleParams = { length: 4, alphabetSize: 10, allowRepeats: false, alphabet: 'digits' };
const colors6: PuzzleParams = { length: 6, alphabetSize: 6, allowRepeats: true, alphabet: 'colors' };
const URL = 'https://example.org/crack-the-code/';

describe('daily share string', () => {
  it('matches the spec in pt-PT', () => {
    const text = shareText(LOCALES['pt-PT'], { number: 123, params: digits4, timeMs: 151_000, hints: 0, clean: true }, URL);
    expect(text).toBe(`Cofre Diário #123 🔓 4 dígitos · ⏱ 2:31 · 💡0 · ✨ limpo\n${URL}`);
  });

  it('omits the clean badge when not clean, and names colors', () => {
    const text = shareText(LOCALES['pt-PT'], { number: 5, params: colors6, timeMs: 3_725_000, hints: 2, clean: false }, URL);
    expect(text).toBe(`Cofre Diário #5 🔓 6 cores · ⏱ 62:05 · 💡2\n${URL}`);
  });

  it('is localized in English', () => {
    expect(shareText(LOCALES.en, { number: 123, params: digits4, timeMs: 151_000, hints: 0, clean: true }, URL)).toBe(
      `Daily Vault #123 🔓 4 digits · ⏱ 2:31 · 💡0 · ✨ clean\n${URL}`,
    );
    expect(shareText(LOCALES.en, { number: 9, params: colors6, timeMs: 59_999, hints: 1, clean: false }, URL)).toBe(
      `Daily Vault #9 🔓 6 colors · ⏱ 0:59 · 💡1\n${URL}`,
    );
  });
});
