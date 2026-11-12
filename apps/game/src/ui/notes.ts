import { symbolName } from '../i18n';
import { isRuledOut, isSymbolOut, markAt } from '../state';
import { h, symbolEl } from './dom';
import type { Component, ComponentContext, View } from './view';

/** Notes grid: rows = positions, columns = symbols. Column headers strike a symbol. */
export function createNotes(ctx: ComponentContext): Component {
  const { puzzle, m, dispatch } = ctx;
  const { params } = puzzle;
  const names = Array.from({ length: params.alphabetSize }, (_, s) => symbolName(m, s, params));

  const headers = names.map((_, s) => {
    const button = h('button', { type: 'button', class: 'note-head' }, symbolEl(s, params));
    button.addEventListener('click', () => dispatch({ type: 'strikeSymbol', symbol: s }));
    return button;
  });

  const cells = Array.from({ length: params.length }, (_, p) =>
    names.map((_, s) => {
      const button = h('button', { type: 'button', class: 'note' }, symbolEl(s, params));
      button.addEventListener('click', () => dispatch({ type: 'cycleNote', position: p, symbol: s }));
      return button;
    }),
  );

  const table = h(
    'table',
    { class: 'notes-grid' },
    h(
      'thead',
      {},
      h('tr', {}, h('th', { scope: 'col' }), ...headers.map((b) => h('th', { scope: 'col' }, b))),
    ),
    h(
      'tbody',
      {},
      ...cells.map((row, p) =>
        h(
          'tr',
          {},
          h('th', { scope: 'row', 'aria-label': m.puzzle.position(p + 1) }, String(p + 1)),
          ...row.map((b) => h('td', {}, b)),
        ),
      ),
    ),
  );

  const el = h(
    'section',
    { class: 'panel notes', 'aria-labelledby': 'notes-title' },
    h('h2', { id: 'notes-title', class: 'panel-title' }, m.puzzle.notesTitle),
    h('div', { class: 'notes-scroll' }, table),
    h('p', { class: 'help' }, m.puzzle.notesHelp),
  );

  const update = ({ state, highlightCells }: View): void => {
    const { notes } = state.board;
    headers.forEach((button, s) => {
      const out = isSymbolOut(notes, params, s);
      button.classList.toggle('struck', out);
      button.setAttribute('aria-label', m.puzzle.strikeLabel(names[s] ?? '', out));
    });
    cells.forEach((row, p) =>
      row.forEach((button, s) => {
        const mark = markAt(notes, p, s);
        button.dataset['mark'] = mark;
        button.classList.toggle('implied', mark === 'unknown' && isRuledOut(notes, params, p, s));
        button.classList.toggle(
          'highlight',
          highlightCells.some((c) => c.position === p && c.symbol === s),
        );
        button.setAttribute('aria-label', m.puzzle.noteLabel(p + 1, names[s] ?? '', mark));
      }),
    );
  };
  return { el, update };
}
