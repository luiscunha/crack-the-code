import type { CampaignData, CampaignLevel } from '@ctc/engine';
import type { Messages } from '../i18n';
import {
  campaignSolved,
  campaignTotal,
  levelLockReason,
  levelStatus,
  solvedInWorld,
  worldLockReason,
  type Progress,
} from '../progress';
import { formatTime, h } from './dom';

export interface MapOptions {
  m: Messages;
  campaign: CampaignData;
  progress: Progress;
  /** Level to focus (the one just played). */
  focus?: string;
  headerExtra?: HTMLElement[];
  onBack: () => void;
  onLevel: (level: CampaignLevel) => void;
}

const MARK = { locked: '🔒', open: '', solved: '✓', clean: '✨' } as const;

/** Campaign map: one card per world, a 6 × 2 grid of level buttons in each. */
export function mountMap(root: HTMLElement, opts: MapOptions): void {
  const { m, campaign, progress } = opts;
  let focusEl: HTMLButtonElement | null = null;
  let firstOpen: HTMLButtonElement | null = null;

  const back = h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': m.puzzle.back }, h('span', { 'aria-hidden': 'true' }, '←'), h('span', { class: 'btn-label' }, m.puzzle.back));
  back.addEventListener('click', opts.onBack);

  const worlds = campaign.worlds.map((world, w) => {
    const name = m.worlds[world.id];
    const worldLock = worldLockReason(campaign, progress, w);
    const bands = [...new Set(world.levels.map((l) => m.bands[l.band].name))].join(' · ');
    const levels = world.levels.map((level) => {
      const status = levelStatus(campaign, progress, level);
      const n = level.index + 1;
      const reason = status === 'locked' ? levelLockReason(campaign, progress, level) : null;
      const best = progress.campaign[level.id]?.bestTimeMs ?? null;
      const label =
        reason?.kind === 'level'
          ? m.map.lockedLevel(n, reason.previous.index + 1)
          : reason?.kind === 'world'
            ? `${m.map.levelLabel(n, 'locked', null)}. ${m.map.lockedWorld(m.worlds[reason.previous.id], reason.missing)}`
            : m.map.levelLabel(n, status, best === null ? null : formatTime(best));
      const button = h(
        'button',
        { type: 'button', class: 'level', 'data-status': status, 'aria-label': label, title: label, disabled: status === 'locked' },
        h('span', { class: 'level-num', 'aria-hidden': 'true' }, String(n)),
        h('span', { class: 'level-mark', 'aria-hidden': 'true' }, MARK[status]),
      );
      button.addEventListener('click', () => opts.onLevel(level));
      if (level.id === opts.focus) focusEl = button;
      if (!firstOpen && status === 'open') firstOpen = button;
      return button;
    });
    const titleId = `world-${world.id}`;
    return h(
      'section',
      { class: `world${worldLock ? ' world-locked' : ''}`, 'aria-labelledby': titleId },
      h(
        'div',
        { class: 'world-head' },
        h('h2', { id: titleId }, name),
        h('span', { class: 'world-progress' }, m.map.progress(solvedInWorld(progress, world), world.levels.length)),
      ),
      h('p', { class: 'world-bands' }, bands),
      worldLock?.kind === 'world' &&
        h('p', { class: 'world-lock' }, `🔒 ${m.map.lockedWorld(m.worlds[worldLock.previous.id], worldLock.missing)}`),
      h('div', { class: 'level-grid', role: 'group', 'aria-labelledby': titleId }, ...levels),
    );
  });

  const screen = h(
    'main',
    { class: 'screen map' },
    h(
      'header',
      { class: 'topbar' },
      back,
      h(
        'div',
        { class: 'title' },
        h('h1', {}, m.map.title),
        h('span', { class: 'subtitle' }, m.home.campaignProgress(campaignSolved(campaign, progress), campaignTotal(campaign))),
      ),
      ...(opts.headerExtra ?? []),
    ),
    h('div', { class: 'worlds' }, ...worlds),
  );
  root.replaceChildren(screen);
  const target: HTMLButtonElement = focusEl ?? firstOpen ?? back;
  target.focus();
  if (target !== back) target.scrollIntoView({ block: 'center' });
}
