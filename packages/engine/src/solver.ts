import { compileTracker, type ClueTracker } from './clues';
import type {
  Cell,
  Clue,
  PuzzleParams,
  SolveResult,
  SolveStep,
  StepEffect,
  SymbolCount,
  Technique,
  Tier,
} from './types';

export const TECHNIQUE_TIER: Record<Technique, Tier> = {
  elimination: 1,
  'positional-exclusion': 1,
  'simple-count': 2,
  fixation: 2,
  'only-position': 2,
  'symbols-complete': 2,
  'clue-consistency': 3,
  'clue-crossing': 4,
  hypothesis: 5,
};

export interface SolveOptions {
  /** Highest tier the solver may use. Default 5. */
  maxTier?: Tier;
}

/** What a player knows: possible symbols per position + occurrence bounds per symbol. */
interface State {
  /** dom[p] = bitmask of symbols still possible at position p. */
  dom: number[];
  /** min[s]..max[s] = bounds on how many times symbol s occurs in the code. */
  min: number[];
  max: number[];
}

/** Codes compatible with a state, with the set of clues each one satisfies. */
interface Pool {
  codes: Uint8Array;
  sat: Int32Array;
  n: number;
}

interface Support {
  or: number[];
  cmin: number[];
  cmax: number[];
}

function cloneState(s: State): State {
  return { dom: s.dom.slice(), min: s.min.slice(), max: s.max.slice() };
}

function sameState(a: State, b: State): boolean {
  for (let i = 0; i < a.dom.length; i++) if (a.dom[i] !== b.dom[i]) return false;
  for (let i = 0; i < a.min.length; i++) {
    if (a.min[i] !== b.min[i] || a.max[i] !== b.max[i]) return false;
  }
  return true;
}

function popcount(x: number): number {
  let n = 0;
  for (; x; x &= x - 1) n++;
  return n;
}

function lowestSymbol(mask: number): number {
  return 31 - Math.clz32(mask & -mask);
}

/**
 * Obvious bookkeeping a player does without thinking. Returns false on contradiction.
 * - a symbol that is out leaves every position
 * - fixed positions count towards min; max never exceeds the positions still open to it
 * - a symbol whose occurrences are all placed leaves the other positions
 */
function normalize(s: State, L: number, K: number): boolean {
  for (;;) {
    let changed = false;
    let sumMin = 0;
    let sumMax = 0;
    for (let v = 0; v < K; v++) {
      const bit = 1 << v;
      let fixed = 0;
      let possible = 0;
      for (let p = 0; p < L; p++) {
        const d = s.dom[p] as number;
        if (d & bit) {
          possible++;
          if (d === bit) fixed++;
        }
      }
      if (fixed > (s.min[v] as number)) {
        s.min[v] = fixed;
        changed = true;
      }
      if (possible < (s.max[v] as number)) {
        s.max[v] = possible;
        changed = true;
      }
      if ((s.min[v] as number) > (s.max[v] as number)) return false;
      if (fixed === s.max[v] && possible > fixed) {
        for (let p = 0; p < L; p++) {
          const d = s.dom[p] as number;
          if (d & bit && d !== bit) s.dom[p] = d & ~bit;
        }
        changed = true;
      }
      sumMin += s.min[v] as number;
      sumMax += s.max[v] as number;
    }
    for (let p = 0; p < L; p++) if (s.dom[p] === 0) return false;
    if (sumMin > L || sumMax < L) return false;
    if (!changed) return true;
  }
}

function diffEffect(before: State, after: State, L: number, K: number): StepEffect {
  const removed: Cell[] = [];
  const placed: Cell[] = [];
  const symbolsIn: number[] = [];
  const symbolsOut: number[] = [];
  const counts: SymbolCount[] = [];
  for (let p = 0; p < L; p++) {
    const b = before.dom[p] as number;
    const a = after.dom[p] as number;
    for (let gone = b & ~a; gone; gone &= gone - 1) {
      removed.push({ position: p, symbol: lowestSymbol(gone) });
    }
    if (popcount(a) === 1 && popcount(b) !== 1) placed.push({ position: p, symbol: lowestSymbol(a) });
  }
  for (let v = 0; v < K; v++) {
    if (before.min[v] === 0 && (after.min[v] as number) > 0) symbolsIn.push(v);
    if ((before.max[v] as number) > 0 && after.max[v] === 0) symbolsOut.push(v);
    if (before.min[v] !== after.min[v] || before.max[v] !== after.max[v]) {
      counts.push({ symbol: v, min: after.min[v] as number, max: after.max[v] as number });
    }
  }
  return { removed, placed, symbolsIn, symbolsOut, counts };
}

