import { BAND_IDS, BANDS, type BandId, type PuzzleParams } from '@ctc/engine';
import type { Messages } from '../i18n';
import { h } from './dom';

export interface HomeOptions {
  m: Messages;
  selected: BandId;
  /** Message shown under the button (e.g. a generation failure). */
  notice?: string;
  headerExtra?: HTMLElement[];
  onSelect: (band: BandId) => void;
  /** Starts generation; the screen shows "generating…" until it navigates away. */
  onNewPuzzle: (band: BandId) => void;
}

function describe(m: Messages, params: PuzzleParams): string {
  const kind =
    params.alphabet === 'colors' ? m.home.alphabetColors(params.alphabetSize) : m.home.alphabetDigits;
  return m.home.params(params.length, kind, params.allowRepeats);
}

/** Band selector: six bands with name, one-line description and parameters. */
export function mountHome(root: HTMLElement, opts: HomeOptions): void {
  const { m } = opts;
  let selected = opts.selected;

  const status = h('p', { class: 'status home-status', role: 'status', 'aria-live': 'polite' }, opts.notice ?? '');
  const start = h('button', { type: 'button', class: 'btn btn-primary btn-start' }, m.home.newPuzzle);

  const cards = BAND_IDS.map((band) => {
    const variants = [...new Set(BANDS[band].variants.map((v) => describe(m, v.params)))];
    const card = h(
      'button',
      { type: 'button', class: 'band', 'aria-pressed': 'false', 'data-band': band },
      h('span', { class: 'band-name' }, m.bands[band].name),
      h('span', { class: 'band-desc' }, m.bands[band].description),
      h('span', { class: 'band-params' }, variants.join(' / ')),
    );
    card.addEventListener('click', () => select(band));
    card.addEventListener('dblclick', () => go());
    return card;
  });

  function select(band: BandId): void {
    selected = band;
    cards.forEach((card, i) => card.setAttribute('aria-pressed', String(BAND_IDS[i] === band)));
    opts.onSelect(band);
  }

  function go(): void {
    start.disabled = true;
    status.classList.remove('error');
    status.textContent = m.home.generating;
    opts.onNewPuzzle(selected);
  }
  start.addEventListener('click', go);

  if (opts.notice) status.classList.add('error');

  const screen = h(
    'main',
    { class: 'screen home' },
    h(
      'header',
      { class: 'topbar' },
      h('div', { class: 'title' }, h('h1', {}, m.appTitle), h('span', { class: 'subtitle' }, m.tagline)),
      ...(opts.headerExtra ?? []),
    ),
    h(
      'section',
      { class: 'bands', 'aria-labelledby': 'bands-title' },
      h('h2', { id: 'bands-title', class: 'panel-title' }, m.home.chooseBand),
      h('div', { class: 'band-list', role: 'group', 'aria-labelledby': 'bands-title' }, ...cards),
    ),
    h('div', { class: 'home-actions' }, start, status),
  );
  root.replaceChildren(screen);
  select(selected);
  start.focus();
}
