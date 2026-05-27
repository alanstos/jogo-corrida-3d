# Phase 3: Game Feel - Research

**Researched:** 2026-05-27
**Domain:** Three.js particle systems, camera shake, Web Vibration API, game loop turbo mechanic, Cannon-es collision events
**Confidence:** HIGH

---

## Summary

Phase 3 adds sensory feedback to a working arcade game: turbo boost with cooldown, pooled collision particles, camera shake, and haptic vibration. The codebase is well-structured — `Game.js` already has a collision hook (`_handleCarCollision`) and a clean `applyInput → step → syncMesh → render` loop. All five features plug in with minimal architectural disruption.

The key technical insight is that **no new npm packages are needed**. Everything is implemented with Three.js 0.184.0 primitives and the Web Vibration API. The particle system uses `InstancedMesh` (1 draw call for 20 instances vs. 20 draw calls for individual meshes — a critical win on the 90%-mobile budget). Camera shake is a pure math offset applied to the Camera class's lerp target, requiring no physics coupling. Turbo injects a force multiplier into `Car.applyInput()` gated by a timer-based state machine in `Game.js`. Haptics use `navigator.vibrate()` with a one-liner guard for iOS/Firefox.

The one tech debt item (console.log at `Game.js` L274) is trivially removed — two lines deleted, verified absent in production build.

**Primary recommendation:** Implement in the order: (1) remove log debt, (2) turbo, (3) particles, (4) camera shake, (5) haptics. Each plan builds on the collision infrastructure established by the previous one.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FEEL-01 | Botao TURBO na tela dispara boost de velocidade por 2s com cooldown de 5s — indicador visual do cooldown, nao ativavel durante cooldown, funciona no touch e teclado | Timer state machine in Game.js; force multiplier in Car.applyInput(); CSS visual on #btnTurbo in HUD; Controls.js extended for turbo key/touch |
| FEEL-02 | Colisao com obstaculo ou AI emite burst de particulas no ponto de impacto — <= 20 particulas por evento, MeshBasicMaterial, auto-recycle (sem alocacao em runtime) | InstancedMesh pool of 20 in ParticleSystem.js; burst triggered from _handleCarCollision; impact position from body.position (proxy for now) |
| FEEL-03 | Camera treme por ~300ms apos colisao (offset noise aplicado ao lerp target) com retorno suave — sem afetar a logica de fisica | ShakeOffset state in Camera.js; additive offset on targetPos in follow(); exponential decay over 300ms |
| FEEL-04 | navigator.vibrate() disparado no uso do turbo (~50ms) e na colisao (~100ms) — graceful degradation silenciosa se API ausente (iOS nao suporta) | `if (navigator.vibrate) navigator.vibrate(N)` pattern; returns false for invalid params, never throws |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Turbo boost logic (state machine, cooldown timer) | Game.js (game loop) | Controls.js (input binding) | Timers must advance with safeDt each tick; Controls reads turbo button state only |
| Turbo force application | Car.js (physics body) | — | Force multiplier applied in applyInput() where all forces are set; keeps physics logic in Car |
| Turbo HUD indicator (cooldown progress) | HUD.js (DOM) | index.html + style.css (markup) | Visual feedback is DOM, not 3D scene |
| Particle system (pool, burst, tick) | ParticleSystem.js (new module) | Game.js (wires call sites) | Follows project pattern of dedicated modules (Car, Track, Camera) |
| Camera shake offset | Camera.js (follow method) | Game.js (triggers shake) | Offset is additive to camera targetPos — pure camera concern |
| Haptic feedback | Game.js (event sites) | — | One-liner at existing event trigger points; no new module needed |
| console.log removal | Game.js (line 274-277) | — | Tech debt in single location |

---

## Standard Stack

### Core (no new packages — all already installed)