// ---------------------------------------------------------------------------
// T1 / T2: direct rules on the state. Each returns true when it changed something.
// ---------------------------------------------------------------------------

/** T1 — clue (0,0): every symbol of the guess is out. */
function elimination(s: State, clue: Clue): boolean {
  if (clue.kind !== 'guess') return false;
  if (clue.feedback.exact !== 0 || clue.feedback.misplaced !== 0) return false;
  let changed = false;
  for (const v of clue.guess) {
    if ((s.max[v] as number) > 0) {
      s.max[v] = 0;
      changed = true;
    }
  }
  return changed;
}

/** T1 — clue with exact = 0: no symbol sits where the guess shows it. */
function positionalExclusion(s: State, clue: Clue): boolean {
  if (clue.kind !== 'guess' || clue.feedback.exact !== 0) return false;
  let changed = false;
  clue.guess.forEach((v, p) => {
    const d = s.dom[p] as number;
    if (d & (1 << v)) {
      s.dom[p] = d & ~(1 << v);
      changed = true;
    }
  });
  return changed;
}

/**
 * T2 — in one clue, the still-unknown symbols are exactly as many as the hits
 * left to explain (all in), or no hit is left to explain (all out).
 */
function simpleCount(s: State, clue: Clue): boolean {
  if (clue.kind !== 'guess') return false;
  const symbols = clue.guess;
  if (new Set(symbols).size !== symbols.length) return false; // repeated symbols: left to T3
  const total = clue.feedback.exact + clue.feedback.misplaced;
  let knownIn = 0;
  const unknown: number[] = [];
  for (const v of symbols) {
    if ((s.min[v] as number) > 0) knownIn++;
    else if ((s.max[v] as number) > 0) unknown.push(v);
  }
  if (unknown.length === 0) return false;
  const missing = total - knownIn;
  if (missing === unknown.length) {
    for (const v of unknown) s.min[v] = 1;
    return true;
  }
  if (missing === 0) {
    for (const v of unknown) s.max[v] = 0;
    return true;
  }
  return false;
}

/**
 * T2 — the positions that can still give the `exact` hits of a clue are exactly as
 * many as needed (fix them all), or the hits are already placed (the rest cannot match).
 */
function fixation(s: State, clue: Clue): boolean {
  if (clue.kind !== 'guess' || clue.feedback.exact === 0) return false;
  const exact = clue.feedback.exact;
  let possible = 0;
  let fixed = 0;
  clue.guess.forEach((v, p) => {
    const d = s.dom[p] as number;
    if (d & (1 << v)) {
      possible++;
      if (d === 1 << v) fixed++;
    }
  });
  if (possible === exact && fixed < exact) {
    clue.guess.forEach((v, p) => {
      if ((s.dom[p] as number) & (1 << v)) s.dom[p] = 1 << v;
    });
    return true;
  }
  if (fixed === exact && possible > exact) {
    clue.guess.forEach((v, p) => {
      const d = s.dom[p] as number;
      if (d & (1 << v) && d !== 1 << v) s.dom[p] = d & ~(1 << v);
    });
    return true;
  }
  return false;
}

/** T2 — a symbol known to be in has exactly as many open positions as occurrences. */
function onlyPosition(s: State, L: number, K: number): boolean {
  for (let v = 0; v < K; v++) {
    const bit = 1 << v;
    let fixed = 0;
    let possible = 0;
    for (let p = 0; p < L; p++) {
      const d = s.dom[p] as number;
      if (d & bit) {
        possible++;
        if (d === bit) fixed++;
      }
    }
    if ((s.min[v] as number) > fixed && possible === s.min[v]) {
      for (let p = 0; p < L; p++) if ((s.dom[p] as number) & bit) s.dom[p] = bit;
      return true;
    }
  }
  return false;
}

/** T2 — all L symbols are known (the rest is out) or only the needed symbols remain (all in). */
function symbolsComplete(s: State, L: number, K: number): boolean {
  let sumMin = 0;
  let sumMax = 0;
  for (let v = 0; v < K; v++) {
    sumMin += s.min[v] as number;
    sumMax += s.max[v] as number;
  }
  let changed = false;
  if (sumMin === L) {
    for (let v = 0; v < K; v++) {
      if ((s.max[v] as number) > (s.min[v] as number)) {
        s.max[v] = s.min[v] as number;
        changed = true;
      }
    }
    return changed;
  }
  for (let v = 0; v < K; v++) {
    const needed = L - (sumMax - (s.max[v] as number));
    if (needed > (s.min[v] as number)) {
      s.min[v] = needed;
      changed = true;
    }
  }
  return changed;
}

