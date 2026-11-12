import type { Messages } from '../i18n';
import { elapsedMs, isClean, type GameState } from '../state';
import { formatTime, h } from './dom';

export interface SuccessActions {
  onAgain: () => void;
  onHome: () => void;
}

/** Modal shown when the code is right: time, hints, wrong attempts, clean badge. */
export function createSuccess(m: Messages, state: GameState, actions: SuccessActions): HTMLElement {
  const stat = (label: string, value: string): HTMLElement =>
    h('div', { class: 'stat' }, h('dt', {}, label), h('dd', {}, value));
  const again = h('button', { type: 'button', class: 'btn btn-primary' }, m.success.again);
  const home = h('button', { type: 'button', class: 'btn' }, m.success.home);
  again.addEventListener('click', actions.onAgain);
  home.addEventListener('click', actions.onHome);

  const dialog = h(
    'div',
    { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'success-title' },
    h('div', { class: 'dialog-icon', 'aria-hidden': 'true' }, '🔓'),
    h('h2', { id: 'success-title' }, m.success.title),
    isClean(state) && h('p', { class: 'badge-clean' }, `✨ ${m.success.clean}`),
    h(
      'dl',
      { class: 'stats' },
      stat(m.success.time, formatTime(elapsedMs(state, state.solvedAt ?? 0))),
      stat(m.success.hints, String(state.hintsUsed)),
      stat(m.success.wrong, String(state.wrongSubmissions)),
    ),
    h('div', { class: 'dialog-actions' }, again, home),
  );
  const overlay = h('div', { class: 'overlay' }, dialog);
  queueMicrotask(() => again.focus());
  return overlay;
}