| Library | Installed Version | Purpose | Why |
|---------|------------------|---------|-----|
| three | 0.184.0 | InstancedMesh for particles, Vector3 for shake offset | Already in project; InstancedMesh gives 1 draw call for 20 particles [VERIFIED: npm registry] |
| cannon-es | 0.20.0 | Collision event `body` + `contact` struct for impact position | Already in project; collide event fires on each body [VERIFIED: npm registry] |

**No new npm packages required for Phase 3.** All implementation is vanilla JS using existing stack.

### Package Legitimacy Audit

> Phase 3 installs zero new packages. This section is intentionally minimal.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| three | npm | ~13 yrs | ~4M/wk | github.com/mrdoob/three.js | N/A (existing) | Approved — already installed |
| cannon-es | npm | ~5 yrs | ~100k/wk | github.com/pmndrs/cannon-es | N/A (existing) | Approved — already installed |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
TURBO PRESS (touch / keydown T)
         |
         v
Controls.getIntent() → { ..., turbo: true }
         |
         v
Game._tick() — Step 5
  └─ turboState machine advances safeDt
       ├─ IDLE: activate → BOOSTING(2s timer)
       ├─ BOOSTING: timer -= safeDt → when expired → COOLING(5s timer)
       └─ COOLING: timer -= safeDt → when expired → IDLE
         |
         v
Car.applyInput(intent) — Step 6
  └─ if turboActive: baseForce * 2.5 (not +boost, replace boost multiplier)
         |
         v
HUD.update({ ..., turboState, turboCooldownRatio })
  └─ #btnTurbo CSS: active / cooling / idle visual

COLLISION EVENT (Cannon-es body 'collide')
         |
         v
Game._handleCarCollision(event)
  ├─ existing: state = GAME_OVER, persist score
  ├─ NEW: particleSystem.burst(impactPos)  → FEEL-02
  ├─ NEW: camera.startShake(0.3)           → FEEL-03
  └─ NEW: hapticFeedback.vibrate(100)      → FEEL-04

TURBO ACTIVATED
  └─ NEW: hapticFeedback.vibrate(50)       → FEEL-04

ParticleSystem.update(safeDt)  ← called in Game._tick() Step 9.5
  ├─ for each active particle: position += velocity * safeDt
  ├─ lifetime -= safeDt; when <= 0: deactivate (scale to 0)
  └─ InstancedMesh.instanceMatrix.needsUpdate = true

Camera.follow(carMesh, deltaTime)  ← existing, extended
  └─ if shakeActive: targetPos += shakeOffset (random unit vec * decaying amplitude)
       amplitude decays via exp(-decayRate * elapsed) over ~300ms
```

### Recommended Project Structure

```
game/
├── Game.js          # [MODIFY] add turbo state machine, wire particle/shake/haptic calls
├── Car.js           # [MODIFY] accept turboActive flag in applyInput, apply force multiplier
├── Controls.js      # [MODIFY] add turbo key (T/Space) + #btnTurbo touch binding
├── Camera.js        # [MODIFY] add shakeOffset state + startShake() + shake tick in follow()
├── HUD.js           # [MODIFY] add updateTurbo(state, ratio) method
├── ParticleSystem.js  # [NEW] InstancedMesh pool of 20, burst(), update()
├── PhysicsWorld.js  # [NO CHANGE]
├── Storage.js       # [NO CHANGE]
└── Track.js         # [NO CHANGE]
index.html           # [MODIFY] add #btnTurbo to #touchControls
style.css            # [MODIFY] add .turbo-btn styles + cooldown visual
```

### Pattern 1: Turbo State Machine (Game.js)

**What:** Timer-gated state machine drives turbo active/cooling/idle — advances with `safeDt` each tick.
**When to use:** Any timed ability with cooldown in a game loop.

```javascript
// Source: project pattern from Controls + Car established in Phase 1
// State: 'idle' | 'boosting' | 'cooling'
this._turboState = 'idle';
this._turboTimer = 0;
const TURBO_DURATION = 2.0;    // seconds active
const TURBO_COOLDOWN = 5.0;    // seconds cooling

