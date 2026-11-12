import { symbolName } from '../i18n';
import { isSymbolOut } from '../state';
import { h, symbolEl } from './dom';
import type { Component, ComponentContext, View } from './view';

const LONG_PRESS_MS = 450;

/** The lock: one button per slot; tapping selects it. */
export function createLock(ctx: ComponentContext): Component {
  const { puzzle, m, dispatch } = ctx;
  const { params } = puzzle;
  const slots = Array.from({ length: params.length }, (_, i) => {
    const button = h('button', { type: 'button', class: 'slot' });
    button.addEventListener('click', () => dispatch({ type: 'select', slot: i }));
    return button;
  });
  const el = h(
    'div',
    { class: 'lock', role: 'group', 'aria-label': m.puzzle.lockTitle },
    ...slots,
  );
  el.style.setProperty('--slots', String(params.length));

  const update = ({ state }: View): void => {
    const solved = state.solvedAt !== null;
    el.classList.toggle('open', solved);
    slots.forEach((button, i) => {
      const value = state.board.lock[i] ?? null;
      button.replaceChildren(value === null ? h('span', { class: 'sym sym-empty', 'aria-hidden': 'true' }) : symbolEl(value, params));
      const selected = i === state.selected && !solved;
      button.classList.toggle('selected', selected);
      if (selected) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
      button.setAttribute(
        'aria-label',
        m.puzzle.slotLabel(i + 1, value === null ? null : symbolName(m, value, params)),
      );
    });
  };
  return { el, update };
}

/** Symbol keys plus erase. Long-press / right-click strikes a symbol everywhere. */
export function createKeypad(ctx: ComponentContext): Component {
  const { puzzle, m, dispatch } = ctx;
  const { params } = puzzle;

  const keys = Array.from({ length: params.alphabetSize }, (_, s) => {
    const name = symbolName(m, s, params);
    const button = h(
      'button',
      { type: 'button', class: 'key', 'aria-label': m.puzzle.keyLabel(name) },
      symbolEl(s, params),
    );
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

  const erase = h('button', { type: 'button', class: 'key key-erase', 'aria-label': m.puzzle.erase }, '⌫');
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
