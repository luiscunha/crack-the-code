# Crack the Code (nome provisório)

Jogo mobile/web de dedução de códigos: o jogador recebe palpites com feedback
("1 correto e no lugar certo", "2 corretos mas no lugar errado"...) e deduz o código
secreto. Todos os puzzles são gerados proceduralmente, têm **solução única garantida**
e uma **dificuldade medida por um solver que raciocina como uma pessoa**.

- Especificação completa: `docs/spec.md` — **ler antes de qualquer alteração ao motor**
- Visão de produto e mercado: `docs/visao.md`
- Decisões de arquitetura (manter atualizado): `docs/arquitetura.md`
- Calibração das bandas (regenerar quando o motor mudar): `docs/calibracao.md`

## Stack

- TypeScript (strict) em todo o lado: motor, pipeline de geração (Node) e UI
- Monorepo com pnpm workspaces:
  - `packages/engine` — modelo, scoring, gerador, solver humano, grading. Zero dependências de UI ou DOM.
  - `packages/cli` — scripts Node: gerar lotes, relatórios de dificuldade, benchmarks
  - `apps/game` — UI em DOM/CSS (sem Canvas), Vite, empacotada com Capacitor para iOS/Android
- Testes: Vitest + fast-check (property-based)
- PRNG com seed: `mulberry32`. **`Math.random()` proibido em `packages/engine`** (regra de lint)

## Regras inegociáveis

1. Todo o puzzle produzido pelo gerador tem exatamente uma solução (verificada por força bruta).
2. O solver humano tem de resolver todos os puzzles que aceita; a solução dele tem de coincidir com a da força bruta.
3. Geração determinística: mesma seed + mesmos parâmetros ⇒ mesmo puzzle, em qualquer plataforma.
4. O mesmo `engine` é usado pela pipeline offline e pelo jogo — nunca duplicar lógica.
5. A dificuldade é a técnica mais difícil que o solver precisa de usar (ver `docs/spec.md` §5).

## Convenções

- Código e identificadores em inglês; textos da UI via i18n (pt-PT e en)
- Funções puras no motor; estado imutável ou explicitamente clonado
- Commits pequenos, um por tarefa concluída, mensagem no imperativo
- No fim de cada milestone: atualizar `docs/arquitetura.md` e a secção "Estado" abaixo

## Comandos

- `pnpm test` — todos os testes (`pnpm lint`, `pnpm typecheck`)
- `pnpm --filter cli gen --band medium --count 1000 --seed 1` — relatório de geração (`--band all` por omissão)
- `pnpm --filter cli examples --band all --count 3 --seed 1` — puzzles de exemplo com os passos do solver
- `pnpm --filter cli bench` — benchmark da força bruta
- `pnpm --filter game dev` — UI em modo desenvolvimento

## Estado

- [x] M0 Scaffolding
- [x] M1 Motor (scoring, força bruta, gerador)
- [x] M2 Solver humano + grading + calibração (relatório em `docs/calibracao.md`)
- [ ] M3 UI jogável (web)
- [ ] M4 Campanha, Cofre Diário, partilha
- [ ] M5 Capacitor + polimento
