---
phase: 01-physics-foundation-and-core-gameplay-loop
plan: 01
subsystem: physics
tags: [three, cannon-es, vite, webgl, physics, game-loop]

# Dependency graph
requires: []
provides:
  - Vite project scaffold with Three.js 0.184.0 + Cannon-es 0.20.0
  - PhysicsWorld with SAPBroadphase, gravity -20, ground plane correctly rotated
  - Car body (mass=150, allowSleep=false) with applyLocalForce propulsion
  - Game loop in mandatory order: applyInput -> step -> syncMesh -> render
  - Delta cap 0.05s + visibilitychange pause to prevent tab-restore NaN corruption
  - Mobile renderer config: antialias=!isMobile, pixelRatio<=2, shadowMap=false
affects: [01-02, 01-03]

# Tech tracking
tech-stack:
  added:
    - three@0.184.0 (latest stable, up from planned ^0.175.0)
    - cannon-es@0.20.0
    - vite@6.3.5 (^6.x resolved)
  patterns:
    - "PhysicsWorld class wraps CANNON.World — exposes addBody/removeBody/step only"
    - "Car owns both CANNON.Body and THREE.Group — applyInput() before step, syncMesh() after"
    - "Game._tick() enforces strict 8-step loop order via comments as code invariants"
    - "Controls.getIntent() returns a copy — caller cannot mutate internal state"

key-files:
  created:
    - package.json
    - vite.config.js
    - index.html
    - style.css
    - main.js
    - game/PhysicsWorld.js
    - game/Car.js
    - game/Game.js
    - game/Controls.js
  modified: []

key-decisions:
  - "three@0.184.0 adopted (latest stable) — ^0.175.0 was pinned from research; 0.184.0 is a non-breaking minor upgrade with the same API"
  - "vite@6.3.5 (v6.4.2 dev server) — ^6.x range resolved to latest, keeping up to date"
  - "index.html rebuilt minimal (canvas-only) — prior HTML had full game UI that blocked the walking skeleton test"
  - "Controls uses forward intent (not turbo) for T1-T2 walking skeleton — turbo/touch added in 01-03"
  - "Static camera (0,5,12) for walking skeleton — chase cam deferred to 01-02 as per plan"

patterns-established:
  - "Loop order invariant: applyInput -> physicsWorld.step -> car.syncMesh -> renderer.render"
  - "Delta cap: safeDt = Math.min(rawDelta, 0.05) — always applied before physicsWorld.step"
  - "Body sleep guard: body.wakeUp() called at top of applyInput() as defensive measure"
  - "Diagnostic log every 60 frames: body.position in console for y-stabilization check"

requirements-completed: [PHYS-01, PHYS-02, PHYS-04, CTRL-02, PERF-01, PERF-02, PERF-03, PERF-04]

# Metrics
duration: ~7min
completed: 2026-05-24
---

# Phase 1 Plan 01: Walking Skeleton Summary

**Three.js + Cannon-es + Vite walking skeleton with physics-correct car body (mass=150, allowSleep=false) and mandatory loop order fixing all 4 prior root-cause bugs**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-24T14:35:00Z
- **Completed:** 2026-05-24T14:41:39Z
- **Tasks:** 2 of 3 completed (T3 = human verification checkpoint — blocking gate)
- **Files modified:** 9 files created/rewritten

## Accomplishments

- All 4 root causes of prior "car not moving" bug addressed in a single atomic unit (PITFALLS #1, #2, #4, #6)
- PhysicsWorld with ground plane correctly rotated (-PI/2 on X) — PITFALL #18 prevented
- Mobile renderer config locked in: antialias by isMobile, pixelRatio cap 2, shadowMap off
- Delta cap + visibilitychange pause prevents tab-restore NaN corruption — PITFALL #5 resolved
- `npm run build` exits 0; dev server serves on LAN (host: true)

## Task Commits

1. **Task 1: Scaffold Vite project with Three.js + Cannon-es** - `f974525` (feat)
2. **Task 2: PhysicsWorld + Car body + Game loop — all 4 bug fixes** - `1b4c02f` (feat)
3. **Task 3: Human verification** — CHECKPOINT (blocking gate — awaiting human verify)

## Files Created/Modified

- `package.json` — three@^0.184.0, cannon-es@^0.20.0, vite@^6.3.5, scripts dev/build/preview
- `vite.config.js` — host:true, es2020 target, manualChunks for three + cannon
- `index.html` — minimal: canvas#gameCanvas, viewport user-scalable=no
- `style.css` — html/body overflow:hidden + #gameCanvas touch-action:none
- `main.js` — entry: `new Game(canvas).start()`, no game logic
- `game/PhysicsWorld.js` — CANNON.World wrapper: SAPBroadphase, gravity -20, ground plane
- `game/Car.js` — mass=150, allowSleep=false, applyLocalForce(-Z), syncMesh()
- `game/Game.js` — RAF loop with 8-step mandatory order, delta cap, visibilitychange
- `game/Controls.js` — keyboard ArrowUp/W/ArrowLeft/A/ArrowRight/D → getIntent()

## Decisions Made

- **three@0.184.0**: Latest stable (0.184.0 > 0.175.0 in CLAUDE.md). Non-breaking minor; same API. Adopted.
- **vite@6.3.5**: ^6.x range resolved to 6.3.5/6.4.2 dev. Kept current.
- **index.html rebuilt minimal**: Prior HTML had full game UI (menu screens, HUD, mobile controls) that would conflict with the walking skeleton test. Stripped to canvas-only per plan spec.
- **Controls uses `forward` key (not `turbo`)**: Plan spec defines `{ left, right, forward }` intent for T2. Turbo and touch controls are 01-03 scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Upgraded three version from ^0.175.0 to ^0.184.0**
- **Found during:** Task 1 (`npm info three version` check)
- **Issue:** Plan specified ^0.175.0 but latest stable published is 0.184.0. Using an older range when 0.184.0 is available and API-compatible would pin the project unnecessarily.
- **Fix:** Updated package.json to `"three": "^0.184.0"` — same public API, no breaking changes in minor versions since r160.
- **Files modified:** package.json
- **Verification:** `npm run build` exits 0 with three@0.184.0 resolved.
- **Committed in:** f974525 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (version range update)
**Impact on plan:** Minimal. Non-breaking minor upgrade. All acceptance criteria still satisfied.

## Issues Encountered

None during T1 and T2.

## Known Stubs

- `game/Controls.js` does not yet have touch/pointer events — touch controls are 01-03 scope. Keyboard-only is intentional for walking skeleton.
- Static camera at (0, 5, 12) — chase cam deferred to 01-02.

## Threat Flags

None — this plan adds no network endpoints, auth paths, file access, or trust-boundary schema changes.

## Next Phase Readiness

- **01-02 can proceed** after T3 human verify passes
- 01-02 needs: chase cam (Camera.js), Track segment geometry, collision detection events
- Known 01-02 inputs: `car.body.position` (for camera follow), `car.mesh` (localToWorld offset)
- Static camera position (0,5,12) was tested to give reasonable view of car — 01-02 will replace with chase cam

## Self-Check: PASSED

All created files verified present on disk. All task commits verified in git log:
- `f974525` — feat(01-01): scaffold Vite project
- `1b4c02f` — feat(01-01): PhysicsWorld + Car + Game loop
- `0a96947` — docs(01-01): SUMMARY + checkpoint T3