// ---------------------------------------------------------------------------
// T3–T5: enumeration restricted to the current domains.
// ---------------------------------------------------------------------------

function buildPool(s: State, params: PuzzleParams, clues: readonly Clue[]): Pool {
  const { length: L, alphabetSize: K } = params;
  const flat: number[] = [];
  const masks: number[] = [];
  const cur = new Uint8Array(L);
  const cnt = new Uint8Array(K);
  const trackers = clues.map((c) => compileTracker(c, params, cnt));

  // `alive` = clues this prefix can still satisfy. Only those are tracked further down,
  // and a prefix that can satisfy no clue is dropped: such codes never support anything.
  const rec = (p: number, alive: number): void => {
    for (let d = s.dom[p] as number; d; d &= d - 1) {
      const v = lowestSymbol(d);
      if ((cnt[v] as number) >= (s.max[v] as number)) continue;
      let next = alive;
      for (let m = alive; m; m &= m - 1) {
        const c = lowestSymbol(m);
        if (!(trackers[c] as ClueTracker).push(p, v)) next &= ~(1 << c);
      }
      if (next !== 0) {
        cur[p] = v;
        cnt[v]!++;
        if (p < L - 1) {
          rec(p + 1, next);
        } else {
          let ok = true;
          for (let u = 0; u < K; u++) if ((cnt[u] as number) < (s.min[u] as number)) ok = false;
          if (ok) {
            // At the last position "still satisfiable" means satisfied.
            for (let i = 0; i < L; i++) flat.push(cur[i] as number);
            masks.push(next);
          }
        }
        cnt[v]!--;
      }
      for (let m = alive; m; m &= m - 1) (trackers[lowestSymbol(m)] as ClueTracker).pop(p, v);
    }
  };
  rec(0, clues.length >= 31 ? -1 : (1 << clues.length) - 1);
  return { codes: Uint8Array.from(flat), sat: Int32Array.from(masks), n: masks.length };
}

/** Keeps only the codes still compatible with the state. `into` may alias `pool`. */
function filterPool(pool: Pool, s: State, L: number, K: number, into: Pool): Pool {
  const cnt = new Uint8Array(K);
  let kept = 0;
  next: for (let i = 0; i < pool.n; i++) {
    const off = i * L;
    for (let p = 0; p < L; p++) {
      if (!((s.dom[p] as number) & (1 << (pool.codes[off + p] as number)))) continue next;
    }
    cnt.fill(0);
    for (let p = 0; p < L; p++) cnt[pool.codes[off + p] as number]!++;
    for (let v = 0; v < K; v++) {
      const c = cnt[v] as number;
      if (c < (s.min[v] as number) || c > (s.max[v] as number)) continue next;
    }
    if (kept !== i || into !== pool) {
      for (let p = 0; p < L; p++) into.codes[kept * L + p] = pool.codes[off + p] as number;
      into.sat[kept] = pool.sat[i] as number;
    }
    kept++;
  }
  into.n = kept;
  return into;
}

/**
 * One pass over the pool that computes, for every clue (or every pair of clues),
 * the union of the codes satisfying it: per position the symbols seen, per symbol
 * the range of occurrence counts. Entry g is clue g, or pair (i, j) at i * n + j;
 * null when no code satisfies it.
 *
 * Counts are tracked as bitmasks per level t: "symbols occurring at least t times",
 * AND-ed (true for every code ⇒ lower bound) and OR-ed (true for some code ⇒ upper
 * bound) across the group. `levels` is the highest count a symbol can reach.
 */
