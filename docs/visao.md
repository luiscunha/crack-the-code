# Resumo — Oportunidade de jogo "Crack the Code"

*Conversa de 7 de novembro de 2026*

---

## 1. Ponto de partida

Imagem partilhada: puzzle viral "Qual é a senha?" — cadeado com código de 3 dígitos e 5 pistas.

| Palpite | Pista |
|---|---|
| 738 | Nada está correto |
| 289 | Um número correto e no lugar certo |
| 215 | Um número correto, mas no lugar errado |
| 942 | Dois números corretos, mas nos lugares errados |
| 784 | Um número correto, mas no lugar errado |

**Solução: 459**

---

## 2. Análise de mercado (App Store / web)

O formato é conhecido como **"Crack the Code"** / **"number lock puzzle"**, derivado do **Mastermind** / **Bulls & Cows**.

### Apps no formato exato (pistas fixas → deduzir código)

| App | Plataforma | Notas |
|---|---|---|
| **Dyslock – Crack The Code** | iOS | O mais completo: +2000 puzzles, códigos de 2 a 6 dígitos, hints inteligentes, bom sistema de notas. Grátis + IAP (2,99 / 1,99 / 3,99 USD) |
| **Crack The Code: IQ Riddles** | iOS (pago) | Exatamente o formato da imagem, 3 dígitos |

### Variantes interativas (palpites + feedback)

| App | Notas |
|---|---|
| **Find Lock** | Palpite → indica dígitos certos e se estão no lugar certo |
| **CodeAB** | Código de 4 dígitos, estilo Bulls & Cows |
| Clones de Mastermind (Code Breaker, MegaDecoder, etc.) | Dezenas, quase todos com poucas reviews |

### Conclusões

- Formato **muito viral** (WhatsApp, Facebook), mas as apps existentes são **pequenas e quase todas iOS**.
- Não foi encontrada nenhuma app com **puzzle diário**, **partilha social estilo Wordle** ou **design moderno**.
- Ressalva: pesquisa feita via web, não diretamente nas stores — o Google Play pode ter algo que escapou.

---

## 3. Avaliação da oportunidade

**Sim, mas pequena e só com diferenciação.**

- ✅ Formato viral, concorrência fraca
- ⚠️ Clonável num fim de semana — só ter os puzzles não chega
- 🎯 Diferenciação necessária: **puzzles infinitos**, **dificuldade medida a sério** e **motivo para voltar todos os dias**

---

## 4. Proposta de jogo

### 4.1 Motor: gerador + solver

- Gerar código aleatório → criar pistas até restar **uma única solução** → remover pistas redundantes.
- **Solver "humano"** que resolve com técnicas ordenadas por dificuldade:
  1. Eliminação simples
  2. Fixar uma posição
  3. Cruzar duas pistas
  4. Hipótese até contradição
- **Dificuldade = técnica mais difícil exigida**, garantindo que "Difícil" significa sempre o mesmo.
- Em .NET é trivial: 10⁶ combinações resolvem-se por força bruta em milissegundos.

### 4.2 Eixos de dificuldade

- Mais dígitos (3 → 6)
- Símbolos diferentes: cores, letras, ícones
- Menos pistas
- Dígitos repetidos permitidos
- Tipos de pista novos: "a soma é 18", "o 5 não está na posição 2", "um dígito é par"

### 4.3 Mecânicas dinâmicas

- **Pista mentirosa** — uma pista é falsa; descobrir qual.
- **Cadeados em cadeia** — a solução do cofre 1 é pista do cofre 2 (níveis "boss").
- **Pistas escondidas** — reveladas com moedas ou mini-puzzles.
- **Modo Arquiteto** — dado o código, escrever o menor conjunto de pistas que o torna único.

### 4.4 Modos de jogo

| Modo | Descrição |
|---|---|
| **Campanha** | Mundos temáticos (Cacifo → Cofre → Banco → Museu → Casino), cada um com uma mecânica nova |
| **Cofre Diário** | Mesmo puzzle para todos, partilha em emojis estilo Wordle (🔒🟩🟨 + tempo) — motor de crescimento orgânico |
| **Duelo assíncrono** | Cada jogador define um código; o outro adivinha com feedback Mastermind |
| **Contra-relógio** | Rankings competitivos |

### 4.5 UX crítica

**Sistema de notas** para marcar dígitos excluídos e posições fixas — elogiado no Dyslock e decisivo num jogo de dedução.

### 4.6 Monetização

- Grátis com anúncios **só entre níveis**
- Hints pagas
- Compra única para remover anúncios
- Skins de cadeados
- Cofre Diário **sempre grátis**

---

## 5. Plano de execução

| Fase | Duração | Entregável |
|---|---|---|
| 1 | Semanas 1–2 | Gerador, solver e classificador de dificuldade (núcleo). Validar com 1000 puzzles |
| 2 | Semanas 3–4 | UI com notas + 3 mundos |
| 3 | Semana 5 | Cofre Diário com partilha, beta fechada |
| 4 | Depois | Pista mentirosa, duelos e rankings, conforme retenção |

---

## 6. Sinergias

- Reutilizar a **stack e o pipeline de publicação do SevenDice** (DiceToSeven).
- Possibilidade de posicionar ambos como uma **família de puzzles lógicos do mesmo estúdio**.

---

## 7. Próximo passo sugerido

Transformar esta proposta num **documento de game design** com detalhe dos níveis e das regras do gerador.

---

## Fontes

- [Dyslock – App Store](https://apps.apple.com/py/app/dyslock-crack-the-code/id1636561650?l=en-GB)
- [Crack The Code: IQ Riddles – App Store](https://apps.apple.com/us/app/id1621868375)
- [Find Lock – App Store](https://apps.apple.com/tr/app/find-lock/id6738378175)
- [CodeAB – App Store](https://apps.apple.com/us/app/codeab-logic-number-puzzle/id1616021619?uo=4)
- [Best Mastermind-Style Games 2026](https://glorifiedcalculator-js7j1.kinsta.page/best-mastermind-style-games.html)
