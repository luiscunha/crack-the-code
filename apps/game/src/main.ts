import {
  BAND_IDS,
  DAILY_EPOCH,
  addUtcDays,
  dailyBand,
  dailyNumber,
  dailyPuzzle,
  generatePuzzle,
  isUtcDate,
  type BandId,
  type CampaignLevel,
  type Puzzle,
} from '@ctc/engine';
import { CAMPAIGN } from './data/campaign';
import { DEFAULT_LOCALE, LOCALES, parseLocale, type Locale, type Messages } from './i18n';
import { readPref, writePref } from './prefs';
import {
  campaignSolved,
  campaignTotal,
  currentStreak,
  findLevel,
  gameResult,
  levelLockReason,
  nextLevel,
  recordCampaign,
  recordDaily,
  recordFree,
  restoreGame,
  setCurrent,
  snapshotGame,
  type DailyRecord,
  type Progress,
  type SavedGame,
} from './progress';
import { shareText } from './share';
import { newGame, type GameState } from './state';
import { loadProgress, saveProgress } from './storage';
import './styles.css';
import { h } from './ui/dom';
import { mountHome } from './ui/home';
import { mountMap } from './ui/map';
import { mountPuzzleScreen, type PuzzleScreen } from './ui/puzzleScreen';
import { mountStats } from './ui/stats';
import type { SuccessFeedback, SuccessOptions } from './ui/success';

declare global {
  interface Window {
    /** Dev builds only: lets a tester read the puzzle (and its solution). */
    __ctc?: { puzzle: Puzzle };
  }
}

/** What is being played: decides the header, the result dialog and what gets recorded. */
type PlayContext =
  | { source: 'campaign'; level: CampaignLevel }
  | { source: 'daily'; date: string }
  | { source: 'free'; band: BandId; seed: number };

type Screen =
  | { kind: 'home'; notice?: string }
  | { kind: 'map'; focus?: string }
  | { kind: 'stats' }
  | { kind: 'puzzle'; ctx: PlayContext; puzzle: Puzzle; state: GameState };

const root = document.getElementById('app') as HTMLElement;
const url = new URL(window.location.href);

let locale: Locale = parseLocale(url.searchParams.get('lang')) ?? parseLocale(readPref('lang')) ?? DEFAULT_LOCALE;
let band: BandId = parseBand(readPref('band')) ?? 'tutorial';
let progress: Progress = loadProgress();
let screen: Screen = { kind: 'home' };
let mounted: PuzzleScreen | null = null;

const msgs = (): Messages => LOCALES[locale];

/** The player's current UTC date. Only the app layer reads the clock. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseBand(value: string | null | undefined): BandId | null {
  return BAND_IDS.find((b) => b === value) ?? null;
}

function parseSeed(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const n = Number(value);
  return n <= 0xffffffff ? n : null;
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

function updateProgress(next: Progress): void {
  if (next === progress) return;
  progress = next;
  saveProgress(progress);
}

// ---------- Contexts ----------

function refOf(ctx: PlayContext): string {
  switch (ctx.source) {
    case 'campaign':
      return ctx.level.id;
    case 'daily':
      return ctx.date;
    case 'free':
      return `${ctx.band}:${ctx.seed}`;
  }
}

function contextOfSaved(saved: SavedGame): PlayContext | null {
  switch (saved.source) {
    case 'campaign': {
      const level = findLevel(CAMPAIGN, saved.ref);
      return level ? { source: 'campaign', level } : null;
    }
    case 'daily':
      return isUtcDate(saved.ref) ? { source: 'daily', date: saved.ref } : null;
    case 'free': {
      const [b, s] = saved.ref.split(':');
      const fb = parseBand(b);
      const seed = parseSeed(s);
      return fb && seed !== null ? { source: 'free', band: fb, seed } : null;
    }
  }
}

function headerOf(ctx: PlayContext, puzzle: Puzzle): { title: string; subtitle: string } {
  const m = msgs();
  const bandName = m.bands[puzzle.band].name;
  switch (ctx.source) {
    case 'campaign':
      return { title: m.context.level(m.worlds[ctx.level.world], ctx.level.index + 1), subtitle: bandName };
    case 'daily':
      return { title: m.context.daily(dailyNumber(ctx.date)), subtitle: m.context.dailySub(bandName, ctx.date) };
    case 'free':
      return { title: bandName, subtitle: m.puzzle.seed(ctx.seed) };
  }
}

/** Short description of a saved game for the "Continue" button. */
function describeSaved(ctx: PlayContext): string {
  const m = msgs();
  switch (ctx.source) {
    case 'campaign':
      return m.context.level(m.worlds[ctx.level.world], ctx.level.index + 1);
    case 'daily':
      return m.context.daily(dailyNumber(ctx.date));
    case 'free':
      return m.bands[ctx.band].name;
  }
}

