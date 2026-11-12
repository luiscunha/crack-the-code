import { BAND_IDS, generatePuzzle, type BandId, type Puzzle } from '@ctc/engine';
import { DEFAULT_LOCALE, LOCALES, parseLocale, type Locale } from './i18n';
import { readPref, writePref } from './prefs';
import type { GameState } from './state';
import './styles.css';
import { h } from './ui/dom';
import { mountHome } from './ui/home';
import { mountPuzzleScreen, type PuzzleScreen } from './ui/puzzleScreen';

declare global {
  interface Window {
    /** Dev builds only: lets a tester read the puzzle (and its solution). */
    __ctc?: { puzzle: Puzzle };
  }
}

type Screen =
  | { kind: 'home'; notice?: string }
  | { kind: 'puzzle'; puzzle: Puzzle; seed: number; state?: GameState };

const root = document.getElementById('app') as HTMLElement;
const url = new URL(window.location.href);

let locale: Locale = parseLocale(url.searchParams.get('lang')) ?? parseLocale(readPref('lang')) ?? DEFAULT_LOCALE;
let band: BandId = parseBand(readPref('band')) ?? 'tutorial';
let screen: Screen = { kind: 'home' };
let mounted: PuzzleScreen | null = null;

function parseBand(value: string | null): BandId | null {
  return BAND_IDS.find((b) => b === value) ?? null;
}

function parseSeed(value: string | null): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const n = Number(value);
  return n <= 0xffffffff ? n : null;
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

/** Keeps ?band=&seed= in the address bar so a puzzle can be reopened or shared. */
function syncUrl(): void {
  const next = new URL(window.location.href);
  if (screen.kind === 'puzzle') {
    next.searchParams.set('band', screen.puzzle.band);
    next.searchParams.set('seed', String(screen.seed));
  } else {
    next.searchParams.delete('band');
    next.searchParams.delete('seed');
  }
  window.history.replaceState(null, '', next);
}

function langButton(): HTMLElement {
  const m = LOCALES[locale];
  const button = h('button', { type: 'button', class: 'btn btn-lang', 'aria-label': m.langToggleLabel, lang: locale === 'en' ? 'pt-PT' : 'en' }, m.langToggle);
  button.addEventListener('click', () => {
    locale = locale === 'en' ? 'pt-PT' : 'en';
    writePref('lang', locale);
    const next = new URL(window.location.href);
    if (next.searchParams.has('lang')) next.searchParams.set('lang', locale === 'en' ? 'en' : 'pt');
    window.history.replaceState(null, '', next);
    render();
    root.querySelector<HTMLElement>('.btn-lang')?.focus();
  });
  return button;
}

function render(): void {
  mounted?.dispose();
  mounted = null;
  const m = LOCALES[locale];
  document.documentElement.lang = locale;
  document.title = m.appTitle;
  syncUrl();

  if (screen.kind === 'home') {
    mountHome(root, {
      m,
      selected: band,
      notice: screen.notice,
      headerExtra: [langButton()],
      onSelect: (b) => {
        band = b;
        writePref('band', b);
      },
      onNewPuzzle: (b) => startPuzzle(b, randomSeed(), true),
    });
    return;
  }

  const current = screen;
  if (import.meta.env.DEV) window.__ctc = { puzzle: current.puzzle };
  mounted = mountPuzzleScreen(root, {
    puzzle: current.puzzle,
    seed: current.seed,
    m,
    now: () => Date.now(),
    initialState: current.state,
    onState: (state) => {
      current.state = state;
    },
    onHome: () => {
      screen = { kind: 'home' };
      render();
    },
    onAgain: () => startPuzzle(current.puzzle.band, randomSeed(), true),
    headerExtra: [langButton()],
  });
}

/**
 * Generates off the current frame so "generating…" paints first (master can take
 * ~150 ms). A random seed that fails is replaced; an explicit one is reported.
 */
function startPuzzle(b: BandId, seed: number, retry: boolean): void {
  if (screen.kind !== 'home') {
    screen = { kind: 'home' };
    render();
  }
  const status = root.querySelector('.home-status');
  if (status) status.textContent = LOCALES[locale].home.generating;
  root.querySelector<HTMLButtonElement>('.btn-start')?.setAttribute('disabled', '');
  window.setTimeout(() => {
    let s = seed;
    let result = generatePuzzle(b, s);
    for (let i = 0; !result && retry && i < 3; i++) {
      s = randomSeed();
      result = generatePuzzle(b, s);
    }
    screen = result
      ? { kind: 'puzzle', puzzle: result.puzzle, seed: s }
      : { kind: 'home', notice: LOCALES[locale].home.failed };
    render();
  }, 30);
}

const linkedBand = parseBand(url.searchParams.get('band'));
const linkedSeed = parseSeed(url.searchParams.get('seed'));
if (linkedBand) {
  band = linkedBand;
  render();
  startPuzzle(linkedBand, linkedSeed ?? randomSeed(), linkedSeed === null);
} else {
  render();
}
