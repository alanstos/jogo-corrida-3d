# Architecture Patterns — RetroRacer 3D

**Researched:** 2026-05-24
**Confidence:** HIGH

## Component Map

```
main.js
  └── Game (orchestrator + game loop, state machine)
        ├── PhysicsWorld     (CANNON.World, owns all physics bodies)
        ├── Car              (player body + mesh + input consumer)
        ├── Track            (geometry generator, obstacle/enemy bodies)
        ├── Camera           (chase cam, reads Car mesh position)
        ├── HUD              (DOM overlay, reads game state scalars)
        ├── Controls         (input normalizer, writes intent object)
        └── Storage          (localStorage helper, isolated from loop)

UI Layer (HTML/CSS — outside Three.js scene)
  ├── MenuScreen
  ├── PhaseEndScreen
  └── VictoryScreen
```

State machine lives in `Game`. All UI screens shown/hidden via CSS class toggling — no Three.js involvement.

## Component Boundaries

| Component | Owns | Reads | Writes |
|-----------|------|-------|--------|
| `Game` | RAF loop, state machine, `THREE.Scene`, `THREE.WebGLRenderer`, `THREE.Clock` | delta time | game state; orchestrates all `update()` calls |
| `PhysicsWorld` | `CANNON.World` instance, broadphase, gravity | nothing | provides `step(delta)` called by Game |
| `Car` | `CANNON.Body` (chassis), `THREE.Group` (mesh), turbo flag | Controls intent `{ left, right, turbo }`, delta | body forces/torque; mesh sync via `syncMesh()` |
| `Track` | road segment meshes, obstacle/enemy `CANNON.Body` list | game state (phase, scroll speed) | Three.js scene (add/remove), physics world (add/remove bodies) |
| `Camera` | `THREE.PerspectiveCamera` | Car mesh world position | camera `.position` and `.lookAt` each frame |
| `Controls` | raw pointer/touch state booleans | DOM touch/pointer events | intent object `{ left, right, turbo }` |
| `HUD` | DOM element references | game state scalars (speed, score, lap) | DOM `textContent` |
| `Storage` | nothing — stateless | localStorage | localStorage |

**Rule:** No component holds a reference to another component's private internals. All cross-component data flows through game state or explicit method parameters passed by `Game`.

## Data Flow

### Input → Physics (every frame)
```
DOM touch/pointer events
  → Controls.update()         [normalizes to intent: { left, right, turbo }]
  → Car.applyInput(intent)    [translates intent to CANNON.Body forces/torque]
  → PhysicsWorld.step(delta)  [integrates all forces, resolves collisions]
```

### Physics → Render (every frame, after world.step)
```
CANNON.Body.position    →  THREE.Mesh.position.copy(body.position)
CANNON.Body.quaternion  →  THREE.Mesh.quaternion.copy(body.quaternion)
                        →  renderer.render(scene, camera)
```

Mesh copy MUST happen after `world.step()` and before `renderer.render()`.

### Physics → HUD (every frame)
```
Game.state.score / speed / lap
  → HUD.update(state)     [DOM writes — no Three.js involvement]
```

## Correct Physics Integration (root cause of prior bug)

### 1. World Setup

```javascript
// PhysicsWorld.js
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -20, 0), // 2x real-world — arcade snap
});
world.broadphase = new CANNON.SAPBroadphase(world); // O(n log n)
world.allowSleep = true; // global sleep OK — overridden per-body for the car
```

```javascript
step(deltaTime) {
  const fixedStep = 1 / 60;
  const maxSubSteps = 3;
  // Second arg is actual elapsed time — Cannon-es computes substep count internally
  // COMMON BUG: passing fixedStep as both args → simulation never catches up
  this.world.step(fixedStep, deltaTime, maxSubSteps);
}
```

### 2. Car Body — The Three Fatal Mistakes

```javascript
// Car.js
this.body = new CANNON.Body({
  mass: 150,           // MUST be > 0; mass 0 = static body that never moves
  shape: new CANNON.Box(new CANNON.Vec3(0.9, 0.4, 2.0)),
  linearDamping: 0.3,
  angularDamping: 0.9, // prevents endless spinning on collision
  allowSleep: false,   // MUST be false — sleeping bodies ignore applyLocalForce
});
```

Two bugs that guarantee car never moves (produce identical visible symptom):
1. `mass: 0` — body is static; forces have no effect whatsoever
2. `allowSleep: true` (default) — if velocity near zero at spawn, body sleeps and ignores all forces

### 3. Force Application — Local vs World Space

