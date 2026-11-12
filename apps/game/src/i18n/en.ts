import type { Mark } from '../state';
import { hintsEn } from './hints.en';
import type { Messages } from './messages';

const MARK: Record<Mark, string> = {
  unknown: 'unknown',
  excluded: 'excluded',
  confirmed: 'confirmed',
};

export const en: Messages = {
  appTitle: 'Crack the Code',
  tagline: 'Deduce the code from the clues.',
  langToggle: 'PT',
  langToggleLabel: 'Mudar para português',
  colorNames: ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'white', 'black'],
  bands: {
    tutorial: { name: 'Tutorial', description: 'Three digits, clues in order, to learn the ropes.' },
    easy: { name: 'Easy', description: 'Three digits, direct deductions only.' },
    medium: { name: 'Medium', description: 'You need to test the combinations a clue allows.' },
    hard: { name: 'Hard', description: 'Four digits and clues to cross in pairs.' },
    expert: { name: 'Expert', description: 'Five digits; sometimes a hypothesis is needed.' },
    master: { name: 'Master', description: 'With repeats, digits or colors. Needs hypotheses.' },
  },
  worlds: { locker: 'Locker', safe: 'Safe', bank: 'Bank', museum: 'Museum', casino: 'Casino' },
  home: {
    continue: 'Continue',
    continueLabel: (what) => `Continue: ${what}`,
    campaign: 'Campaign',
    campaignProgress: (solved, total) => `${solved}/${total} levels`,
    daily: 'Daily Vault',
    dailyLine: (n, band) => `#${n} · ${band}`,
    dailySolved: 'solved ✓',
    streak: (days) => `🔥 ${days}-day streak`,
    freePlay: 'Free play',
    stats: 'Statistics',
    chooseBand: 'Choose a difficulty',
    newPuzzle: 'New puzzle',
    generating: 'Generating…',
    failed: 'Could not generate the puzzle. Please try again.',
    params: (length, kind, repeats) => `${length} symbols · ${kind}${repeats ? ' · with repeats' : ''}`,
    alphabetDigits: 'digits 0–9',
    alphabetColors: (count) => `${count} colors`,
  },
  map: {
    title: 'Campaign',
    progress: (solved, total) => `${solved}/${total}`,
    level: (n) => `Level ${n}`,
    levelLabel: (n, status, bestTime) => {
      const state = { locked: 'locked', open: 'not solved yet', solved: 'solved', clean: 'solved, clean' }[status];
      return `Level ${n}: ${state}${bestTime ? `, best time ${bestTime}` : ''}`;
    },
    lockedLevel: (n, previous) => `Level ${n}: locked — solve level ${previous} first`,
    lockedWorld: (previousWorld, missing) =>
      `Solve ${missing} more ${missing === 1 ? 'level' : 'levels'} in ${previousWorld} to open.`,
  },
  stats: {
    title: 'Statistics',
    streak: 'Current streak',
    maxStreak: 'Best streak',
    dailySolved: 'Dailies solved',
    campaignSolved: 'Campaign',
    campaignClean: 'Clean levels',
    freeTitle: 'Free play: puzzles solved',
  },
  context: {
    level: (world, n) => `${world} · level ${n}`,
    daily: (n) => `Daily Vault #${n}`,
    dailySub: (band, date) => `${band} · ${date}`,
  },
  share: {
    title: (n) => `Daily Vault #${n}`,
    digits: (length) => `${length} digits`,
    colors: (length) => `${length} colors`,
    clean: 'clean',
  },
  puzzle: {
    back: 'Back to start',
    backToMap: 'Back to map',
    seed: (seed) => `seed ${seed}`,
    timerLabel: 'Time',
    cluesTitle: 'Clues',
    clueNumber: (n) => `#${n}`,
    feedback: (exact, misplaced) =>
      exact === 0 && misplaced === 0
        ? 'nothing right'
        : `${exact} in place · ${misplaced} misplaced`,
    clueToggleLabel: (n, exhausted) =>
      `Clue ${n}: ${exhausted ? 'marked as used up' : 'mark as used up'}`,
    exhaustedHelp: 'Tap a clue to mark it as used up.',
    lockTitle: 'Lock',
    slotLabel: (position, symbol) => `Position ${position}: ${symbol ?? 'empty'}`,
    keypadTitle: 'Keypad',
    keyLabel: (symbol) => `Enter ${symbol}`,
    keypadHelp: 'Long-press (or right-click) a symbol to strike it everywhere.',
    erase: 'Erase',
    notesTitle: 'Notes',
    notesHelp: 'Tap a cell: excluded → confirmed → blank. The header strikes the symbol.',
    position: (n) => `Position ${n}`,
    noteLabel: (position, symbol, mark) => `Position ${position}, ${symbol}: ${MARK[mark]}`,
    strikeLabel: (symbol, struck) => (struck ? `Restore ${symbol}` : `Strike ${symbol} everywhere`),
    undo: 'Undo',
    redo: 'Redo',
    hint: 'Hint',
    validate: 'Check',
    incomplete: 'Fill in every position of the lock.',
    wrong: 'That is not the code. Keep going!',
  },
  hints: hintsEn,
  hintPanel: {
    title: 'Hint',
    apply: 'Apply',
    close: 'Close',
  },
  success: {
    title: 'Vault open!',
    time: 'Time',
    hints: 'Hints',
    wrong: 'Wrong attempts',
    clean: 'Clean solve',
    again: 'New puzzle',
    home: 'Home',
    next: 'Next',
    map: 'Map',
    share: 'Share',
    copied: 'Copied!',
    shareFailed: 'Could not copy. Select and copy the text:',
    generating: 'Generating…',
    dailyDone: 'Come back tomorrow for a new vault.',
  },
};
