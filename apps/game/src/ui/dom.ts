import type { PuzzleParams } from '@ctc/engine';
import { COLORS, glyph } from '../symbols';

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

/** Minimal element factory: h('button', { class: 'x', 'aria-label': '…' }, 'text'). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
  return el;
}

/** A symbol as shown in clues, keys and the lock: digit, or color swatch with its letter. */
export function symbolEl(symbol: number, params: PuzzleParams, extraClass = ''): HTMLSpanElement {
  const el = h('span', { class: `sym ${extraClass}`.trim(), 'aria-hidden': 'true' }, glyph(symbol, params));
  if (params.alphabet === 'colors') {
    el.classList.add('sym-color');
    el.style.setProperty('--swatch', COLORS[symbol]?.css ?? 'gray');
    el.style.setProperty('--ink', COLORS[symbol]?.ink ?? 'black');
  }
  return el;
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Restarts a one-shot CSS animation class (e.g. the lock shake). */
export function replayAnimation(el: HTMLElement, className: string): void {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  el.addEventListener('animationend', () => el.classList.remove(className), { once: true });
}
