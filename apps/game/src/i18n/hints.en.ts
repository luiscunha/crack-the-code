import type { HintContext, HintMessages, NamedCell } from './messages';

const list = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

const at = (c: NamedCell): string => `${c.symbol} in position ${c.position}`;

/** "3 and 2 are out and 7 goes in position 1" */
function conclusions(c: HintContext): string {
  const parts: string[] = [];
  if (c.placed.length) parts.push(list(c.placed.map((p) => `${p.symbol} goes in position ${p.position}`)));
  if (c.out.length === 1) parts.push(`${c.out[0] ?? ''} is not in the code`);
  if (c.out.length > 1) parts.push(`${list(c.out)} are not in the code`);
  if (c.in.length === 1) parts.push(`${c.in[0] ?? ''} is in the code`);
  if (c.in.length > 1) parts.push(`${list(c.in)} are in the code`);
  if (c.removed.length) parts.push(list(c.removed.map((r) => `${r.symbol} is not in position ${r.position}`)));
  for (const k of c.counts) parts.push(`${k.symbol} appears ${times(k.min, k.max, c.length)}`);
  return list(parts);
}

const count = (n: number): string => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

function times(min: number, max: number, length: number): string {
  if (min === max) return `exactly ${count(min)}`;
  if (min === 0) return `at most ${count(max)}`;
  if (max >= length) return `at least ${count(min)}`;
  return `between ${min} and ${max} times`;
}

const right = (n: number): string => `${n} right ${n === 1 ? 'symbol' : 'symbols'}`;
const clue = (c: HintContext): string => c.refs[0] ?? '';

export const hintsEn: HintMessages = {
  clueRef: (guess, n) => `${guess} (#${n})`,
  techniques: {
    elimination: (c) => `Clue ${clue(c)} says nothing is right: ${conclusions(c)}.`,
    'positional-exclusion': (c) =>
      `Clue ${clue(c)} has nothing in the right place: ${conclusions(c)}.`,
    'simple-count': (c) =>
      c.in.length > 0
        ? `Clue ${clue(c)} has ${right(c.total)} and no other candidates are left: ${conclusions(c)}.`
        : `Clue ${clue(c)} has only ${right(c.total)}, and ${c.total === 1 ? 'it is' : 'they are'} already known: ${conclusions(c)}.`,
    fixation: (c) =>
      c.placed.length > 0
        ? `In clue ${clue(c)}, only ${c.exact === 1 ? 'one position' : 'those positions'} can still give the in-place hit: ${conclusions(c)}.`
        : `Clue ${clue(c)} already has its in-place ${c.exact === 1 ? 'hit' : 'hits'} accounted for, so the other symbols are not where it shows them: ${conclusions(c)}.`,
    'only-position': (c) => {
      const first = c.placed[0];
      return first
        ? `${first.symbol} is in the code and has only one place left: ${conclusions(c)}.`
        : `Look at where each symbol can still go: ${conclusions(c)}.`;
    },
    'symbols-complete': (c) =>
      c.in.length > 0
        ? `Only the symbols needed for the ${c.length} positions are left: ${conclusions(c)}.`
        : c.out.length === 0
          ? `Adding up what you know accounts for all ${c.length} positions: ${conclusions(c)}.`
          : `All ${c.length} symbols of the code are known, so the rest are out: ${conclusions(c)}.`,
    'clue-consistency': (c) =>
      `Try the combinations clue ${clue(c)} allows with what you know: in all of them, ${conclusions(c)}.`,
    'clue-crossing': (c) =>
      `Cross clues ${list(c.refs)}: in every combination both allow at once, ${conclusions(c)}.`,
    hypothesis: (c) => {
      const h = c.hypothesis;
      const why =
        c.refs.length === 0
          ? 'we would reach a contradiction'
          : c.refs.length === 1
            ? `clue ${c.refs[0]} could no longer hold`
            : `clues ${list(c.refs)} could no longer hold together`;
      const head = h ? `If ${h.symbol} were in position ${h.position}, ${why}; so it is not there.` : '';
      const rest = conclusions(c);
      return rest ? `${head} So ${rest}.` : head;
    },
  },
  mistake: (c) => `There is a mistake in your notes: check ${at(c)}.`,
  done: 'Your notes already show the whole code. Enter it in the lock and check it.',
};
