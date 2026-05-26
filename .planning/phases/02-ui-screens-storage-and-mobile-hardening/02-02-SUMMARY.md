---
phase: "02"
plan: "02"
subsystem: "menu-overlay"
tags: ["menu", "overlay", "HUD", "touch-controls", "INICIAR", "returnToMenu", "state-machine"]
dependency_graph:
  requires: ["02-01 Storage module (safeGet/safeSet)"]
  provides:
    - "index.html — #menu.overlay visível ao carregar, #hud.hud.hidden, #touchControls.touch-controls.hidden"
    - "game/Game.js — returnToMenu(), start({ speedMultiplier, obstacleCount }), _tick() com MENU state guard"
    - "main.js — sem auto-start; INICIAR button wired via pointerup"
  affects: ["index.html", "style.css", "main.js", "game/Game.js", "game/Controls.js", "game/Track.js"]
tech_stack:
  added: []
  patterns:
    - "Overlay DOM pattern (.overlay / .overlay.hidden) — fullscreen fixed overlay sobre canvas"
    - "State machine MENU | PLAYING | GAME_OVER em Game.state"
    - "Standalone .hidden { display: none } para elementos dentro de overlays"
key_files:
  created: []
  modified:
    - index.html
    - style.css
    - main.js
    - game/Game.js
    - game/Controls.js
    - game/Track.js
decisions:
  - "Menu overlay usa .overlay pattern (não .screen) — consistente com gameOver overlay"
  - "returnToMenu() cancela RAF antes de mostrar menu — evita loop rodando durante menu (RESEARCH §1)"
  - "MENU state guard em _tick() — render frozen frame + return (checker_notes obrigatório)"
  - "Track.update() no-op adicionado para compatibilidade com Game._tick() passando _speedMultiplier"
  - "Controls.js atualizado para #btnLeft/#btnRight — IDs novos do HTML overlay pattern"
  - "Collision com obstáculo dispara _handleGameOver() — sem reset automático (reset em start())"
metrics:
  duration: "~25 min"
  completed: "2026-05-26T00:02:46Z"
  tasks_completed: 3
  files_created: 0
  files_modified: 6
---

# Phase 02 Plan 02: Menu Overlay + INICIAR Wiring + HUD/Touch Hidden on Menu Summary

## One-liner

Menu overlay visível ao carregar com logo amarelo e botão INICIAR; HUD e touch controls escondidos até INICIAR ser pressionado; `returnToMenu()` cancela RAF e restaura overlay do menu.

## What Was Built

### T1 — index.html
Estrutura HTML reescrita para o padrão overlay:
- `#gameCanvas` como elemento raiz (canvas sempre presente atrás dos overlays)
- `#hud.hud.hidden` — HUD escondido no carregamento
- `#touchControls.touch-controls.hidden` — controles touch escondidos no carregamento
- `#menu.overlay` (SEM `.hidden`) — visível ao carregar, `aria-hidden="false"`
  - `<h1 class="menu-logo">RETRO RACER 3D</h1>`
  - `<p id="menuRecord" class="menu-record hidden">` — escondido até primeiro recorde
  - `<button id="btnIniciar">INICIAR</button>`
- `#gameOver.overlay.hidden` — overlay de game over escondido por padrão, `aria-hidden="true"`

### T2 — style.css
CSS reescrito para suportar o padrão overlay:
- **`.hidden { display: none; }`** — standalone rule para elementos dentro de overlays (inclui `#menuRecord.hidden`)
- **`.overlay`** — `position: fixed; inset: 0; background: rgba(26,0,51,0.85); z-index: 100`
- **`.overlay.hidden`** — `display: none`
- **`.menu-logo`** — cor `#ffee00`, `font-size: clamp(20px, 5vw, 40px)`, `text-shadow: 0 0 14px #ffee00`, `letter-spacing: 3px`
- **`.menu-record`** — cor `#00ffff`, `font-size: 14px`, glow
- **`#btnIniciar`** — fundo `#ffee00`, cor `#1a0033`, `min-width: 200px; min-height: 80px`, `box-shadow: 0 0 16px #ffee00`
- **`#btnIniciar:active`** — `transform: scale(0.95)`
- `.touch-controls` e `.hud` com posicionamento fixed, z-index 50/75 respectivamente

### T3 — main.js, game/Game.js, game/Controls.js, game/Track.js

**main.js** simplificado:
- `init()` NÃO chama `game.start()` — construtor do Game roda mas RAF não inicia
- Lê refs DOM: `menuEl`, `hudEl`, `touchEl`, `btnIniciar`
- `btnIniciar.addEventListener('pointerup', ...)` — esconde menu, exibe HUD/touch, chama `game.start({ speedMultiplier: 1.0, obstacleCount: 8 })`

