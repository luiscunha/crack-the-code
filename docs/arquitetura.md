# Arquitetura — Crack the Code

Documento vivo. Regista a estrutura, os tipos principais, o plano de tarefas e as
decisões tomadas (com justificação) sempre que a prática se afasta da `spec.md`.

## 1. Monorepo

```
crack-the-code/
├─ package.json            scripts raiz: test, lint, typecheck
├─ pnpm-workspace.yaml     packages/*, apps/*
├─ tsconfig.base.json      strict, noUncheckedIndexedAccess, moduleResolution bundler
├─ eslint.config.js        flat config; Math.random proibido em packages/engine
├─ vitest.config.ts        projetos: engine, cli (e game em M3)
├─ packages/
│  ├─ engine/              @ctc/engine — zero dependências de runtime, sem DOM
│  │  └─ src/
│  │     ├─ types.ts       Code, Feedback, Clue (união discriminada), Puzzle, Grade…
│  │     ├─ rng.ts         mulberry32, randInt, shuffle, weightedIndex, deriveSeed
│  │     ├─ score.ts       score(secret, guess) → Feedback
│  │     ├─ clues.ts       compileClue(clue) → matcher; clueHolds
│  │     ├─ space.ts       allCodes(params): espaço enumerado (cache por params)
│  │     ├─ bruteforce.ts  candidates, countCandidates (oráculo)
│  │     ├─ solver.ts      solver humano T1–T5 com passos registados
│  │     ├─ grade.ts       gradeFromSteps, difficultyScore
│  │     ├─ bands.ts       configuração das bandas (calibrada em M2)
│  │     ├─ generator.ts   generateAttempt, generatePuzzle
│  │     └─ index.ts       API pública
│  └─ cli/                 cli — scripts Node (tsx): gen, examples, bench
└─ apps/
   └─ game/                game — Vite + DOM/CSS (M3), Capacitor (M5)
```

Os pacotes exportam o código-fonte TypeScript diretamente (`"main": "src/index.ts"`):
Vite, Vitest e `tsx` consomem TS sem passo de build. O mesmo `@ctc/engine` é usado
pela pipeline offline e pelo jogo (regra inegociável 4).

## 2. Tipos principais do motor

```ts
type Code = readonly number[];            // índices de símbolo 0..K-1, comprimento L
interface Feedback { exact: number; misplaced: number }

interface PuzzleParams {
  length: number;                         // L (3–6)
  alphabetSize: number;                   // K
  allowRepeats: boolean;
  alphabet: 'digits' | 'colors' | 'letters';  // só apresentação
}

// União discriminada por `kind`. v1 só tem 'guess'; §7 acrescenta 'sum', 'parity',
// 'position'… Cada novo membro obriga a tratar o `switch` exaustivo de compileClue.
interface GuessClue { kind: 'guess'; guess: Code; feedback: Feedback }
type Clue = GuessClue;

type Tier = 1 | 2 | 3 | 4 | 5;
type Technique =
  | 'elimination' | 'positional-exclusion'                       // T1
  | 'simple-count' | 'fixation' | 'only-position' | 'symbols-complete' // T2
  | 'clue-consistency'                                           // T3
  | 'clue-crossing'                                              // T4
  | 'hypothesis';                                                // T5

interface StepEffect {
  removed: { position: number; symbol: number }[];  // valores retirados dos domínios
  placed:  { position: number; symbol: number }[];  // posições que ficaram fixas
  symbolsIn: number[];                              // símbolos que passaram a "dentro"
  symbolsOut: number[];                             // símbolos que passaram a "fora"
}
interface SolveStep {
  technique: Technique; tier: Tier;
  clueIds: number[];                      // índices em puzzle.clues
  effect: StepEffect;
  hypothesis?: { position: number; symbol: number };  // só T5
}
interface SolveResult { status: 'solved' | 'blocked'; solution: Code | null; steps: SolveStep[] }

interface Grade { maxTier: Tier; stepsAtMaxTier: number; totalSteps: number;
                  clueCount: number; difficultyScore: number }
interface Puzzle { id: string; seed: number; band: BandId; params: PuzzleParams;
                   clues: Clue[]; solution: Code; grade: Grade }
```

`Puzzle` é JSON puro (arrays de números), para poder ir em bundles da campanha.

## 3. Decisões

