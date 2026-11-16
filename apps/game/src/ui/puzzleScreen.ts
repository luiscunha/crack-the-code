import type { Puzzle } from '@ctc/engine';
import type { Messages } from '../i18n';
import { canRedo, canRestart, canUndo, elapsedMs, newGame, reduce, type Action, type GameState } from '../state';
import { symbolForKey } from '../symbols';
import { createClues } from './clues';
import { createHintPanel } from './hintPanel';
import { formatTime, h, iconButton, replayAnimation } from './dom';
import { icon } from './icons';
import { createKeypad, createLock } from './lock';
import { createNotes } from './notes';
import { createSuccess, type SuccessOptions } from './success';
import type { Component, View } from './view';

export interface PuzzleScreenOptions {
  puzzle: Puzzle;
  /** Header: what is being played ("Cofre · nível 3", "Cofre Diário #5", band name). */
  title: string;
  subtitle: string;
  /** Text on the lock's label (level number, "#5", band). */
  lockLabel?: string;
  /** Accessible label of the back button. */
  backLabel: string;
  m: Messages;
  now: () => number;
  /** Resume a game (after a reload or a language switch); a solved one opens on the result. */
  initialState?: GameState;
  /** Every state change (to keep it across renders and save it for resuming). */
  onState?: (state: GameState) => void;
  /** Called once, when the right code is submitted, before the result dialog opens. */
  onSolved?: (state: GameState) => void;
  /** Buttons and note of the result dialog (they depend on the mode). */
  success: (state: GameState) => SuccessOptions;
  onBack: () => void;
  /** Extra header controls (language toggle). */
  headerExtra?: HTMLElement[];
}

/** Length of the unlock animation before the result dialog opens (styles.css). */
const UNLOCK_MS = 1100;

export interface PuzzleScreen {
  dispose: () => void;
}

