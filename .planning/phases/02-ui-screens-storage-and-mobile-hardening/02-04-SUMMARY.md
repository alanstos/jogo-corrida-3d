---
phase: "02"
plan: "04"
subsystem: "gameover-highscore"
tags: ["game-over", "highscore", "localStorage", "NOVO RECORDE", "badge", "menu-record", "persistence"]
dependency_graph:
  requires: ["02-01 Storage (safeGet/safeSet)", "02-02 menu overlay", "02-03 difficulty selector"]
  provides:
    - "game/Game.js — highScore persistence via safeGet/safeSet; NOVO RECORDE badge toggle; goHighScoreValue; returnToMenu() atualiza menu record"
    - "index.html — #goRecordBadge, #goHighScoreValue, #retryButton (RETRY), #menuButton (MENU), .go-buttons"
    - "style.css — .go-record-badge, .go-highscore, .go-buttons layout"
  affects: ["index.html", "style.css", "game/Game.js"]
tech_stack:
  added: []
  patterns:
    - "safeSet ANTES de mostrar overlay — garante persistência antes de render (research pitfall #9)"
    - "isNewRecord computed em _handleCarCollision — single source of truth"
    - "returnToMenu() atualiza #menuRecord — highscore visível no menu após primeiro recorde"
key_files:
  created: []
  modified:
    - index.html
    - style.css
    - game/Game.js
decisions:
  - "safeSet chamado ANTES de classList.remove('hidden') no game-over — evita estado inconsistente se UI falhar"
  - "_highScore carregado em construtor via safeGet — persiste entre reloads"
  - "#menuRecord exibido somente quando _highScore > 0 (D-06)"
  - "retryButton renomeado para RETRY; menuButton separado para MENU — dois botões distintos no game-over"
metrics:
  duration: "~25 min"
  completed: "2026-05-25T21:10:10Z"
  tasks_completed: 3
  files_created: 0
  files_modified: 3
---

# Phase 02 Plan 04: Game-Over Revamp + Highscore Persistence + "NOVO RECORDE!" Badge — Summary

## One-liner

Game-over overlay revampado com badge "NOVO RECORDE!", highscore salvo em localStorage via Storage.js, e dois botões (RETRY + MENU); menu exibe recorde persistente após primeira corrida.

## What Was Built

### T1 — index.html

Game-over overlay reestruturado:
- `#goRecordBadge.go-record-badge.hidden` — badge "NOVO RECORDE!" (escondido por padrão)
- `<p class="go-highscore">RECORDE: <span id="goHighScoreValue">0</span></p>` — exibe melhor pontuação atual
- `.go-buttons` container com dois botões:
  - `#retryButton` → texto alterado para "RETRY"
  - `#menuButton` — novo botão "MENU"

Menu overlay (já existia `#menuRecord.hidden` do plan 02-02) — sem alteração estrutural.

### T2 — style.css

Estilos adicionados para o game-over revamp:
- `.go-record-badge` — cor `#ffee00`, glow amarelo, font Press Start 2P, animação de destaque
- `.go-highscore` — cor `#00ffff`, menor que `.go-score`
- `.go-buttons` — `display: flex; gap: 16px; justify-content: center`
- Estilos para `#retryButton` e `#menuButton` (dois botões distintos)

### T3 — game/Game.js

**Construtor:**
- `import { safeGet, safeSet } from './Storage.js'` adicionado
- `this._highScore = safeGet('melhorPontuacao', 0)` — carrega recorde persistido
- DOM refs: `_goRecordBadgeEl`, `_goHighScoreEl`, `_menuBtn`, `_menuRecordEl`, `_menuRecordValueEl`
- `_menuBtn.addEventListener('pointerup', () => this.returnToMenu())` — segundo botão wired

**`_handleCarCollision()`:**
```js
const finalScore = Math.floor(this.score);
const isNewRecord = finalScore > this._highScore;
if (isNewRecord) {
  this._highScore = finalScore;
  safeSet('melhorPontuacao', finalScore);  // write BEFORE showing overlay
}
this._goScoreEl.textContent = String(finalScore);
this._goHighScoreEl.textContent = String(this._highScore);
this._goRecordBadgeEl.classList.toggle('hidden', !isNewRecord);
```

**`returnToMenu()`:**
```js
this._menuRecordValueEl.textContent = String(this._highScore);
if (this._highScore > 0) {
  this._menuRecordEl.classList.remove('hidden');
}
```

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| T1+T2+T3 | Game-over revamp, highscore persistence, NOVO RECORDE badge | fe11b53 | index.html, style.css, game/Game.js |

## Deviations from Plan

Nenhuma — implementação seguiu o plano exatamente. Todos os 3 arquivos do `affects` foram modificados.

## Self-Check

- [x] `safeGet/safeSet` importados de `./Storage.js`
- [x] `_highScore` carregado no construtor via `safeGet('melhorPontuacao', 0)`
- [x] `_handleCarCollision` computa `isNewRecord = finalScore > this._highScore`
- [x] `safeSet` chamado ANTES de mostrar o overlay quando `isNewRecord`
- [x] `#goRecordBadge` toggled com `.hidden` baseado em `isNewRecord`
- [x] `#goHighScoreValue` exibe `this._highScore`
- [x] `#menuButton` wired para `returnToMenu()`
- [x] `returnToMenu()` atualiza `#menuRecordValue` e exibe `#menuRecord` quando `_highScore > 0`
- [x] Dois botões no game-over: RETRY e MENU

## Self-Check: PASSED

## Threat Flags

localStorage: chave `melhorPontuacao` — existente desde plan 02-01. Sem novas chaves. Sem endpoints de rede ou auth paths.