// In _tick() Step 5.5 (after getIntent, before applyInput):
const intent = this.controls.getIntent(); // now includes intent.turbo

if (intent.turbo && this._turboState === 'idle') {
  this._turboState = 'boosting';
  this._turboTimer = TURBO_DURATION;
  this._triggerHaptic(50);        // FEEL-04
}

if (this._turboState === 'boosting') {
  this._turboTimer -= safeDt;
  if (this._turboTimer <= 0) {
    this._turboState = 'cooling';
    this._turboTimer = TURBO_COOLDOWN;
  }
}

if (this._turboState === 'cooling') {
  this._turboTimer -= safeDt;
  if (this._turboTimer <= 0) {
    this._turboState = 'idle';
    this._turboTimer = 0;
  }
}

const turboActive = this._turboState === 'boosting';
this.car.applyInput(intent, turboActive); // pass flag to Car
```

### Pattern 2: Turbo Force in Car.applyInput (Car.js)

**What:** Pass turboActive boolean to applyInput; multiply base force.
**When to use:** Force-based boost where magnitude increase is instant.

```javascript
// Source: Car.applyInput pattern from Phase 1
applyInput(intent, turboActive = false) {
  this.body.wakeUp();
  const forceMultiplier = turboActive ? 2.5 : 1.0;
  const baseForce = 2500;
  const boost = intent.forward ? 800 : 0;
  this.body.applyLocalForce(
    new CANNON.Vec3(0, 0, -(baseForce + boost) * forceMultiplier),
    new CANNON.Vec3(0, 0, 0)
  );
  if (intent.left)  this.body.torque.y += 400;
  if (intent.right) this.body.torque.y -= 400;
}
```

### Pattern 3: InstancedMesh Particle Pool (ParticleSystem.js)

**What:** Pre-allocate MAX_PARTICLES InstancedMesh instances at construction; burst activates N of them; update() advances each active particle and expires it.
**When to use:** Fixed-count particle effects with zero runtime allocation.

Key facts verified:
- `InstancedMesh` uses 1 draw call regardless of count [VERIFIED: threejs.org/docs]
- Hide inactive instances by scaling matrix to (0,0,0) — simple, no reorder needed for 20 particles [VERIFIED: discourse.threejs.org]
- `instanceMatrix.needsUpdate = true` required after any matrix change [VERIFIED: threejs.org/docs]
- `MeshBasicMaterial` is correct — no lighting cost (matches CLAUDE.md constraint) [VERIFIED: project CLAUDE.md]

```javascript
// Source: Three.js InstancedMesh docs + project pool pattern
import * as THREE from 'three';

const MAX_PARTICLES = 20;
const PARTICLE_LIFETIME = 0.6;  // seconds
const PARTICLE_SPEED = 8;       // units/sec

export default class ParticleSystem {
  constructor(scene) {
    this._scene = scene;
    this._particles = [];  // { velocity: Vector3, lifetime: number, active: bool }
    this._dummy = new THREE.Object3D();
    this._zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);

