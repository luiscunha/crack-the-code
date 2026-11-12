# Calibração das bandas — M2

Gerado com `pnpm --filter cli gen --count 1000 --seed 1` e `pnpm --filter cli examples --count 3 --seed 1`
(Node v24.19.0, Windows). Regenerar sempre que as bandas ou o solver mudarem.

## Relatório de geração

```text
Relatório de geração — 1000 puzzles por banda, seed 1

── tutorial ──────────────────────────────────────────
  sucesso (≤20 tentativas): 100.0%  (1000/1000), média 2.88 tentativas
  tiers:      T2: 100.0%
  nº pistas:  5: 97.8%  6: 2.2%
  comprimento: L3: 100.0%
  dificuldade: min 123  mediana 158  máx 174
  tempo:      p50 0.1 ms   p95 0.4 ms   máx 1.1 ms
  critérios §6 (≥95% e p95 < 200 ms): CUMPRE

── easy ──────────────────────────────────────────────
  sucesso (≤20 tentativas): 99.7%  (997/1000), média 3.19 tentativas
  tiers:      T2: 100.0%
  nº pistas:  4: 92.8%  5: 6.0%  6: 1.2%
  comprimento: L3: 100.0%
  dificuldade: min 123  mediana 147  máx 174
  tempo:      p50 0.1 ms   p95 0.3 ms   máx 0.7 ms
  critérios §6 (≥95% e p95 < 200 ms): CUMPRE

── medium ────────────────────────────────────────────
  sucesso (≤20 tentativas): 99.9%  (999/1000), média 2.88 tentativas
  tiers:      T3: 100.0%
  nº pistas:  4: 64.3%  5: 28.5%  6: 7.2%
  comprimento: L3: 39.4%  L4: 60.6%
  dificuldade: min 213  mediana 228  máx 274
  tempo:      p50 0.8 ms   p95 2.9 ms   máx 5.8 ms
  critérios §6 (≥95% e p95 < 200 ms): CUMPRE

── hard ──────────────────────────────────────────────
  sucesso (≤20 tentativas): 100.0%  (1000/1000), média 2.15 tentativas
  tiers:      T4: 100.0%
  nº pistas:  4: 62.3%  5: 37.7%
  comprimento: L4: 100.0%
  dificuldade: min 313  mediana 324  máx 379
  tempo:      p50 1.7 ms   p95 4.6 ms   máx 8.5 ms
  critérios §6 (≥95% e p95 < 200 ms): CUMPRE

── expert ────────────────────────────────────────────
  sucesso (≤20 tentativas): 100.0%  (1000/1000), média 1.62 tentativas
  tiers:      T4: 95.8%  T5: 4.2%
  nº pistas:  5: 65.8%  6: 29.0%  7: 5.2%
  comprimento: L5: 100.0%
  dificuldade: min 315  mediana 331  máx 486
  tempo:      p50 3.5 ms   p95 7.6 ms   máx 19.8 ms
  critérios §6 (≥95% e p95 < 200 ms): CUMPRE

── master ────────────────────────────────────────────
  sucesso (≤20 tentativas): 98.5%  (985/1000), média 4.99 tentativas
  tiers:      T5: 100.0%
  nº pistas:  5: 26.8%  6: 32.6%  7: 26.2%  8: 14.4%
  comprimento: L5: 41.8%  L6: 58.2%
  dificuldade: min 418  mediana 450  máx 499
  tempo:      p50 42.0 ms   p95 147.2 ms   máx 285.8 ms
  critérios §6 (≥95% e p95 < 200 ms): CUMPRE

Todas as bandas cumprem os critérios.
```

Força bruta (`pnpm --filter cli bench`): 10^6 códigos com 5 pistas em ~16 ms (orçamento da spec: 50 ms).

## Exemplos (3 por banda)

Notação dos passos: `7@1` = símbolo 7 na posição 1; cores: R G B Y O P.