// ---------- Opening puzzles ----------

/** A solved daily reopens on its result (the recorded first solve), not on a fresh board. */
function solvedDailyState(puzzle: Puzzle, record: DailyRecord): GameState {
  const game = newGame({ params: puzzle.params, solution: puzzle.solution, clueCount: puzzle.clues.length, startedAt: 0 });
  return {
    ...game,
    board: { ...game.board, lock: [...puzzle.solution] },
    solvedAt: record.timeMs,
    wrongSubmissions: record.wrong,
    hintsUsed: record.hints,
    lastSubmit: 'right',
  };
}

function saveCurrent(ctx: PlayContext, state: GameState): void {
  updateProgress(setCurrent(progress, snapshotGame(state, ctx.source, refOf(ctx), Date.now())));
}

/** Shows a puzzle: the solved daily result, the saved game for it, or a fresh start (which replaces any saved game). */
function openPuzzle(ctx: PlayContext, puzzle: Puzzle): void {
  const now = Date.now();
  let state: GameState | null = null;
  const record = ctx.source === 'daily' ? progress.daily[ctx.date] : undefined;
  if (record) state = solvedDailyState(puzzle, record);
  const saved = progress.current;
  if (!state && saved && saved.source === ctx.source && saved.ref === refOf(ctx)) {
    state = restoreGame(saved, puzzle, now);
  }
  if (!state) {
    state = newGame({ params: puzzle.params, solution: puzzle.solution, clueCount: puzzle.clues.length, startedAt: now });
    saveCurrent(ctx, state);
  }
  screen = { kind: 'puzzle', ctx, puzzle, state };
  render();
}

/**
 * Generation runs off the current frame so "generating…" paints first (master can
 * take ~150 ms). `make` returns null when it cannot produce a puzzle.
 */
function launch(make: () => { ctx: PlayContext; puzzle: Puzzle } | null): void {
  if (screen.kind !== 'home' && screen.kind !== 'puzzle') {
    screen = { kind: 'home' };
    render();
  }
  const status = root.querySelector('.home-status');
  if (status) status.textContent = msgs().home.generating;
  root.querySelector<HTMLButtonElement>('.btn-start')?.setAttribute('disabled', '');
  window.setTimeout(() => {
    const made = make();
    if (made) {
      openPuzzle(made.ctx, made.puzzle);
    } else {
      screen = { kind: 'home', notice: msgs().home.failed };
      render();
    }
  }, 30);
}

/** A random seed that fails is replaced; an explicit one is reported. */
function launchFree(b: BandId, seed: number, retry: boolean): void {
  launch(() => {
    let s = seed;
    let result = generatePuzzle(b, s);
    for (let i = 0; !result && retry && i < 3; i++) {
      s = randomSeed();
      result = generatePuzzle(b, s);
    }
    return result ? { ctx: { source: 'free', band: b, seed: s }, puzzle: result.puzzle } : null;
  });
}

const dailyCache = new Map<string, Puzzle>();
function launchDaily(date: string): void {
  const cached = dailyCache.get(date);
  if (cached) {
    openPuzzle({ source: 'daily', date }, cached);
    return;
  }
  launch(() => {
    const puzzle = dailyPuzzle(date);
    dailyCache.set(date, puzzle);
    return { ctx: { source: 'daily', date }, puzzle };
  });
}

function openLevel(level: CampaignLevel): void {
  openPuzzle({ source: 'campaign', level }, level.puzzle);
}

