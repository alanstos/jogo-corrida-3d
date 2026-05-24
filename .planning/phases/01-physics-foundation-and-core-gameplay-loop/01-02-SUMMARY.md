---
phase: 01-physics-foundation-and-core-gameplay-loop
plan: 02
subsystem: gameplay
tags: [three, cannon-es, track, camera, collision, game-over, retry, pooling]

# Dependency graph
requires: [01-01]
provides:
  - Track module with SEGMENT_COUNT=12 pooled road segments recycled via z-position
  - Obstacle pool (OBSTACLE_COUNT=8) with userData.tag='obstacle' for collision filter
  - Invisible lateral CANNON walls at x=±5.5 keeping car on road
  - Neon cyan edge meshes at x=±5 as visual lane markers
  - Progressive scroll speed: 20 units/s start, ramps 1.2/s, max 80 units/s (TRACK-04)
  - Chase camera (Camera.js) with exponential smoothing — alpha = 1 - exp(-10*dt)
  - 2-state machine in Game.js (PLAYING / GAME_OVER)
  - Collision filter: only obstacle hits (userData.tag==='obstacle') trigger GAME_OVER
  - Game-Over overlay with score display and Retry button (pointerup, sub-500ms)
  - reset() sequence: hide overlay → car.reset → track.reset → score=0 → _lastTime → state=PLAYING