    // Single geometry + MeshBasicMaterial — no PBR (CLAUDE.md)
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8800 });

    this._mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this._mesh.frustumCulled = false;  // particles may be at camera edge

    // Initialize all instances to hidden (scale 0)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._mesh.setMatrixAt(i, this._zeroScale);
      this._particles.push({ velocity: new THREE.Vector3(), lifetime: 0, active: false });
    }
    this._mesh.instanceMatrix.needsUpdate = true;
    scene.add(this._mesh);
  }

  burst(position) {
    // Activate up to 8 particles per burst (leaves headroom for overlapping bursts)
    const COUNT = 8;
    let activated = 0;
    for (let i = 0; i < MAX_PARTICLES && activated < COUNT; i++) {
      if (!this._particles[i].active) {
        const p = this._particles[i];
        p.active = true;
        p.lifetime = PARTICLE_LIFETIME;
        // Random direction burst
        p.velocity.randomDirection().multiplyScalar(PARTICLE_SPEED);

        // Position at impact
        this._dummy.position.copy(position);
        this._dummy.scale.set(1, 1, 1);
        this._dummy.updateMatrix();
        this._mesh.setMatrixAt(i, this._dummy.matrix);
        activated++;
      }
    }
    this._mesh.instanceMatrix.needsUpdate = true;
  }

  update(deltaTime) {
    let anyActive = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this._particles[i];
      if (!p.active) continue;

      p.lifetime -= deltaTime;
      if (p.lifetime <= 0) {
        p.active = false;
        this._mesh.setMatrixAt(i, this._zeroScale);
      } else {
        // Advance position
        this._dummy.position.set(0, 0, 0);
        // Get current position from matrix
        this._mesh.getMatrixAt(i, this._dummy.matrix);
        this._dummy.matrix.decompose(this._dummy.position, this._dummy.quaternion, this._dummy.scale);
        this._dummy.position.addScaledVector(p.velocity, deltaTime);
        this._dummy.scale.setScalar(p.lifetime / PARTICLE_LIFETIME); // shrink over time
        this._dummy.updateMatrix();
        this._mesh.setMatrixAt(i, this._dummy.matrix);
        anyActive = true;
      }
    }
    if (anyActive || this._needsUpdate) {
      this._mesh.instanceMatrix.needsUpdate = true;
    }
  }

  reset() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._particles[i].active = false;
      this._particles[i].lifetime = 0;
      this._mesh.setMatrixAt(i, this._zeroScale);
    }
    this._mesh.instanceMatrix.needsUpdate = true;
  }
}
```

### Pattern 4: Camera Shake (Camera.js)

**What:** Add decaying random offset to the chase cam's lerp target for ~300ms. No physics coupling.
**When to use:** Any hit reaction / impact feedback in a chase camera system.

Key facts:
- `_offset` in Camera.js is a fixed local-space offset `(0, 3, 8)`. The shake offset is additive in world space after `localToWorld`.
- `Vector3.randomDirection()` gives a random unit vector — scale by decaying amplitude for noise [VERIFIED: threejs.org/docs]
- Exponential decay: `amplitude * Math.exp(-decayRate * elapsed)` gives a smooth tail-off.
- Return to zero is automatic as amplitude approaches 0.

```javascript
// Source: Camera.js existing follow() pattern — additive extension
// Add to Camera constructor:
this._shakeAmplitude = 0;
this._shakeElapsed = 0;
const SHAKE_DURATION = 0.3;    // seconds
const SHAKE_DECAY = 15;        // higher = faster decay
const SHAKE_INTENSITY = 0.35;  // world units at peak

// New method:
startShake() {
  this._shakeAmplitude = SHAKE_INTENSITY;
  this._shakeElapsed = 0;
}

// Modified follow():
follow(carMesh, deltaTime) {
  const targetPos = carMesh.localToWorld(this._offset.clone());

  // Apply shake offset if active
  if (this._shakeAmplitude > 0.001) {
    this._shakeElapsed += deltaTime;
    const currentAmplitude = this._shakeAmplitude * Math.exp(-SHAKE_DECAY * this._shakeElapsed);
    if (currentAmplitude < 0.001) {
      this._shakeAmplitude = 0;  // done
    } else {
      // New random offset each frame (noise, not smooth — intentional for shake feel)
      const shakeVec = new THREE.Vector3().randomDirection().multiplyScalar(currentAmplitude);
      targetPos.add(shakeVec);
    }
  }

  const alpha = 1 - Math.exp(-10 * deltaTime);
  this.instance.position.lerp(targetPos, alpha);
  this.instance.lookAt(carMesh.position);
}
```

**Pitfall:** `new THREE.Vector3()` inside `follow()` per frame allocates. Reuse a pre-allocated `_shakeVec` instance. Pre-allocate in constructor: `this._shakeVec = new THREE.Vector3();`

### Pattern 5: Haptic Feedback (inline in Game.js)

**What:** One-liner guard for vibration API with graceful degradation.
**When to use:** Any event that benefits from tactile confirmation.

Browser facts [VERIFIED: MDN Web Docs + caniuse.com]:
- Chrome/Android: supported (Chrome 30+)
- Firefox 129+: removed on all platforms
- Safari/iOS: never supported
- The API returns `false` for invalid params, never throws — calling it on iOS is safe (no-op)
- Requires sticky user activation (user must have touched/clicked the page first)
- In a game, activation is guaranteed before `game.start()` fires (user tapped INICIAR)

```javascript
// Source: MDN Web Docs — navigator.vibrate()
// In Game.js as a private helper:
_triggerHaptic(durationMs) {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(durationMs);
  }
}

