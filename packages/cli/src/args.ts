import { BAND_IDS, type BandId } from '@ctc/engine';

/** Parses `--key value` pairs. */
export function parseArgs(argv: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (!arg.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[arg.slice(2)] = next;
      i++;
    } else {
      out[arg.slice(2)] = 'true';
    }
  }
  return out;
}

export function parseBands(value: string | undefined): BandId[] {
  if (!value || value === 'all') return [...BAND_IDS];
  const bands = value.split(',').map((b) => b.trim());
  for (const b of bands) {
    if (!BAND_IDS.includes(b as BandId)) {
      throw new Error(`Unknown band "${b}". Use one of: ${BAND_IDS.join(', ')}, all`);
    }
  }
  return bands as BandId[];
}

export function intArg(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) throw new Error(`Expected an integer, got "${value}"`);
  return n;
}