affects: [01-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Track uses fixed pool arrays (_segments, _obstacles) — new Mesh/Body only in constructor, never in update()"
    - "Obstacle bodies tagged body.userData = { tag: 'obstacle' } — collision filter by tag not by object reference"
    - "Camera.js: localToWorld(this._offset.clone()) — .clone() is mandatory, localToWorld mutates in place"
    - "Exponential smoothing: alpha = 1 - Math.exp(-10 * deltaTime) — frame-rate independent (ARCHITECTURE.md pattern)"
    - "State guard in _tick: render frozen frame on GAME_OVER, skip physics — RAF stays alive for final frame"
    - "Retry sequence: state flipped to PLAYING LAST so physics path is re-enabled only after all state is clean"
    - "DOMContentLoaded guard in main.js — ensures overlay DOM elements exist before Game constructor queries them"

key-files:
  created:
    - game/Track.js
    - game/Camera.js
  modified:
    - game/Car.js
    - game/Game.js
    - index.html
    - style.css
    - main.js

key-decisions:
  - "Obstacle bodies are mass=0 (static) and manually repositioned in track.update() — avoids dynamic body overhead for objects that follow the scrolling track deterministically"
  - "Lateral edge meshes are visually static (not scrolling) — acceptable for Phase 1 arcade feel; Phase 3 endless track will revisit"
  - "Collision filter uses userData.tag rather than body reference comparison — more robust when bodies are pooled and reused"
  - "Camera smoothing constant k=10 — recovers ~63% of distance each 0.1s; snappy arcade feel without snap"
  - "Score formula: track.getDistanceTraveled() * 0.5 — distance-based, no time bonus; HUD display deferred to 01-03"

patterns-established:
  - "Pool discipline: all THREE.Mesh and CANNON.Body created in constructor, recycled in update via position reset"
  - "Tag-based collision filter: body.userData.tag checked in _handleCarCollision — wall/ground hits silently ignored"
  - "Retry sequence order: overlay hide → car.reset → track.reset → score=0 → _lastTime → state flip LAST"

requirements-completed: [PHYS-03, TRACK-01, TRACK-02, TRACK-03, TRACK-04, GAME-01, GAME-02, GAME-03, GAME-04, UI-03]

# Metrics
duration: ~25min
completed: 2026-05-24
---

# Phase 1 Plan 02: Track, Camera, Collision, Game Loop Summary

**Scrolling track with pooled segments + obstacles, chase camera with exp smoothing, GAME_OVER state machine, Retry-without-reload — full play/die/retry loop implemented**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-24T18:33:00Z
- **Completed:** 2026-05-24T18:58:08Z
- **Tasks:** 3 of 4 completed (T4 = human verification checkpoint — awaiting human verify)
- **Files modified:** 7 files (2 created, 5 modified)

## Accomplishments

- Track module built with fixed pool: 12 road segments recycled via z-position subtraction — zero heap allocations during gameplay (PITFALLS #14)
- Obstacle pool: 8 cubes, mass=0 static bodies tagged `userData.tag='obstacle'` for collision filtering
- Invisible CANNON walls at x=±5.5 enforce road boundaries — car physically cannot leave the road
- Neon cyan edge meshes at x=±5 provide visual lane markers (TRACK-03)
- Progressive speed ramp: 20 → 80 units/s over ~50 seconds of play (TRACK-04)
- Chase camera with exponential smoothing (k=10) — PITFALLS #15 addressed
- 2-state machine: PLAYING → GAME_OVER on obstacle collision; Retry resets to PLAYING in one synchronous sequence
- Collision filter: only `userData.tag === 'obstacle'` triggers GAME_OVER — wall/ground collisions silently pass through
- Retry under 500ms: all state reset is synchronous DOM ops + position/velocity sets — no async work
- DOMContentLoaded guard in main.js ensures overlay DOM exists before Game constructor queries it

## Task Commits

1. **Task 1: Track module** — `edd8cca` (feat)
2. **Task 2: Chase camera** — `3f9b0f4` (feat)
3. **Task 3: Collision + GAME_OVER + Retry** — `3e36e47` (feat)
4. **Task 4: Human verification** — CHECKPOINT (blocking gate — awaiting human verify)

## Files Created/Modified

- `game/Track.js` — NEW: pooled segment/obstacle architecture, lateral walls, progressive speed
- `game/Camera.js` — NEW: exponential smoothing chase cam, localToWorld offset, onResize
- `game/Car.js` — MODIFIED: collision listener, onCollide(callback), reset() with wakeUp()
- `game/Game.js` — MODIFIED: Camera integration, Track integration, state machine, _handleCarCollision, reset()
- `index.html` — MODIFIED: Game-Over overlay DOM (#gameOver, #goScoreValue, #retryButton)
- `style.css` — MODIFIED: overlay styles, neon palette, 200x80px retry button tap target
- `main.js` — MODIFIED: DOMContentLoaded guard for safe DOM querying

## Tuning Constants (as shipped — developer may adjust)

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| SEGMENT_COUNT | 12 | Track.js | Total road visible: 240 units |
| SEGMENT_LENGTH | 20 | Track.js | Per-segment length |
| OBSTACLE_COUNT | 8 | Track.js | Max simultaneous obstacles |
| Initial scroll speed | 20 units/s | Track.update() | Comfortable starting pace |
| Speed ramp rate | 1.2 per second | Track.update() | `elapsedTime * 1.2`, max ramp = 60 |
| Max scroll speed | 80 units/s | Track.update() | 20 + 60 cap |
| Spawn interval | 1.5s / speedMultiplier | Track.update() | Gets faster with speed |
| Camera smoothing k | 10 | Camera.js | `1 - exp(-10 * dt)` |
| Score multiplier | 0.5 | Game._tick() | `distanceTraveled * 0.5` |
| Lateral wall x | ±5.5 | Track.js | Half-extents 0.5 + road half-width 5 |

## Collision Filter Notes for 01-03

- **Only `body.userData.tag === 'obstacle'` triggers GAME_OVER** — lateral walls, ground, and any unlabeled body are silently ignored in `_handleCarCollision`.
- Obstacle bodies start at y=-100 when inactive — they exist in the physics world but are below the floor, so they can't accidentally collide.
- The HUD in 01-03 will read `game.score` directly — it is a plain number updated every frame in the PLAYING path.
- If 01-03 adds more collision categories (e.g. power-ups, debris), tag their bodies with a different `userData.tag` value and add a handler branch in `_handleCarCollision`.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

## Issues Encountered

None during T1, T2, T3.

## Known Stubs

- HUD score display: `game.score` is computed each frame but not yet shown on screen — deferred to 01-03.
- Touch controls: not yet wired — deferred to 01-03.
- Lateral edge meshes do not scroll with the road segments — they are static visual anchors. This is intentional for Phase 1 arcade feel; Phase 3 endless track will handle proper scrolling edges.

## Threat Flags

None — this plan adds no network endpoints, auth paths, file access, or trust-boundary schema changes.

## Self-Check: PASSED

All created files verified present on disk.

Commit hashes verified:
- `edd8cca` — T1 Track module
- `3f9b0f4` — T2 Camera module
- `3e36e47` — T3 Collision + Game-Over + Retry

`npm run build` exits 0 with 13 modules transformed.

Acceptance criteria verified programmatically:
- Track.js: SEGMENT_COUNT=12, OBSTACLE_COUNT=8, _segments pool, reset(), getDistanceTraveled()
- Track.js: update() has no new THREE.Mesh / CANNON.Body / BoxGeometry calls
- Game.js: applyInput → track.update → physicsWorld.step → syncMesh → camera.follow → renderer.render
- Camera.js: 1 - Math.exp(-10 *), localToWorld, .clone(), follow(), onResize()
- Game.js: camera.instance used in render, camera.onResize in resize handler
- index.html: #gameOver, #goScoreValue, #retryButton present
- style.css: #retryButton min-width:200px, min-height:80px
- Car.js: body.addEventListener('collide'), onCollide(), reset() with velocity.set + wakeUp()
- Game.js: userData.tag === 'obstacle' filter, state='GAME_OVER', reset() sequence, pointerup listener
