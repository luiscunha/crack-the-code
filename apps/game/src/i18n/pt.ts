import type { Mark } from '../state';
import type { Messages } from './messages';

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

const MARK: Record<Mark, string> = {
  unknown: 'desconhecido',
  excluded: 'excluído',
  confirmed: 'confirmado',
};

export const pt: Messages = {
  appTitle: 'Crack the Code',
  tagline: 'Deduz o código a partir das pistas.',
  langToggle: 'EN',
  langToggleLabel: 'Switch to English',
  colorNames: ['vermelho', 'verde', 'azul', 'amarelo', 'laranja', 'roxo', 'branco', 'preto'],
  list: (items) =>
    items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`,
  bands: {
    tutorial: { name: 'Tutorial', description: 'Três dígitos e pistas por ordem, para aprender.' },
    easy: { name: 'Fácil', description: 'Três dígitos, só deduções diretas.' },
    medium: { name: 'Médio', description: 'É preciso testar as combinações de uma pista.' },
    hard: { name: 'Difícil', description: 'Quatro dígitos e pistas para cruzar duas a duas.' },
    expert: { name: 'Perito', description: 'Cinco dígitos; às vezes é preciso uma hipótese.' },
    master: { name: 'Mestre', description: 'Com repetições, dígitos ou cores. Exige hipóteses.' },
  },
  home: {
    chooseBand: 'Escolhe a dificuldade',
    newPuzzle: 'Novo puzzle',
    generating: 'A gerar…',
    failed: 'Não foi possível gerar o puzzle. Tenta outra vez.',
    params: (length, kind, repeats) =>
      `${length} símbolos · ${kind}${repeats ? ' · com repetições' : ''}`,
    alphabetDigits: 'dígitos 0–9',
    alphabetColors: (count) => `${count} cores`,
  },
  puzzle: {
    back: 'Voltar ao início',
    seed: (seed) => `seed ${seed}`,
    timerLabel: 'Tempo',
    cluesTitle: 'Pistas',
    clueNumber: (n) => `n.º ${n}`,
    feedback: (exact, misplaced) =>
      exact === 0 && misplaced === 0
        ? 'nada certo'
        : `${exact} ${plural(exact, 'certo', 'certos')} no lugar · ${misplaced} fora do lugar`,
    clueToggleLabel: (n, exhausted) =>
      `Pista ${n}: ${exhausted ? 'marcada como esgotada' : 'marcar como esgotada'}`,
    exhaustedHelp: 'Toca numa pista para a marcar como esgotada.',
    lockTitle: 'Cadeado',
    slotLabel: (position, symbol) => `Posição ${position}: ${symbol ?? 'vazia'}`,
    keypadTitle: 'Teclado',
    keyLabel: (symbol) => `Introduzir ${symbol}`,
    keypadHelp: 'Toque longo (ou botão direito) num símbolo para o riscar em todo o lado.',
    erase: 'Apagar',
    notesTitle: 'Notas',
    notesHelp: 'Toca numa célula: excluído → confirmado → vazio. O cabeçalho risca o símbolo.',
    position: (n) => `Posição ${n}`,
    noteLabel: (position, symbol, mark) => `Posição ${position}, ${symbol}: ${MARK[mark]}`,
    strikeLabel: (symbol, struck) => (struck ? `Repor o ${symbol}` : `Riscar o ${symbol} em todo o lado`),
    undo: 'Desfazer',
    redo: 'Refazer',
    hint: 'Ajuda',
    validate: 'Validar',
    incomplete: 'Preenche todas as posições do cadeado.',
    wrong: 'Não é esse o código. Continua a tentar!',
  },
  hintPanel: {
    title: 'Ajuda',
    apply: 'Aplicar',
    close: 'Fechar',
  },
  success: {
    title: 'Cofre aberto!',
    time: 'Tempo',
    hints: 'Ajudas',
    wrong: 'Tentativas erradas',
    clean: 'Solução limpa',
    again: 'Novo puzzle',
    home: 'Início',
  },
};