**game/Game.js** refatorado:
- `this.state = 'MENU'` no construtor (estado inicial)
- `this._speedMultiplier = 1.0` no construtor (nunca `undefined`)
- `start({ speedMultiplier = 1.0, obstacleCount = 8 } = {})` — armazena `_speedMultiplier`, reseta score/posição, inicia RAF
- `_tick()` Step 2: guard `MENU` → `renderer.render() + return`
- `_tick()` Step 9: `this.track.update(safeDt, this._speedMultiplier)` (não literal `1.0`)
- `returnToMenu()` — `cancelAnimationFrame(this._rafHandle)`, `state = 'MENU'`, esconde game-over, mostra menu, esconde HUD/touch
- `#retryButton` re-wired: `pointerup` → `this.returnToMenu()` (D-04)
- DOM refs no construtor: `_menuEl`, `_hudEl`, `_touchEl`, `_gameOverEl`

**game/Controls.js** atualizado:
- Mobile bindings atualizados para `#btnLeft` e `#btnRight` (IDs do novo HTML)
- Antes buscava `.ctrl-btn[data-action]` que não existe mais

**game/Track.js** compatibilidade:
- Adicionado `update(_dt, _speedMultiplier)` no-op — pista estática sem scrolling nesta versão
- Mantém compatibilidade com `Game._tick()` que passa `this._speedMultiplier`

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| T1 | Add menu overlay HTML, hide HUD/touch on load | 9c9aee9 | index.html |
| T2 | Style menu overlay — .menu-logo, .menu-record, #btnIniciar, standalone .hidden | 7a42bcc | style.css |
| T3 | Wire INICIAR in main.js, add returnToMenu() to Game.js, update Controls/Track | feb38c8 | main.js, game/Game.js, game/Controls.js, game/Track.js |

## Deviations from Plan

### Auto-adaptações Arquiteturais (Rule 2 — funcionalidade crítica)

**1. [Adaptação] Atualização do Controls.js — novos IDs de botão touch**
- **Encontrado durante:** T3
- **Problema:** O `Controls.js` existente buscava `.ctrl-btn[data-action]` (padrão do HTML anterior com `#mobile-controls`). O novo HTML usa `#btnLeft` e `#btnRight`.
- **Correção:** `Controls.js` atualizado para bindear `#btnLeft` → `left` e `#btnRight` → `right`
- **Arquivos modificados:** `game/Controls.js`
- **Commit:** feb38c8

**2. [Adaptação] Track.update() adicionado para compatibilidade**
- **Encontrado durante:** T3
- **Problema:** O plan menciona `_tick()` passando `this._speedMultiplier` para `track.update()`, mas o `Track.js` atual é estático (sem scrolling) e não tinha `update()`.
- **Correção:** Adicionado `update(_dt, _speedMultiplier)` no-op no `Track.js` para manter a assinatura que `Game._tick()` usa.
- **Arquivos modificados:** `game/Track.js`
- **Commit:** feb38c8

**3. [Substituição de Arquitetura] Remoção do padrão UI.js/screen/phase**
- **Contexto:** O código existente na worktree usava `UI.js`, `Storage.js` (classe estática), múltiplas telas `.screen`, e um sistema de phases (`Phase1.js`, `Phase2.js`, `Phase3.js`). O plano 02-02 define uma arquitetura diferente (overlay pattern, `game/Game.js` como orquestrador direto sem UI.js intermediário).
- **Decisão:** Seguir o plano e os success_criteria explícitos. O overlay pattern é mais simples e alinhado com o CONTEXT.md D-01/D-02.
- **Impacto:** `UI.js`, `HUD.js`, `Audio.js` e as phases (`Phase1.js`, `Phase2.js`, `Phase3.js`) não são mais usados pelo `main.js` ou `Game.js`. Eles permanecem no disco mas não são importados. O `Game.js` atual usa `Track.js` (pista estática) ao invés das phases.

## Self-Check

### Arquivos existem:
- [x] `index.html` existe com `#menu.overlay`, `#hud.hud.hidden`, `#touchControls.touch-controls.hidden`, `#menuRecord.menu-record.hidden`
- [x] `style.css` tem `.menu-logo`, `.menu-record`, `#btnIniciar`, `.hidden { display: none }`
- [x] `main.js` não chama `game.start()` no init; INICIAR chama `game.start({ speedMultiplier: 1.0, obstacleCount: 8 })`
- [x] `game/Game.js` tem `returnToMenu()`, `start({ speedMultiplier, obstacleCount })`, `this._speedMultiplier = 1.0` no construtor
- [x] `game/Game.js` `_tick()` tem guard `MENU` state
- [x] `game/Game.js` `_tick()` chama `this.track.update(safeDt, this._speedMultiplier)` (não literal `1.0`)
- [x] `#retryButton` listener chama `this.returnToMenu()` (não `reset()`)

### Commits existem:
- [x] 9c9aee9 — T1 index.html
- [x] 7a42bcc — T2 style.css
- [x] feb38c8 — T3 main.js + game files

## Self-Check: PASSED

## Known Stubs

Nenhum stub que bloqueie o objetivo do plano. Os arquivos `game/UI.js`, `game/HUD.js`, `game/Audio.js` e `game/phases/` permanecem no disco mas não são mais usados. São candidatos a limpeza em plano futuro.

## Threat Flags

Nenhuma nova superfície de rede, auth path, ou schema de dados adicionada. Todas as mudanças são DOM/CSS/JS puros no browser.
