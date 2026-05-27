---
phase: 03-game-feel
plan: "02"
subsystem: game-mechanics
tags: [turbo, boost, state-machine, hud, controls, touch-input, css-animation]
dependency_graph:
  requires: [03-01]
  provides: [turbo-mechanic, turbo-hud-feedback]
  affects: [index.html, style.css, game/Controls.js, game/Game.js, game/Car.js, game/HUD.js]
tech_stack:
  added: []
  patterns:
    - Turbo state machine (idle/boosting/cooling) with timer-based transitions
    - CSS custom property --cooldown-ratio for data-driven visual fill
    - DOM dirty-check pattern extended to turboState
key_files:
  created: []
  modified:
    - index.html
    - style.css
    - game/Controls.js
    - game/Game.js
    - game/Car.js
    - game/HUD.js
decisions:
  - "TURBO_DURATION=2.0 and TURBO_COOLDOWN=5.0 defined as module-level constants in Game.js for single-location configurability"
  - "cooldown-ratio setProperty lifted out of dirty-check into per-frame guard (state==='cooling') so bar drains continuously without numeric tolerance logic"
  - "_triggerHaptic hook left empty in Plan 03-02 as specified — Plan 03-05 (Wave 3) wires haptic into this state transition"
metrics:
  duration: "~3 minutes"
  completed: "2026-05-27"
  tasks_completed: 4
  files_modified: 6
---

# Phase 3 Plan 02: Turbo Boost Mechanic Summary

TURBO boost mechanic (FEEL-01) with 2-second speed boost (2.5x force multiplier), 5-second cooldown, touch button + keyboard (T/Space), and CSS state classes (boosting/cooling) with a --cooldown-ratio fill bar.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add #btnTurbo to HUD (HTML + CSS) | f66c0d2 | index.html, style.css |
| 2 | Extend Controls.js to surface turbo intent | 0c9d07d | game/Controls.js |
| 3 | Add turbo state machine in Game.js + Car.js force multiplier | e0e6b23 | game/Game.js, game/Car.js |
| 4 | Wire HUD turbo button visual feedback | cdb3c9b | game/HUD.js, game/Game.js |

## Changes Made

### index.html
- Added `<button id="btnTurbo" class="touch-btn touch-btn-turbo" type="button" aria-label="Turbo boost">TURBO</button>` between #btnLeft and #btnRight inside #touchControls

### style.css
- Added `.touch-btn-turbo` base override (width: 20vw, smaller than steering buttons, position:relative, overflow:hidden)
- Added `.touch-btn-turbo.boosting` (orange glow: rgba(255,150,0,0.5))
- Added `.touch-btn-turbo.cooling` (opacity:0.5, cursor:not-allowed)
- Added `.touch-btn-turbo.cooling::after` with `height: calc(var(--cooldown-ratio, 0) * 100%)` cooldown fill

### game/Controls.js
- Extended `_keyState` init and `destroy()` reset to include `turbo: false`
- Added keydown/keyup bindings for T/t/Space → `_keyState.turbo`
- Added `#btnTurbo` lookup and `_bindButton(turbo, 'turbo')` in `_bindTouch()`
- Added `touchTurbo` lookup and `turbo: this._keyState.turbo || touchTurbo` in `getIntent()` return

### game/Game.js
- Added module-level constants `TURBO_DURATION = 2.0` and `TURBO_COOLDOWN = 5.0`
- Added `this._turboState = 'idle'` and `this._turboTimer = 0` in constructor
- Added resets for both fields in `start()` after `this.score = 0`
- Inserted Step 5.5 state machine in `_tick`: idle→boosting (on intent.turbo+PLAYING), boosting→cooling (timer), cooling→idle (timer)
- Replaced `applyInput(intent)` with `applyInput(intent, turboActive)`
- Extended `hud.update()` call with `turboState` and `turboCooldownRatio` fields

### game/Car.js
- Changed `applyInput(intent)` signature to `applyInput(intent, turboActive = false)`
- Added `const forceMultiplier = turboActive ? 2.5 : 1.0`
- Applied multiplier: `-(baseForce + boost) * forceMultiplier` in Z-axis Vec3

### game/HUD.js
- Added `this._turboBtnEl = document.getElementById('btnTurbo')` in constructor
- Added `this._lastTurboState = ''` sentinel in constructor
- Added dirty-check block: on state change, `classList.remove('boosting','cooling')` + conditional `classList.add(state.turboState)` if not idle
- Added per-frame `style.setProperty('--cooldown-ratio', ...)` gated by `state.turboState === 'cooling'`

## Verification Results

```
grep -c "btnTurbo" index.html        → 1 (PASS)
grep -c "touch-btn-turbo" style.css  → 4 (PASS: base, boosting, cooling, ::after)
grep -c "turbo" game/Controls.js     → 8 (PASS)
grep -q "_turboState" game/Game.js   → PASS
grep -q "TURBO_DURATION" game/Game.js → PASS
grep -q "applyInput(intent, turboActive = false)" game/Car.js → PASS
grep -c "console.log" game/Game.js   → 0 (no regression)
npm run build                        → built in 2.10s (PASS)
```

## Deviations from Plan

None — plan executed exactly as written. All code patterns matched the PATTERNS.md spec. Build passed without adjustments.

## Known Stubs

None. All turbo state transitions are fully wired: Controls → Game state machine → Car force multiplier → HUD visual feedback.

## Threat Flags

None — changes are game-loop mechanics and DOM class updates only; no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- index.html modified and committed: f66c0d2
- style.css modified and committed: f66c0d2
- game/Controls.js modified and committed: 0c9d07d
- game/Game.js modified and committed: e0e6b23, cdb3c9b
- game/Car.js modified and committed: e0e6b23
- game/HUD.js modified and committed: cdb3c9b
- Zero `console.log` in game/ confirmed (no regression on 03-01)
- `npm run build` succeeded cleanly
