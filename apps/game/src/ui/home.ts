import type { BandId, WorldId } from '@ctc/engine';
import type { Messages } from '../i18n';
import { h, iconButton } from './dom';
import { icon, type IconName } from './icons';

export interface HomeWorld {
  id: WorldId;
  solved: number;
  total: number;
  locked: boolean;
}

export interface HomeOptions {
  m: Messages;
  /** Message shown under the entries (e.g. a generation failure). */
  notice?: string;
  headerExtra?: HTMLElement[];
  /** What "Continue" resumes (e.g. "Cofre · nível 3"); absent = nothing in progress. */
  resume?: string;
  campaign: { solved: number; total: number; worlds: readonly HomeWorld[] };
  daily: { number: number; band: BandId; solved: boolean; streak: number };
  /** Decorative lock shown under the brand. */
  hero?: HTMLElement;
  onResume: () => void;
  onCampaign: () => void;
  onDaily: () => void;
  onFreePlay: () => void;
  onStats: () => void;
}

function entry(kind: string, name: IconName, title: string, ...body: (Node | false | null)[]): HTMLButtonElement {
  return h(
    'button',
    { type: 'button', class: `entry entry-${kind}` },
    h('span', { class: 'entry-icon', 'aria-hidden': 'true' }, icon(name)),
    h('span', { class: 'entry-title' }, title),
    ...body,
  );
}

/** Start screen: brand and hero lock, then Continue, Campaign, Daily Vault and Free play. */
export function mountHome(root: HTMLElement, opts: HomeOptions): void {
  const { m, daily } = opts;

  const resume =
    opts.resume !== undefined
      ? h(
          'button',
          { type: 'button', class: 'entry entry-resume', 'aria-label': m.home.continueLabel(opts.resume) },
          h('span', { class: 'entry-icon', 'aria-hidden': 'true' }, icon('play')),
          h('span', { class: 'entry-title' }, m.home.continue),
          h('span', { class: 'entry-line' }, opts.resume),
        )
      : null;
  resume?.addEventListener('click', opts.onResume);

  const { solved, total, worlds } = opts.campaign;
  const meter = h('span', { class: 'meter', 'aria-hidden': 'true' }, h('span', { class: 'meter-fill' }));
  meter.style.setProperty('--p', String(total > 0 ? solved / total : 0));
  const chips = h(
    'span',
    { class: 'world-chips', 'aria-hidden': 'true' },
    ...worlds.map((w) =>
      h('span', { class: `world-chip${w.locked ? ' locked' : ''}`, 'data-theme': w.id, title: m.worlds[w.id] }, w.locked ? icon('lock') : null),
    ),
  );
  const campaign = entry('campaign', 'map', m.home.campaign, h('span', { class: 'entry-line' }, m.home.campaignProgress(solved, total)), meter, chips);
  campaign.addEventListener('click', opts.onCampaign);

  const dailyBtn = entry(
    'daily',
    'calendar',
    m.home.daily,
    h('span', { class: 'entry-number' }, `#${daily.number}`),
    h('span', { class: 'entry-line' }, m.bands[daily.band].name),
    daily.solved && h('span', { class: 'entry-stamp' }, icon('check'), m.home.dailySolved),
    daily.streak > 0 && h('span', { class: 'entry-streak' }, icon('flame'), m.home.streak(daily.streak)),
  );
  dailyBtn.dataset['theme'] = 'daily';
  if (daily.solved) dailyBtn.classList.add('entry-done');
  dailyBtn.addEventListener('click', opts.onDaily);

  const free = entry('free', 'dice', m.home.freePlay, h('span', { class: 'entry-line' }, m.home.freePlayLine));
  free.addEventListener('click', opts.onFreePlay);

  const stats = iconButton(m.home.stats, 'stats');
  stats.addEventListener('click', opts.onStats);

  const status = h('p', { class: 'gen-status', role: 'status', 'aria-live': 'polite' }, opts.notice ?? '');
  if (opts.notice) status.classList.add('error');

  const screen = h(
    'main',
    { class: 'screen home' },
    h('header', { class: 'topbar home-bar' }, h('span', { class: 'spacer' }), stats, ...(opts.headerExtra ?? [])),
    h(
      'section',
      { class: 'hero' },
      opts.hero ?? null,
      h('h1', { class: 'brand' }, m.appTitle),
      h('p', { class: 'tagline' }, m.tagline),
    ),
    h('nav', { class: 'entries', 'aria-label': m.appTitle }, resume, campaign, dailyBtn, free),
    status,
  );
  root.replaceChildren(screen);
  (resume ?? campaign).focus();
}
