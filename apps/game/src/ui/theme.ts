import type { WorldId } from '@ctc/engine';

/**
 * Visual themes ("places"). `workshop` is the app chrome and free play (light/dark),
 * each campaign world has its own room, and the Daily Vault has a blueprint look.
 * The palettes live in styles.css under `[data-theme='…']`.
 */
export type ThemeId = 'workshop' | 'daily' | WorldId;

/** Browser UI color (status bar on phones) per theme; workshop follows the color scheme. */
const CHROME: Record<Exclude<ThemeId, 'workshop'>, string> = {
  locker: '#17666b',
  safe: '#0f3727',
  bank: '#c9ccd1',
  museum: '#3e0f19',
  casino: '#0b4a2d',
  daily: '#0b1d38',
};

/**
 * Applies a theme to a screen root and mirrors it on <html>, so the page background
 * (the "room") and fixed overlays (dialogs) match the screen.
 */
export function applyTheme(screen: HTMLElement, theme: ThemeId): void {
  screen.dataset['theme'] = theme;
  document.documentElement.dataset['theme'] = theme;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
  }
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  meta.content = theme === 'workshop' ? (dark ? '#17181a' : '#d9d4c9') : CHROME[theme];
}
