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
├─ vitest.config.ts        testes de packages/* e apps/*
├─ packages/
│  ├─ engine/              @ctc/engine — zero dependências de runtime, sem DOM
│  │  └─ src/
│  │     ├─ types.ts       Code, Feedback, Clue (união discriminada), Puzzle, Grade…
│  │     ├─ rng.ts         mulberry32, randInt, shuffle, weightedIndex, deriveSeed
│  │     ├─ score.ts       score(secret, guess) → Feedback
│  │     ├─ clues.ts       compileClue → matcher; compileTracker → vista incremental
│  │     ├─ space.ts       allCodes(params): espaço enumerado (cache por params)
│  │     ├─ bruteforce.ts  candidates, countCandidates (oráculo)
│  │     ├─ search.ts      countSolutions: contagem por DFS com poda (minimização)
│  │     ├─ clueGen.ts     generateClues (heurísticas estéticas), minimizeClues
│  │     ├─ solver.ts      solver humano T1–T5 com passos registados
│  │     ├─ grade.ts       gradeFromSteps, difficultyScore
│  │     ├─ bands.ts       configuração das bandas (calibrada em M2)
│  │     ├─ generator.ts   generateAttempt, generatePuzzle
│  │     └─ index.ts       API pública
│  └─ cli/                 cli — scripts Node (tsx): gen, examples, bench (report.ts, format.ts)
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
  counts: { symbol: number; min: number; max: number }[]; // limites novos (útil com repetições)
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
`D` só guarda códigos que satisfazem pelo menos uma pista e é construído com *trackers*
incrementais (`compileTracker`), que abandonam um prefixo quando nenhuma pista o pode
ainda cumprir. Os suportes de todas as pistas (ou de todos os pares) saem de uma única
passagem por `D`.
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

### D8 — Bandas calibradas (M2)
Relatório completo e exemplos em `docs/calibracao.md`. Valores finais (`bands.ts`):

| Banda | Variantes | Tier aceite | Pistas | Notas |
|---|---|---|---|---|
| tutorial | L3, 0–9 | T1–T2 | 5–6 | abre com pista (0,0), que nunca é removida; ordem pedagógica |
| easy | L3, 0–9 | T2 | 4–6 | |
| medium | L3 / L4, 0–9 | T3 | 4–6 | |
| hard | L4, 0–9 | T4 | 4–5 | |
| expert | L5, 0–9 | T4–T5 | 5–7 | ~4% dos puzzles chegam a T5 |
| master | L5 0–9 com repetições (peso 3) / L6 6 cores com repetições (peso 2) | T5 | 5–8 | sem pistas (0,0) |

"Tier aceite" é sobre a técnica **mais difícil necessária**: `medium` exige mesmo T3,
`hard` exige T4, `master` exige T5. Assim cada banda significa sempre o mesmo.

Desvios face à tabela inicial da spec §6 e porquê:
- **master sem L6 com dígitos**: 10^6 códigos torna o solver lento demais para o
  orçamento de 200 ms. Ficou L5 com dígitos (10^5) e L6 com 6 cores (46 656).
- **master: palpites quase sempre sem símbolos repetidos** (`repeatGuessChance` 0.1) e
  **sem pistas (0,0)**: palpites com repetições dão puzzles que T4 resolve; com símbolos
  distintos a taxa de puzzles T5 por tentativa sobe de ~8% para ~15–40%.
- A variante é sorteada em cada tentativa, por isso a mistura final (≈42% L5, ≈58% L6)
  não coincide com os pesos: a variante de cores acerta mais vezes em T5.

### D9 — Contagem de soluções com poda na minimização
A minimização testava a unicidade com uma passagem de força bruta por pista (37% do
tempo de geração na `master`). `countSolutions` faz DFS com *trackers* incrementais e
abandona um prefixo mal uma pista deixa de poder ser cumprida. Um property test garante
que devolve exatamente o mesmo que a força bruta, e a validação final de cada puzzle
continua a ser feita com a força bruta (regra inegociável 1).

### D10 — Bandas com tier máximo 5 minimizam só por unicidade
Sem teto de tier para proteger, correr o solver a cada remoção não acrescenta nada:
minimiza-se por unicidade e o solver corre uma vez no fim (rejeita-se se bloquear ou
se não precisar de T5 quando a banda o exige).

### D11 — `difficultyScore`
`100 × (maxTier − 1) + min(60, 10 × passos no tier máx.) + min(39, passos totais)`.
O tier domina; dentro do tier ordena por quanto a técnica mais difícil é usada. Serve para
ordenar níveis dentro de uma banda na campanha (M4). A rever com dados de jogadores.

### D12 — Estrutura de `apps/game` (M3)
TypeScript + DOM sem framework, Vite 8. Lógica pura separada do DOM:
- `state/` — redutor puro `reduce(state, action)`: cadeado, notas (posição × símbolo,
  `unknown → excluded → confirmed`), pistas esgotadas, undo/redo ilimitado. O histórico
  guarda só o `Board` (cadeado + notas + pistas esgotadas); seleção, contadores
  (`wrongSubmissions`, `hintsUsed`) e tempos ficam fora, para o undo não apagar erros nem
  ajudas. O relógio entra pelas ações (`submit { now }`); nada de `Date.now()` no redutor.
  Ações sem efeito não criam entradas no histórico.
- "Riscado" não é um estado próprio: um símbolo está riscado quando as notas o excluem de
  todas as posições (explicitamente ou por haver outro símbolo confirmado na posição /
  sem repetições, o mesmo símbolo confirmado noutra).
- `hints/` — seleção e texto das ajudas (puro, testado). `i18n/` — dicionários tipados.
  `ui/` — componentes DOM construídos uma vez e atualizados com `update(view)`.
- Geração no browser, na thread principal, dentro de um `setTimeout` para o "a gerar…"
  aparecer primeiro. `?band=<id>&seed=<n>` abre `generatePuzzle(band, n)`; `?lang=en`.

### D13 — Seleção das ajudas
O solver corre uma vez por puzzle e guarda os passos. Cada ajuda:
1. Se alguma nota contradiz a solução (confirmado errado, ou a solução excluída), aponta
   essa célula; "Aplicar" repõe-na a desconhecido.
2. Senão, o primeiro passo cuja conclusão as notas ainda não mostram: uma célula removida
   que não está excluída (nem implicada por uma confirmação), uma posição fixa não
   confirmada, um símbolo "fora" que não está excluído em todo o lado.
3. Passos sem efeito representável nas notas ("o 5 está no código", contagens com
   repetições) contam como vistos quando o jogador os aplica (`acknowledged` no `Board`)
   ou quando já confirmou esses símbolos.
4. T3/T4 são focados: a ajuda diz **uma** dedução (posição fixa, senão símbolo fora,
   senão as posições excluídas de **um** símbolo, "o 5 não está nas posições 1, 2 e 4") e
   "Aplicar" escreve só essa; a ajuda seguinte continua o mesmo passo. (Na verificação no
   browser, uma célula de cada vez dava 12 ajudas para um único passo T3; agrupar por
   símbolo reduz para 3–4.)
   T1/T2/T5 aplicam todo o efeito ainda em falta.
Um property test garante que aplicar ajudas repetidamente leva as notas à solução em todas
as bandas (incluindo master). `hintsUsed` conta uma vez por ajuda distinta mostrada.

### D14 — i18n
Um dicionário por língua (`pt-PT` por omissão, `en`), ambos tipados com a mesma interface
`Messages`, por isso uma chave em falta é erro de compilação. Frases com números/símbolos
são funções. As ajudas têm um template por técnica que recebe um contexto já formatado
(nomes das cores por língua, pistas como "326 (n.º 1)"). A língua escolhida fica em
`localStorage` (com `try/catch`); `?lang=` tem prioridade.

### Limitações conhecidas
- Os passos T3/T4 são "consistência em bloco": um passo pode excluir uma dúzia de valores
  de uma vez. Resolvido na UI com ajudas focadas (D13), mas a explicação continua a ser
  "experimenta as combinações": diz *o quê*, não mostra *porquê* com um exemplo concreto.
- Na master, os primeiros passos T3/T4 são muitas vezes só limites de contagem ("o azul
  aparece no máximo 3 vezes"): corretos mas pouco úteis como ajuda.
- Ajudas T5 podem citar 5–6 pistas ("as pistas … deixariam de ser possíveis em conjunto").
- Sem testes de DOM (sem jsdom); a UI é verificada por typecheck, build e no browser.
- Na variante L6 com 6 cores, um palpite sem repetições mostra sempre as 6 cores, logo
  `exact + misplaced` é igual em todas as pistas (o nº de cores distintas do código).
  7 ou 8 cores resolveriam isso à custa de tempo de geração (ver D8).
- `pnpm test` demora ~40 s por causa dos 500 puzzles por banda (critério de M2).

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
    Feita a 375 px e a 1280 px, claro/escuro, pt-PT/en: tutorial, easy, medium, hard,
    expert, master (L6 cores e L5 dígitos) jogados até "Cofre aberto!" só com ajudas e
    teclado do jogo; erro registado em "Tentativas erradas"; undo de notas e riscados.
    Corrigido nesta verificação: transbordo horizontal a 375 px (coluna `auto` da grelha)
    e grelha de notas mais larga que o painel.
