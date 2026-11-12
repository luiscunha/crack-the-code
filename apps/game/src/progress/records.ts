import { addUtcDays, utcDayIndex, type BandId } from '@ctc/engine';
import { elapsedMs, isClean, type GameState } from '../state';
import type { GameResult, Progress, SavedGame } from './types';

/** Time, hints, wrong submissions and the clean flag of a solved game. */
export function gameResult(state: GameState): GameResult {
  return {
    timeMs: elapsedMs(state, state.solvedAt ?? state.startedAt),
    hints: state.hintsUsed,
    wrong: state.wrongSubmissions,
    clean: isClean(state),
  };
}

/** Keeps the best: solved stays solved, clean once is clean, fastest time wins. */
export function recordCampaign(progress: Progress, levelId: string, result: GameResult): Progress {
  const prev = progress.campaign[levelId];
  const best = prev?.bestTimeMs ?? null;
  return {
    ...progress,
    campaign: {
      ...progress.campaign,
      [levelId]: {
        solved: true,
        clean: (prev?.clean ?? false) || result.clean,
        bestTimeMs: best === null ? result.timeMs : Math.min(best, result.timeMs),
      },
    },
  };
}

/** The first solve of a day is the one that counts (and is shared); later ones are ignored. */
export function recordDaily(progress: Progress, date: string, result: GameResult): Progress {
  if (progress.daily[date]) return progress;
  const { timeMs, hints, wrong, clean } = result;
  return { ...progress, daily: { ...progress.daily, [date]: { timeMs, hints, wrong, clean } } };
}

export function recordFree(progress: Progress, band: BandId): Progress {
  return {
    ...progress,
    free: { ...progress.free, [band]: { solved: progress.free[band].solved + 1 } },
  };
}

export function setCurrent(progress: Progress, current: SavedGame | null): Progress {
  return progress.current === current ? progress : { ...progress, current };
}

/**
 * Consecutive UTC days with a solved daily, ending today — or yesterday, so the
 * streak is still alive during a day the player has not played yet.
 */
export function currentStreak(progress: Progress, today: string): number {
  let day = progress.daily[today] ? today : addUtcDays(today, -1);
  let streak = 0;
  while (progress.daily[day]) {
    streak++;
    day = addUtcDays(day, -1);
  }
  return streak;
}

/** Longest run of consecutive solved days in the whole history. */
export function maxStreak(progress: Progress): number {
  const days = Object.keys(progress.daily)
    .map(utcDayIndex)
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === (days[i - 1] as number) + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function dailySolvedCount(progress: Progress): number {
  return Object.keys(progress.daily).length;
}
