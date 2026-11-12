import type { Puzzle, SolveStep } from '@ctc/engine';
import { explainHint, hintKey, nextHint, solverSteps, type Hint } from '../hints';
import type { Messages } from '../i18n';
import type { Action, GameState } from '../state';
import { h } from './dom';

export interface HintPanelOptions {
  puzzle: Puzzle;
  m: Messages;
  dispatch: (action: Action) => void;
  getState: () => GameState;
  /** Called whenever the highlighted hint changes (null = none). */
  onHighlight: (hint: Hint | null) => void;
}

export interface HintPanel {
  el: HTMLElement;
  /** Shows the hint for the current notes; counts it once per distinct hint. */
  show: () => void;
  close: () => void;
  isOpen: () => boolean;
}

export function createHintPanel(opts: HintPanelOptions): HintPanel {
  const { puzzle, m, dispatch, getState, onHighlight } = opts;
  let steps: SolveStep[] | null = null;
  let current: Hint | null = null;
  let lastCounted = '';

  const text = h('p', { class: 'hint-text' });
  const apply = h('button', { type: 'button', class: 'btn btn-primary' }, m.hintPanel.apply);
  const closeBtn = h('button', { type: 'button', class: 'btn' }, m.hintPanel.close);
  const el = h(
    'section',
    { class: 'hint-panel', 'aria-labelledby': 'hint-title', 'aria-live': 'polite', hidden: true },
    h('h2', { id: 'hint-title', class: 'panel-title' }, m.hintPanel.title),
    text,
    h('div', { class: 'hint-actions' }, apply, closeBtn),
  );

  const close = (): void => {
    el.hidden = true;
    current = null;
    onHighlight(null);
  };

  const show = (): void => {
    steps ??= solverSteps(puzzle);
    const hint = nextHint(puzzle, steps, getState().board);
    const key = hintKey(hint);
    if (hint.kind !== 'done' && key !== lastCounted) {
      lastCounted = key;
      dispatch({ type: 'useHint' });
    }
    current = hint;
    text.textContent = explainHint(hint, puzzle, m);
    apply.hidden = hint.kind === 'done';
    el.hidden = false;
    onHighlight(hint);
  };

  apply.addEventListener('click', () => {
    const hint = current;
    close();
    if (hint && hint.kind !== 'done') dispatch({ type: 'applyNotes', patch: hint.patch });
  });
  closeBtn.addEventListener('click', close);

  return { el, show, close, isOpen: () => !el.hidden };
}
