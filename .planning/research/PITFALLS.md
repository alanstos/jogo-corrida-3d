# Domain Pitfalls — Browser 3D Racing Game (Three.js + Cannon-es + Vite)

**Researched:** 2026-05-24
**Confidence:** HIGH

> Key finding: Pitfalls 1, 2, 4, and 6 together explain the prior "carro parado" bug. Any one is sufficient to cause it; they often co-occur. All four must be addressed as a unit in Phase 1.

---

## CRITICAL — Physics (Car Not Moving)

### #1 Car Body Sleeping — Forces Applied to a Dormant Body

**Root cause of prior bug.** Cannon-es bodies enter sleep automatically when velocity drops below a threshold. Forces applied to sleeping bodies are silently ignored.

- `body.sleepState === 2` (SLEEPING) — no runtime error thrown
- Prevention: `body.allowSleep = false` on the player car. Call `body.wakeUp()` before force application as additional guard.
- Warning sign: `body.velocity` reads `{0,0,0}` every frame even with force applied
- **Phase 1 — Car constructor. Must never be removed.**

### #2 Force Applied in Wrong Coordinate Space

`body.applyForce(force, worldPoint)` takes world-space vectors. Passing local-space direction after any car rotation causes diagonal movement or spinning.

- Prevention: use `body.applyLocalForce(force, localPoint)` — handles quaternion transform internally
- Warning sign: car moves diagonally or rotates in place when forward is pressed
- **Phase 1 — Car.applyInput(). Validate with hardcoded world-space force first, then switch to local.**

### #3 world.step() Called After Rendering (or Not Called)

Mandatory call order: input → forces → `world.step()` → sync meshes → render. Any deviation freezes physics or renders stale positions.

- Prevention: enforce strict order in Game.js as a code invariant; never split across RAF and setTimeout
- Warning sign: mesh positions lag body positions (step after render) or body never moves (step omitted)
- **Phase 1 — Game.js loop. Locked in as an invariant before any gameplay testing.**

### #4 Zero-Mass or Static Car Body

`mass: 0` automatically makes a body static in Cannon-es. Forces have no effect. Same visible symptom as sleeping body.

- Prevention: `new CANNON.Body({ mass: 150 })` explicitly; log `body.mass` and `body.type` at init before wiring any input
- Warning sign: `body.mass === 0` or `body.type === 2` (STATIC) in console
- **Phase 1 — Car constructor. First thing to verify.**

### #5 Physics Timestep Delta Explosion on Tab Restore

Raw RAF delta passed unguarded to `world.step()`. Tab restore spikes delta to 500ms+, causing bodies to tunnel or NaN-corrupt the physics world.

- Prevention: `const safeDt = Math.min(delta, 1/30)`; use `world.step(1/60, safeDt, 3)`; pause loop on `document.visibilitychange` when `document.hidden`
- Warning sign: car flies off screen after switching tabs and returning; `body.position` contains NaN
- **Phase 1 — Game.js loop. Delta cap must be in place before any collision testing.**

### #6 Mesh-to-Body Position Sync Omitted

After `world.step()`, Three.js meshes do not update automatically. Without explicit sync, meshes stay at spawn position while physics runs invisibly.

- Prevention: `mesh.position.copy(body.position); mesh.quaternion.copy(body.quaternion)` after every `world.step()`. Create a `syncMesh()` method on each physics-driven object.
- Warning sign: `body.position` changes per frame in console but mesh never moves
- **Phase 1. Sync loop is mandatory infrastructure; no gameplay is testable without it.**

---

## CRITICAL — Mobile Performance

### #7 Uncontrolled Pixel Ratio

`renderer.setPixelRatio(window.devicePixelRatio)` unguarded at ratio 3.0 = 9x more fragments → 10–15 FPS on Android.

- Prevention: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
- **Phase 1 — renderer init. Non-negotiable.**

### #8 Shadow Maps Enabled

`renderer.shadowMap.enabled = true` = extra depth-render pass per light → 30–50% FPS drop on mobile.

- Prevention: `renderer.shadowMap.enabled = false` unconditionally
- **Phase 1 — renderer setup. Never enable.**

### #9 Excessive Draw Calls from Un-merged/Un-instanced Geometry

100+ distinct meshes on mobile collapses the GPU command buffer.

