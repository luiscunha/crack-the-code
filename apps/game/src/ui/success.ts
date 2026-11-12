import type { Messages } from '../i18n';
import { elapsedMs, isClean, type GameState } from '../state';
import { formatTime, h } from './dom';

/** Lets an action report back inside the dialog ("Copied!", or a text to copy by hand). */
export interface SuccessFeedback {
  say: (text: string) => void;
  /** Shows `text` in a read-only, pre-selected box (manual copy fallback). */
  showText: (label: string, text: string) => void;
}

export interface SuccessAction {
  label: string;
  primary?: boolean;
  onClick: (button: HTMLButtonElement, feedback: SuccessFeedback) => void;
}

export interface SuccessOptions {
  actions: readonly SuccessAction[];
  /** Line under the title (e.g. "Come back tomorrow"). */
  note?: string;
}

/** Modal shown when the code is right: time, hints, wrong attempts, clean badge, mode actions. */
export function createSuccess(m: Messages, state: GameState, opts: SuccessOptions): HTMLElement {
  const stat = (label: string, value: string): HTMLElement =>
    h('div', { class: 'stat' }, h('dt', {}, label), h('dd', {}, value));

  const status = h('p', { class: 'status dialog-status', role: 'status', 'aria-live': 'polite' });
  const manual = h('div', { class: 'share-manual', hidden: true });
  const feedback: SuccessFeedback = {
    say: (text) => {
      status.textContent = text;
    },
    showText: (label, text) => {
      const box = h('textarea', { class: 'share-text', readonly: true, rows: 3, 'aria-label': label });
      box.value = text;
      manual.replaceChildren(h('p', {}, label), box);
      manual.hidden = false;
      box.focus();
      box.select();
    },
  };

  const buttons = opts.actions.map((action) => {
    const button = h('button', { type: 'button', class: action.primary ? 'btn btn-primary' : 'btn' }, action.label);
    button.addEventListener('click', () => action.onClick(button, feedback));
    return button;
  });

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
    opts.note && h('p', { class: 'dialog-note' }, opts.note),
    h('div', { class: 'dialog-actions' }, ...buttons),
    status,
    manual,
  );
  const overlay = h('div', { class: 'overlay' }, dialog);
  queueMicrotask(() => buttons[0]?.focus());
  return overlay;
}
