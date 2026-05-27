# RetroRacer 3D

## What This Is

Jogo de corrida 3D arcade para web, otimizado para mobile (90% mobile, 10% desktop). Estética retrô anos 80/90 com Three.js + Cannon-es + Vite. Sem login, sem backend — tudo roda no browser puro. v1.0 entregou jogabilidade funcional completa: carro com física coerente, pista infinita, controles touch, menu com seletor de dificuldade, highscore persistido e proteção contra perda de contexto WebGL.

## Core Value

O carro se move, responde aos controles touch e o jogador consegue completar uma fase — jogabilidade funcional antes de qualquer polimento.

## Current Milestone: v2.0 Content & Polish

**Goal:** Expandir o jogo com game feel, novas fases, carros inimigos AI e sons — transformando o MVP jogável numa experiência arcade completa.

**Target features:**
- Game Feel — Turbo com cooldown, partículas de faísca, camera shake, haptic feedback
- Fase 2 — Autodromo Arcade (nova pista temática)
- Fase 3 — Rodovia Infinita (pool de segmentos para memória constante)
- Carros inimigos AI spawner lane-based + sistema de estrelas por fase (1-3)
- Sons 8-bit via Web Audio API

## Current State

**Shipped:** v1.0 MVP — 2026-05-27
**In progress:** v2.0 Content & Polish
**Codebase:** ~5,500 LOC (JS + CSS + HTML), zero dependências de backend
**Tech stack:** Three.js 0.184.0 + Cannon-es 0.20.0 + Vite 6.3.5

## Requirements

### Validated

- ✓ Carro avança automaticamente com física Cannon-es (mass > 0, allowSleep: false, applyLocalForce) — v1.0
- ✓ Carro vira à esquerda/direita via torque com damping — v1.0
- ✓ Câmera chase cam terceira pessoa com lerp suave — v1.0
- ✓ Botões touch esq/dir fixos (pointer events) + teclado desktop — v1.0
- ✓ Pista reta com rolagem infinita (pool de segmentos reciclados por carZ) — v1.0
- ✓ Obstáculos aleatórios + limites laterais visíveis + velocidade progressiva — v1.0
- ✓ Colisão → game over → Retry em < 500ms sem reload — v1.0
- ✓ HUD com score e velocidade (Press Start 2P pixel font) — v1.0
- ✓ Menu inicial com INICIAR e seletor FÁCIL/MÉDIO/DIFÍCIL — v1.0
- ✓ Dificuldade afeta velocidade (speedMultiplier) e densidade de obstáculos (_activeLimit) — v1.0
- ✓ Highscore salvo em localStorage (safeGet/safeSet) e exibido no menu — v1.0
- ✓ Performance mobile: antialias off, shadowMap off, pixelRatio ≤ 2, Lambert materials — v1.0
- ✓ Loop pausado com visibilitychange + WebGL context loss handler — v1.0

### Active (v2)

- [ ] Turbo com cooldown (FEEL-01)
- [ ] Partículas ao colidir e camera shake (FEEL-02, FEEL-03)
- [ ] Fase 2 — Autodromo Arcade (PROG-01)
- [ ] Fase 3 — Rodovia Infinita com pool para memória constante (PROG-02)
- [ ] Sistema de estrelas por fase 1-3 (PROG-03)
- [ ] Carros inimigos AI spawner lane-based (PROG-04)
- [ ] Sons 8-bit via Web Audio API (POLISH-02)

### Out of Scope

| Feature | Reason |
|---------|--------|
| Login / autenticação | Sem backend — browser only |
| Multiplayer | Sem backend |
| Texturas fotorrealistas | Contradiz estética + custo GPU |
| Física de suspensão realista | Arcade, não simulador |
| Giroscópio / swipe steering | Inconsistente entre devices |
| Bloom post-processing | UnrealBloomPass mata FPS mobile |
| Sons em v1 | Web Audio API unlock friction no mobile |
| IAP / monetização | Fora do escopo |

## Context

- Stack: Three.js 0.184.0 + Cannon-es 0.20.0 + Vite 6.3.5 — validada pela entrega v1.0
- Bug crítico anterior resolvido: 4 causas simultâneas (allowSleep, world-space force, mass=0, syncMesh antes de step)
- Track recycling: posição relativa ao carZ (não threshold fixo) — evita bug em score ~120
- Pool pattern: pool sempre constrói 12 corpos (max difícil) — sem reconstrução entre runs
- Debt conhecido: console.log periódico em `Game.js` L276 (~1/s em produção) — remover no próximo cleanup

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild do zero vs. continuar | Bugs irrecuperáveis de física — mais rápido reconstruir com plano claro | ✓ Correto — 4 dias com GSD |
| Manter Three.js + Cannon-es | Stack funcionou; problema era implementação, não as libs | ✓ Confirmado em v1.0 |
| Priorizar jogabilidade core (Phase 1) antes de features | Valida física e controles antes de expandir | ✓ Hard gate funcionou |
| Pointer Events em vez de Touch Events puros | Unifica mouse (desktop) e touch (mobile) | ✓ Multi-touch correto |
| allowSleep: false + applyLocalForce | Duas das quatro causas do bug anterior | ✓ Resolvido |
| Track recycling por carZ relativo | Fixed-threshold quebrava em score ~120 | ✓ Resolvido |
| Pool fixo 12 + _activeLimit cap | Separa construção de pool da regra de spawn ativo | ✓ Padrão estabelecido |
| safeSet antes de mostrar overlay game-over | Evita estado inconsistente se UI falhar | ✓ Padrão de persistência |
| event.preventDefault() primeiro em contextlost | Sem isso, recovery WebGL não funciona | ✓ Crítico para mobile |
| Endless/distance-score model (sem lap gates em v1) | Lap gates requerem track com checkpoints — fora do escopo v1 | ✓ Deferred para v2 |

## Constraints

- **Tech stack**: Three.js + Cannon-es + Vite — decisão tomada, não negociar em v1
- **Platform**: Browser-only, sem backend, sem login
- **Performance**: antialias off em mobile, pixel ratio ≤ 2, polígonos mínimos
- **Controles**: somente botões touch fixos (esq/dir) + turbo opcional — sem giroscópio

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-05-27 — v2.0 milestone started*