```text
════ TUTORIAL ════

tutorial-b19fea7c — L=3, 0–9, sem repetições
  1) 326  →  0 no lugar certo, 0 no lugar errado
  2) 860  →  0 no lugar certo, 1 no lugar errado
  3) 894  →  0 no lugar certo, 2 no lugar errado
  4) 687  →  1 no lugar certo, 1 no lugar errado
  5) 706  →  1 no lugar certo, 0 no lugar errado
  Solução: 789
  Grade: T2 (6 passos no tier máx., 9 no total), dificuldade 169
  Passos do solver:
    1. T1 Eliminação [326]: fora: 2 3 6
    2. T1 Exclusão posicional [860]: exclui: 8@1 0@3
    3. T1 Exclusão posicional [894]: exclui: 9@2 4@3
    4. T2 Contagem simples [687]: dentro: 7 8
    5. T2 Contagem simples [860]: fora: 0
    6. T2 Fixação [706]: fixa: 7@1
    7. T2 Fixação [687]: fora: 4; fixa: 8@2
    8. T2 Contagem simples [894]: dentro: 9
    9. T2 Única posição: fora: 1 5; fixa: 9@3

tutorial-85a7d419 — L=3, 0–9, sem repetições
  1) 128  →  0 no lugar certo, 0 no lugar errado
  2) 425  →  0 no lugar certo, 1 no lugar errado
  3) 438  →  0 no lugar certo, 1 no lugar errado
  4) 457  →  2 no lugar certo, 0 no lugar errado
  5) 954  →  1 no lugar certo, 0 no lugar errado
  Solução: 357
  Grade: T2 (3 passos no tier máx., 6 no total), dificuldade 136
  Passos do solver:
    1. T1 Eliminação [128]: fora: 1 2 8
    2. T1 Exclusão posicional [425]: exclui: 4@1 5@3
    3. T1 Exclusão posicional [438]: exclui: 3@2
    4. T2 Fixação [457]: fora: 4; dentro: 5 7; fixa: 5@2 7@3
    5. T2 Contagem simples [438]: dentro: 3
    6. T2 Única posição: fora: 0 6 9; fixa: 3@1

tutorial-2fc9155f — L=3, 0–9, sem repetições
  1) 426  →  0 no lugar certo, 0 no lugar errado
  2) 630  →  0 no lugar certo, 1 no lugar errado
  3) 983  →  1 no lugar certo, 2 no lugar errado
  4) 861  →  1 no lugar certo, 0 no lugar errado
  5) 183  →  1 no lugar certo, 1 no lugar errado
  Solução: 893
  Grade: T2 (3 passos no tier máx., 5 no total), dificuldade 135
  Passos do solver:
    1. T1 Eliminação [426]: fora: 2 4 6
    2. T1 Exclusão posicional [630]: exclui: 3@2 0@3
    3. T2 Contagem simples [983]: dentro: 3 8 9
    4. T2 Símbolos completos: fora: 0 1 5 7
    5. T2 Fixação [861]: fixa: 8@1 9@2 3@3

════ EASY ════

easy-725ce18e — L=3, 0–9, sem repetições
  1) 603  →  0 no lugar certo, 2 no lugar errado
  2) 689  →  0 no lugar certo, 2 no lugar errado
  3) 357  →  0 no lugar certo, 0 no lugar errado
  4) 096  →  1 no lugar certo, 1 no lugar errado
  Solução: 068
  Grade: T2 (5 passos no tier máx., 8 no total), dificuldade 158
  Passos do solver:
    1. T1 Exclusão posicional [603]: exclui: 6@1 0@2 3@3
    2. T1 Exclusão posicional [689]: exclui: 8@2 9@3
    3. T1 Eliminação [357]: fora: 3 5 7
    4. T2 Contagem simples [603]: dentro: 0 6
    5. T2 Contagem simples [096]: fora: 9
    6. T2 Contagem simples [689]: dentro: 8
    7. T2 Símbolos completos: fora: 1 2 4; fixa: 6@2
    8. T2 Fixação [096]: fixa: 0@1 8@3

easy-85a7d419 — L=3, 0–9, sem repetições
  1) 514  →  0 no lugar certo, 1 no lugar errado
  2) 695  →  0 no lugar certo, 1 no lugar errado
  3) 476  →  0 no lugar certo, 1 no lugar errado
  4) 537  →  1 no lugar certo, 2 no lugar errado
  Solução: 357
  Grade: T2 (4 passos no tier máx., 7 no total), dificuldade 147
  Passos do solver:
    1. T1 Exclusão posicional [514]: exclui: 5@1 1@2 4@3
    2. T1 Exclusão posicional [695]: exclui: 6@1 9@2 5@3
    3. T1 Exclusão posicional [476]: exclui: 4@1 7@2 6@3
    4. T2 Contagem simples [537]: dentro: 3 5 7
    5. T2 Única posição: fora: 4 6; fixa: 5@2
    6. T2 Símbolos completos: fora: 0 1 2 8 9
    7. T2 Fixação [537]: fixa: 3@1 7@3

easy-30798f2c — L=3, 0–9, sem repetições
  1) 269  →  0 no lugar certo, 1 no lugar errado
  2) 470  →  2 no lugar certo, 0 no lugar errado
  3) 780  →  0 no lugar certo, 1 no lugar errado
  4) 649  →  0 no lugar certo, 2 no lugar errado
  Solução: 476
  Grade: T2 (4 passos no tier máx., 7 no total), dificuldade 147
  Passos do solver:
    1. T1 Exclusão posicional [269]: exclui: 2@1 6@2 9@3
    2. T1 Exclusão posicional [780]: exclui: 7@1 8@2 0@3
    3. T1 Exclusão posicional [649]: exclui: 6@1 4@2
    4. T2 Fixação [470]: fora: 0 9; dentro: 4 7; fixa: 4@1 7@2
    5. T2 Contagem simples [780]: fora: 8
    6. T2 Contagem simples [649]: dentro: 6
    7. T2 Única posição: fora: 1 2 3 5; fixa: 6@3

════ MEDIUM ════

medium-e7fcce14 — L=4, 0–9, sem repetições
  1) 2957  →  1 no lugar certo, 0 no lugar errado
  2) 1043  →  1 no lugar certo, 1 no lugar errado
  3) 5629  →  1 no lugar certo, 0 no lugar errado
  4) 8143  →  0 no lugar certo, 2 no lugar errado
  Solução: 1637
  Grade: T3 (2 passos no tier máx., 9 no total), dificuldade 229
  Passos do solver:
    1. T1 Exclusão posicional [8143]: exclui: 8@1 1@2 4@3 3@4
    2. T3 Consistência de uma pista [2957]: exclui: 5@1 7@1 9@1 2@2 5@2 7@2 2@3 7@3 9@3 2@4 5@4 9@4
    3. T2 Fixação [5629]: fora: 9; dentro: 6; fixa: 6@2
    4. T2 Fixação [1043]: fora: 2; dentro: 1; fixa: 1@1
    5. T2 Contagem simples [5629]: fora: 5
    6. T2 Fixação [2957]: fora: 4; dentro: 7; fixa: 7@4
    7. T3 Consistência de uma pista [1043]: fora: 8
    8. T2 Contagem simples [8143]: dentro: 3
    9. T2 Única posição: fora: 0; fixa: 3@3

medium-7e32275d — L=4, 0–9, sem repetições
  1) 7849  →  0 no lugar certo, 2 no lugar errado
  2) 8506  →  0 no lugar certo, 1 no lugar errado
  3) 9127  →  0 no lugar certo, 2 no lugar errado
  4) 4263  →  0 no lugar certo, 1 no lugar errado
  5) 9071  →  0 no lugar certo, 3 no lugar errado
  6) 2195  →  1 no lugar certo, 0 no lugar errado
  Solução: 3790
  Grade: T3 (1 passos no tier máx., 12 no total), dificuldade 222
  Passos do solver:
    1. T1 Exclusão posicional [7849]: exclui: 7@1 8@2 4@3 9@4
    2. T1 Exclusão posicional [8506]: exclui: 8@1 5@2 0@3 6@4
    3. T1 Exclusão posicional [9127]: exclui: 9@1 1@2 2@3 7@4
    4. T1 Exclusão posicional [4263]: exclui: 4@1 2@2 6@3 3@4
    5. T1 Exclusão posicional [9071]: exclui: 0@2 7@3 1@4
    6. T3 Consistência de uma pista [2195]: fora: 1; exclui: 5@1 9@2 5@3 2@4
    7. T2 Contagem simples [9071]: dentro: 0 7 9
    8. T2 Única posição: fixa: 7@2
    9. T2 Única posição: fixa: 9@3
   10. T2 Contagem simples [7849]: fora: 4 8
   11. T2 Contagem simples [8506]: fora: 5 6; fixa: 0@4
   12. T2 Contagem simples [9127]: fora: 2; dentro: 3; fixa: 3@1

medium-2fc9155f — L=3, 0–9, sem repetições
  1) 328  →  0 no lugar certo, 2 no lugar errado
  2) 173  →  1 no lugar certo, 0 no lugar errado
  3) 189  →  0 no lugar certo, 2 no lugar errado
  4) 409  →  0 no lugar certo, 1 no lugar errado
  Solução: 893
  Grade: T3 (1 passos no tier máx., 8 no total), dificuldade 218
  Passos do solver:
    1. T1 Exclusão posicional [328]: exclui: 3@1 2@2 8@3
    2. T1 Exclusão posicional [189]: exclui: 1@1 8@2 9@3
    3. T1 Exclusão posicional [409]: exclui: 4@1 0@2
    4. T3 Consistência de uma pista [173]: fora: 1; exclui: 7@1 3@2 7@3
    5. T2 Contagem simples [189]: dentro: 8 9
    6. T2 Única posição: fixa: 8@1
    7. T2 Única posição: fora: 7; fixa: 9@2
    8. T2 Fixação [173]: fora: 0 2 4 5 6; dentro: 3; fixa: 3@3

════ HARD ════

hard-0dd6b1d3 — L=4, 0–9, sem repetições
  1) 6751  →  0 no lugar certo, 3 no lugar errado
  2) 4536  →  0 no lugar certo, 1 no lugar errado
  3) 0932  →  1 no lugar certo, 0 no lugar errado
  4) 0195  →  0 no lugar certo, 2 no lugar errado
  Solução: 1967
  Grade: T4 (3 passos no tier máx., 7 no total), dificuldade 337
  Passos do solver:
    1. T1 Exclusão posicional [6751]: exclui: 6@1 7@2 5@3 1@4
    2. T1 Exclusão posicional [4536]: exclui: 4@1 5@2 3@3 6@4
    3. T1 Exclusão posicional [0195]: exclui: 0@1 1@2 9@3 5@4
    4. T3 Consistência de uma pista [0932]: fora: 0 3; exclui: 2@1 9@1 2@2 2@3 9@4
    5. T4 Cruzamento de pistas [6751 + 4536]: fora: 4; dentro: 1 7
    6. T4 Cruzamento de pistas [6751 + 0932]: fora: 8
    7. T4 Cruzamento de pistas [6751 + 0195]: fora: 2 5; dentro: 6 9; fixa: 1@1 9@2 6@3 7@4

hard-85a7d419 — L=4, 0–9, sem repetições
  1) 1395  →  0 no lugar certo, 3 no lugar errado
  2) 6495  →  0 no lugar certo, 2 no lugar errado
  3) 4097  →  0 no lugar certo, 2 no lugar errado
  4) 4670  →  1 no lugar certo, 0 no lugar errado
  5) 2309  →  1 no lugar certo, 1 no lugar errado
  Solução: 3579
  Grade: T4 (1 passos no tier máx., 13 no total), dificuldade 323
  Passos do solver:
    1. T1 Exclusão posicional [1395]: exclui: 1@1 3@2 9@3 5@4
    2. T1 Exclusão posicional [6495]: exclui: 6@1 4@2
    3. T1 Exclusão posicional [4097]: exclui: 4@1 0@2 7@4
    4. T3 Consistência de uma pista [4670]: fora: 4; exclui: 0@1 7@1 7@2 0@3 6@3 6@4
    5. T3 Consistência de uma pista [2309]: exclui: 9@1 2@4
    6. T4 Cruzamento de pistas [1395 + 4097]: fora: 2 6 8; dentro: 9
    7. T2 Contagem simples [6495]: dentro: 5
    8. T2 Fixação [2309]: fora: 0; fixa: 9@4
    9. T2 Contagem simples [4097]: dentro: 7
   10. T2 Única posição: fixa: 7@3
   11. T2 Contagem simples [2309]: dentro: 3
   12. T2 Única posição: fixa: 3@1
   13. T2 Única posição: fora: 1; fixa: 5@2

hard-a64b3dd9 — L=4, 0–9, sem repetições
  1) 8401  →  1 no lugar certo, 0 no lugar errado
  2) 9710  →  1 no lugar certo, 2 no lugar errado
  3) 8564  →  1 no lugar certo, 0 no lugar errado
  4) 0958  →  0 no lugar certo, 2 no lugar errado
  Solução: 9571
  Grade: T4 (1 passos no tier máx., 8 no total), dificuldade 318
  Passos do solver:
    1. T1 Exclusão posicional [0958]: exclui: 0@1 9@2 5@3 8@4
    2. T3 Consistência de uma pista [8401]: exclui: 1@1 4@1 0@2 1@2 8@2 1@3 4@3 8@3 0@4 4@4
    3. T3 Consistência de uma pista [9710]: exclui: 7@1 2@3 3@3 6@3 2@4 3@4 5@4 6@4
    4. T3 Consistência de uma pista [8564]: fora: 4 6; exclui: 5@1
    5. T4 Cruzamento de pistas [8401 + 9710]: fora: 8; dentro: 7 9
    6. T2 Fixação [8564]: dentro: 5; fixa: 5@2
    7. T2 Fixação [9710]: fora: 2 3; fixa: 9@1
    8. T2 Contagem simples [0958]: fora: 0; dentro: 1; fixa: 7@3 1@4

════ EXPERT ════

expert-b19fea7c — L=5, 0–9, sem repetições
  1) 27931  →  1 no lugar certo, 1 no lugar errado
  2) 08497  →  1 no lugar certo, 2 no lugar errado
  3) 25497  →  0 no lugar certo, 3 no lugar errado
  4) 83067  →  1 no lugar certo, 2 no lugar errado
  5) 68123  →  1 no lugar certo, 1 no lugar errado
  Solução: 78965
  Grade: T4 (7 passos no tier máx., 19 no total), dificuldade 379
  Passos do solver:
    1. T1 Exclusão posicional [25497]: exclui: 2@1 5@2 4@3 9@4 7@5
    2. T3 Consistência de uma pista [08497]: exclui: 8@1 0@2
    3. T4 Cruzamento de pistas [08497 + 83067]: exclui: 6@2 0@4
    4. T4 Cruzamento de pistas [08497 + 68123]: exclui: 6@1
    5. T4 Cruzamento de pistas [27931 + 68123]: exclui: 1@2 2@2 3@2 9@2 2@3 3@3
    6. T3 Consistência de uma pista [83067]: exclui: 6@3
    7. T4 Cruzamento de pistas [08497 + 83067]: exclui: 8@4
    8. T4 Cruzamento de pistas [25497 + 83067]: fora: 1; dentro: 7
    9. T4 Cruzamento de pistas [27931 + 08497]: exclui: 3@1 9@1
   10. T4 Cruzamento de pistas [27931 + 83067]: exclui: 7@3 7@4
   11. T3 Consistência de uma pista [08497]: exclui: 4@1 5@1 4@2
   12. T3 Consistência de uma pista [83067]: fora: 3; exclui: 8@3 0@5 6@5 8@5
   13. T3 Consistência de uma pista [27931]: exclui: 0@3
   14. T2 Fixação [83067]: dentro: 6; fixa: 6@4
   15. T2 Fixação [68123]: dentro: 8; fixa: 8@2
   16. T2 Única posição: fora: 0; fixa: 7@1
   17. T2 Fixação [27931]: dentro: 9; fixa: 9@3
   18. T2 Contagem simples [27931]: fora: 2
   19. T2 Contagem simples [08497]: fora: 4; dentro: 5; fixa: 5@5

expert-7e32275d — L=5, 0–9, sem repetições
  1) 84579  →  0 no lugar certo, 3 no lugar errado
  2) 65317  →  0 no lugar certo, 3 no lugar errado
  3) 32450  →  1 no lugar certo, 2 no lugar errado
  4) 38612  →  1 no lugar certo, 0 no lugar errado
  5) 89604  →  1 no lugar certo, 1 no lugar errado
  Solução: 37905
  Grade: T4 (2 passos no tier máx., 11 no total), dificuldade 331
  Passos do solver:
    1. T1 Exclusão posicional [84579]: exclui: 8@1 4@2 5@3 7@4 9@5
    2. T1 Exclusão posicional [65317]: exclui: 6@1 5@2 3@3 1@4 7@5
    3. T3 Consistência de uma pista [38612]: fora: 1; exclui: 2@1 2@2 3@2 6@2 2@3 8@3 2@4 3@4 6@4 8@4 3@5 6@5 8@5
    4. T4 Cruzamento de pistas [84579 + 38612]: fora: 8; dentro: 0
    5. T3 Consistência de uma pista [32450]: exclui: 4@1
    6. T3 Consistência de uma pista [89604]: exclui: 9@1 4@4 9@4
    7. T3 Consistência de uma pista [32450]: exclui: 5@1 0@5
    8. T4 Cruzamento de pistas [84579 + 65317]: fora: 2; dentro: 5 7
    9. T3 Consistência de uma pista [89604]: fora: 6; dentro: 3; fixa: 3@1; exclui: 9@2
   10. T2 Fixação [32450]: dentro: 9; fixa: 7@2 9@3 0@4
   11. T2 Única posição: fora: 4; fixa: 5@5

expert-a64b3dd9 — L=5, 0–9, sem repetições
  1) 90857  →  1 no lugar certo, 2 no lugar errado
  2) 06432  →  1 no lugar certo, 0 no lugar errado
  3) 86349  →  0 no lugar certo, 1 no lugar errado
  4) 70128  →  0 no lugar certo, 3 no lugar errado
  5) 14539  →  0 no lugar certo, 3 no lugar errado
  Solução: 95712
  Grade: T4 (1 passos no tier máx., 10 no total), dificuldade 320
  Passos do solver:
    1. T1 Exclusão posicional [86349]: exclui: 8@1 6@2 3@3 4@4 9@5
    2. T1 Exclusão posicional [70128]: exclui: 7@1 0@2 1@3 2@4 8@5
    3. T1 Exclusão posicional [14539]: exclui: 1@1 4@2 5@3 3@4
    4. T3 Consistência de uma pista [06432]: fora: 3 6; exclui: 2@1 4@1 2@2 0@3 2@3 0@4 0@5 4@5
    5. T4 Cruzamento de pistas [90857 + 06432]: fora: 0; dentro: 1; exclui: 9@3 5@4
    6. T3 Consistência de uma pista [86349]: dentro: 2 5 7; fixa: 2@5
    7. T2 Fixação [06432]: fora: 4
    8. T2 Contagem simples [70128]: fora: 8; fixa: 7@3
    9. T2 Símbolos completos: dentro: 9
   10. T2 Fixação [90857]: fixa: 9@1 5@2 1@4

════ MASTER ════

master-b19fea7c — L=6, 6 colors, com repetições
  1) YGBROP  →  1 no lugar certo, 2 no lugar errado
  2) OBRGYP  →  0 no lugar certo, 3 no lugar errado
  3) BGOYRP  →  1 no lugar certo, 2 no lugar errado
  4) OBYGPR  →  1 no lugar certo, 2 no lugar errado
  5) RPGYOB  →  0 no lugar certo, 3 no lugar errado
  6) GYBRPO  →  1 no lugar certo, 2 no lugar errado
  7) RGYOPB  →  1 no lugar certo, 2 no lugar errado
  8) BRYPOG  →  3 no lugar certo, 0 no lugar errado
  Solução: BRYRBY
  Grade: T5 (1 passos no tier máx., 20 no total), dificuldade 430
  Passos do solver:
    1. T1 Exclusão posicional [OBRGYP]: exclui: O@1 B@2 R@3 G@4 Y@5 P@6; contagem: R×0–5 G×0–5 B×0–5 Y×0–5 O×0–5 P×0–5
    2. T1 Exclusão posicional [RPGYOB]: exclui: R@1 P@2 G@3 Y@4 O@5 B@6; contagem: R×0–4 G×0–4 B×0–4 Y×0–4 O×0–4 P×0–4
    3. T3 Consistência de uma pista [BRYPOG]: fora: O; contagem: Y×0–3
    4. T4 Cruzamento de pistas [YGBROP + RGYOPB]: contagem: B×0–3 P×0–3
    5. T4 Cruzamento de pistas [BGOYRP + BRYPOG]: contagem: R×0–3
    6. T4 Cruzamento de pistas [OBYGPR + RGYOPB]: contagem: G×0–3
    7. T5 Hipótese [OBYGPR]: supondo G@2 ⇒ contradição; exclui: G@2
    8. T3 Consistência de uma pista [BGOYRP]: contagem: G×0–2
    9. T4 Cruzamento de pistas [YGBROP + BGOYRP]: contagem: P×0–2
   10. T4 Cruzamento de pistas [YGBROP + GYBRPO]: exclui: G@1
   11. T4 Cruzamento de pistas [YGBROP + BRYPOG]: exclui: P@1 P@3
   12. T4 Cruzamento de pistas [BGOYRP + GYBRPO]: exclui: P@5; contagem: P×0–1
   13. T2 Fixação [RGYOPB]: dentro: Y; fixa: Y@3; contagem: Y×1–3
   14. T2 Fixação [OBYGPR]: exclui: R@6
   15. T3 Consistência de uma pista [YGBROP]: contagem: B×0–2 Y×2–3
   16. T4 Cruzamento de pistas [YGBROP + BGOYRP]: fora: G; dentro: R; fixa: Y@6; contagem: R×1–2
   17. T3 Consistência de uma pista [GYBRPO]: fora: P; dentro: B; contagem: B×1–2
   18. T2 Fixação [BRYPOG]: fixa: B@1 R@2; contagem: Y×2
   19. T2 Símbolos completos: contagem: R×2 B×2
   20. T2 Fixação [YGBROP]: fixa: R@4 B@5

master-85a7d419 — L=5, 0–9, com repetições
  1) 74062  →  1 no lugar certo, 1 no lugar errado
  2) 42798  →  1 no lugar certo, 1 no lugar errado
  3) 95681  →  0 no lugar certo, 2 no lugar errado
  4) 59034  →  1 no lugar certo, 1 no lugar errado
  5) 81275  →  0 no lugar certo, 2 no lugar errado
  6) 57039  →  1 no lugar certo, 2 no lugar errado
  Solução: 10097
  Grade: T5 (5 passos no tier máx., 34 no total), dificuldade 484
  Passos do solver:
    1. T1 Exclusão posicional [95681]: exclui: 9@1 5@2 6@3 8@4 1@5; contagem: 1×0–4 5×0–4 6×0–4 8×0–4 9×0–4
    2. T1 Exclusão posicional [81275]: exclui: 8@1 1@2 2@3 7@4 5@5; contagem: 1×0–3 2×0–4 5×0–3 7×0–4 8×0–3
    3. T3 Consistência de uma pista [74062]: contagem: 0×0–4 3×0–3 4×0–4 9×0–3
    4. T3 Consistência de uma pista [42798]: contagem: 0×0–3 6×0–3
    5. T3 Consistência de uma pista [95681]: contagem: 2×0–3 4×0–3 7×0–3
    6. T3 Consistência de uma pista [57039]: contagem: 1×0–2 2×0–2 4×0–2 6×0–2 8×0–2
    7. T4 Cruzamento de pistas [74062 + 42798]: contagem: 5×0–2
    8. T4 Cruzamento de pistas [74062 + 95681]: contagem: 3×0–2
    9. T4 Cruzamento de pistas [59034 + 57039]: fora: 4; dentro: 7; exclui: 7@2; contagem: 7×1–3
   10. T3 Consistência de uma pista [95681]: contagem: 0×0–2
   11. T4 Cruzamento de pistas [95681 + 57039]: contagem: 7×1–2
   12. T5 Hipótese [95681]: supondo 2@2 ⇒ contradição; exclui: 2@2
   13. T5 Hipótese [74062 + 42798 + 95681 + 59034 + 81275]: supondo 3@2 ⇒ contradição; exclui: 3@2
   14. T4 Cruzamento de pistas [74062 + 42798]: fora: 2
   15. T4 Cruzamento de pistas [74062 + 81275]: contagem: 9×0–2
   16. T4 Cruzamento de pistas [74062 + 57039]: exclui: 6@1
   17. T5 Hipótese [74062 + 42798 + 95681 + 59034 + 81275 + 57039]: supondo 6@2 ⇒ contradição; exclui: 6@2
   18. T4 Cruzamento de pistas [42798 + 59034]: exclui: 9@3
   19. T5 Hipótese [74062]: supondo 8@2 ⇒ contradição; exclui: 8@2
   20. T4 Cruzamento de pistas [74062 + 59034]: exclui: 0@1 5@1
   21. T4 Cruzamento de pistas [74062 + 57039]: exclui: 5@3; contagem: 5×0–1 6×0–1
   22. T5 Hipótese [74062 + 95681]: supondo 9@2 ⇒ contradição; dentro: 0; fixa: 0@2; contagem: 0×1–2
   23. T2 Contagem simples [74062]: fora: 6
   24. T3 Consistência de uma pista [95681]: contagem: 3×0–1
   25. T3 Consistência de uma pista [59034]: exclui: 3@3 0@4
   26. T4 Cruzamento de pistas [74062 + 95681]: exclui: 3@1
   27. T4 Cruzamento de pistas [74062 + 59034]: exclui: 1@4 3@5 9@5; contagem: 1×0–1 9×0–1
   28. T3 Consistência de uma pista [42798]: exclui: 7@3
   29. T4 Cruzamento de pistas [74062 + 81275]: fora: 5
   30. T4 Cruzamento de pistas [42798 + 95681]: dentro: 1; exclui: 8@3; contagem: 1×1 8×0–1
   31. T2 Contagem simples [81275]: fora: 8
   32. T2 Fixação [42798]: fora: 3; dentro: 9; fixa: 9@4; contagem: 9×1
   33. T2 Fixação [59034]: fixa: 0@3 7@5; contagem: 0×2
   34. T2 Única posição: fixa: 1@1; contagem: 7×1

master-a64b3dd9 — L=6, 6 colors, com repetições
  1) BOGRPY  →  0 no lugar certo, 4 no lugar errado
  2) OGPYBR  →  1 no lugar certo, 3 no lugar errado
  3) YRPGBO  →  0 no lugar certo, 4 no lugar errado
  4) YBPROG  →  1 no lugar certo, 3 no lugar errado
  5) PGROYB  →  2 no lugar certo, 2 no lugar errado
  6) BRGOYP  →  0 no lugar certo, 4 no lugar errado
  7) RYPBGO  →  1 no lugar certo, 3 no lugar errado
  8) GOBYPR  →  0 no lugar certo, 4 no lugar errado
  Solução: OPRBOB
  Grade: T5 (1 passos no tier máx., 14 no total), dificuldade 424
  Passos do solver:
    1. T1 Exclusão posicional [BOGRPY]: exclui: B@1 O@2 G@3 R@4 P@5 Y@6; contagem: R×0–5 G×0–5 B×0–5 Y×0–5 O×0–5 P×0–5
    2. T1 Exclusão posicional [YRPGBO]: exclui: Y@1 R@2 P@3 G@4 B@5 O@6; contagem: R×0–4 G×0–4 B×0–4 Y×0–4 O×0–4 P×0–4
    3. T1 Exclusão posicional [BRGOYP]: exclui: O@4 Y@5 P@6; contagem: Y×0–3 O×0–3 P×0–3
    4. T1 Exclusão posicional [GOBYPR]: exclui: G@1 B@3 Y@4 R@6; contagem: R×0–3 G×0–3 B×0–3 Y×0–2
    5. T3 Consistência de uma pista [OGPYBR]: contagem: P×0–2
    6. T4 Cruzamento de pistas [OGPYBR + YBPROG]: contagem: R×0–2
    7. T4 Cruzamento de pistas [OGPYBR + PGROYB]: contagem: Y×0–1 O×0–2
    8. T4 Cruzamento de pistas [OGPYBR + RYPBGO]: exclui: Y@2; contagem: G×0–2
    9. T5 Hipótese [BOGRPY + OGPYBR + YBPROG + PGROYB + RYPBGO]: supondo P@4 ⇒ contradição; dentro: B; fixa: B@4; contagem: B×1–3
   10. T2 Fixação [RYPBGO]: exclui: R@1 G@5
   11. T3 Consistência de uma pista [OGPYBR]: contagem: P×0–1
   12. T4 Cruzamento de pistas [OGPYBR + PGROYB]: fora: Y; dentro: O P; exclui: B@2; contagem: B×1–2 O×1–2 P×1
   13. T3 Consistência de uma pista [YBPROG]: fixa: O@5 B@6; contagem: R×0–1 G×0–1 B×2 O×2
   14. T3 Consistência de uma pista [PGROYB]: fora: G; dentro: R; fixa: O@1 P@2 R@3; contagem: R×1
```