- Prevention: `InstancedMesh` for repeated objects; `BufferGeometryUtils.mergeGeometries()` for static tiles; segment pooling (fixed array of 12–15 segments repositioned as player passes — no `new Mesh` during gameplay)
- Warning sign: `renderer.info.render.calls` above 100; FPS degrades with track distance
- **Phases 2–3. Pool architecture decided in Phase 1 even if not built until Phase 3.**

---

## CRITICAL — Controls

### #10 Touch Events Blocked by Passive Listeners

Chrome 56+ auto-marks `touchstart`/`touchmove` as passive. `preventDefault()` silently ignored → browser scrolls instead of firing game control. Works in DevTools emulation, fails on real phones.

- Prevention: use `pointerdown`/`pointerup` (not auto-passive); `touch-action: none` on canvas and controls overlay
- **Phase 1 — controls. Pointer Events must be the baseline from commit one.**

### #11 Multi-Touch Breaking Single-Touch Assumption

Holding left + tapping turbo causes touchend to briefly read as "no input" — car straightens.

- Prevention: track input state per `pointerId` independently; never reset all state on any single pointer event; state: `{ left: bool, right: bool, turbo: bool }` updated per pointer
- **Phase 1 — controls. Design for multi-pointer from the start.**

---

## MODERATE

### #12 Memory Leaks from Unmanaged Geometry/Material Disposal

Phase transitions and retries without `geometry.dispose()` / `material.dispose()` fill VRAM progressively.

- Prevention: `disposables` array per phase; on teardown iterate `.dispose()`; `world.remove(body)` for each body; monitor `renderer.info.memory.geometries`
- **Phase 2 — phase transitions. Teardown contract must be designed into Phase class from Phase 1.**

### #13 WebGL Context Loss Not Handled on Mobile

Device lock, app background, or memory pressure revokes the WebGL context → canvas freezes permanently.

- Prevention: listen for `webglcontextlost` (show "Tap to Resume" overlay); `webglcontextrestored` → `renderer.forceContextRestore()` + re-init GPU resources; pause loop on `visibilitychange`
- **Phase 1 — renderer setup. `visibilitychange` pause from day one.**

### #14 Endless Track Naive Generation — Memory Growth

New mesh+body per segment without recycling → hundreds of physics bodies after 3–5 minutes → progressive crash.

- Prevention: segment pool (fixed array, repositioned not recreated); define recycle distance; never call `new Mesh` or `new Body` during gameplay after pool init
- **Phase 3 — Rodovia Infinita. Pool must be designed before first line of track generation.**

### #15 Chase Camera Without Damping — Motion Sickness

Camera snapped directly to `car.position + offset` each frame amplifies physics jitter → motion sickness within 30–60 seconds on mobile.

- Prevention: lerp with fixed factor (0.05–0.15): `camera.position.lerp(targetPos, 0.1)`. Use exponential smoothing, not delta-based lerp (delta-based changes feel at different framerates). `inicio.md` requires "leve lag suave" — this is a spec requirement.
- **Phase 1. Chase cam with lerp is Phase 1 infrastructure.**

---

## MINOR

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| 16 | RAF not cancelled on teardown → double loop | Store RAF handle; `cancelAnimationFrame(this.rafHandle)` on all teardown paths | Phase 1 |
| 17 | `localStorage.setItem()` throws in private browsing → crash | `safeGet(key, default)` and `safeSet(key, value)` wrappers with try/catch in Storage.js | Phase 1 |
| 18 | Cannon-es Plane faces +Z by default → car falls through ground | `groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0)`; validate with drop test before any controls | Phase 1 |

---

## Phase Summary

| Phase Topic | Pitfalls to Address |
|-------------|---------------------|
| Phase 1 — Car physics init | #1 (sleep), #4 (mass/type), #6 (sync) |
| Phase 1 — Force application | #2 (coordinate space) |
| Phase 1 — Game loop | #3 (step order), #5 (delta cap) |
| Phase 1 — Renderer setup | #7 (pixel ratio), #8 (shadows), #13 (context loss) |
| Phase 1 — Controls | #10 (passive listeners), #11 (multi-touch) |
| Phase 1 — Camera | #15 (motion sickness) |
| Phase 1 — Loop lifecycle | #16 (RAF cancel) |
| Phase 1 — Storage | #17 (localStorage crash) |
| Phase 1 — Ground | #18 (plane orientation) |
| Phase 2 — Scene transitions | #12 (memory leaks) |
| Phase 3 — Endless track | #9 (draw calls), #14 (memory growth) |
