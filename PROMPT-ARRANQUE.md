	# Prompt de arranque (colar no Claude Code)

> Lê o `CLAUDE.md`, o `docs/spec.md` e o `docs/visao.md`. Vais construir este jogo de forma
> autónoma, milestone a milestone, sem pedir confirmação entre tarefas, exceto nos pontos
> de paragem indicados.
>
> **Forma de trabalhar**
> - Começa por escrever `docs/arquitetura.md` com a estrutura do monorepo, os tipos
>   principais do motor e o plano de tarefas de M0–M3. Depois avança logo.
> - Escreve os testes antes ou em conjunto com a implementação. Nenhuma tarefa está
>   concluída com testes a falhar.
> - Commit por tarefa concluída. Atualiza a secção "Estado" do `CLAUDE.md` em cada milestone.
> - Se uma decisão da spec se revelar má na prática, toma a melhor decisão, regista-a em
>   `docs/arquitetura.md` com a justificação e continua.
>
> **Milestones e critérios de aceitação**
> - **M0** — monorepo pnpm, TypeScript strict, Vitest, ESLint com regra que proíbe
>   `Math.random` em `packages/engine`, `mulberry32`. `pnpm test` passa.
> - **M1** — `score`, força bruta, gerador com minimização. Testes: os dois exemplos de
>   referência da spec (459 e 042); property tests com fast-check (unicidade de solução,
>   determinismo por seed, propriedades do scoring).
> - **M2** — solver humano com tiers T1–T5, passos registados e grading. Property test:
>   em 500 puzzles por banda, a solução do solver coincide sempre com a da força bruta.
>   CLI `gen` imprime por banda: taxa de sucesso, distribuição de tiers e de nº de pistas,
>   p50/p95 do tempo. Calibra as bandas até cumprir os critérios da spec §6.
>   **PONTO DE PARAGEM 1**: mostra-me o relatório de calibração e 3 puzzles de exemplo
>   por banda (pistas, solução, passos do solver) antes de passares à UI.
> - **M3** — UI web jogável (Vite, DOM/CSS, mobile-first): ecrã de puzzle com teclado,
>   notas, undo, hint explicada a partir dos passos do solver, validação, seletor de banda.
>   Verifica no browser que um puzzle de cada banda se joga do início ao fim.
>   **PONTO DE PARAGEM 2**: screenshots dos ecrãs e lista do que falta para M4.
>
>Para o M3, delega a implementação da UI num subagente com model: opus. Tu ficas como coordenador: defines as tarefas, revês o resultado e corres a verificação no browser.
>
> Não implementes ainda as pistas estendidas da spec §7, mas o tipo `Clue` deve ser uma
> união discriminada preparada para elas.
