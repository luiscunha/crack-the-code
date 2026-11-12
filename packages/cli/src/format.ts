import type { Cell, Clue, Code, Puzzle, PuzzleParams, SolveStep } from '@ctc/engine';

const COLOR_LETTERS = 'RGBYOPWK';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function formatSymbol(symbol: number, params: PuzzleParams): string {
  if (params.alphabet === 'colors') return COLOR_LETTERS[symbol] ?? '?';
  if (params.alphabet === 'letters') return LETTERS[symbol] ?? '?';
  return String(symbol);
}

export function formatCode(code: Code, params: PuzzleParams): string {
  return code.map((s) => formatSymbol(s, params)).join('');
}

export function formatClue(clue: Clue, params: PuzzleParams): string {
  switch (clue.kind) {
    case 'guess':
      return `${formatCode(clue.guess, params)}  →  ${clue.feedback.exact} no lugar certo, ${clue.feedback.misplaced} no lugar errado`;
  }
}

const TECHNIQUE_LABEL: Record<SolveStep['technique'], string> = {
  elimination: 'Eliminação',
  'positional-exclusion': 'Exclusão posicional',
  'simple-count': 'Contagem simples',
  fixation: 'Fixação',
  'only-position': 'Única posição',
  'symbols-complete': 'Símbolos completos',
  'clue-consistency': 'Consistência de uma pista',
  'clue-crossing': 'Cruzamento de pistas',
  hypothesis: 'Hipótese',
};

function cells(list: Cell[], params: PuzzleParams): string {
  return list.map((c) => `${formatSymbol(c.symbol, params)}@${c.position + 1}`).join(' ');
}

/** One line per solver step; hides the bookkeeping already implied by "out" and "placed". */
export function formatStep(step: SolveStep, index: number, puzzle: Puzzle): string {
  const { params } = puzzle;
  const { effect } = step;
  const out = new Set(effect.symbolsOut);
  const placedPositions = new Set(effect.placed.map((c) => c.position));
  const placedSymbols = new Set(effect.placed.map((c) => c.symbol));
  const removed = effect.removed.filter(
    (c) =>
      !out.has(c.symbol) &&
      !placedPositions.has(c.position) &&
      !(placedSymbols.has(c.symbol) && !params.allowRepeats),
  );

  const parts: string[] = [];
  if (effect.symbolsOut.length) {
    parts.push(`fora: ${effect.symbolsOut.map((s) => formatSymbol(s, params)).join(' ')}`);
  }
  if (effect.symbolsIn.length) {
    parts.push(`dentro: ${effect.symbolsIn.map((s) => formatSymbol(s, params)).join(' ')}`);
  }
  if (effect.placed.length) parts.push(`fixa: ${cells(effect.placed, params)}`);
  if (removed.length) parts.push(`exclui: ${cells(removed, params)}`);
  if (params.allowRepeats) {
    const counts = effect.counts
      .filter((c) => c.max > 0 && (c.min > 1 || c.max < params.length))
      .map((c) => {
        const range = c.min === c.max ? `${c.min}` : `${c.min}–${c.max}`;
        return `${formatSymbol(c.symbol, params)}×${range}`;
      });
    if (counts.length) parts.push(`contagem: ${counts.join(' ')}`);
  }

  const source = step.clueIds.length
    ? ` [${step.clueIds.map((id) => formatCode((puzzle.clues[id] as Clue).guess, params)).join(' + ')}]`
    : '';
  const hypothesis = step.hypothesis
    ? ` supondo ${formatSymbol(step.hypothesis.symbol, params)}@${step.hypothesis.position + 1} ⇒ contradição;`
    : '';
  const n = String(index + 1).padStart(2, ' ');
  return `${n}. T${step.tier} ${TECHNIQUE_LABEL[step.technique]}${source}:${hypothesis} ${parts.join('; ')}`;
}

export function describeParams(params: PuzzleParams): string {
  const alphabet =
    params.alphabet === 'digits' && params.alphabetSize === 10
      ? '0–9'
      : `${params.alphabetSize} ${params.alphabet}`;
  return `L=${params.length}, ${alphabet}, ${params.allowRepeats ? 'com' : 'sem'} repetições`;
}
