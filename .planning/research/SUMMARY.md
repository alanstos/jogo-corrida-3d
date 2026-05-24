# Project Research Summary

**Project:** RetroRacer 3D
**Domain:** Browser 3D Racing Game (endless runner / arcade phases)
**Researched:** 2026-05-24
**Confidence:** HIGH

## Executive Summary

RetroRacer 3D is a mobile-first 3D arcade racing game built entirely in the browser with no backend. The project is a ground-up rebuild of a prior implementation that failed due to physics bugs. The stack itself (Three.js + Cannon-es + Vite) was not the cause and is confirmed as the right choice. Research confirms this genre is well-understood and patterns are stable: a single RAF game loop, box-body for car physics, procedural track segment recycling for endless play, and a DOM overlay for HUD. The key architectural constraint is mandatory loop ordering: apply forces, step physics world, sync meshes to bodies, then render. Violations of this order produce the exact car-does-not-move symptom seen in v0.

The recommended approach is to gate all gameplay work behind three validated milestones: (1) car body moves visibly on input, (2) car drives on a road surface, (3) collision ends the run. No Phase 2 or Phase 3 content should be built until Phase 1 is fully verified on a real Android device. Mobile performance is non-negotiable: antialias off, shadows off, pixel ratio capped at 2, no PBR materials, geometry budgets enforced from the first commit.

The single highest risk is re-introducing the prior physics bug. Research identified four independent causes that produce identical symptoms (car stays still): body sleeping, zero mass, wrong coordinate space for force application, and mesh sync before world step. All four must be addressed as a unit in the first implementation milestone. A secondary risk is mobile FPS degradation from draw calls during the endless track phase (Phase 3). Pooled segment architecture must be designed in Phase 1 even if not fully exercised until Phase 3.
## Key Findings

### Recommended Stack

The stack is decided and not up for negotiation in v1. Three.js handles 3D rendering via WebGL abstraction. Cannon-es handles rigid-body physics (the ES-module fork of abandoned Cannon.js, lighter than Ammo.js/Rapier with no WASM overhead). Vite provides sub-second HMR and native ES module support. No framework (React/Vue/Svelte) is used. Vanilla JS is correct for a game loop with minimal DOM surface.

**Core technologies:**
- Three.js ^0.175.0: 3D rendering and scene graph. Industry standard, ES module imports, tree-shakeable.
- Cannon-es ^0.20.0: rigid-body physics and collision. Lighter than WASM alternatives, has RaycastVehicle helper.
- Vite ^6.x: dev server and bundler. host:true for LAN/mobile testing, native Three.js imports.

**Hard renderer requirements (non-negotiable):**
- antialias: false on mobile. Prevents 50 FPS drop on Snapdragon.
- renderer.shadowMap.enabled = false unconditionally.
- renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
- MeshLambertMaterial or MeshToonMaterial only. No PBR (MeshStandardMaterial).

**Version note:** Exact version numbers carry MEDIUM confidence (npm registry was unreachable during research). Verify with npm info before pinning.

### Expected Features

**Must have (table stakes) — missing any causes immediate abandonment:**
- Car moves and steers. The critical bug in v0. Must work before anything else ships.
- Responsive touch controls. Two large fixed buttons (left/right), pointerdown/pointerup, touch-action: none.
- Collision with outcome. Hitting something ends the run.
- Infinite/long-enough track. Endless runner contract. Procedural segment recycling.
- Score counter visible during play. DOM overlay, pixel font.
- Game over state with instant retry. Reset JS state, never reload page. Under 500ms felt latency.
- 30+ FPS on mid-range Android.
- Landscape orientation enforced via CSS.

**Should have (differentiators for identity and retention):**
- Retro neon aesthetic (CRT scanline CSS overlay, Press Start 2P font, neon palette)
- Phase progression with distinct themes (Phase 1: Neon City, Phase 2: Arcade Circuit, Phase 3: Infinite Highway)
- Star rating on phase completion (1-3 stars, threshold-based)
- Turbo mechanic. Speed burst + cooldown bar.
- Haptic feedback on collision and turbo (navigator.vibrate([50]))
- Enemy AI cars (lane-based spawner, no pathfinding)
- Difficulty selector (Easy/Medium/Hard with speed, spawn rate, track width multipliers)
- localStorage highscore persistence (3 keys maximum)

**Defer to v2+:**
- Sound. Web Audio API unlock friction on mobile.
- Bloom post-processing. Kills mobile framerate. Use emissive color instead.
- Multiplayer, login, leaderboard.
- Physics-accurate suspension.
- Gyroscope/tilt steering.
- Virtual joystick.
### Architecture Approach

