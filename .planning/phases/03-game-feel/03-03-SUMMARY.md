---
phase: 03-game-feel
plan: "03"
subsystem: visual-feedback
tags: [particles, instanced-mesh, collision-feedback, object-pool, zero-allocation, arcade-feel]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [particle-system, collision-burst-vfx]
  affects: [game/ParticleSystem.js, game/Game.js]
tech_stack:
  added: []
  patterns:
    - InstancedMesh pool with scale-to-zero visibility trick for zero-draw-call particles
    - Pre-allocated scratch Vector3/Quaternion objects to eliminate per-frame allocation in update()
    - Contact object extraction pattern — copy Cannon-es event.contact.ri values immediately (pooled/reused)
    - anyChanged flag to skip instanceMatrix.needsUpdate on frames with no active particles
key_files:
  created:
    - game/ParticleSystem.js
  modified:
    - game/Game.js
decisions:
  - "MeshBasicMaterial (not Lambert) chosen for particles — zero lighting cost, no PBR (CLAUDE.md constraint)"
  - "BURST_COUNT=8 leaves headroom for overlapping bursts within MAX_PARTICLES=20 hard ceiling"
  - "Defensive ri?.x ?? 0 guard in _handleCarCollision for forward compatibility with cannon-es API changes"
  - "anyChanged flag avoids GPU upload on the ~99% of frames when no particles are active"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-27"
  tasks_completed: 2
  files_modified: 2
---

# Phase 3 Plan 03: Collision Burst Particles Summary

InstancedMesh-backed pool of 20 orange particles (MeshBasicMaterial, zero per-frame allocation) with burst on collision, decay over 0.6s, and reset on retry — single draw call, zero PBR cost.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create game/ParticleSystem.js with InstancedMesh pool | 76994f2 | game/ParticleSystem.js |
| 2 | Wire ParticleSystem into Game.js (construct, burst, update, reset) | 3eaa401 | game/Game.js |

## Changes Made

### game/ParticleSystem.js (NEW)

- Module-level constants: `MAX_PARTICLES=20`, `BURST_COUNT=8`, `PARTICLE_LIFETIME=0.6`, `PARTICLE_SPEED=8`, `PARTICLE_COLOR=0xff8800`
- Constructor: pre-allocates `_dummy`, `_zeroScale`, `_tmpPos`, `_tmpQuat`, `_tmpScale`; creates one `BoxGeometry(0.15,0.15,0.15)` + one `MeshBasicMaterial`; builds `InstancedMesh(geo, mat, 20)` with `frustumCulled=false`; initializes `_particles[]` array with 20 entries each containing a pre-allocated `velocity: new THREE.Vector3()`; hides all instances with `_zeroScale`; calls `instanceMatrix.needsUpdate=true`; adds mesh to scene
- `burst(position)`: iterates pool, activates up to `BURST_COUNT` inactive slots; calls `p.velocity.randomDirection().multiplyScalar(PARTICLE_SPEED)` (in-place, no allocation); positions `_dummy` at impact point; writes matrix per slot; sets `instanceMatrix.needsUpdate=true` once after loop
- `update(deltaTime)`: for each active particle, decrements lifetime; on expiry writes `_zeroScale`; otherwise decomposes current matrix into `_tmpPos/_tmpQuat/_tmpScale`, advances position with `addScaledVector`, applies soft gravity (`p.velocity.y -= 9.8 * dt * 0.3`), shrinks scale by `lifetime/PARTICLE_LIFETIME`; recomposes and writes; sets `instanceMatrix.needsUpdate=true` only if `anyChanged`
- `reset()`: deactivates all 20 slots, zeroes velocity, writes `_zeroScale` for each, sets `instanceMatrix.needsUpdate=true`

### game/Game.js

- Added `import ParticleSystem from './ParticleSystem.js'` after HUD import
- Constructor: added `this.particleSystem = new ParticleSystem(this.scene)` between HUD construction and `car.onCollide(...)` binding (order guarantees particleSystem exists before first collision)
- `_handleCarCollision`: added contact position extraction (`const ri = event.contact?.ri`) with `?.` defensive guard; constructed `impactPos` as `new THREE.Vector3(body.pos + ri.x/y/z)` immediately (before state change); called `this.particleSystem.burst(impactPos)`
- `_tick` Step 9.5: added `this.particleSystem.update(safeDt)` between `this.car.syncMesh()` and score calculation
- `start()`: added `this.particleSystem.reset()` after turbo state resets

## Verification Results

```
test -f game/ParticleSystem.js                              → PASS
grep -q "InstancedMesh" game/ParticleSystem.js              → PASS
grep -q "MeshBasicMaterial" game/ParticleSystem.js          → PASS
grep -q "MAX_PARTICLES = 20" game/ParticleSystem.js         → PASS
grep -q "instanceMatrix.needsUpdate" game/ParticleSystem.js → PASS
grep -q "frustumCulled = false" game/ParticleSystem.js      → PASS
new THREE in burst() body                                   → 0 (PASS)
new THREE in update() body                                  → 0 (PASS)
grep -q "import ParticleSystem" game/Game.js                → PASS
grep -q "this.particleSystem = new ParticleSystem"          → PASS
grep -q "particleSystem.burst(" game/Game.js                → PASS
grep -q "particleSystem.update(safeDt)" game/Game.js        → PASS
grep -q "particleSystem.reset()" game/Game.js               → PASS
grep -q "event.contact" game/Game.js                        → PASS
burst before GAME_OVER in handler (L162 < L164)             → PASS
npm run build                                               → built in 2.29s (PASS)
```

## Deviations from Plan

None — plan executed exactly as written. The `_tmpPos/_tmpQuat/_tmpScale` scratch objects were used in `update()` exactly as specified. The `?.` defensive guard on `event.contact.ri` was applied as a one-line `const ri = event.contact?.ri` with `?? 0` fallback per spec.

## Known Stubs

None. ParticleSystem is fully wired: burst fires on every obstacle collision, update runs every tick, reset runs on every start(). No placeholders or hardcoded empty values.

## Threat Flags

None — changes are visual feedback only (Three.js InstancedMesh rendering + game-loop mutation). No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- game/ParticleSystem.js created and committed: 76994f2
- game/Game.js modified and committed: 3eaa401
- Zero `new THREE.*` in burst() or update() confirmed
- `npm run build` succeeded with 16 modules (15 prior + ParticleSystem.js)
- All 5 Game.js wiring points present: import, construct, burst, update, reset