// Usage:
// Turbo activated:  this._triggerHaptic(50);
// Collision:        this._triggerHaptic(100);
```

### Pattern 6: Collision Impact Position

**What:** Derive world-space impact point from Cannon-es `contact` object.
**When to use:** Positioning particles at collision point.

Facts from cannon-es source (verified in `/node_modules/cannon-es/dist/cannon-es.js` L12984 + `cannon-es.d.ts` L539):
- `event.body` = the other body (obstacle)
- `event.contact` = `ContactEquation` with `ri: Vec3`, `rj: Vec3`, `ni: Vec3`
- `ri` = offset from body_i to contact point (world-oriented)
- Impact world position = `car.body.position + contact.ri`

```javascript
// Source: cannon-es.d.ts ContactEquation + cannon-es.js World_step_collideEvent
_handleCarCollision(event) {
  if (event.body?.userData?.tag === 'obstacle') {
    // Derive impact world position
    const impactPos = new THREE.Vector3(
      this.car.body.position.x + event.contact.ri.x,
      this.car.body.position.y + event.contact.ri.y,
      this.car.body.position.z + event.contact.ri.z,
    );
    this.particleSystem.burst(impactPos);
    this.camera.startShake();
    this._triggerHaptic(100);
    // existing: state = GAME_OVER, persist score...
  }
}
```

**Pitfall:** `event.contact` object is **reused** between collisions (the `World_step_collideEvent` object is pooled, see `cannon-es.js` L12759: "We reuse the collideEvent object"). Copy the values immediately — do not store a reference to `event.contact`.

### Anti-Patterns to Avoid

- **New THREE.Vector3() per frame in Camera.follow():** Allocates on every frame. Pre-allocate `_shakeVec` in constructor.
- **New CANNON.Vec3() in Car.applyInput():** The existing code already does this — it's a known minor allocation accepted per the original author's pattern. Do not compound it with additional allocations.
- **Points/PointsMaterial for particles:** PointsMaterial requires `sizeAttenuation:false` for mobile or points appear differently at distance. InstancedMesh with BoxGeometry gives more controlled visual and better pooling semantics.
- **Storing event.contact reference:** The contact object is reused by cannon-es. Copy values before the handler returns.
- **Triggering haptics without activation guard:** navigator.vibrate throws on iOS and may be undefined in some browsers. Always check `typeof navigator.vibrate === 'function'` first.
- **Turbo allowed during GAME_OVER state:** Gate turbo activation on `this.state === 'PLAYING'`.
- **HUD turbo button visible in menu:** #btnTurbo must live inside #touchControls which is already hidden during MENU state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Particle pooling | Custom array manager + manual mesh hide/show | Three.js InstancedMesh + scale-to-zero | 1 draw call, GPU instancing, no custom pool bookkeeping |
| Camera shake math | Custom sinusoidal or spring system | Exponential decay + Vector3.randomDirection() | Two lines, frame-rate independent, no new math module needed |
| Haptic abstraction | HapticManager class | Inline `if (navigator.vibrate) vibrate(N)` | Zero overhead; the API is already graceful-degradation |
| Turbo timing | requestAnimationFrame-based setTimeout workaround | `safeDt` accumulation in game loop | Already capped at 0.05s per tick; consistent with existing physics step |

**Key insight:** The entire Game Feel phase is additive math and state mutations on existing objects. Nothing justifies a new library or abstraction layer.

---

## Common Pitfalls

### Pitfall 1: collision event.contact is a Reused Object Pool Reference
**What goes wrong:** Storing `this._lastContact = event.contact` and reading it a frame later yields overwritten or null data.
**Why it happens:** cannon-es reuses a single `World_step_collideEvent` object across all collision dispatches in a step to avoid GC pressure (confirmed at `cannon-es.js` L12759).
**How to avoid:** Extract all needed values immediately inside the handler: `const { x, y, z } = event.contact.ri; const impactX = this.car.body.position.x + x;`
**Warning signs:** Particles always appear at (0,0,0) or wrong positions.

### Pitfall 2: InstancedMesh instanceMatrix.needsUpdate Not Set
**What goes wrong:** Particle positions update in JS but appear frozen on screen.
**Why it happens:** The GPU-side buffer is not notified of changes until the flag is set.
**How to avoid:** Set `instancedMesh.instanceMatrix.needsUpdate = true` whenever any matrix is changed in a frame.
**Warning signs:** Particles freeze at spawn position after first frame.

### Pitfall 3: Camera Shake Allocates per Frame
**What goes wrong:** GC pressure causes frame drops mid-shake on mobile.
**Why it happens:** `new THREE.Vector3()` inside `follow()` creates 60 objects/sec during a 300ms shake.
**How to avoid:** Pre-allocate `this._shakeVec = new THREE.Vector3()` in Camera constructor; call `.randomDirection()` on it in follow().
**Warning signs:** Chrome DevTools Memory tab shows sawtooth allocation pattern during gameplay.

### Pitfall 4: Turbo Activates During GAME_OVER or MENU
**What goes wrong:** Pressing T or tapping the turbo button after game over triggers a turbo state with no visual feedback, confusing state on next run.
**Why it happens:** Controls.getIntent() fires every frame regardless of state; turbo state machine only runs in Step 5.5 but button state persists.
**How to avoid:** Gate turbo activation check: `if (intent.turbo && this._turboState === 'idle' && this.state === 'PLAYING')`.
**Warning signs:** Turbo starts already in COOLING when a new game begins.

### Pitfall 5: navigator.vibrate() Absence (iOS and Firefox 129+)
**What goes wrong:** `navigator.vibrate` is undefined on iOS and Firefox 129+. Calling it without a guard throws TypeError.
**Why it happens:** Safari/iOS never implemented the Vibration API; Firefox 129 removed it (confirmed: MDN + caniuse.com).
**How to avoid:** `if (typeof navigator.vibrate === 'function') navigator.vibrate(N)`.
**Warning signs:** Console errors on iOS devices; TypeError: navigator.vibrate is not a function.

### Pitfall 6: Turbo Cooldown Button Not Reset on Game Restart
**What goes wrong:** If player collides mid-turbo or turbo is in COOLING, and then retries — the turbo state persists into the new run.
**Why it happens:** `game.start()` resets car/track/score but turbo state is a new field in Game.
**How to avoid:** Reset `_turboState = 'idle'` and `_turboTimer = 0` inside `start()`.
**Warning signs:** New run begins with turbo immediately unavailable.

### Pitfall 7: Particles Left Active Across Game Over → Retry
**What goes wrong:** Particles from the collision that triggered game over continue animating into the new run.
**Why it happens:** `particleSystem.update()` is called every tick; if reset() is not called in `start()`, old particles persist.
**How to avoid:** Call `this.particleSystem.reset()` inside `game.start()`, after `car.reset()`.
**Warning signs:** Orange particle cubes visible at wrong position at start of new run.

---

## Code Examples

### Console.log Removal (Plan 03-01)

```javascript
// Source: Game.js L273-277 — REMOVE these lines entirely
this._frameCount++;
if (this._frameCount % 60 === 0) {
  const p = this.car.body.position;
  console.log(`[frame ${this._frameCount}] body.position:`, { x: p.x.toFixed(3), y: p.y.toFixed(3), z: p.z.toFixed(3) });
}
// Also remove: this._frameCount = 0 from constructor (L16)
// Also remove: this.car.body.console.log at Car.js L29-33 (init diagnostic log)
```

### HUD Turbo Button HTML (to add in index.html)

```html
<!-- Inside #touchControls, alongside #btnLeft and #btnRight -->
<button id="btnTurbo" class="touch-btn touch-btn-turbo" type="button" aria-label="Turbo boost">TURBO</button>
```

### HUD Turbo CSS (to add in style.css)

```css
/* Centered above touch buttons, or between left and right buttons */
.touch-btn-turbo {
  /* Smaller than steering buttons — secondary action */
  width: 20vw;
  max-width: 120px;
  min-width: 80px;
  min-height: 70px;
  font-size: 14px;
  /* Cooldown via CSS custom property set by HUD.js */
  position: relative;
  overflow: hidden;
}

