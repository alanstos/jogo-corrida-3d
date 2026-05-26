---
phase: "02"
plan: "03"
subsystem: "difficulty"
tags: ["difficulty-selector", "FÁCIL", "MÉDIO", "DIFÍCIL", "Track", "obstacle-pool", "config"]
dependency_graph:
  requires: ["02-02 menu overlay + INICIAR wiring"]
  provides:
    - "index.html — #difficultySelector com 3 botões; MÉDIO .selected por padrão"
    - "main.js — DIFFICULTY_CONFIG map, selectedDifficulty state, pointerup wiring"
    - "game/Track.js — pool fixo em 12; setDifficulty(n); _activeLimit cap em _trySpawnObstacle"
    - "game/Game.js — start() chama track.setDifficulty(obstacleCount) antes de track.reset()"
  affects: ["index.html", "style.css", "main.js", "game/Game.js", "game/Track.js"]
tech_stack:
  added: []
  patterns:
    - "DIFFICULTY_CONFIG map (facil/medio/dificil) → { speedMultiplier, obstacleCount }"
    - "Pool fixo 12 + _activeLimit cap — separa construção de pool da regra de spawn ativo"
    - "setDifficulty(n) como setter público — Game.start() não acessa internals de Track"
key_files:
  created: []
  modified:
    - index.html
    - style.css
    - main.js
    - game/Game.js
    - game/Track.js
decisions:
  - "Pool sempre constrói 12 corpos (max difícil) — evita re-construção entre runs"
  - "_activeLimit cap verificado antes do pool-exhaustion guard — prioridade correta de spawn"
  - "selectedDifficulty persiste em main.js scope — seleção mantida entre runs automaticamente"
  - "DIFFICULTY_CONFIG como const no topo de main.js — evita lookup a cada pointerup"
metrics:
  duration: "~25 min"
  completed: "2026-05-25T21:09:00Z"
  tasks_completed: 3
  files_created: 0
  files_modified: 5
---

# Phase 02 Plan 03: Difficulty Selector + Track Parameterization — Summary

## One-liner

Três botões FÁCIL/MÉDIO/DIFÍCIL no menu com seleção persistente; INICIAR passa a dificuldade escolhida para `game.start()`, que limita obstacle count e aplica speed multiplier no Track.

## What Was Built

### T1 — index.html + style.css

**index.html:** Adicionado `#difficultySelector.difficulty-selector` dentro de `#menu > .overlay-inner`, imediatamente antes do `#btnIniciar`. Três botões `<button class="difficulty-btn" data-difficulty="...">` com values `facil`, `medio`, `dificil`; MÉDIO tem `class="difficulty-btn selected"` por padrão.

**style.css:** Três regras adicionadas:
- `.difficulty-selector` — `display: flex; gap: 12px; flex-wrap: wrap; justify-content: center`
- `.difficulty-btn` — fundo transparente, borda + cor `#00ffff`, `Press Start 2P` font, `min-width: 80px; min-height: 60px`, `touch-action: none`
- `.difficulty-btn.selected` — `background: #00ffff; color: #1a0033; box-shadow: 0 0 10px #00ffff`
- `.difficulty-btn:active` — `transform: scale(0.93)` para feedback de toque

### T2 — main.js

`DIFFICULTY_CONFIG` definido como const no topo:
```js
const DIFFICULTY_CONFIG = {
  facil:   { speedMultiplier: 0.75, obstacleCount: 6  },
  medio:   { speedMultiplier: 1.0,  obstacleCount: 8  },
  dificil: { speedMultiplier: 1.4,  obstacleCount: 12 },
};
```

`let selectedDifficulty = 'medio'` inicializado após DOM refs. Listener `pointerup` em cada `.difficulty-btn` remove `.selected` de todos e adiciona ao botão tocado, atualizando `selectedDifficulty`.

INICIAR `pointerup` atualizado para `game.start(DIFFICULTY_CONFIG[selectedDifficulty])` ao invés do hardcoded `{ speedMultiplier: 1.0, obstacleCount: 8 }`.

### T3 — game/Track.js + game/Game.js

**Track.js:**
- `this._activeLimit = 8` no construtor (default Médio)
- `_buildObstaclePool()` loop alterado para `for (let i = 0; i < 12; i++)` — pool fixo em 12
- `_trySpawnObstacle()` — difficulty cap adicionado ANTES do pool-exhaustion guard:
  ```js
  const activeCount = this._obstacles.filter((o) => o.active).length;
  if (activeCount >= this._activeLimit) return;
  const obs = this._obstacles.find((o) => !o.active);
  if (!obs) return;
  ```
- `setDifficulty(obstacleCount)` método público adicionado

**Game.js:**
- `start({ speedMultiplier, obstacleCount })` agora chama `this.track.setDifficulty(obstacleCount)` antes de `this.track.reset()`

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| T1+T2+T3 | Difficulty buttons, config, Track pool parameterization | e87b4af | index.html, style.css, main.js, game/Game.js, game/Track.js |

## Deviations from Plan

Nenhuma — implementação seguiu o plano exatamente. Todos os 5 arquivos do `affects` foram modificados.

## Self-Check

- [x] Menu mostra FÁCIL / MÉDIO (destacado) / DIFÍCIL na carga da página
- [x] Tocar botão dificuldade → `.selected` alterna corretamente
- [x] `DIFFICULTY_CONFIG` mapeado para `facil/medio/dificil`
- [x] `Track._buildObstaclePool()` loop usa `12` (max difícil)
- [x] `Track.setDifficulty(n)` existe e seta `_activeLimit`
- [x] `_trySpawnObstacle()` verifica `activeCount >= _activeLimit` antes de pool-exhaustion
- [x] `game.start()` chama `track.setDifficulty(obstacleCount)` antes de `track.reset()`
- [x] `selectedDifficulty` persiste em scope de `main.js` — seleção mantida entre runs

## Self-Check: PASSED

## Threat Flags

Sem novos endpoints de rede, auth paths, ou localStorage adicional. Mudanças são DOM/CSS/JS puros.
