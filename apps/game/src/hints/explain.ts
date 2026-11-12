import type { Cell, Clue, Puzzle } from '@ctc/engine';
import { symbolName, type Messages } from '../i18n';
import type { HintContext, NamedCell } from '../i18n/messages';
import { glyphs } from '../symbols';
import type { Hint } from './select';

function clueRef(m: Messages, puzzle: Puzzle, id: number): string {
  const clue = puzzle.clues[id] as Clue;
  switch (clue.kind) {
    case 'guess':
      return m.hints.clueRef(glyphs(clue.guess, puzzle.params), id + 1);
    default: {
      const unreachable: never = clue.kind;
      return unreachable;
    }
  }
}

function clueCounts(puzzle: Puzzle, id: number | undefined): { exact: number; total: number } {
  const clue = id === undefined ? undefined : puzzle.clues[id];
  if (!clue) return { exact: 0, total: 0 };
  switch (clue.kind) {
    case 'guess':
      return { exact: clue.feedback.exact, total: clue.feedback.exact + clue.feedback.misplaced };
    default: {
      const unreachable: never = clue.kind;
      return unreachable;
    }
  }
}

/** Symbols in the order they appear in the step's clues ("o 3, o 2 e o 6" for 326). */
function inClueOrder(symbols: readonly number[], puzzle: Puzzle, clueIds: readonly number[]): number[] {
  const order: number[] = [];
  for (const id of clueIds) {
    const clue = puzzle.clues[id] as Clue;
    switch (clue.kind) {
      case 'guess':
        for (const s of clue.guess) if (!order.includes(s)) order.push(s);
        break;
      default: {
        const unreachable: never = clue.kind;
        return unreachable;
      }
    }
  }
  const rank = (s: number): number => {
    const i = order.indexOf(s);
    return i < 0 ? order.length + s : i;
  };
  return [...symbols].sort((a, b) => rank(a) - rank(b));
}

/** The hint in plain language, in the given locale. */
export function explainHint(hint: Hint, puzzle: Puzzle, m: Messages): string {
  const { params } = puzzle;
  const name = (symbol: number): string => symbolName(m, symbol, params);
  const named = (c: Cell): NamedCell => ({ symbol: name(c.symbol), position: c.position + 1 });

  switch (hint.kind) {
    case 'done':
      return m.hints.done;
    case 'mistake':
      return m.hints.mistake(named(hint.cell));
    case 'step': {
      const { step, focus } = hint;
      const hyp = step.hypothesis;
      // The hypothesis cell is the subject of the sentence, not a separate conclusion.
      const removed = hyp
        ? focus.removed.filter((c) => c.position !== hyp.position || c.symbol !== hyp.symbol)
        : focus.removed;
      const ctx: HintContext = {
        refs: step.clueIds.map((id) => clueRef(m, puzzle, id)),
        ...clueCounts(puzzle, step.clueIds[0]),
        length: params.length,
        placed: focus.placed.map(named),
        out: inClueOrder(focus.out, puzzle, step.clueIds).map(name),
        in: inClueOrder(focus.in, puzzle, step.clueIds).map(name),
        removed: removed.map(named),
        counts: focus.counts.map((c) => ({ symbol: name(c.symbol), min: c.min, max: c.max })),
        hypothesis: hyp ? named(hyp) : null,
      };
      return m.hints.techniques[step.technique](ctx);
    }
  }
}
