import type { Code, PuzzleParams } from './types';

/** Every code of a parameter set, flattened: code i lives at data[i*L .. i*L+L). */
export interface CodeSpace {
  readonly length: number;
  readonly count: number;
  readonly data: Uint8Array;
}

export function spaceSize(params: PuzzleParams): number {
  const { length: L, alphabetSize: K, allowRepeats } = params;
  if (allowRepeats) return K ** L;
  let n = 1;
  for (let i = 0; i < L; i++) n *= K - i;
  return Math.max(n, 0);
}

export function assertValidParams(params: PuzzleParams): void {
  const { length: L, alphabetSize: K, allowRepeats } = params;
  if (!Number.isInteger(L) || L < 1 || L > 8) throw new Error(`Invalid code length: ${L}`);
  if (!Number.isInteger(K) || K < 2 || K > 30) throw new Error(`Invalid alphabet size: ${K}`);
  if (!allowRepeats && K < L) throw new Error('Alphabet too small for codes without repeats');
  if (spaceSize(params) > 2_000_000) throw new Error('Code space too large to enumerate');
}

const cache = new Map<string, CodeSpace>();

/** Enumerates the whole space in lexicographic order. Memoised per parameter set. */
export function allCodes(params: PuzzleParams): CodeSpace {
  const { length: L, alphabetSize: K, allowRepeats } = params;
  const key = `${L}:${K}:${allowRepeats ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  assertValidParams(params);

  const count = spaceSize(params);
  const data = new Uint8Array(count * L);
  const cur = new Uint8Array(L);
  const used = new Uint8Array(K);
  let out = 0;
  const fill = (pos: number): void => {
    if (pos === L) {
      data.set(cur, out);
      out += L;
      return;
    }
    for (let s = 0; s < K; s++) {
      if (!allowRepeats) {
        if (used[s]) continue;
        used[s] = 1;
      }
      cur[pos] = s;
      fill(pos + 1);
      if (!allowRepeats) used[s] = 0;
    }
  };
  fill(0);

  const space: CodeSpace = { length: L, count, data };
  cache.set(key, space);
  return space;
}

export function codeAt(space: CodeSpace, index: number): Code {
  const start = index * space.length;
  return Array.from(space.data.subarray(start, start + space.length));
}

/** True when `code` is a member of the space described by `params`. */
export function isValidCode(code: ArrayLike<number>, params: PuzzleParams): boolean {
  if (code.length !== params.length) return false;
  const seen = new Set<number>();
  for (let i = 0; i < code.length; i++) {
    const s = code[i] as number;
    if (!Number.isInteger(s) || s < 0 || s >= params.alphabetSize) return false;
    if (!params.allowRepeats && seen.has(s)) return false;
    seen.add(s);
  }
  return true;
}