The game uses a single orchestrator class (Game) that owns the RAF loop and state machine. All subsystems are encapsulated in purpose-bound classes that communicate only through the game state object or explicit method parameters. No component holds a reference to another component private internals. UI screens (menu, phase end, victory) live entirely in HTML/CSS, shown and hidden by class toggling. Three.js has no involvement in UI rendering.

**Major components:**
1. Game. RAF loop, state machine (LOADING to MENU to PLAYING to PHASE_END / GAME_OVER to VICTORY), scene and renderer ownership.
2. PhysicsWorld. CANNON.World instance, gravity (-20 on Y for arcade snap), SAPBroadphase, step(delta) method.
3. Car. CANNON.Body (mass 150, allowSleep false) + THREE.Group mesh + applyInput(intent) + syncMesh().
4. Track. Procedural segment generation and recycling, obstacle and enemy physics bodies, scene add/remove.
5. Controls. Normalizes pointer/touch events to intent object { left, right, turbo }. Tracks state per pointerId.
6. Camera. Chase cam with exponential smoothing (1 - exp(-k * dt)) to avoid framerate-coupled lag.
7. HUD. Pure DOM writes, reads game state scalars. No Three.js involvement.
8. Storage. safeGet/safeSet wrappers around localStorage with try/catch.

**Mandatory loop order (violation = car stays still):**
Read input > applyInput() > physicsWorld.step() > syncMesh() > camera.follow() > hud.update() > renderer.render()

### Critical Pitfalls

Pitfalls 1-4 are direct causes of the prior carro parado bug and must all be resolved as a unit in the first build milestone.

1. **Car body sleeping (allowSleep: true default).** Forces applied to sleeping bodies are silently ignored with no error. Fix: body.allowSleep = false on the player car. Call body.wakeUp() before force application as guard. Warning sign: body.velocity reads {0,0,0} every frame even with force applied.

2. **Zero mass / static body (mass: 0).** Makes the body static in Cannon-es. Forces have no effect whatsoever. Identical symptom to sleeping body. Fix: new CANNON.Body({ mass: 150 }) explicitly. Log body.mass and body.type at init before wiring any input.

3. **Force applied in world space instead of local space.** applyForce() takes world-space vectors. After any rotation the car moves diagonally or spins. Fix: use applyLocalForce(new CANNON.Vec3(0, 0, -force), new CANNON.Vec3(0, 0, 0)) exclusively.

4. **Mesh sync before world step.** Three.js meshes do not update automatically after physics. Syncing before world.step() renders stale positions and the mesh appears frozen. Fix: always step > copy position/quaternion > render, enforced as a code invariant in Game._tick().

5. **Delta explosion on tab restore.** Raw RAF delta passed unguarded to world.step() spikes to 500ms+ after tab switch, corrupting the physics world. Fix: const safeDt = Math.min(delta, 1/30) before any physics call. Pause loop on document.visibilitychange.

**Additional Phase 1 pitfalls:**
- Ground plane not rotated. CANNON.Plane faces +Z by default. Car falls through. Fix: groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0).
- Touch passive listener blocking. Use pointerdown/pointerup + touch-action: none on canvas.
- Uncontrolled pixel ratio. Cap at 2 unconditionally.
- Memory leaks on phase transitions. Design disposables teardown contract into Phase classes from Phase 1.
- Draw call explosion in endless track. Use segment pool (fixed array repositioned, never new Mesh during gameplay after init).
## Implications for Roadmap

Research strongly suggests a 3-phase build order that mirrors the game own 3-phase structure, with each roadmap phase gated by a verifiable working demo before proceeding.

### Phase 1: Physics Foundation and Core Gameplay Loop

**Rationale:** The entire project viability depends on the car actually moving. All four car-not-moving bug causes must be resolved before any other work has value. This phase delivers a playable Phase 1 (Cidade Neon) level from menu to game-over to retry.

**Delivers:** Working car physics on a road surface, touch controls, collision with game-over, score, HUD, Phase 1 track (Neon City aesthetic), menu screen with difficulty selector, localStorage highscore, chase camera with smoothing.

**Build order within this phase (dependency-gated):**
1. PhysicsWorld + ground plane. Verify with drop test in console.
2. Car body (no mesh) + Game loop. Verify body.position.y stabilizes above 0.
3. Car mesh sync + Controls. Hard gate: car mesh must visibly move on input before proceeding.
4. Track geometry (Phase 1 segment).
5. Chase camera with lerp.
6. Collision detection + game-over.
7. HUD DOM overlay.
8. Menu screen + Storage + phase completion flow.

