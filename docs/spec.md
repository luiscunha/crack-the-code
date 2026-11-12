# Especificação do motor e do jogo — Crack the Code

## 1. Conceitos

| Termo | Definição |
|---|---|
| `Alphabet` | Conjunto de símbolos, de tamanho K. Default: dígitos 0–9 (K=10). Variantes: cores (K=6–8), letras |
| `Code` | Sequência de L símbolos (L entre 3 e 6). Sem repetições por default; com repetições nas bandas altas |
| `Guess` | Sequência de L símbolos mostrada como pista |
| `Feedback` | `{ exact, misplaced }`: símbolos certos no lugar certo / símbolos certos no lugar errado |
| `Clue` | `{ guess, feedback }` (v1). Tipos estendidos em §7 |
| `Puzzle` | `{ id, seed, params, clues[], solution, grade }` |

Representação interna: códigos como `Uint8Array` ou inteiro empacotado em base K
(K^L ≤ 10^6 cabe num `number`) para enumerar sem pressão no GC.

### Exemplo de referência (tem de ser um teste)

| Palpite | Feedback |
|---|---|
| 738 | 0 exact, 0 misplaced |
| 289 | 1 exact, 0 misplaced |
| 215 | 0 exact, 1 misplaced |
| 942 | 0 exact, 2 misplaced |
| 784 | 0 exact, 1 misplaced |

Solução única: **459**. Segundo exemplo clássico: 682 (1,0), 614 (0,1), 206 (0,2), 738 (0,0), 780 (0,1) → **042**.

## 2. Scoring

`score(secret, guess) → Feedback`, com as regras standard do Mastermind:
- `exact` = posições i onde `secret[i] === guess[i]`
- `misplaced` = Σ por símbolo de min(contagem no secret, contagem no guess), menos `exact`

Correto com repetições. Testes property-based: `exact + misplaced ≤ L`, simetria
`score(a,b) === score(b,a)`, `score(x,x) = {L,0}`.

## 3. Força bruta (oráculo)

`candidates(params, clues) → Code[]`: enumera todo o espaço (K^L ou permutações sem
repetição) e filtra os códigos consistentes com todas as pistas. Serve de verdade
absoluta para validar o gerador e o solver. Orçamento: < 50 ms para 10^6 códigos em Node.

## 4. Gerador

Entrada: `seed`, `band` (§6). Saída: `Puzzle` ou `null` (retry com seed derivada).

1. `rng = mulberry32(seed)`; escolher o `secret`.
2. Começar com o espaço de candidatos completo.
3. Em ciclo: gerar um palpite segundo as **heurísticas estéticas** abaixo, calcular o feedback e filtrar os candidatos. Parar quando restar 1 candidato.
4. **Minimização**: percorrer as pistas por ordem aleatória (seeded) e remover cada uma se a solução continuar única sem ela.
5. Correr o solver humano (§5) e obter o `grade`. Se estiver fora da banda pedida, rejeitar e tentar de novo.
6. Validar: força bruta = 1 solução, solver resolve, número de pistas dentro da banda.

Heurísticas estéticas (configuráveis por banda):
- No máximo 1 pista com feedback (0,0)
- Nenhuma pista com `exact === L`
- Preferir palpites que partilham 1–2 símbolos com o secret (pistas informativas mas não óbvias)
- Ordem final das pistas baralhada, exceto no modo tutorial

## 5. Solver humano e grading

Estado: `domains[pos]` (símbolos possíveis em cada posição) + estado por símbolo
(`in` / `out` / `unknown`, com limites de contagem quando há repetições).

Ciclo: aplicar sempre a **técnica de nível mais baixo que faça progresso**; repetir até
ficar resolvido ou bloqueado. Registar cada passo (`technique`, `clueIds`, `effect`):
alimenta o grading **e as hints da UI**.

