---
phase: 03-game-feel
plan: "04"
subsystem: ui
tags: [three.js, camera, game-feel, shake, collision, arcade]

requires:
  - phase: 03-03
    provides: ParticleSystem.burst() called from _handleCarCollision — startShake() added at same site

provides:
  - Camera.startShake() method with exponential decay over ~300ms
  - Additive shake offset in Camera.follow() — zero per-frame allocations
  - Game.js collision handler triggers camera shake alongside particle burst

affects:
  - 03-05 (haptic feedback wired from same collision handler — same call site pattern)
  - Any future plan touching Camera.js or _handleCarCollision

tech-stack:
  added: []
  patterns:
    - "Pre-allocated scratch Vector3 (_shakeVec) reused every frame — zero GC pressure during shake"
    - "Exponential decay: amplitude * Math.exp(-DECAY * elapsed) for smooth tail-off"
    - "Additive offset on targetPos before lerp — purely cosmetic, physics untouched"

key-files:
  created: []
  modified:
    - game/Camera.js
    - game/Game.js

key-decisions:
  - "startShake() takes no arguments — SHAKE_INTENSITY constant drives behavior (simpler API, future optional param possible)"
  - "lookAt still receives carMesh.position not targetPos — camera always aims at car center, producing shake rather than drift"
  - "No camera reset in Game.start() — shake is self-terminating via decay; amplitude reaches 0 well before player clicks RETRY"

patterns-established:
  - "Pattern: pre-allocate Vector3 in constructor for per-frame mutations — never new THREE.Vector3() inside hot path"
  - "Pattern: additive offset on localToWorld result before lerp — shake plugs between targetPos and camera.lerp without touching physics"

requirements-completed:
  - FEEL-03

duration: 15min
completed: "2026-05-27"
---

# Phase 03 Plan 04: Camera Shake on Collision Summary

**Exponentially-decaying camera shake (FEEL-03): 0.35-unit peak amplitude over ~300ms triggered from collision handler, zero per-frame Vector3 allocations via pre-allocated _shakeVec**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-27T17:24:00Z
- **Completed:** 2026-05-27T17:39:53Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- Camera.js extended with shake state (`_shakeAmplitude`, `_shakeElapsed`, `_shakeVec`) and `startShake()` method
- `follow()` applies additive random offset to `targetPos` with exponential decay — zero new THREE allocations per frame
- Game.js collision handler calls `this.camera.startShake()` immediately after `particleSystem.burst()`, grouping both visual feedback calls before `state = 'GAME_OVER'`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Camera.js with shake state and additive offset** - `7f92f46` (feat)
2. **Task 2: Trigger Camera.startShake() from collision handler in Game.js** - `0126215` (feat)

## Files Created/Modified

- `game/Camera.js` — Added SHAKE_DURATION/DECAY/INTENSITY constants, shake fields in constructor, guarded shake block in follow(), startShake() method
- `game/Game.js` — Added `this.camera.startShake()` in `_handleCarCollision` after `particleSystem.burst()`

## Decisions Made

- `startShake()` takes no arguments: SHAKE_INTENSITY constant drives behavior; simpler API, optional intensity param can be added later
- `lookAt` still receives `carMesh.position` (not the shake-offset `targetPos`) — camera always aims at car center, which produces a "shake" feel rather than a "drift" feel
- No defensive `_shakeAmplitude = 0` reset in `Game.start()` — the 300ms decay finishes before any reasonable RETRY interaction (~1-2s); adding it would be paranoid and the plan explicitly notes this

## Deviations from Plan

None — plan executed exactly as written.

The comment `// No new THREE.Vector3() here — _shakeVec is pre-allocated in constructor` in the initial draft contained the string "new THREE.Vector3()" which would have falsely tripped the awk zero-allocation gate. The comment was rephrased to avoid the false positive — this is a cosmetic wording adjustment, not a code change.

## Issues Encountered

Minor: the awk gate checking for `new THREE` inside `follow()` matched a comment that contained the string "new THREE.Vector3()". Resolved by rephrasing the comment to remove the false positive. No functional impact.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Camera shake (FEEL-03) complete and integrated
- Collision handler now has: `particleSystem.burst(impactPos)` then `camera.startShake()` — haptic (FEEL-04) should be added at the same site in Plan 03-05
- `npm run build` passes cleanly

---
*Phase: 03-game-feel*
*Completed: 2026-05-27*

## Self-Check: PASSED

- `game/Camera.js` exists and contains `startShake`, `_shakeAmplitude`, `_shakeVec`, `SHAKE_INTENSITY`, `SHAKE_DECAY`, `randomDirection`
- `game/Game.js` exists and contains `this.camera.startShake()`
- Commit `7f92f46` exists (Task 1)
- Commit `0126215` exists (Task 2)
- `npm run build` succeeded (built in 2.08s)