function openContext(ctx: PlayContext): void {
  switch (ctx.source) {
    case 'campaign':
      return openLevel(ctx.level);
    case 'daily':
      return launchDaily(ctx.date);
    case 'free':
      return launchFree(ctx.band, ctx.seed, false);
  }
}

function go(next: Screen): void {
  screen = next;
  render();
}

// ---------- Results ----------

function onSolved(ctx: PlayContext, puzzle: Puzzle, state: GameState): void {
  const result = gameResult(state);
  let next = setCurrent(progress, null);
  switch (ctx.source) {
    case 'campaign':
      next = recordCampaign(next, ctx.level.id, result);
      break;
    case 'daily':
      // Today's vault (or yesterday's, finished after midnight UTC) counts for the
      // history and the streak; other days opened through a link do not.
      if (ctx.date >= addUtcDays(today(), -1) && ctx.date <= today()) next = recordDaily(next, ctx.date, result);
      break;
    case 'free':
      next = recordFree(next, puzzle.band);
      break;
  }
  updateProgress(next);
}

async function share(text: string, feedback: SuccessFeedback): Promise<void> {
  const m = msgs();
  // The native share sheet suits phones; on desktop, copying is what people expect.
  const native = typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
  if (native) {
    try {
      await navigator.share({ text });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    feedback.say(m.success.copied);
  } catch {
    feedback.showText(m.success.shareFailed, text);
  }
}

function successOptions(ctx: PlayContext, puzzle: Puzzle, state: GameState): SuccessOptions {
  const m = msgs();
  const home = { label: m.success.home, onClick: () => go({ kind: 'home' }) };
  switch (ctx.source) {
    case 'campaign': {
      const following = nextLevel(CAMPAIGN, ctx.level);
      const map = { label: m.success.map, onClick: () => go({ kind: 'map', focus: following?.id ?? ctx.level.id }) };
      return following
        ? { actions: [{ label: m.success.next, primary: true, onClick: () => openLevel(following) }, map] }
        : { actions: [{ ...map, primary: true }] };
    }
    case 'daily': {
      const result = gameResult(state);
      const text = shareText(
        m,
        { number: dailyNumber(ctx.date), params: puzzle.params, timeMs: result.timeMs, hints: result.hints, clean: result.clean },
        window.location.origin + window.location.pathname,
      );
      return {
        note: ctx.date === today() ? m.success.dailyDone : undefined,
        actions: [{ label: m.success.share, primary: true, onClick: (_, feedback) => void share(text, feedback) }, home],
      };
    }
    case 'free':
      return {
        actions: [
          {
            label: m.success.again,
            primary: true,
            onClick: (button) => {
              button.disabled = true;
              button.textContent = m.success.generating;
              launchFree(ctx.band, randomSeed(), true);
            },
          },
          home,
        ],
      };
  }
}

// ---------- Rendering ----------

/** Keeps the deep link of the open puzzle in the address bar (reload resumes it). */
function syncUrl(): void {
  const next = new URL(window.location.href);
  for (const key of ['band', 'seed', 'daily', 'level']) next.searchParams.delete(key);
  if (screen.kind === 'puzzle') {
    const { ctx } = screen;
    if (ctx.source === 'campaign') next.searchParams.set('level', ctx.level.id);
    if (ctx.source === 'daily') next.searchParams.set('daily', ctx.date);
    if (ctx.source === 'free') {
      next.searchParams.set('band', ctx.band);
      next.searchParams.set('seed', String(ctx.seed));
    }
  }
  window.history.replaceState(null, '', next);
}

function langButton(): HTMLElement {
  const m = msgs();
  const button = h('button', { type: 'button', class: 'btn btn-lang', 'aria-label': m.langToggleLabel, lang: locale === 'en' ? 'pt-PT' : 'en' }, m.langToggle);
  button.addEventListener('click', () => {
    locale = locale === 'en' ? 'pt-PT' : 'en';
    writePref('lang', locale);
    const next = new URL(window.location.href);
    if (next.searchParams.has('lang')) next.searchParams.set('lang', locale === 'en' ? 'en' : 'pt');
    window.history.replaceState(null, '', next);
    render();
    root.querySelector<HTMLElement>('.btn-lang')?.focus();
  });
  return button;
}

function renderHome(notice?: string): void {
  const date = today();
  const saved = progress.current;
  const savedCtx = saved ? contextOfSaved(saved) : null;
  mountHome(root, {
    m: msgs(),
    selected: band,
    notice,
    headerExtra: [langButton()],
    resume: savedCtx ? describeSaved(savedCtx) : undefined,
    campaign: { solved: campaignSolved(CAMPAIGN, progress), total: campaignTotal(CAMPAIGN) },
    daily: {
      number: dailyNumber(date),
      band: dailyBand(date),
      solved: progress.daily[date] !== undefined,
      streak: currentStreak(progress, date),
    },
    onResume: () => (savedCtx ? openContext(savedCtx) : undefined),
    onCampaign: () => go({ kind: 'map' }),
    onDaily: () => launchDaily(today()),
    onStats: () => go({ kind: 'stats' }),
    onSelect: (b) => {
      band = b;
      writePref('band', b);
    },
    onNewPuzzle: (b) => launchFree(b, randomSeed(), true),
  });
}

function render(): void {
  mounted?.dispose();
  mounted = null;
  const m = msgs();
  document.documentElement.lang = locale;
  document.title = m.appTitle;
  syncUrl();

  switch (screen.kind) {
    case 'home':
      return renderHome(screen.notice);
    case 'map':
      return mountMap(root, {
        m,
        campaign: CAMPAIGN,
        progress,
        focus: screen.focus,
        headerExtra: [langButton()],
        onBack: () => go({ kind: 'home' }),
        onLevel: openLevel,
      });
    case 'stats':
      return mountStats(root, {
        m,
        campaign: CAMPAIGN,
        progress,
        today: today(),
        headerExtra: [langButton()],
        onBack: () => go({ kind: 'home' }),
      });
    case 'puzzle':
      break;
  }

  const current = screen;
  const { ctx, puzzle } = current;
  if (import.meta.env.DEV) window.__ctc = { puzzle };
  const back: Screen = ctx.source === 'campaign' ? { kind: 'map', focus: ctx.level.id } : { kind: 'home' };
  mounted = mountPuzzleScreen(root, {
    puzzle,
    ...headerOf(ctx, puzzle),
    backLabel: back.kind === 'map' ? m.puzzle.backToMap : m.puzzle.back,
    m,
    now: () => Date.now(),
    initialState: current.state,
    onState: (state) => {
      current.state = state;
      if (state.solvedAt === null) saveCurrent(ctx, state);
    },
    onSolved: (state) => onSolved(ctx, puzzle, state),
    success: (state) => successOptions(ctx, puzzle, state),
    onBack: () => go(back),
    headerExtra: [langButton()],
  });
}

/** Saves the clock when the page is hidden or closed (actions already save the board). */
function flush(): void {
  if (screen.kind === 'puzzle' && screen.state.solvedAt === null) saveCurrent(screen.ctx, screen.state);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
window.addEventListener('pagehide', flush);

// ---------- Deep links ----------
// ?level=<id> (campaign; respects locks outside dev), ?daily=YYYY-MM-DD (today or an
// earlier day; any day in dev), ?band=&seed= (free play).

function boot(): void {
  const level = url.searchParams.get('level');
  const daily = url.searchParams.get('daily');
  const linkedBand = parseBand(url.searchParams.get('band'));
  if (level !== null) {
    const found = findLevel(CAMPAIGN, level);
    if (found && (import.meta.env.DEV || !levelLockReason(CAMPAIGN, progress, found))) openLevel(found);
    else go({ kind: 'map' });
    return;
  }
  if (daily !== null) {
    const allowed = isUtcDate(daily) && (import.meta.env.DEV || (daily >= DAILY_EPOCH && daily <= today()));
    if (allowed) {
      render();
      launchDaily(daily);
    } else {
      render();
    }
    return;
  }
  if (linkedBand) {
    band = linkedBand;
    const seed = parseSeed(url.searchParams.get('seed'));
    render();
    launchFree(linkedBand, seed ?? randomSeed(), seed === null);
    return;
  }
  render();
}

boot();