### D1 — Representação dos códigos
API pública com `readonly number[]` (legível, serializável). Nos ciclos quentes
(força bruta, gerador, solver) o espaço é um `Uint8Array` plano (`count × L`) em cache
por `params`, e as pistas são compiladas em *matchers* `(buf, offset) => boolean` sem
alocações. Justificação: evita pressão no GC sem espalhar inteiros empacotados pela API.

### D2 — Estado do solver
`dom[pos]` = bitmask de símbolos possíveis; por símbolo, limites `min[s]..max[s]` de
ocorrências (sem repetições: `max ≤ 1`; "dentro" ⇔ `min ≥ 1`; "fora" ⇔ `max = 0`).

**Normalização** (gratuita, faz parte do efeito do passo que a provocou): símbolo fora
sai de todos os domínios; posição fixa conta para `min`; `max` nunca excede o número de
posições onde o símbolo ainda cabe; símbolo com todas as ocorrências já fixas sai das
restantes posições. São as consequências "óbvias" que um jogador faz sem pensar.

### D3 — Técnicas adicionais em T2
A spec lista "contagem simples" e "fixação". Acrescentámos duas técnicas estruturais
(sem pista associada) porque são deduções reais que precisam de hint própria:
- `only-position`: o símbolo está no código e só resta uma posição possível.
- `symbols-complete`: já se conhecem os L símbolos (os restantes saem), ou só sobram
  exatamente os símbolos necessários (entram todos).

### D4 — T3/T4/T5 por enumeração restrita
`D` = códigos compatíveis com os domínios e limites atuais, construído por DFS só quando
T3 é necessário, com um bitmask por código das pistas que satisfaz.
- T3: para uma pista, intersecta os domínios com a união dos códigos de `D` que a satisfazem.
- T4: o mesmo com pares de pistas.
- T5: assume `pos = v`, propaga T3+T4 até ponto fixo (subsume T1/T2 dentro da hipótese);
  contradição ⇒ remove `v`. Um passo por valor removido.
O solver aceita `maxTier` para parar cedo (usado pelo gerador nas bandas baixas).

### D5 — Gerador com minimização sensível ao tier
A minimização da spec (remover pistas enquanto a solução for única) empurra os puzzles
para tiers altos e falharia as bandas baixas. Uma pista só é removida se (a) a solução
continuar única **e** (b) o solver continuar a resolver sem ultrapassar o tier máximo da
banda; a minimização pára no nº mínimo de pistas da banda. O puzzle é aceite se o tier
final estiver no intervalo da banda e o nº de pistas dentro dos limites.

### D6 — Seeds e tentativas
`generateAttempt(band, seed)` é uma tentativa determinística (ou `null`).
`generatePuzzle(band, seed, maxAttempts = 20)` tenta com `deriveSeed(seed, i)`.
O `Puzzle.seed` guardado é a seed da tentativa que resultou: reproduz o puzzle sozinha.

### D7 — Identidade das pistas
`clueIds` nos passos são índices em `puzzle.clues`. A ordem final das pistas é fixada
antes do grading final, por isso os passos guardados/recalculados batem com a UI.

## 4. Plano de tarefas

### M0 — Scaffolding
1. Workspace pnpm, tsconfig strict, Vitest, ESLint (regra `Math.random`), `mulberry32` + testes.

### M1 — Motor
2. Tipos + `score` + property tests (limite, simetria, identidade).
3. Espaço + matchers + força bruta; exemplos de referência 459 e 042.
4. Gerador (heurísticas estéticas, minimização só por unicidade nesta fase) + property
   tests de unicidade e determinismo.

### M2 — Solver humano, grading, calibração
5. Solver T1–T2 + normalização; resolve os exemplos de referência.
6. Solver T3–T5 + grading.
7. Bandas + gerador sensível ao tier; property test 500 puzzles/banda (solver = força bruta).
8. CLI `gen` (relatório por banda), `examples`, `bench`.
9. Calibração até cumprir §6 → **PONTO DE PARAGEM 1**.

### M3 — UI web jogável
10. `apps/game` (Vite): estado de jogo puro + testes (notas, undo, validação).
11. Ecrã de puzzle: cadeado, teclado, lista de pistas, grelha de notas, undo.
12. Hints a partir dos passos do solver (i18n pt-PT/en), seletor de banda.
13. Verificação no browser de um puzzle por banda → **PONTO DE PARAGEM 2**.
