import type { Puzzle } from '@ctc/engine';
import type { Messages } from '../i18n';
import { canRedo, canUndo, elapsedMs, newGame, reduce, type Action, type GameState } from '../state';
import { symbolForKey } from '../symbols';
import { createClues } from './clues';
import { formatTime, h, replayAnimation } from './dom';
import { createKeypad, createLock } from './lock';
import { createNotes } from './notes';
import { createSuccess } from './success';
import type { Component, View } from './view';

export interface PuzzleScreenOptions {
  puzzle: Puzzle;
  m: Messages;
  now: () => number;
  /** Resume a game (e.g. after switching language). */
  initialState?: GameState;
  onState?: (state: GameState) => void;
  onHome: () => void;
  onAgain: () => void;
  /** Extra header controls (language toggle). */
  headerExtra?: HTMLElement[];
}

export interface PuzzleScreen {
  dispose: () => void;
}

function button(label: string, className: string, icon?: string): HTMLButtonElement {
  return h(
    'button',
    { type: 'button', class: `btn ${className}`, 'aria-label': icon ? label : undefined },
    icon ? h('span', { 'aria-hidden': 'true' }, icon) : label,
    icon ? h('span', { class: 'btn-label' }, label) : null,
  );
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
    render();
    opts.onState?.(state);
  };

  const ctx = { puzzle, m, dispatch };
  const clues = createClues(ctx);
  const lock = createLock(ctx);
  const keypad = createKeypad(ctx);
  const notes = createNotes(ctx);
  const components: Component[] = [clues, lock, keypad, notes];

  // Header
  const back = button(m.puzzle.back, 'btn-icon', '←');
  back.addEventListener('click', opts.onHome);
  const timer = h('span', { class: 'timer', role: 'timer', 'aria-label': m.puzzle.timerLabel });
  const title = h(
    'div',
    { class: 'title' },
    h('h1', {}, m.bands[puzzle.band].name),
    h('span', { class: 'subtitle' }, m.puzzle.seed(puzzle.seed)),
  );
  const header = h('header', { class: 'topbar' }, back, title, timer, ...(opts.headerExtra ?? []));

  // Actions
  const undo = button(m.puzzle.undo, 'btn-icon', '↶');
  const redo = button(m.puzzle.redo, 'btn-icon', '↷');
  const validate = button(m.puzzle.validate, 'btn-primary');
  undo.addEventListener('click', () => dispatch({ type: 'undo' }));
  redo.addEventListener('click', () => dispatch({ type: 'redo' }));
  validate.addEventListener('click', () => dispatch({ type: 'submit', now: now() }));
  const actions = h('div', { class: 'actions' }, undo, redo, validate);

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
    h('div', { class: 'puzzle-layout' }, clues.el, h('div', { class: 'play' }, lockArea, keypad.el, actions), notes.el),
  );
  root.replaceChildren(screen);

  let overlay: HTMLElement | null = null;
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
      case 'right':
        status.textContent = '';
        showSuccess();
        break;
      case null:
        break;
    }
  }

  function showSuccess(): void {
    overlay = createSuccess(m, state, { onAgain: opts.onAgain, onHome: opts.onHome });
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
    validate.disabled = state.solvedAt !== null;
    tick();
  }

  const onKey = (e: KeyboardEvent): void => {
    if (overlay) return;
    const target = e.target as HTMLElement | null;
    const onButton = target?.tagName === 'BUTTON';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
    } else if (mod && e.key.toLowerCase() === 'y') {
      dispatch({ type: 'redo' });
    } else if (mod || e.altKey) {
      return;
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
    },
  };
}
