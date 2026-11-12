import { BAND_IDS, generatePuzzle, type BandId } from '@ctc/engine';
import { LOCALES } from './i18n';
import './styles.css';
import { mountPuzzleScreen } from './ui/puzzleScreen';

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

const root = document.getElementById('app') as HTMLElement;
const url = new URL(window.location.href);
const bandParam = url.searchParams.get('band');
const band: BandId = BAND_IDS.find((b) => b === bandParam) ?? 'tutorial';
const seedParam = Number(url.searchParams.get('seed'));
const seed = Number.isInteger(seedParam) && seedParam > 0 ? seedParam : randomSeed();

const result = generatePuzzle(band, seed);
if (result) {
  mountPuzzleScreen(root, {
    puzzle: result.puzzle,
    m: LOCALES['pt-PT'],
    now: () => Date.now(),
    onHome: () => window.location.reload(),
    onAgain: () => window.location.reload(),
  });
}
