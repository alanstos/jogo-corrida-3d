# RetroRacer 3D

## What This Is

Jogo de corrida 3D para web, otimizado para mobile (90% mobile, 10% desktop). Estética retrô arcade anos 80/90 com Three.js + Cannon-es + Vite. Sem login, sem backend — tudo roda no browser puro. Rebuild do zero após implementação anterior apresentar bugs irrecuperáveis de física do carro.

## Core Value

O carro se move, responde aos controles touch e o jogador consegue completar uma fase — jogabilidade funcional antes de qualquer polimento.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Carro se move com física coerente via Cannon-es
- [ ] Controles touch (botões esq/dir) funcionam no mobile
- [ ] Pista com rolagem infinita (endless runner)
- [ ] Colisão com obstáculos e carros inimigos detectada
- [ ] Fase 1 — Cidade Neon — jogável do início ao fim
- [ ] HUD com velocidade, pontuação e lap counter
- [ ] Tela inicial com seletor de dificuldade (Fácil/Médio/Difícil)
- [ ] Fase 2 — Autodromo Arcade
- [ ] Fase 3 — Rodovia Infinita
- [ ] Tela de fim de fase com estrelas (1-3) e botões Next/Retry/Menu
- [ ] Histórico de recordes via localStorage
- [ ] Performance mobile: 30-60 FPS, antialias off, sombras off

### Out of Scope

- Login / autenticação — sem backend
- Multiplayer — browser-only
- Texturas fotorrealistas — estética low-poly intencional
- Física complexa de suspensão — arcade, não simulador
- Giroscópio / swipe — só botões touch fixos
- Sons (v1) — opcional, não crítico para jogabilidade core

## Context

- Design completo em `inicio.md` — referência canônica para visual, mecânicas e estrutura de fases
- Stack: Three.js (npm), Cannon-es (npm), Vite — mesma stack do projeto anterior, stack não foi a causa dos bugs
- Bug crítico anterior: carro não se movia — provável problema na aplicação de forças no loop de física (Car.js + Game.js)
- Mobile-first: landscape forçado via CSS, touch events com pointer events unificados
- Câmera chase cam terceira pessoa, FOV ~75, leve lag suave
- localStorage para highscores (melhorPontuacao, melhorTempo, fasesCompletadas)

## Constraints

- **Tech stack**: Three.js + Cannon-es + Vite — decisão tomada, não negociar em v1
- **Platform**: Browser-only, sem backend, sem login
- **Performance**: antialias off em mobile, pixel ratio ≤ 2, polígonos mínimos
- **Controles**: somente botões touch fixos (esq/dir) + turbo opcional — sem giroscópio

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild do zero vs. continuar | Bugs irrecuperáveis de física no código anterior — mais rápido reconstruir com plano claro | — Pending |
| Manter Three.js + Cannon-es | A stack funcionou; o problema era a implementação, não as libs | — Pending |
| Priorizar jogabilidade core (Fase 1) antes de features completas | Valida que a física e controles funcionam antes de expandir para 3 fases | — Pending |
| Pointer events em vez de touch events puros | Unifica mouse (desktop) e touch (mobile) em um único handler | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-24 after initialization*
