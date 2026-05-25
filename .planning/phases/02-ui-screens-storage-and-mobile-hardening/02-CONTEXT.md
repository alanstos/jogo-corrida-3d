# Phase 2: UI Screens, Storage, and Mobile Hardening - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Players reach the game through a menu screen, choose a difficulty level that visibly affects gameplay, and their best score persists across sessions shown on the menu. The game does not crash or go blank when WebGL context is lost on Android.

**In scope:** Menu screen (logo, INICIAR button, difficulty selector, highscore display), difficulty config affecting speed + obstacle density, localStorage save/load with safeGet/safeSet, WebGL context loss handler.

**Out of scope (deferred to v2):** Melhor tempo tracking, fases completadas counter, "Resetar recordes" button, stars on game over, PRÓXIMA FASE button, turbo, enemy cars, phase backgrounds.

</domain>

<decisions>
## Implementation Decisions

### Menu Integration

- **D-01:** Game constructor runs immediately on page load (canvas renders dark purple `#1a0033` behind the menu overlay). RAF starts only when INICIAR is pressed — `game.start(difficulty)`.
- **D-02:** Menu is a DOM overlay using the established `.overlay.hidden` pattern already in `index.html` / `style.css`. No external state manager — a `MENU` state is added to `Game.state`.
- **D-03:** Canvas shows the dark purple scene background while menu is visible. No attract-mode car or animation needed.

### After-Game-Over Flow

- **D-04:** After game over, both buttons (RETRY and MENU) return to the menu screen — no direct gameplay restart. The action: (1) hides game-over overlay, (2) resets game state, (3) shows menu overlay. Player can change difficulty before replaying.
- **D-05:** Game-over overlay shows current run score. If score exceeds saved highscore, show a "NOVO RECORDE!" badge before saving.

### First-Run Highscore Display

- **D-06:** If no localStorage record exists, the `RECORD:` line is hidden on the menu. Once a record exists after the first run, it appears.

### Difficulty (Claude's Discretion)

- **D-07:** Three difficulty levels with these values:
  - Fácil: `speedMultiplier = 0.75`, `obstacleCount = 6`
  - Médio: `speedMultiplier = 1.0`, `obstacleCount = 8` (current defaults)
  - Difícil: `speedMultiplier = 1.4`, `obstacleCount = 12`
- Difficulty is passed to `game.start({ speedMultiplier, obstacleCount })`. `Track.js` already has the `speedMultiplier` hook in `update()` and `1.5 / speedMultiplier` spawn interval. `OBSTACLE_COUNT` (currently hardcoded at `8`) must become a constructor parameter.
- Default difficulty when page first loads: Médio.

### Context Loss (Claude's Discretion)

- **D-08:** On `webglcontextlost` event: call `event.preventDefault()` (keeps context alive in Chrome/Android), show a DOM overlay ("TOQUE PARA RECARREGAR"). On `webglcontextrestored`: attempt renderer re-init and hide the overlay. If re-init fails, the tap-to-reload overlay stays. This satisfies the ROADMAP requirement ("does not crash or leave a blank canvas") without full auto-recovery complexity.

### localStorage Schema

- **D-09:** Store only what Phase 2 requires: `{ "melhorPontuacao": number }`. Helpers: `safeGet(key, defaultValue)` and `safeSet(key, value)` with try/catch around `JSON.parse` / `localStorage.setItem`. Key name `melhorPontuacao` matches inicio.md schema. Tempo and fasesCompletadas are deferred.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Spec
- `inicio.md` — Canonical design reference for visual style, screen structure, controls, and localStorage schema. Note: sections on melhor tempo, fases completadas, resetar recordes, and stars/PRÓXIMA FASE are deferred to v2. Only `melhorPontuacao` is in Phase 2 scope.

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: UI-01, UI-02, STOR-01, STOR-02. Also PERF-04 (visibilitychange) — already implemented in Phase 1, verify it stays intact.

### Phase 2 Goal
- `.planning/ROADMAP.md` §Phase 2 — Four success criteria (menu loads first, difficulty affects gameplay, best score persists, context loss doesn't crash).

### Phase 1 Summaries (direct dependency)
- `.planning/phases/01-physics-foundation-and-core-gameplay-loop/01-03-SUMMARY.md` — HUD DOM overlay pattern (change-detection, `.hidden` class toggle)
- `.planning/phases/01-physics-foundation-and-core-gameplay-loop/01-01-SUMMARY.md` — Game loop mandatory order, physics setup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `game/HUD.js` — Change-detection pattern (`_lastScore`, `_lastSpeed`) for zero-thrash DOM updates at 60fps. Apply same pattern to menu RECORD display.
- `index.html` `#gameOver.overlay.hidden` — Established DOM overlay pattern. Menu overlay and context-loss overlay must follow the same structure (`<div id="…" class="overlay hidden">`).
- `style.css` — `.overlay`, `.overlay-inner`, `.hidden` classes already styled. Menu overlay extends these.

### Established Patterns

- **State machine:** `Game.state` string enum (`PLAYING` / `GAME_OVER`). Add `MENU` as a third state. State guard in `_tick()` must handle `MENU` (render scene but skip physics/input).
- **Button events:** `pointerup` not `click` (avoids 300ms mobile delay on Android). Apply to INICIAR and difficulty selector buttons.
- **Mobile detection:** `const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768` — available in `Game` constructor.
- **visibilitychange:** Already implemented in `Game.js`. No changes needed.

### Integration Points

- `main.js` — Currently calls `game.start()` immediately. Change to: create `Game`, wire INICIAR button to call `game.start(difficulty)`, leave menu visible until INICIAR pressed.
- `game/Game.js` `reset()` — Extend to also show menu overlay and hide game-over overlay (the "back to menu" path).
- `game/Track.js` constructor — `OBSTACLE_COUNT = 8` constant must become a constructor parameter for difficulty support.
- `canvas` element — Register `webglcontextlost` and `webglcontextrestored` listeners in `Game` constructor after renderer creation.

</code_context>

<specifics>
## Specific Ideas

- Menu button text: "INICIAR" (per inicio.md and ROADMAP — not "PLAY" or "START")
- Difficulty labels: "FÁCIL" / "MÉDIO" / "DIFÍCIL" (with accents, per inicio.md)
- Selected difficulty should have a visual highlight (CSS active class or border)
- Default selected difficulty on load: Médio
- localStorage key: `melhorPontuacao` (matches inicio.md schema)
- Game-over "NOVO RECORDE!" badge when current score beats saved best
- Context-loss overlay copy in Portuguese (e.g. "TOQUE PARA RECARREGAR")
- All new buttons use `pointerup` event, `touch-action: none` on container

</specifics>

<deferred>
## Deferred Ideas

- Melhor tempo (best lap time) field — v2, inicio.md has `melhorTempo` key
- Fases completadas counter — v2
- "Resetar recordes" button on menu — v2
- Stars on game over (1–3 based on score threshold) — v2, PROG-03
- "PRÓXIMA FASE" button on game over — v2
- Logo glitch CSS animation — v2, POLISH-03
- Enemy cars AI — v2, PROG-04
- Turbo / boost button — v2, FEEL-01

</deferred>

---

*Phase: 2-ui-screens-storage-and-mobile-hardening*
*Context gathered: 2026-05-25*
