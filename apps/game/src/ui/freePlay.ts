import { BAND_IDS, BANDS, type BandId, type PuzzleParams } from '@ctc/engine';
import type { Messages } from '../i18n';
import { h, iconButton } from './dom';
import { icon } from './icons';

export interface FreePlayOptions {
  m: Messages;
  /** Band played last (gets the focus). */
  last: BandId;
  /** Puzzles solved per band (shown on each button). */
  solved: Record<BandId, number>;
  /** Shown under the list (e.g. a generation failure). */
  notice?: string;
  headerExtra?: HTMLElement[];
  onBack: () => void;
  /** Starts generation; the screen shows "generating…" until it navigates away. */
  onStart: (band: BandId) => void;
}

function describe(m: Messages, params: PuzzleParams): string {
  const kind = params.alphabet === 'colors' ? m.home.alphabetColors(params.alphabetSize) : m.home.alphabetDigits;
  return m.home.params(params.length, kind, params.allowRepeats);
}

/** Free play: tap a difficulty and a puzzle of that band starts right away. */
export function mountFreePlay(root: HTMLElement, opts: FreePlayOptions): void {
  const { m } = opts;
  const back = iconButton(m.puzzle.back, 'back');
  back.addEventListener('click', opts.onBack);

  const status = h('p', { class: 'gen-status', role: 'status', 'aria-live': 'polite' }, opts.notice ?? '');
  if (opts.notice) status.classList.add('error');

  let focus: HTMLButtonElement | null = null;
  const buttons = BAND_IDS.map((band, level) => {
    const size = [...new Set(BANDS[band].variants.map((v) => describe(m, v.params)))].join(' / ');
    const { name, description } = m.bands[band];
    const meter = h('span', { class: 'band-meter', 'aria-hidden': 'true' });
    for (let i = 0; i < BAND_IDS.length; i++) meter.append(h('span', { class: i <= level ? 'on' : '' }));
    const solved = opts.solved[band];
    const button = h(
      'button',
      { type: 'button', class: 'band', 'data-band': band, 'aria-label': m.home.startBand(name, description, size) },
      meter,
      h(
        'span',
        { class: 'band-body' },
        h('span', { class: 'band-name' }, name),
        h('span', { class: 'band-desc' }, description),
        h('span', { class: 'band-params' }, size),
      ),
      h(
        'span',
        { class: 'band-go', 'aria-hidden': 'true' },
        solved > 0 ? h('span', { class: 'band-solved' }, icon('check'), String(solved)) : null,
        icon('play'),
      ),
    );
    button.addEventListener('click', () => {
      for (const b of buttons) b.disabled = true;
      button.classList.add('busy');
      button.setAttribute('aria-busy', 'true');
      status.classList.remove('error');
      status.textContent = m.home.generating;
      opts.onStart(band);
    });
    if (band === opts.last) focus = button;
    return button;
  });

  const screen = h(
    'main',
    { class: 'screen free-screen' },
    h(
      'header',
      { class: 'topbar' },
      back,
      h('div', { class: 'title' }, h('h1', {}, m.home.freePlay), h('span', { class: 'subtitle' }, m.home.chooseBand)),
      ...(opts.headerExtra ?? []),
    ),
    h('div', { class: 'band-list', role: 'group', 'aria-label': m.home.chooseBand }, ...buttons),
    status,
  );
  root.replaceChildren(screen);
  (focus ?? buttons[0] ?? back).focus();
}