| Tier | Técnica | Descrição |
|---|---|---|
| T1 | Eliminação | Pista (0,0): todos os seus símbolos estão fora |
| T1 | Exclusão posicional | Pista com `exact = 0`: cada símbolo não está na posição em que aparece |
| T2 | Contagem simples | Numa pista, os símbolos ainda desconhecidos chegam exatamente para o número que falta ⇒ estão todos dentro, ou todos fora |
| T2 | Fixação | Só uma posição pode dar o `exact` de uma pista ⇒ fixar o símbolo |
| T3 | Consistência de uma pista | Remover o valor v da posição p se nenhuma atribuição dos domínios atuais satisfizer essa pista com p=v |
| T4 | Cruzamento de pistas | Igual a T3, mas com pares de pistas avaliados em conjunto |
| T5 | Hipótese | Assumir p=v, propagar com T1–T4; se houver contradição, remover v |

`grade = { maxTier, stepsAtMaxTier, totalSteps, clueCount }` → `difficultyScore` numérico
(fórmula a calibrar em M2 com relatórios de distribuição).

Os tiers T3–T5 podem ser implementados por enumeração restrita aos domínios. Otimizar
só se o benchmark o exigir.

## 6. Bandas de dificuldade (valores iniciais, calibrar em M2)

| Banda | L | Alfabeto | Repetições | Tier máx. | Pistas |
|---|---|---|---|---|---|
| tutorial | 3 | 0–9 | não | T1–T2 | 5–6, ordem pedagógica |
| easy | 3 | 0–9 | não | T2 | 4–6 |
| medium | 3–4 | 0–9 | não | T3 | 4–6 |
| hard | 4 | 0–9 | não | T4 | 4–5 |
| expert | 5 | 0–9 | não | T4–T5 | 5–7 |
| master | 5–6 | 0–9 / cores | sim | T5 | 5–8 |

Critério de aceitação de M2: ≥ 95% de sucesso de geração por banda em ≤ 20 tentativas,
p95 do tempo de geração < 200 ms no Node.

## 7. Pistas e mecânicas estendidas (pós-MVP, desenhar o modelo já preparado)

- `SumClue` ("a soma dos dígitos é 18"), `ParityClue`, `PositionClue` ("o 5 não está na posição 2")
- **Pista mentirosa**: uma pista é falsa. A unicidade passa a ser "existe exatamente um par (pista falsa, código)"
- **Cadeados em cadeia**: a solução do cofre N entra como pista no cofre N+1
- **Modo Arquiteto**: dado o código, o jogador escreve o conjunto mínimo de pistas (o motor valida a unicidade)

O tipo `Clue` deve ser uma união discriminada desde o início.

## 8. Jogo (UI)

### Ecrã de puzzle
- Cadeado com L slots e teclado de símbolos
- Lista de pistas com feedback visual (ícones ●/○ além do texto)
- **Sistema de notas** (crítico): grelha posição × símbolo com 3 estados (desconhecido / excluído / confirmado); toque longo num símbolo para o riscar em todas as pistas; riscar pistas já esgotadas
- Undo ilimitado
- **Hint** = próximo passo do solver, explicado em linguagem humana ("A pista 738 diz que nada está certo: o 7, o 3 e o 8 saem.")
- Validar resposta: errar não penaliza, mas fica registado para o troféu "solução limpa"

### Modos
- **Campanha**: mundos (Cacifo → Cofre → Banco → Museu → Casino), cada um introduz uma banda ou mecânica nova. Os níveis vêm de seeds fixas geradas offline (JSON no bundle)
- **Cofre Diário**: seed = f(data UTC); igual para todos; string de partilha:
  `Cofre Diário #123 🔓 4 dígitos · ⏱ 2:31 · 💡0 · ✨ limpo`
- **Contra-relógio** (pós-MVP), **Duelo assíncrono** (v2, precisa de backend)

### Monetização (mesma filosofia do Septet)
Sem vidas, sem energia, sem vender hints como recurso escasso. Compra única para remover
anúncios ou jogo completo, packs de níveis, arquivo do Diário, cosmética (skins de cadeados).

### Distribuição
Build web primeiro (domínio próprio + itch.io) como canal de aquisição; depois iOS/Android
via Capacitor.
