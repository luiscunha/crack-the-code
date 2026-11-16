import type { PuzzleParams } from '@ctc/engine';
import { symbolName } from '../i18n';
import { isSymbolOut } from '../state';
import { h, replayAnimation, symbolEl } from './dom';
import { icon } from './icons';
import type { Component, ComponentContext, View } from './view';

const LONG_PRESS_MS = 450;

/**
 * Lock chassis shared by the playable lock and the decorative one on the home screen:
 * shackle, side bolts, body with a label and a row of wheels. Themes decide which
 * parts show (a padlock shows the shackle, a vault door the bolts…).
 */
function chassis(wheels: HTMLElement, label: string | undefined, extra: Record<string, string> = {}): HTMLElement {
  return h(
    'div',
    { class: 'lock', ...extra },
    h('span', { class: 'lock-shackle', 'aria-hidden': 'true' }),
    h('span', { class: 'lock-bolts', 'aria-hidden': 'true' }, h('span', { class: 'bolt bolt-l' }), h('span', { class: 'bolt bolt-r' })),
    h(
      'div',
      { class: 'lock-body' },
      h('span', { class: 'lock-deco', 'aria-hidden': 'true' }),
      label ? h('span', { class: 'lock-label', 'aria-hidden': 'true' }) : null,
      wheels,
    ),
  );
}

function setLabel(lock: HTMLElement, label: string | undefined): void {
  const el = lock.querySelector('.lock-label');
  if (el && label) el.textContent = label;
}

/** One drum face: the symbol, or nothing for an empty slot. */
function face(value: number | null, params: PuzzleParams, className: string): HTMLElement {
  return h('span', { class: `face ${className}` }, value === null ? null : symbolEl(value, params));
}

/** Drum strip: the neighbours above and below the shown symbol suggest a turning wheel. */
function strip(value: number | null, params: PuzzleParams): HTMLElement[] {
  const k = params.alphabetSize;
  const prev = value === null ? null : (value - 1 + k) % k;
  const next = value === null ? null : (value + 1) % k;
  return [
    face(prev, params, 'face-prev'),
    value === null ? h('span', { class: 'face face-cur face-empty' }) : face(value, params, 'face-cur'),
    face(next, params, 'face-next'),
  ];
}

export interface LockOptions {
  /** Short text on the lock's label (level number, "#5", band name). */
  label?: string;
}

/** The lock: one wheel (a real button) per slot; tapping selects it. */
export function createLock(ctx: ComponentContext, opts: LockOptions = {}): Component {
  const { puzzle, m, dispatch } = ctx;
  const { params } = puzzle;
  let shown: (number | null | undefined)[] = new Array(params.length).fill(undefined);

  const wheels = Array.from({ length: params.length }, (_, i) => {
    const drum = h('span', { class: 'wheel-strip' });
    const button = h('button', { type: 'button', class: 'wheel' }, h('span', { class: 'wheel-window' }, drum));
    button.style.setProperty('--i', String(i));
    button.addEventListener('click', () => dispatch({ type: 'select', slot: i }));
    return { button, drum };
  });
  const row = h('div', { class: 'wheels', role: 'group', 'aria-label': m.puzzle.lockTitle }, ...wheels.map((w) => w.button));
  row.style.setProperty('--slots', String(params.length));
  const el = chassis(row, opts.label);
  setLabel(el, opts.label);
  el.style.setProperty('--slots', String(params.length));

  const update = ({ state }: View): void => {
    const solved = state.solvedAt !== null;
    el.classList.toggle('open', solved);
    const first = shown.every((v) => v === undefined);
    wheels.forEach(({ button, drum }, i) => {
      const value = state.board.lock[i] ?? null;
      const before = shown[i];
      if (before !== value) {
        drum.replaceChildren(...strip(value, params));
        // A short roll in the direction the digit moved (not on first paint).
        if (!first) replayAnimation(drum, value === null || (before !== null && before !== undefined && value < before) ? 'roll-down' : 'roll-up');
      }
      const selected = i === state.selected && !solved;
      button.classList.toggle('selected', selected);
      if (selected) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
      button.setAttribute('aria-label', m.puzzle.slotLabel(i + 1, value === null ? null : symbolName(m, value, params)));
    });
    shown = state.board.lock.slice();
  };
  return { el, update };
}

/** A still lock for decoration (home hero): same chassis, wheels as plain spans. */
export function createShowpieceLock(params: PuzzleParams, code: readonly number[], label?: string): HTMLElement {
  const row = h(
    'div',
    { class: 'wheels' },
    ...code.map((value, i) => {
      const wheel = h('span', { class: 'wheel' }, h('span', { class: 'wheel-window' }, h('span', { class: 'wheel-strip' }, ...strip(value, params))));
      wheel.style.setProperty('--i', String(i));
      return wheel;
    }),
  );
  row.style.setProperty('--slots', String(code.length));
  const el = chassis(row, label, { 'aria-hidden': 'true' });
  el.classList.add('lock-showpiece');
  setLabel(el, label);
  el.style.setProperty('--slots', String(code.length));
  return el;
}

/** Symbol keys plus erase. Long-press / right-click strikes a symbol everywhere. */
export function createKeypad(ctx: ComponentContext): Component {
  const { puzzle, m, dispatch } = ctx;
  const { params } = puzzle;

  const keys = Array.from({ length: params.alphabetSize }, (_, s) => {
    const name = symbolName(m, s, params);
    const button = h('button', { type: 'button', class: 'key', 'aria-label': m.puzzle.keyLabel(name) }, symbolEl(s, params));
    let timer: number | undefined;
    let longPressed = false;
    const strike = (): void => {
      longPressed = true;
      dispatch({ type: 'strikeSymbol', symbol: s });
    };
    const cancel = (): void => window.clearTimeout(timer);
    button.addEventListener('pointerdown', (e) => {
      longPressed = false;
      if (e.button !== 0) return;
      cancel();
      timer = window.setTimeout(strike, LONG_PRESS_MS);
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel'] as const) {
      button.addEventListener(type, cancel);
    }
    button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      cancel();
      if (!longPressed) strike();
    });
    button.addEventListener('click', () => {
      if (longPressed) {
        longPressed = false;
        return;
      }
      dispatch({ type: 'input', symbol: s });
    });
    return button;
  });

  const erase = h('button', { type: 'button', class: 'key key-erase', 'aria-label': m.puzzle.erase }, icon('erase'));
  erase.addEventListener('click', () => dispatch({ type: 'erase' }));

  const el = h(
    'section',
    { class: 'keypad-wrap', 'aria-label': m.puzzle.keypadTitle },
    h('div', { class: 'keypad', role: 'group' }, ...keys, erase),
    h('p', { class: 'help' }, m.puzzle.keypadHelp),
  );
  if (params.alphabetSize <= 6) el.classList.add('keypad-small');

  const update = ({ state }: View): void => {
    keys.forEach((button, s) => {
      button.classList.toggle('struck', isSymbolOut(state.board.notes, params, s));
    });
  };
  return { el, update };
}
