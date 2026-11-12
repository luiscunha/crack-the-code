import type { HintContext, HintMessages, NamedCell } from './messages';

const list = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;

const o = (symbol: string): string => `o ${symbol}`;
const at = (c: NamedCell): string => `${o(c.symbol)} na posição ${c.position}`;

/** "o 3 e o 2 saem do código e o 7 fica na posição 1" */
function conclusions(c: HintContext): string {
  const parts: string[] = [];
  if (c.placed.length) parts.push(list(c.placed.map((p) => `${o(p.symbol)} fica na posição ${p.position}`)));
  if (c.out.length === 1) parts.push(`${o(c.out[0] ?? '')} sai do código`);
  if (c.out.length > 1) parts.push(`${list(c.out.map(o))} saem do código`);
  if (c.in.length === 1) parts.push(`${o(c.in[0] ?? '')} está no código`);
  if (c.in.length > 1) parts.push(`${list(c.in.map(o))} estão no código`);
  if (c.removed.length) {
    parts.push(
      list(
        bySymbol(c.removed).map(([s, ps]) =>
          ps.length === 1 ? `${o(s)} não está na posição ${ps[0]}` : `${o(s)} não está nas posições ${list(ps)}`,
        ),
      ),
    );
  }
  for (const k of c.counts) parts.push(`${o(k.symbol)} aparece ${times(k.min, k.max, c.length)}`);
  return parts.join('; ');
}

/** Removed cells grouped by symbol, in first-seen order: [["5", ["1", "2"]], …]. */
function bySymbol(cells: readonly NamedCell[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const c of cells) groups.set(c.symbol, [...(groups.get(c.symbol) ?? []), String(c.position)]);
  return [...groups];
}

const vezes = (n: number): string => `${n} ${n === 1 ? 'vez' : 'vezes'}`;

function times(min: number, max: number, length: number): string {
  if (min === max) return `exatamente ${vezes(min)}`;
  if (min === 0) return `no máximo ${vezes(max)}`;
  if (max >= length) return `pelo menos ${vezes(min)}`;
  return `entre ${min} e ${max} vezes`;
}

const right = (n: number): string => `${n} ${n === 1 ? 'símbolo certo' : 'símbolos certos'}`;
const clue = (c: HintContext): string => c.refs[0] ?? '';

export const hintsPt: HintMessages = {
  clueRef: (guess, n) => `${guess} (n.º ${n})`,
  techniques: {
    elimination: (c) => `A pista ${clue(c)} diz que nada está certo: ${conclusions(c)}.`,
    'positional-exclusion': (c) =>
      `A pista ${clue(c)} não tem nenhum símbolo no lugar certo: ${conclusions(c)}.`,
    'simple-count': (c) =>
      c.in.length > 0
        ? `A pista ${clue(c)} tem ${right(c.total)} e não sobram outros candidatos: ${conclusions(c)}.`
        : `A pista ${clue(c)} só tem ${right(c.total)} e ${c.total === 1 ? 'esse já está identificado' : 'esses já estão identificados'}: ${conclusions(c)}.`,
    fixation: (c) =>
      c.placed.length > 0
        ? `Na pista ${clue(c)}, só ${c.exact === 1 ? 'uma posição pode' : 'essas posições podem'} ainda dar o certo no lugar: ${conclusions(c)}.`
        : `A pista ${clue(c)} já tem ${c.exact === 1 ? 'o seu certo no lugar identificado' : 'os seus certos no lugar identificados'}, por isso os outros símbolos não estão onde ela os mostra: ${conclusions(c)}.`,
    'only-position': (c) => {
      const first = c.placed[0];
      return first
        ? `O ${first.symbol} está no código e só lhe resta uma posição: ${conclusions(c)}.`
        : `Vê onde cada símbolo ainda pode ficar: ${conclusions(c)}.`;
    },
    'symbols-complete': (c) =>
      c.in.length > 0
        ? `Só restam os símbolos necessários para as ${c.length} posições: ${conclusions(c)}.`
        : c.out.length === 0
          ? `Somando o que já sabes, as ${c.length} posições ficam contadas: ${conclusions(c)}.`
          : `Já sabemos quais são os ${c.length} símbolos do código, por isso os restantes saem: ${conclusions(c)}.`,
    'clue-consistency': (c) =>
      `Experimenta as combinações que a pista ${clue(c)} permite com o que já sabes: em todas elas, ${conclusions(c)}.`,
    'clue-crossing': (c) =>
      `Cruza as pistas ${list(c.refs)}: em todas as combinações que as duas permitem ao mesmo tempo, ${conclusions(c)}.`,
    hypothesis: (c) => {
      const h = c.hypothesis;
      const why =
        c.refs.length === 0
          ? 'chegaríamos a uma contradição'
          : c.refs.length === 1
            ? `a pista ${c.refs[0]} deixaria de ser possível`
            : `as pistas ${list(c.refs)} deixariam de ser possíveis em conjunto`;
      const head = h ? `Se ${o(h.symbol)} estivesse na posição ${h.position}, ${why}; logo não está.` : '';
      const rest = conclusions(c);
      return rest ? `${head} Assim, ${rest}.` : head;
    },
  },
  mistake: (c) => `Há um erro nas tuas notas: revê ${at(c)}.`,
  done: 'As tuas notas já mostram o código todo. Introduz-o no cadeado e valida.',
};