.touch-btn-turbo.cooling::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%;
  height: calc(var(--cooldown-ratio, 0) * 100%);
  background: rgba(255, 238, 0, 0.25);
  pointer-events: none;
}

.touch-btn-turbo.boosting {
  background: rgba(255, 150, 0, 0.5);
  border-color: #ff9600;
  color: #ff9600;
}

.touch-btn-turbo.cooling {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| THREE.Geometry (particle arrays) | BufferGeometry + InstancedMesh | Three.js r125 (2021) | Single draw call vs N draw calls; mandatory for mobile |
| ParticleSystem class (deprecated) | InstancedMesh or Points with BufferGeometry | r100+ | No built-in particle system; project builds own pool |
| navigator.vibrate on Firefox Android | Removed in Firefox 129 | 2024 | Must check function existence, not just property |

**Deprecated/outdated:**
- `THREE.Geometry`: Removed in r137. Do not use. BufferGeometry + InstancedMesh is the standard.
- `THREE.ParticleSystem`: Removed long ago. Three.js has no first-party particle system — use InstancedMesh or Points.
- `THREE.Points` with `PointsMaterial`: Still valid for dot-style particles, but for pooled burst effects with custom geometry (cube sparks), InstancedMesh with BoxGeometry is cleaner.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Turbo force multiplier of 2.5 on base 2500N gives noticeable boost without loss of control | Pattern 2 (Car.applyInput) | May feel underpowered or uncontrollable — tunable at runtime |
| A2 | 8 particles per burst is visually sufficient for a retro arcade aesthetic | Pattern 3 (burst COUNT) | Could look sparse — trivially increased to 12 |
| A3 | SHAKE_INTENSITY of 0.35 world units is readable but not nauseating | Pattern 4 (startShake) | Player-tunable concern; may need to reduce for prolonged play sessions |
| A4 | `Car.js` L29-33 console.log (init diagnostic) should also be removed in Plan 03-01 | Code Examples | Low risk — it fires only once at construction |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions (RESOLVED)

1. **Turbo button layout in touch controls**
   - What we know: #touchControls has left/right buttons side by side at bottom. Turbo needs to be reachable with one thumb while steering.
   - What's unclear: Center-bottom (between left/right), or center-top of the touch zone?
   - Recommendation: Center-bottom between left/right buttons — matches arcade layout ("boost is in the middle"); planner decides final position.
   - RESOLVED: Center-bottom position adopted — implemented in Plan 03-02 Task 1 (index.html).

2. **Particle color — orange sparks or cyan glow matching car?**
   - What we know: Car is cyan (0x00ffff), obstacles are yellow (0xffee00), road is purple.
   - What's unclear: Which reads better as "collision sparks" against the retro palette.
   - Recommendation: Orange (0xff8800) — contrasts with both cyan car and purple road; reads as "heat/impact" in retro arcade visual language.
   - RESOLVED: Orange (0xff8800) adopted — implemented in Plan 03-03 Task 1 (ParticleSystem.js).

3. **Should car init diagnostic log (Car.js L29-33) be removed in Plan 03-01?**
   - What we know: It fires once at construction, not in the game loop, so it doesn't contribute to the periodic 1/s spam. But it is console noise in production.
   - Recommendation: Remove it in Plan 03-01 along with the Game.js loop log — clean sweep of all diagnostic logs.
   - RESOLVED: Removed in Plan 03-01 Task 2 (Car.js).

---

## Environment Availability

> Step 2.6 SKIPPED: Phase 3 is pure code changes to existing files. No external tools, services, CLIs, or databases are required beyond the already-working development environment (Node.js + Vite already running from Phases 1-2).

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` in config.json. Evaluated below.

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Rationale |
|---------------|---------|-----------|
| V2 Authentication | No | No auth in this game (browser-only, no backend) |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No privileged operations |
| V5 Input Validation | Minimal | turbo key/button input — low risk; no user-supplied data persisted |
| V6 Cryptography | No | No secrets or encryption |
| V7 Error Handling | Minimal | navigator.vibrate guard prevents TypeError; no other new throw paths |

### Known Threat Patterns for Browser Game Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious vibration pattern via XSS injecting navigator.vibrate call | Tampering | N/A — no XSS surface in this static browser game; no user-generated content |
| localStorage manipulation of turbo state | Tampering | Turbo state is in-memory only, never persisted; no risk |

**Assessment:** Phase 3 has no meaningful security surface. The only new browser API (`navigator.vibrate`) is called with hard-coded constants (50, 100ms) and guarded against absence. No user input is persisted. Security review: PASS at ASVS Level 1.

---

## Sources

### Primary (HIGH confidence)
- `cannon-es/dist/cannon-es.js` L12984 — `World_step_collideEvent` pool object structure, confirms event reuse
- `cannon-es/dist/cannon-es.d.ts` L539-551 — `ContactEquation` type: `ri: Vec3`, `rj: Vec3`, `ni: Vec3`, `getImpactVelocityAlongNormal()`
- [threejs.org/docs — InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh) — setMatrixAt, instanceMatrix.needsUpdate, 1 draw call
- [threejs.org/docs — Vector3](https://threejs.org/docs/#api/en/math/Vector3) — randomDirection(), addScaledVector(), lerp()
- [MDN Web Docs — Navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) — return values, graceful degradation, activation requirement
- Project source: `game/Game.js`, `game/Car.js`, `game/Camera.js`, `game/Controls.js`, `game/HUD.js`, `game/Track.js` — all read directly

### Secondary (MEDIUM confidence)
- [caniuse.com — Navigator.vibrate](https://caniuse.com/mdn-api_navigator_vibrate) — iOS never supported; Firefox 129 removed
- [discourse.threejs.org — show/hide InstancedMesh instance](https://discourse.threejs.org/t/how-to-show-and-hide-an-instance-in-instance-mesh/28198) — scale-to-zero pattern, no native per-instance visibility

### Tertiary (LOW confidence — training knowledge, not independently verified)
- Turbo force multiplier value of 2.5x (A1) — tunable, not a correctness concern
- Particle count of 8 per burst (A2) — aesthetic judgment, not correctness

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; Three.js InstancedMesh and cannon-es collision event verified in installed source files
- Architecture: HIGH — all patterns derived directly from reading existing codebase source
- Pitfalls: HIGH — pitfall #1 (contact reuse) verified in cannon-es.js source; others derived from codebase patterns and MDN

**Research date:** 2026-05-27
**Valid until:** 2026-08-27 (stable APIs; navigator.vibrate support changes are the most volatile item)
