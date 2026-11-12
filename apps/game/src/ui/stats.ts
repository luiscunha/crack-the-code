import { BAND_IDS, type CampaignData } from '@ctc/engine';
import type { Messages } from '../i18n';
import {
  campaignSolved,
  campaignTotal,
  currentStreak,
  dailySolvedCount,
  maxStreak,
  type Progress,
} from '../progress';
import { h } from './dom';

export interface StatsOptions {
  m: Messages;
  campaign: CampaignData;
  progress: Progress;
  today: string;
  headerExtra?: HTMLElement[];
  onBack: () => void;
}

export function mountStats(root: HTMLElement, opts: StatsOptions): void {
  const { m, campaign, progress } = opts;
  const stat = (label: string, value: string | number): HTMLElement =>
    h('div', { class: 'stat' }, h('dt', {}, label), h('dd', {}, String(value)));

  const back = h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': m.puzzle.back }, h('span', { 'aria-hidden': 'true' }, '←'), h('span', { class: 'btn-label' }, m.puzzle.back));
  back.addEventListener('click', opts.onBack);

  const clean = Object.values(progress.campaign).filter((r) => r.clean).length;

  const screen = h(
    'main',
    { class: 'screen stats-screen' },
    h('header', { class: 'topbar' }, back, h('div', { class: 'title' }, h('h1', {}, m.stats.title)), ...(opts.headerExtra ?? [])),
    h(
      'section',
      { class: 'panel', 'aria-labelledby': 'stats-daily' },
      h('h2', { id: 'stats-daily', class: 'panel-title' }, m.home.daily),
      h(
        'dl',
        { class: 'stats' },
        stat(m.stats.streak, currentStreak(progress, opts.today)),
        stat(m.stats.maxStreak, maxStreak(progress)),
        stat(m.stats.dailySolved, dailySolvedCount(progress)),
      ),
    ),
    h(
      'section',
      { class: 'panel', 'aria-labelledby': 'stats-campaign' },
      h('h2', { id: 'stats-campaign', class: 'panel-title' }, m.home.campaign),
      h(
        'dl',
        { class: 'stats stats-2' },
        stat(m.stats.campaignSolved, m.map.progress(campaignSolved(campaign, progress), campaignTotal(campaign))),
        stat(m.stats.campaignClean, clean),
      ),
    ),
    h(
      'section',
      { class: 'panel', 'aria-labelledby': 'stats-free' },
      h('h2', { id: 'stats-free', class: 'panel-title' }, m.stats.freeTitle),
      h('dl', { class: 'stats' }, ...BAND_IDS.map((band) => stat(m.bands[band].name, progress.free[band].solved))),
    ),
  );
  root.replaceChildren(screen);
  back.focus();
}
