import { BAND_IDS, BANDS, type BandId, type PuzzleParams } from '@ctc/engine';
import type { Messages } from '../i18n';
import { h } from './dom';

export interface HomeOptions {
  m: Messages;
  selected: BandId;
  /** Message shown under the free-play button (e.g. a generation failure). */
  notice?: string;
  headerExtra?: HTMLElement[];
  /** What "Continue" resumes (e.g. "Cofre · nível 3"); absent = nothing in progress. */
  resume?: string;
  campaign: { solved: number; total: number };
  daily: { number: number; band: BandId; solved: boolean; streak: number };
  onResume: () => void;
  onCampaign: () => void;
  onDaily: () => void;
  onStats: () => void;
  onSelect: (band: BandId) => void;
  /** Starts generation; the screen shows "generating…" until it navigates away. */
  onNewPuzzle: (band: BandId) => void;
}

function describe(m: Messages, params: PuzzleParams): string {
  const kind =
    params.alphabet === 'colors' ? m.home.alphabetColors(params.alphabetSize) : m.home.alphabetDigits;
  return m.home.params(params.length, kind, params.allowRepeats);
}

function entry(icon: string, title: string, ...lines: (string | false)[]): HTMLButtonElement {
  return h(
    'button',
    { type: 'button', class: 'entry' },
    h('span', { class: 'entry-icon', 'aria-hidden': 'true' }, icon),
    h(
      'span',
      { class: 'entry-body' },
      h('span', { class: 'entry-title' }, title),
      ...lines.filter((l): l is string => !!l).map((l) => h('span', { class: 'entry-line' }, l)),
    ),
    h('span', { class: 'entry-go', 'aria-hidden': 'true' }, '›'),
  );
}

/** Start screen: resume, campaign, Daily Vault, free play (band selector), statistics. */
export function mountHome(root: HTMLElement, opts: HomeOptions): void {
  const { m } = opts;
  let selected = opts.selected;

  const resume =
    opts.resume !== undefined
      ? h(
          'button',
          { type: 'button', class: 'btn btn-primary btn-resume', 'aria-label': m.home.continueLabel(opts.resume) },
          h('span', {}, `▶ ${m.home.continue}`),
          h('span', { class: 'resume-what' }, opts.resume),
        )
      : null;
  resume?.addEventListener('click', opts.onResume);

  const campaign = entry('🗺️', m.home.campaign, m.home.campaignProgress(opts.campaign.solved, opts.campaign.total));
  campaign.addEventListener('click', opts.onCampaign);

  const { daily } = opts;
  const daySolved = daily.solved ? `${m.home.dailySolved}${daily.streak > 0 ? ` · ${m.home.streak(daily.streak)}` : ''}` : false;
  const dailyBtn = entry('🔐', m.home.daily, m.home.dailyLine(daily.number, m.bands[daily.band].name), daySolved);
  if (daily.solved) dailyBtn.classList.add('entry-done');
  dailyBtn.addEventListener('click', opts.onDaily);

  const stats = h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': m.home.stats }, h('span', { 'aria-hidden': 'true' }, '📊'), h('span', { class: 'btn-label' }, m.home.stats));
  stats.addEventListener('click', opts.onStats);

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
      stats,
      ...(opts.headerExtra ?? []),
    ),
    h('nav', { class: 'entries', 'aria-label': m.appTitle }, resume, campaign, dailyBtn),
    h(
      'section',
      { class: 'bands', 'aria-labelledby': 'bands-title' },
      h('h2', { id: 'bands-title', class: 'section-title' }, m.home.freePlay),
      h('p', { class: 'help' }, m.home.chooseBand),
      h('div', { class: 'band-list', role: 'group', 'aria-labelledby': 'bands-title' }, ...cards),
      h('div', { class: 'home-actions' }, start, status),
    ),
  );
  root.replaceChildren(screen);
  select(selected);
  (resume ?? campaign).focus();
}