```javascript
// Car.js
applyInput(intent) {
  const maxForce = 2500;
  const forceMag = intent.turbo ? maxForce * 1.6 : maxForce;

  // applyLocalForce: forward is -Z in local space regardless of world orientation
  // applyForce (world space) breaks propulsion after any rotation
  this.body.applyLocalForce(
    new CANNON.Vec3(0, 0, -forceMag),
    new CANNON.Vec3(0, 0, 0)          // center of mass
  );

  if (intent.left)  this.body.torque.y += maxTorque;
  if (intent.right) this.body.torque.y -= maxTorque;
}
```

### 4. Game Loop — Mandatory Ordering

```javascript
// Game.js — ORDER IS MANDATORY
_tick(timestamp) {
  requestAnimationFrame((ts) => this._tick(ts));

  const deltaTime = Math.min((timestamp - this._lastTime) / 1000, 0.05); // cap
  this._lastTime = timestamp;

  if (this.state !== 'PLAYING') return;

  // 1. Read input
  const intent = this.controls.getIntent();

  // 2. Apply forces BEFORE step
  this.car.applyInput(intent);
  this.track.updateEnemies(deltaTime);

  // 3. Step physics
  this.physicsWorld.step(deltaTime);

  // 4. Sync meshes AFTER step
  this.car.syncMesh();
  this.track.syncMeshes();

  // 5. Camera
  this.camera.follow(this.car.mesh, deltaTime);

  // 6. Game logic
  this._updateGameLogic(deltaTime);

  // 7. HUD
  this.hud.update(this.gameState);

  // 8. Render last
  this.renderer.render(this.scene, this.camera.instance);
}
```

### 5. Ground Plane

```javascript
const groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(new CANNON.Plane());
// Rotate so normal faces +Y (upward) — MANDATORY
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);
```

Without rotation, `CANNON.Plane` faces +Z — car falls into infinity.

## State Machine

```
LOADING → MENU
MENU → (INICIAR tapped) → PLAYING
PLAYING → (phase complete) → PHASE_END
PLAYING → (lives = 0)     → GAME_OVER
PHASE_END → (PRÓXIMA FASE) → PLAYING [reinit Track + Car for next phase]
PHASE_END → (REPETIR)     → PLAYING
PHASE_END → (phase = 3)   → VICTORY
GAME_OVER → (REPETIR)     → PLAYING
MENU ← VICTORY/GAME_OVER/PHASE_END
```

Guard clause at top of `_tick()`: skip physics and logic when state ≠ `PLAYING`.

## Camera — Chase Cam

```javascript
// Camera.js — exponential smoothing (frame-rate independent)
follow(carMesh, deltaTime) {
  const offset = new THREE.Vector3(0, 3, 8); // behind and above in car local space
  const targetPos = carMesh.localToWorld(offset.clone());

  const alpha = 1 - Math.exp(-10 * deltaTime); // correct lerp factor
  this.instance.position.lerp(targetPos, alpha);
  this.instance.lookAt(carMesh.position);
}
```

Prefer `1 - exp(-k * dt)` over plain `lerp(target, k * dt)` — the latter couples lag to framerate.

## Build Order (Dependency-Gated)

| Step | What to Build | Hard Gate Before Proceeding |
|------|--------------|--------------------------|
| 1 | PhysicsWorld + ground plane | Ground body exists; gravity active |
| 2 | Car body (no mesh) + Game loop | `body.position.y` stabilizes above 0 in console |
| 3 | Car mesh sync + Controls | **Car mesh visibly moves on input** — HARD GATE |
| 4 | Track geometry (Phase 1 segment) | Car drives on road surface |
| 5 | Camera chase cam | Follows car with visible lag |
| 6 | Collision detection + events | Console log on hit |
| 7 | HUD DOM overlay | Speed and score update each frame |
| 8 | Phase completion + PhaseEndScreen | PRÓXIMA FASE button works |
| 9 | Phase 2 + Phase 3 content | Each phase loads from PHASE_END |
| 10 | MenuScreen + Storage + VictoryScreen | Full flow MENU → VICTORY |

**Phase 1 roadmap = steps 1–8. Steps 1–3 are the critical path for the physics bug fix.**

## Anti-Patterns to Avoid

| Anti-Pattern | Correct Alternative |
|---|---|
| `mass: 0` on car body | `mass: 150`, `type: DYNAMIC` |
| `applyForce()` for propulsion | `applyLocalForce()` |
| `allowSleep: true` on car | `allowSleep: false` explicitly |
| Sync mesh BEFORE `world.step()` | Always: step → sync → render |
| Physics and render in separate loops | Single RAF loop |
| Raw delta (no cap) | `Math.min(delta, 0.05)` |
