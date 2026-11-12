import { allCodes, countCandidates, score, type GuessClue, type PuzzleParams } from '@ctc/engine';

// Spec §3 budget: brute force over 10^6 codes in < 50 ms.
const params: PuzzleParams = { length: 6, alphabetSize: 10, allowRepeats: true, alphabet: 'digits' };
const secret = [3, 1, 4, 1, 5, 9];
const guesses = [
  [1, 2, 3, 4, 5, 6],
  [9, 9, 8, 7, 1, 3],
  [3, 3, 4, 0, 0, 2],
  [5, 1, 1, 4, 6, 9],
  [0, 7, 2, 8, 6, 6],
];
const clues: GuessClue[] = guesses.map((guess) => ({
  kind: 'guess',
  guess,
  feedback: score(secret, guess),
}));

let t0 = performance.now();
const space = allCodes(params);
console.log(`enumerar ${space.count} códigos: ${(performance.now() - t0).toFixed(1)} ms (uma vez, em cache)`);

const runs: number[] = [];
let found = 0;
for (let i = 0; i < 12; i++) {
  t0 = performance.now();
  found = countCandidates(params, clues);
  runs.push(performance.now() - t0);
}
runs.sort((a, b) => a - b);
console.log(
  `força bruta, ${clues.length} pistas, ${found} candidato(s): mediana ${(runs[6] as number).toFixed(1)} ms, melhor ${(runs[0] as number).toFixed(1)} ms`,
);