function supports(
  pool: Pool,
  L: number,
  K: number,
  n: number,
  pairs: boolean,
  levels: number,
): (Support | null)[] {
  const groups = pairs ? n * n : n;
  const or = new Int32Array(groups * L);
  const allOf = new Int32Array(groups * levels).fill(-1);
  const anyOf = new Int32Array(groups * levels);
  const found = new Uint8Array(groups);
  const cnt = new Uint8Array(K);
  const atLeast = new Int32Array(levels);
  const bits = new Uint8Array(32);
  const codes = pool.codes;

  const add = (g: number, off: number): void => {
    found[g] = 1;
    const go = g * L;
    for (let p = 0; p < L; p++) or[go + p] = (or[go + p] as number) | (1 << (codes[off + p] as number));
    const gl = g * levels;
    for (let t = 0; t < levels; t++) {
      const m = atLeast[t] as number;
      allOf[gl + t] = (allOf[gl + t] as number) & m;
      anyOf[gl + t] = (anyOf[gl + t] as number) | m;
    }
  };

  for (let i = 0; i < pool.n; i++) {
    const sat = pool.sat[i] as number;
    if (pairs && (sat & (sat - 1)) === 0) continue; // satisfies fewer than two clues
    const off = i * L;
    atLeast.fill(0);
    for (let p = 0; p < L; p++) {
      const v = codes[off + p] as number;
      const c = cnt[v] as number;
      if (c < levels) atLeast[c] = (atLeast[c] as number) | (1 << v);
      cnt[v] = c + 1;
    }
    for (let p = 0; p < L; p++) cnt[codes[off + p] as number] = 0;

    let nb = 0;
    for (let m = sat; m; m &= m - 1) bits[nb++] = lowestSymbol(m);
    if (!pairs) {
      for (let a = 0; a < nb; a++) add(bits[a] as number, off);
    } else {
      for (let a = 0; a < nb; a++) {
        for (let b = a + 1; b < nb; b++) add((bits[a] as number) * n + (bits[b] as number), off);
      }
    }
  }

  const out: (Support | null)[] = new Array<Support | null>(groups).fill(null);
  for (let g = 0; g < groups; g++) {
    if (!found[g]) continue;
    const cmin = new Array<number>(K).fill(0);
    const cmax = new Array<number>(K).fill(0);
    for (let t = 0; t < levels; t++) {
      const all = allOf[g * levels + t] as number;
      const any = anyOf[g * levels + t] as number;
      for (let v = 0; v < K; v++) {
        if (all & (1 << v)) cmin[v] = t + 1;
        if (any & (1 << v)) cmax[v] = t + 1;
      }
    }
    out[g] = { or: Array.from(or.subarray(g * L, g * L + L)), cmin, cmax };
  }
  return out;
}

function applySupport(s: State, sup: Support): boolean {
  let changed = false;
  for (let p = 0; p < s.dom.length; p++) {
    const d = (s.dom[p] as number) & (sup.or[p] as number);
    if (d !== s.dom[p]) {
      s.dom[p] = d;
      changed = true;
    }
  }
  for (let v = 0; v < s.min.length; v++) {
    if ((sup.cmin[v] as number) > (s.min[v] as number)) {
      s.min[v] = sup.cmin[v] as number;
      changed = true;
    }
    if ((sup.cmax[v] as number) < (s.max[v] as number)) {
      s.max[v] = sup.cmax[v] as number;
      changed = true;
    }
  }
  return changed;
}

/**
 * T5 inner loop: propagate single-clue and pairwise consistency (which subsume
 * T1/T2 inside a hypothesis) to a fixed point. Returns the clue ids that expose
 * the contradiction, or null when none shows up.
 */
function refute(
  sub: State,
  base: Pool,
  L: number,
  K: number,
  n: number,
  levels: number,
): number[] | null {
  if (!normalize(sub, L, K)) return [];
  const pool: Pool = {
    codes: new Uint8Array(base.n * L),
    sat: new Int32Array(base.n),
    n: 0,
  };
  filterPool(base, sub, L, K, pool);
  let blamed: number[] = [];
  propagate: for (;;) {
    if (pool.n === 0) return blamed;
    for (const pairs of [false, true]) {
      const all = supports(pool, L, K, n, pairs, levels);
      const used = new Set<number>();
      for (let i = 0; i < n; i++) {
        const last = pairs ? n - 1 : i;
        for (let j = pairs ? i + 1 : i; j <= last; j++) {
          const sup = all[pairs ? i * n + j : i];
          if (!sup) return pairs ? [i, j] : [i];
          if (applySupport(sub, sup)) used.add(i).add(j);
        }
      }
      if (used.size > 0) {
        blamed = [...used].sort((a, b) => a - b);
        if (!normalize(sub, L, K)) return blamed;
        filterPool(pool, sub, L, K, pool);
        continue propagate;
      }
    }
    return null;
  }
}

/**
 * Human-style solver (spec §5). Always applies the lowest-tier technique that
 * makes progress and records every step, which feeds grading and UI hints.
 */