export function mountPuzzleScreen(root: HTMLElement, opts: PuzzleScreenOptions): PuzzleScreen {
  const { puzzle, m, now } = opts;
  let state =
    opts.initialState ??
    newGame({
      params: puzzle.params,
      solution: puzzle.solution,
      clueCount: puzzle.clues.length,
      startedAt: now(),
    });
  let view: View = { state, highlightClues: new Set(), highlightCells: [] };

  const dispatch = (action: Action): void => {
    const before = state;
    state = reduce(state, action);
    if (state === before) return;
    if (action.type === 'submit') onSubmitted();
    else status.textContent = action.type === 'restart' ? m.puzzle.restarted : '';
    status.classList.toggle('status-info', action.type === 'restart');
    render();
    opts.onState?.(state);
  };

  const ctx = { puzzle, m, dispatch };
  const clues = createClues(ctx);
  const lock = createLock(ctx, { label: opts.lockLabel });
  const keypad = createKeypad(ctx);
  const notes = createNotes(ctx);
  const components: Component[] = [clues, lock, keypad, notes];

  // Header
  const back = iconButton(opts.backLabel, 'back');
  back.addEventListener('click', opts.onBack);
  const timer = h('span', { class: 'timer', role: 'timer', 'aria-label': m.puzzle.timerLabel });
  const title = h(
    'div',
    { class: 'title' },
    h('h1', {}, opts.title),
    h('span', { class: 'subtitle' }, opts.subtitle),
  );
  const header = h('header', { class: 'topbar' }, back, title, timer, ...(opts.headerExtra ?? []));

  // Actions
  const undo = iconButton(m.puzzle.undo, 'undo');
  const redo = iconButton(m.puzzle.redo, 'redo');
  const hintBtn = iconButton(m.puzzle.hint, 'hint', 'btn-hint');
  const validate = h('button', { type: 'button', class: 'btn btn-primary btn-validate' }, icon('unlock'), m.puzzle.validate);
  undo.addEventListener('click', () => dispatch({ type: 'undo' }));
  redo.addEventListener('click', () => dispatch({ type: 'redo' }));
  validate.addEventListener('click', () => dispatch({ type: 'submit', now: now() }));
  const restart = iconButton(m.puzzle.restart, 'restart', 'btn-restart');
  restart.setAttribute('aria-expanded', 'false');
  restart.setAttribute('aria-controls', 'restart-confirm');
  const actions = h('div', { class: 'actions' }, undo, redo, restart, hintBtn, validate);

  // Restart asks first (inline, no modal): it wipes minutes of notes, even if undo can bring them back.
  const confirmYes = h('button', { type: 'button', class: 'btn btn-primary' }, icon('restart'), m.puzzle.restartConfirm);
  const confirmNo = h('button', { type: 'button', class: 'btn' }, m.puzzle.cancel);
  const confirm = h(
    'div',
    { id: 'restart-confirm', class: 'confirm', role: 'group', 'aria-labelledby': 'restart-ask', 'aria-describedby': 'restart-note', hidden: true },
    h('p', { id: 'restart-ask', class: 'confirm-ask' }, m.puzzle.restartAsk),
    h('p', { id: 'restart-note', class: 'confirm-note' }, m.puzzle.restartNote),
    h('div', { class: 'confirm-actions' }, confirmNo, confirmYes),
  );
  const closeConfirm = (focus: HTMLElement | null): void => {
    confirm.hidden = true;
    restart.setAttribute('aria-expanded', 'false');
    focus?.focus();
  };
  restart.addEventListener('click', () => {
    if (!confirm.hidden) return closeConfirm(restart);
    hints.close();
    confirm.hidden = false;
    restart.setAttribute('aria-expanded', 'true');
    confirmNo.focus();
  });
  confirmNo.addEventListener('click', () => closeConfirm(restart));
  confirmYes.addEventListener('click', () => {
    closeConfirm(null);
    hints.close();
    dispatch({ type: 'restart' });
    undo.focus();
  });

  const hints = createHintPanel({
    puzzle,
    m,
    dispatch,
    getState: () => state,
    onHighlight: (hint) => {
      view = {
        ...view,
        highlightClues: new Set(hint?.clueIds ?? []),
        highlightCells: hint?.cells ?? [],
      };
      render();
    },
  });
  hintBtn.addEventListener('click', () => {
    closeConfirm(null);
    hints.show();
  });

  const status = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
  const lockArea = h(
    'section',
    { class: 'lock-area', 'aria-label': m.puzzle.lockTitle },
    lock.el,
    status,
  );

  const screen = h(
    'main',
    { class: 'screen puzzle-screen' },
    header,
    h('div', { class: 'puzzle-layout' }, clues.el, h('div', { class: 'play' }, lockArea, keypad.el, actions, confirm, hints.el), notes.el),
  );
  root.replaceChildren(screen);

  let overlay: HTMLElement | null = null;
  let unlockTimer: number | undefined;
  function onSubmitted(): void {
    switch (state.lastSubmit) {
      case 'wrong':
        status.textContent = m.puzzle.wrong;
        replayAnimation(lock.el, 'shake');
        break;
      case 'incomplete':
        status.textContent = m.puzzle.incomplete;
        replayAnimation(lock.el, 'shake');
        break;
      case 'right': {
        status.textContent = '';
        opts.onSolved?.(state);
        // Let the unlock sequence (wheels light up, shackle springs) play before the dialog.
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        overlay = h('div', { class: 'overlay-pending' });
        unlockTimer = window.setTimeout(showSuccess, reduced ? 0 : UNLOCK_MS);
        break;
      }
      case null:
        break;
    }
  }

  function showSuccess(): void {
    hints.close();
    overlay = createSuccess(m, state, opts.success(state));
    screen.append(overlay);
  }

  function tick(): void {
    timer.textContent = formatTime(elapsedMs(state, now()));
  }

  function render(): void {
    view = { ...view, state };
    for (const c of components) c.update(view);
    undo.disabled = !canUndo(state);
    redo.disabled = !canRedo(state);
    restart.disabled = !canRestart(state);
    if (restart.disabled && !confirm.hidden) closeConfirm(null);
    validate.disabled = state.solvedAt !== null;
    hintBtn.disabled = state.solvedAt !== null;
    tick();
  }

  const onKey = (e: KeyboardEvent): void => {
    if (overlay) return;
    if (!confirm.hidden) {
      if (e.key === 'Escape') {
        closeConfirm(restart);
        e.preventDefault();
      }
      return;
    }
    const target = e.target as HTMLElement | null;
    const onButton = target?.tagName === 'BUTTON';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
    } else if (mod && e.key.toLowerCase() === 'y') {
      dispatch({ type: 'redo' });
    } else if (mod || e.altKey) {
      return;
    } else if (e.key === 'Escape' && hints.isOpen()) {
      hints.close();
    } else if (e.key === 'ArrowLeft') {
      dispatch({ type: 'move', delta: -1 });
    } else if (e.key === 'ArrowRight') {
      dispatch({ type: 'move', delta: 1 });
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      dispatch({ type: 'erase' });
    } else if (e.key === 'Enter' && !onButton) {
      dispatch({ type: 'submit', now: now() });
    } else {
      const symbol = e.key.length === 1 ? symbolForKey(e.key, puzzle.params) : null;
      if (symbol === null) return;
      dispatch({ type: 'input', symbol });
    }
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);
  const interval = window.setInterval(tick, 1000);

  render();
  if (state.solvedAt !== null) showSuccess();

  return {
    dispose: () => {
      document.removeEventListener('keydown', onKey);
      window.clearInterval(interval);
      window.clearTimeout(unlockTimer);
    },
  };
}
