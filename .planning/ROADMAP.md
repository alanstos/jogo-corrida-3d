# Roadmap: RetroRacer 3D

## Overview

RetroRacer 3D is rebuilt from zero, gated by one unbreakable constraint: the car must visibly move on input before any other work has value. Phase 1 resolves all four documented root causes of the prior physics failure and delivers a complete playable loop — car moves, track scrolls, collision ends the run, player retries without a page reload. Phase 2 adds the menu, difficulty selector, and highscore system, then hardens the experience for mobile (context loss, visibility change, real-device FPS). Phase 3 is held for v2 content expansion and is out of scope for this milestone.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Physics Foundation and Core Gameplay Loop** - Car moves on input, track scrolls, collision ends the run, retry resets state — all on mobile
- [ ] **Phase 2: UI Screens, Storage, and Mobile Hardening** - Menu with difficulty selector, highscore persistence, WebGL context loss handling, and real-device performance validation

## Phase Details

### Phase 1: Physics Foundation and Core Gameplay Loop

**Goal**: A player opens the game on a mobile browser, the car moves forward and steers on touch input, obstacles appear on the track, a collision ends the run with a game-over screen, and Retry resets the game in under 500 ms without a page reload
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PHYS-01, PHYS-02, PHYS-03, PHYS-04, CTRL-01, CTRL-02, CTRL-03, TRACK-01, TRACK-02, TRACK-03, TRACK-04, GAME-01, GAME-02, GAME-03, GAME-04, HUD-01, HUD-02, UI-03, PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):

  1. On a real Android device, touching the left or right button causes the car mesh to visibly move and steer — the car never stays still after input
  2. The track scrolls continuously with obstacles appearing at increasing speed; the car does not fall through the ground plane
  3. Hitting an obstacle transitions to a game-over screen that shows the score; tapping Retry resets all game state without a page reload and the car is moving again within 500 ms
  4. Score and speed are visible in the HUD throughout the run with a pixel font
  5. The game renders at 30+ FPS on a mid-range Android device (antialias off, shadows off, pixel ratio capped at 2, Lambert/Toon materials only)

**Plans**: TBD
**UI hint**: yes
Plans:
**Wave 1**

- [x] 01-01: PhysicsWorld + ground plane + Car body + Game RAF loop (hard gate: body.position.y stabilizes above 0, car mesh moves on input)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02: Track segment pool + obstacles + lateral limits + progressive speed + chase camera + collision/game-over

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03: HUD DOM overlay + touch controls + keyboard fallback + PERF renderer config + visibilitychange pause

### Phase 2: UI Screens, Storage, and Mobile Hardening

**Goal**: Players reach the game through a menu that lets them choose difficulty, the chosen difficulty visibly affects obstacle density and speed, and their best score persists and is shown on the menu after each session; the game survives WebGL context loss and tab-switching without crashing
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, STOR-01, STOR-02
**Success Criteria** (what must be TRUE):

  1. The menu screen loads first with an INICIAR button and a three-option difficulty selector (Facil / Medio / Dificil)
  2. Selecting Hard produces noticeably denser obstacles and higher base speed than selecting Easy in the same session
  3. After any run, the player's best score is saved; refreshing the page and returning to the menu shows the saved record
  4. Losing the WebGL context (e.g., switching apps on Android) and restoring it does not crash the game or leave a blank canvas

**Plans**: TBD
**UI hint**: yes

Plans:

- [ ] 02-01: Menu screen + difficulty selector + difficulty integration into Track/Game state
- [ ] 02-02: Storage module (safeGet/safeSet) + highscore display on menu + WebGL context loss handler + visibilitychange hardening audit

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Physics Foundation and Core Gameplay Loop | 1/3 | In Progress|  |
| 2. UI Screens, Storage, and Mobile Hardening | 0/2 | Not started | - |