**Pitfalls to address:** #1 sleep, #2 coordinate space, #3 step order, #4 zero mass, #5 delta cap, #6 mesh sync, #7 pixel ratio, #8 shadows, #10 passive listeners, #11 multi-touch, #15 camera damping, #16 RAF cancel, #17 localStorage crash, #18 ground plane rotation.

**Research flag:** Standard patterns. Complete code templates in ARCHITECTURE.md. No additional research needed.

### Phase 2: Phase 2 Content, Polish, and Mobile Hardening

**Rationale:** Phase 2 (Autodromo Arcade) introduces a new track theme and potentially a lap-based win condition. Mobile hardening (WebGL context loss, memory leak audit, real-device testing) belongs here before adding more content complexity.

**Delivers:** Phase 2 track with Arcade Circuit theme, phase transition teardown/init, geometry and body disposal on retry, WebGL context loss handler, real-device FPS validation, star rating system, turbo mechanic, haptic feedback.

**Open question to resolve at start of this phase:** Is Phase 2 endless or lap-based? The spec implies circuit with laps. Lap-based requires a lap counter and finish line trigger vs. a score threshold.

**Pitfalls to address:** #12 memory leaks on transitions, #13 WebGL context loss.

**Research flag:** Lap-based win condition needs explicit resolution from inicio.md before Phase 2 planning begins.

### Phase 3: Endless Highway and Performance Optimization

**Rationale:** Phase 3 (Rodovia Infinita) is the hardest performance challenge. Infinite procedural track with enemy AI risks draw call explosion and memory growth. Segment pooling architecture must be validated at scale.

**Delivers:** Phase 3 infinite track with segment pool, enemy AI lane-based spawner, difficulty scaling at high speeds, draw call optimization (InstancedMesh for repeated obstacles), victory screen, full 3-phase game flow tested end-to-end.

**Pitfalls to address:** #9 draw calls / instanced mesh, #14 memory growth from naive generation.

**Research flag:** Segment pool and InstancedMesh patterns are well-documented. No additional research needed.

### Phase Ordering Rationale

- Physics correctness is the dependency for all other gameplay. Nothing can be tested without the car moving.
- Phase 1 content ships as a complete game loop (not a prototype) so the core experience is fully playable before expanding.
- Memory and teardown concerns are addressed in Phase 2 before Phase 3 introduces the longest sessions and most body churn.
- Segment pool architecture must be designed before Phase 3 begins, not discovered mid-implementation.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2:** Clarify lap-based vs. endless win condition from inicio.md before writing the phase plan.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Complete code templates in ARCHITECTURE.md and STACK.md. Implementation can start directly.
- **Phase 3:** Segment pooling and InstancedMesh are well-documented Three.js patterns.
## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Confirmed by prior implementation. Stack was not the bug source. |
| Features | HIGH | Genre conventions are stable. Table stakes list is well-established. |
| Architecture | HIGH | Root cause of prior bug identified. Correct patterns fully documented. |
| Pitfalls | HIGH | Four independent bug causes identified with prevention code. |
| Version numbers | MEDIUM | npm registry unreachable during research. Verify before pinning. |

**Overall confidence:** HIGH

### Gaps to Address

- **Star rating thresholds:** Specific score/time values for 1/2/3 stars require playtesting to calibrate. Leave as tunable constants from day one, not hardcoded values.
- **Phase 2 win condition:** inicio.md implies lap-based circuit but requirements spec says rolagem infinita. Needs explicit resolution before Phase 2 planning.
- **Turbo cooldown duration:** 3s vs 5s meaningfully changes skill expression. Design as a tunable constant and decide after playtesting Phase 1.
- **Enemy AI difficulty curve:** Exact dodge difficulty scaling for Phase 3 is unspecified. Iterate during Phase 3.

## Sources

### Primary (HIGH confidence)
- .planning/research/STACK.md. Renderer configuration, physics loop ordering, Cannon-es body setup.
- .planning/research/ARCHITECTURE.md. Component boundaries, state machine, build order, loop invariants.
- .planning/research/PITFALLS.md. 18 documented pitfalls with prevention code and phase attribution.
- .planning/research/FEATURES.md. Table stakes analysis, anti-feature list, mobile control patterns.
- .planning/PROJECT.md. Requirements, constraints, prior bug context.

### Secondary (MEDIUM confidence)
- Version numbers. Inferred from prior project. Verify with npm registry before pinning.

---
*Research completed: 2026-05-24*
*Ready for roadmap: yes*
