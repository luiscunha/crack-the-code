import type { PuzzleParams } from '@ctc/engine';
import type { Messages } from './i18n';
import { formatTime } from './ui/dom';

export interface DailyShare {
  number: number;
  params: PuzzleParams;
  timeMs: number;
  hints: number;
  clean: boolean;
}

/**
 * Daily Vault share string (spec §8), e.g.
 * "Cofre Diário #123 🔓 4 dígitos · ⏱ 2:31 · 💡0 · ✨ limpo" + newline + URL.
 * No spoilers: only the size, time, hints and the clean badge.
 */
export function shareText(m: Messages, share: DailyShare, url: string): string {
  const { length, alphabet } = share.params;
  const size = alphabet === 'colors' ? m.share.colors(length) : m.share.digits(length);
  const parts = [`${m.share.title(share.number)} 🔓 ${size}`, `⏱ ${formatTime(share.timeMs)}`, `💡${share.hints}`];
  if (share.clean) parts.push(`✨ ${m.share.clean}`);
  return `${parts.join(' · ')}\n${url}`;
}