export function solve(
  params: PuzzleParams,
  clues: readonly Clue[],
  options: SolveOptions = {},
): SolveResult {
  const { length: L, alphabetSize: K, allowRepeats } = params;
  const maxTier = options.maxTier ?? 5;
  const levels = allowRepeats ? L : 1;
  if (clues.length > 30) throw new Error('solve: too many clues');

  const s: State = {
    dom: new Array<number>(L).fill((1 << K) - 1),
    min: new Array<number>(K).fill(0),
    max: new Array<number>(K).fill(allowRepeats ? L : 1),
  };
  const steps: SolveStep[] = [];
  let inconsistent = false;
  let pool: Pool | null = null;
  let poolStale = false;

  const attempt = (
    technique: Technique,
    clueIds: number[],
    rule: (state: State) => boolean,
    hypothesis?: Cell,
  ): boolean => {
    const before = cloneState(s);
    if (!rule(s)) return false;
    if (!normalize(s, L, K)) {
      inconsistent = true;
      return true;
    }
    if (sameState(before, s)) return false;
    const step: SolveStep = {
      technique,
      tier: TECHNIQUE_TIER[technique],
      clueIds,
      effect: diffEffect(before, s, L, K),
    };
    if (hypothesis) step.hypothesis = hypothesis;
    steps.push(step);
    poolStale = true;
    return true;
  };

  const currentPool = (): Pool => {
    if (!pool) {
      pool = buildPool(s, params, clues);
    } else if (poolStale) {
      filterPool(pool, s, L, K, pool);
    }
    poolStale = false;
    return pool;
  };

  const tier1 = (): boolean => {
    for (let i = 0; i < clues.length; i++) {
      const clue = clues[i] as Clue;
      if (attempt('elimination', [i], (st) => elimination(st, clue))) return true;
      if (attempt('positional-exclusion', [i], (st) => positionalExclusion(st, clue))) return true;
    }
    return false;
  };

  const tier2 = (): boolean => {
    if (attempt('only-position', [], (st) => onlyPosition(st, L, K))) return true;
    if (attempt('symbols-complete', [], (st) => symbolsComplete(st, L, K))) return true;
    for (let i = 0; i < clues.length; i++) {
      const clue = clues[i] as Clue;
      if (attempt('fixation', [i], (st) => fixation(st, clue))) return true;
      if (attempt('simple-count', [i], (st) => simpleCount(st, clue))) return true;
    }
    return false;
  };

  const consistency = (technique: Technique, pairs: boolean): boolean => {
    const n = clues.length;
    const all = supports(currentPool(), L, K, n, pairs, levels);
    for (let i = 0; i < n; i++) {
      const last = pairs ? n - 1 : i;
      for (let j = pairs ? i + 1 : i; j <= last; j++) {
        const sup = all[pairs ? i * n + j : i];
        if (!sup) {
          inconsistent = true;
          return true;
        }
        if (attempt(technique, pairs ? [i, j] : [i], (st) => applySupport(st, sup))) return true;
      }
    }
    return false;
  };

  const tier3 = (): boolean => consistency('clue-consistency', false);
  const tier4 = (): boolean => consistency('clue-crossing', true);

  const tier5 = (): boolean => {
    const base = currentPool();
    const positions: number[] = [];
    for (let p = 0; p < L; p++) if (popcount(s.dom[p] as number) > 1) positions.push(p);
    positions.sort((a, b) => popcount(s.dom[a] as number) - popcount(s.dom[b] as number) || a - b);
    for (const p of positions) {
      for (let d = s.dom[p] as number; d; d &= d - 1) {
        const v = lowestSymbol(d);
        const sub = cloneState(s);
        sub.dom[p] = 1 << v;
        const contradiction = refute(sub, base, L, K, clues.length, levels);
        if (!contradiction) continue;
        const cell = { position: p, symbol: v };
        const removeIt = (st: State): boolean => {
          st.dom[p] = (st.dom[p] as number) & ~(1 << v);
          return true;
        };
        if (attempt('hypothesis', contradiction, removeIt, cell)) return true;
      }
    }
    return false;
  };

  const tiers = [tier1, tier2, tier3, tier4, tier5];
  const solved = (): boolean => s.dom.every((d) => popcount(d) === 1);

  if (!normalize(s, L, K)) inconsistent = true;
  progress: while (!inconsistent && !solved()) {
    for (let t = 0; t < maxTier; t++) {
      if ((tiers[t] as () => boolean)()) continue progress;
    }
    break;
  }

  if (inconsistent || !solved()) return { status: 'blocked', solution: null, steps };
  return { status: 'solved', solution: s.dom.map(lowestSymbol), steps };
}
