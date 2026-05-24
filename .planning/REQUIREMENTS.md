# Requirements: RetroRacer 3D

**Defined:** 2026-05-24
**Core Value:** O carro se move, responde aos controles touch e o jogador consegue completar uma fase — jogabilidade funcional antes de qualquer polimento.

## v1 Requirements

### Physics & Movement

- [ ] **PHYS-01**: Carro avança automaticamente com física Cannon-es (mass > 0, allowSleep: false, applyLocalForce)
- [ ] **PHYS-02**: Carro vira à esquerda/direita via torque com damping
- [ ] **PHYS-03**: Câmera chase cam em terceira pessoa com lerp suave atrás do carro
- [ ] **PHYS-04**: Ground plane física impede o carro de cair (Plane rotacionado -π/2)

### Controls

- [ ] **CTRL-01**: Botões touch esq/dir fixos na base da tela (pointer events, touch-action: none)
- [ ] **CTRL-02**: Teclado (setas/WASD) funciona para testar no desktop
- [ ] **CTRL-03**: Botões com feedback visual ao pressionar (highlight/scale CSS)

### Track & Obstacles

- [ ] **TRACK-01**: Pista reta com rolagem infinita via pool de segmentos reciclados
- [ ] **TRACK-02**: Obstáculos estáticos (caixas/barreiras) gerados aleatoriamente na pista
- [ ] **TRACK-03**: Limites laterais da pista visíveis (bordas coloridas ou geometria)
- [ ] **TRACK-04**: Velocidade da pista aumenta progressivamente com o tempo

### Gameplay Loop

- [ ] **GAME-01**: Colisão com obstáculo termina a corrida (game over)
- [ ] **GAME-02**: Score aumenta com a distância percorrida
- [ ] **GAME-03**: Tela de game over exibe score com botão Retry (sem reload de página)
- [ ] **GAME-04**: Retry reseta o estado do jogo em < 500ms

### HUD

- [ ] **HUD-01**: Score visível durante o jogo (pixel font)
- [ ] **HUD-02**: Velocidade atual exibida (numérica)

### UI Screens

- [ ] **UI-01**: Tela inicial com botão INICIAR e seletor de dificuldade (Fácil/Médio/Difícil)
- [ ] **UI-02**: Dificuldade afeta velocidade base e densidade de obstáculos
- [ ] **UI-03**: Tela de game over com score e botão Retry

### Storage

- [ ] **STOR-01**: Melhor score salvo no localStorage com safeGet/safeSet (try/catch)
- [ ] **STOR-02**: Recorde exibido na tela inicial

### Performance

- [ ] **PERF-01**: Renderer com antialias: false e shadowMap: false em mobile
- [ ] **PERF-02**: Pixel ratio limitado a Math.min(devicePixelRatio, 2)
- [ ] **PERF-03**: Materiais MeshLambertMaterial ou MeshToonMaterial (sem PBR)
- [ ] **PERF-04**: Loop pausado com visibilitychange (evita delta explosion)

## v2 Requirements

### Game Feel

- **FEEL-01**: Turbo (boost com cooldown)
- **FEEL-02**: Partículas de faísca ao colidir (pool de 20-30)
- **FEEL-03**: Camera shake ao colidir
- **FEEL-04**: Haptic feedback (navigator.vibrate)

### Progression

- **PROG-01**: Fase 2 — Autodromo Arcade
- **PROG-02**: Fase 3 — Rodovia Infinita (pool de segmentos para memória constante)
- **PROG-03**: Sistema de estrelas por fase (1-3)
- **PROG-04**: Carros inimigos AI (spawner lane-based)
- **PROG-05**: Tela de vitória

### Polish

- **POLISH-01**: Backgrounds temáticos por fase (prédios, arquibancadas, estrelas)
- **POLISH-02**: Sons 8-bit (Web Audio API)
- **POLISH-03**: Efeito glitch no logo da tela inicial

## Out of Scope

| Feature | Reason |
|---------|--------|
| Login / autenticação | Sem backend — browser only |
| Multiplayer | Scope explode, sem backend |
| Texturas fotorrealistas | Contradiz a estética + custo GPU |
| Física de suspensão realista | Arcade, não simulador |
| Giroscópio / swipe steering | Inconsistente entre devices |
| Bloom post-processing | UnrealBloomPass mata FPS mobile |
| Sons em v1 | Web Audio API unlock friction no mobile |
| IAP / monetização | Fora do escopo do projeto |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PHYS-01 | Phase 1 | Pending |
| PHYS-02 | Phase 1 | Pending |
| PHYS-03 | Phase 1 | Pending |
| PHYS-04 | Phase 1 | Pending |
| CTRL-01 | Phase 1 | Pending |
| CTRL-02 | Phase 1 | Pending |
| CTRL-03 | Phase 1 | Pending |
| TRACK-01 | Phase 1 | Pending |
| TRACK-02 | Phase 1 | Pending |
| TRACK-03 | Phase 1 | Pending |
| TRACK-04 | Phase 1 | Pending |
| GAME-01 | Phase 1 | Pending |
| GAME-02 | Phase 1 | Pending |
| GAME-03 | Phase 1 | Pending |
| GAME-04 | Phase 1 | Pending |
| HUD-01 | Phase 1 | Pending |
| HUD-02 | Phase 1 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 1 | Pending |
| STOR-01 | Phase 2 | Pending |
| STOR-02 | Phase 2 | Pending |
| PERF-01 | Phase 1 | Pending |
| PERF-02 | Phase 1 | Pending |
| PERF-03 | Phase 1 | Pending |
| PERF-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-24*
