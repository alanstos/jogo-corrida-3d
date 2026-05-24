---
phase: "01"
plan: "03"
subsystem: "hud-touch-controls"
tags: ["hud", "touch", "mobile", "ui", "auto-advance"]
dependency_graph:
  requires: ["01-02"]
  provides: ["hud-overlay", "touch-controls", "auto-advance"]
  affects: ["Game.js", "Car.js", "Controls.js", "Track.js", "HUD.js", "index.html", "style.css"]
tech_stack:
  added: ["Press Start 2P (Google Fonts)", "Pointer Events API (multi-touch)"]
  patterns: ["change-detection DOM updates", "per-pointerId pointer capture", "CSS media query for desktop hide"]
key_files:
  created: ["game/HUD.js"]
  modified: ["game/Game.js", "game/Car.js", "game/Controls.js", "game/Track.js", "index.html", "style.css"]
decisions:
  - "Auto-advance baseForce=2500 always applied; forward key adds +800 boost — prevents need for dedicated forward button on mobile"
  - "HUD uses change-detection (_lastScore, _lastSpeed) to avoid unnecessary DOM writes every frame"
  - "Pointer Events API with setPointerCapture chosen over Touch Events — handles multi-touch correctly and works on both mobile and desktop"
  - "touch-controls hidden on desktop via media query (hover:hover and pointer:fine) — no JS needed"
metrics:
  duration: "~33 minutes"
  completed: "2026-05-24"
  tasks_completed: 2
  files_changed: 7
---

# Phase 01 Plan 03: HUD + Touch Controls Summary

**One-liner:** Pixel-font HUD overlay (SCORE/SPEED) and multi-touch buttons with auto-advance via Pointer Events API.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| T1 | HUD overlay with Press Start 2P | 745896f | game/HUD.js, game/Game.js, game/Track.js, index.html, style.css |
| T2 | Touch controls multi-touch + auto-advance | 28e08d1 | game/Car.js, game/Controls.js, index.html, style.css |
| T3 | Human verification checkpoint | — | awaiting |

## Decisions Made

1. **Auto-advance baseForce=2500 always applied** — The car moves forward at all times. The `forward` keyboard/button adds a +800 boost. This eliminates the need for a dedicated forward button on mobile, matching the PHYS-01 requirement.

2. **HUD change-detection** — `_lastScore` and `_lastSpeed` guards prevent textContent writes on every frame (60fps). DOM mutations only occur when values change.

3. **Pointer Events API over Touch Events** — `pointerdown/pointerup/pointercancel/pointerleave` with `setPointerCapture` gives correct multi-touch semantics (each finger tracked by `pointerId`) and also works on desktop mouse. The old `touchstart/touchend` approach had double-fire on some browsers.

4. **CSS media query to hide touch buttons on desktop** — `@media (hover: hover) and (pointer: fine)` hides `.touch-controls` on true pointer devices without any JavaScript detection logic.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — HUD reads live data from `game.score` and `track.getSpeed()` every frame.

## Threat Flags

No new network endpoints, auth paths, or trust boundary changes introduced. All DOM elements are local browser-only UI.

## Self-Check

**Files created:**
- game/HUD.js: exists ✓

**Files modified:**
- game/Game.js: imports HUD, calls hud.update ✓
- game/Car.js: baseForce auto-advance ✓
- game/Controls.js: _activePointers Map, setPointerCapture ✓
- game/Track.js: getSpeed() ✓
- index.html: hudScore, hudSpeed, btnLeft, btnRight ✓
- style.css: Press Start 2P, pointer-events:none, .touch-btn.pressed ✓

**Commits:**
- 745896f: feat(01-03): T1 — HUD overlay ✓
- 28e08d1: feat(01-03): T2 — touch controls ✓

## Self-Check: PASSED
