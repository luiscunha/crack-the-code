import type { Clue } from '@ctc/engine';
import { symbolName } from '../i18n';
import { isSymbolOut, markAt } from '../state';
import { h, symbolEl } from './dom';
import type { Component, ComponentContext, View } from './view';

interface ClueSymbol {
  el: HTMLElement;
  symbol: number;
  position: number;
}

interface ClueRender {
  nodes: Node[];
  symbols: ClueSymbol[];
  /** Text for screen readers. */
  description: string;
}

function pegs(exact: number, misplaced: number): HTMLElement {
  const el = h('span', { class: 'pegs', 'aria-hidden': 'true' });
  for (let i = 0; i < exact; i++) el.append(h('span', { class: 'peg peg-exact' }, '●'));
  for (let i = 0; i < misplaced; i++) el.append(h('span', { class: 'peg peg-misplaced' }, '○'));
  if (exact + misplaced === 0) el.append(h('span', { class: 'peg peg-none' }, '–'));
  return el;
}

function renderClue(clue: Clue, ctx: ComponentContext): ClueRender {
  const { puzzle, m } = ctx;
  const { params } = puzzle;
  switch (clue.kind) {
    case 'guess': {
      const code = h('span', { class: 'clue-code' });
      const symbols = clue.guess.map((symbol, position) => {
        const el = symbolEl(symbol, params);
        code.append(el);
        return { el, symbol, position };
      });
      const { exact, misplaced } = clue.feedback;
      const text = m.puzzle.feedback(exact, misplaced);
      const names = clue.guess.map((s) => symbolName(m, s, params)).join(' ');
      return {
        nodes: [code, pegs(exact, misplaced), h('span', { class: 'clue-text' }, text)],
        symbols,
        description: `${names}: ${text}`,
      };
    }
    default: {
      const unreachable: never = clue.kind;
      return unreachable;
    }
  }
}

export function createClues(ctx: ComponentContext): Component {
  const { puzzle, m, dispatch } = ctx;
  const list = h('ol', { class: 'clue-list' });
  const rows = puzzle.clues.map((clue, i) => {
    const render = renderClue(clue, ctx);
    const button = h(
      'button',
      { type: 'button', class: 'clue', 'aria-pressed': 'false' },
      h('span', { class: 'clue-num' }, m.puzzle.clueNumber(i + 1)),
      ...render.nodes,
    );
    button.addEventListener('click', () => dispatch({ type: 'toggleExhausted', clue: i }));
    list.append(h('li', {}, button));
    return { button, render };
  });

  const el = h(
    'section',
    { class: 'panel clues', 'aria-labelledby': 'clues-title' },
    h('h2', { id: 'clues-title', class: 'panel-title' }, m.puzzle.cluesTitle),
    list,
    h('p', { class: 'help' }, m.puzzle.exhaustedHelp),
  );

  const update = ({ state, highlightClues }: View): void => {
    const { notes, exhausted } = state.board;
    rows.forEach(({ button, render }, i) => {
      const done = exhausted[i] ?? false;
      button.classList.toggle('exhausted', done);
      button.classList.toggle('highlight', highlightClues.has(i));
      button.setAttribute('aria-pressed', String(done));
      button.setAttribute('aria-label', `${m.puzzle.clueToggleLabel(i + 1, done)}. ${render.description}`);
      for (const { el: symbol, symbol: s, position } of render.symbols) {
        symbol.classList.toggle('struck', isSymbolOut(notes, puzzle.params, s));
        symbol.classList.toggle('confirmed', markAt(notes, position, s) === 'confirmed');
      }
    });
  };
  return { el, update };
}
