# Phase 3: Game Feel - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 8 (1 new, 6 modified, 1 HTML/CSS pair)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `game/ParticleSystem.js` | service | event-driven | `game/Track.js` (obstacle pool) | role-match (pool pattern exact) |
| `game/Game.js` | controller | request-response | self (existing) | self-modification |
| `game/Car.js` | service | request-response | self (existing) | self-modification |
| `game/Controls.js` | utility | event-driven | self (existing) | self-modification |
| `game/Camera.js` | service | request-response | self (existing) | self-modification |
| `game/HUD.js` | component | request-response | self (existing) | self-modification |
| `index.html` | config | — | `index.html` (existing btnLeft/btnRight) | exact |
| `style.css` | config | — | `style.css` (existing .touch-btn) | exact |

---

## Pattern Assignments

### `game/ParticleSystem.js` — NEW (service, event-driven)

**Analog:** `game/Track.js` — obstacle pool pattern

**Module import pattern** (`game/Track.js` lines 1–2, `game/Car.js` lines 1–2):
```javascript
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
```
ParticleSystem only needs THREE (no cannon-es).

**Pool construction pattern** (`game/Track.js` lines 78–99 — `_buildObstaclePool`):
```javascript
_buildObstaclePool() {
  const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffee00 });

  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    this._scene.add(mesh);

    const body = new CANNON.Body({ mass: 0, ... });
    body.userData = { tag: 'obstacle' };
    body.position.set(0, -100, 0);
    this._physicsWorld.addBody(body);

    this._obstacles.push({ mesh, body, active: false });
  }
}
```
ParticleSystem replaces the individual-mesh pool with InstancedMesh: single geometry + `MeshBasicMaterial` (NOT Lambert — no lighting cost), `MAX_PARTICLES = 20`, hide inactive via `makeScale(0,0,0)`.

**Pool item state object pattern** (`game/Track.js` line 97):
```javascript
this._obstacles.push({ mesh, body, active: false });
```
ParticleSystem particle state: `{ velocity: new THREE.Vector3(), lifetime: 0, active: false }`

**Pool deactivate pattern** (`game/Track.js` lines 201–205 — `_deactivateObstacle`):
```javascript
_deactivateObstacle(obs) {
  obs.active = false;
  obs.body.position.set(0, -100, 0);
  obs.mesh.visible = false;
}
```
ParticleSystem equivalent: set `p.active = false`, set matrix to `_zeroScale` (`makeScale(0,0,0)`), set `instanceMatrix.needsUpdate = true`.

**Pool reset pattern** (`game/Track.js` lines 228–232):
```javascript
for (let i = 0; i < this._obstacles.length; i++) {
  this._deactivateObstacle(this._obstacles[i]);
}
```
ParticleSystem `reset()` iterates all `MAX_PARTICLES` and deactivates each.

**Constructor `(scene, physicsWorld)` pattern** (`game/Track.js` lines 15–16, `game/Car.js` lines 9–10):
```javascript
constructor(scene, physicsWorld) {
  this._scene = scene;
  this._physicsWorld = physicsWorld;
  ...
}
```
ParticleSystem only needs `scene`: `constructor(scene)`.

**Material rule** (`game/Car.js` line 91, `game/Track.js` line 80 — CLAUDE.md constraint "Never Use PBR"):
```javascript
// Car.js L91 — correct mobile material
const mat = new THREE.MeshLambertMaterial({ color: 0x00ffff });
// Track.js L80 — correct mobile material
const mat = new THREE.MeshLambertMaterial({ color: 0xffee00 });
```
ParticleSystem uses `MeshBasicMaterial` (even cheaper — no lighting calculation at all): `new THREE.MeshBasicMaterial({ color: 0xff8800 })`.

---

### `game/Game.js` — MODIFY (controller, request-response)

**Analog:** self — extend existing patterns

**Constructor field initialization pattern** (`game/Game.js` lines 12–16):
```javascript
constructor(canvas) {
  this.canvas = canvas;
  this._rafHandle = null;
  this._lastTime = 0;
  this._paused = false;
  this._frameCount = 0;       // <-- REMOVE in Plan 03-01
  ...
  this._highScore = safeGet('melhorPontuacao', 0);
}
```
Add alongside existing fields (after `this._highScore`):
```javascript
this._turboState = 'idle';   // 'idle' | 'boosting' | 'cooling'
this._turboTimer = 0;
```

**Module wiring pattern** (`game/Game.js` lines 55–61):
```javascript
this.physicsWorld = new PhysicsWorld();
this.car = new Car(this.scene, this.physicsWorld);
this.controls = new Controls();
this.track = new Track(this.scene, this.physicsWorld);
this.hud = new HUD();
```
Add after `this.hud = new HUD()`:
```javascript
this.particleSystem = new ParticleSystem(this.scene);
```
Add import at top alongside existing imports.

**Collision handler pattern** (`game/Game.js` lines 138–162 — `_handleCarCollision`):
```javascript
_handleCarCollision(event) {
  if (
    event.body &&
    event.body.userData &&
    event.body.userData.tag === 'obstacle'
  ) {
    this.state = 'GAME_OVER';
    const finalScore = Math.floor(this.score);
    const isNewRecord = finalScore > this._highScore;
    if (isNewRecord) {
      this._highScore = finalScore;
      safeSet('melhorPontuacao', finalScore);
    }
    this._goScoreEl.textContent = String(finalScore);
    this._goHighScoreEl.textContent = String(this._highScore);
    this._goRecordBadgeEl.classList.toggle('hidden', !isNewRecord);
    this._gameOverEl.classList.remove('hidden');
    this._gameOverEl.setAttribute('aria-hidden', 'false');
  }
}
```
Add before `this.state = 'GAME_OVER'` (extract contact values immediately — they are pooled/reused by cannon-es):
```javascript
const impactPos = new THREE.Vector3(
  this.car.body.position.x + event.contact.ri.x,
  this.car.body.position.y + event.contact.ri.y,
  this.car.body.position.z + event.contact.ri.z,
);
this.particleSystem.burst(impactPos);
this.camera.startShake();
this._triggerHaptic(100);
```

**Game loop step order** (`game/Game.js` lines 228–278 — `_tick`):
```javascript
// Step 5 — Read input
const intent = this.controls.getIntent();

// Step 6 — Apply forces BEFORE step
this.car.applyInput(intent);

// Step 7 — Track update BEFORE step
this.track.update(safeDt, this._speedMultiplier, this.car.body.position.z);

// Step 8 — Step physics
this.physicsWorld.step(safeDt);

// Step 9 — Sync mesh AFTER step
this.car.syncMesh();
```
New additions insert at Step 5.5 (between Step 5 and Step 6), and Step 9.5 (between Step 9 and score calculation):
```javascript
// Step 5.5 — Turbo state machine (MUST be after getIntent, before applyInput)
if (intent.turbo && this._turboState === 'idle' && this.state === 'PLAYING') {
  this._turboState = 'boosting';
  this._turboTimer = 2.0;
  this._triggerHaptic(50);
}
if (this._turboState === 'boosting') {
  this._turboTimer -= safeDt;
  if (this._turboTimer <= 0) { this._turboState = 'cooling'; this._turboTimer = 5.0; }
}
if (this._turboState === 'cooling') {
  this._turboTimer -= safeDt;
  if (this._turboTimer <= 0) { this._turboState = 'idle'; this._turboTimer = 0; }
}
const turboActive = this._turboState === 'boosting';
this.car.applyInput(intent, turboActive); // REPLACE existing applyInput call

// Step 9.5 — Particle update (AFTER syncMesh, before render)
this.particleSystem.update(safeDt);
```

**HUD update call pattern** (`game/Game.js` line 268):
```javascript
this.hud.update({ score: this.score, speed: this.track.getSpeed() });
```
Extend with turbo state:
```javascript
this.hud.update({
  score: this.score,
  speed: this.track.getSpeed(),
  turboState: this._turboState,
  turboCooldownRatio: this._turboState === 'cooling' ? this._turboTimer / 5.0 : 0,
});
```

**start() reset pattern** (`game/Game.js` lines 197–211):
```javascript
start({ speedMultiplier = 1.0, obstacleCount = 8 } = {}) {
  this._speedMultiplier = speedMultiplier;
  this.track.setDifficulty(obstacleCount);
  this.car.reset();
  this.track.reset();
  this.score = 0;
  this._lastTime = performance.now();
  this.state = 'PLAYING';
  this._rafHandle = requestAnimationFrame((ts) => this._tick(ts));
}
```
Add resets after `this.score = 0`:
```javascript
this._turboState = 'idle';
this._turboTimer = 0;
this.particleSystem.reset();
```

**Console.log debt to remove** (`game/Game.js` lines 273–277):
```javascript
this._frameCount++;
if (this._frameCount % 60 === 0) {
  const p = this.car.body.position;
  console.log(`[frame ${this._frameCount}] body.position:`, { x: p.x.toFixed(3), y: p.y.toFixed(3), z: p.z.toFixed(3) });
}
```
Delete these 4 lines entirely. Also delete `this._frameCount = 0` from constructor (line 16).

---

### `game/Car.js` — MODIFY (service, request-response)

**Analog:** self — extend `applyInput` signature

**applyInput signature** (`game/Car.js` lines 102–119):
```javascript
applyInput(intent) {
  this.body.wakeUp();
  const baseForce = 2500;
  const boost = intent.forward ? 800 : 0;
  this.body.applyLocalForce(
    new CANNON.Vec3(0, 0, -(baseForce + boost)),
    new CANNON.Vec3(0, 0, 0)
  );
  if (intent.left)  this.body.torque.y += 400;
  if (intent.right) this.body.torque.y -= 400;
}
```
Change to accept optional second parameter and apply multiplier to the total forward force:
```javascript
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

**Console.log debt to remove** (`game/Car.js` lines 29–34):
```javascript
console.log('Car init:', {
  mass: this.body.mass,
  type: this.body.type,
  allowSleep: this.body.allowSleep,
});
```
Delete these 5 lines entirely.

---

### `game/Controls.js` — MODIFY (utility, event-driven)

**Analog:** self — extend existing key/touch binding pattern

**Key state object pattern** (`game/Controls.js` lines 3–5):
```javascript
this._keyState = { left: false, right: false, forward: false };
```
Extend to:
```javascript
this._keyState = { left: false, right: false, forward: false, turbo: false };
```

**Keyboard binding pattern** (`game/Controls.js` lines 9–19 — `_bindKeyboard`):
```javascript
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')  this._keyState.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this._keyState.right = true;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')    this._keyState.forward = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')  this._keyState.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this._keyState.right = false;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')    this._keyState.forward = false;
});
```
Add turbo key bindings (T / Space) following the exact same pattern:
```javascript
if (e.key === 't' || e.key === 'T' || e.key === ' ') this._keyState.turbo = true;
// in keyup:
if (e.key === 't' || e.key === 'T' || e.key === ' ') this._keyState.turbo = false;
```

**Touch button binding pattern** (`game/Controls.js` lines 22–46 — `_bindTouch` + `_bindButton`):
```javascript
_bindTouch() {
  const left  = document.getElementById('btnLeft');
  const right = document.getElementById('btnRight');
  if (left)  this._bindButton(left,  'left');
  if (right) this._bindButton(right, 'right');
}

_bindButton(el, dir) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    this._activePointers.set(e.pointerId, dir);
    el.classList.add('pressed');
  });
  const release = (e) => {
    if (this._activePointers.get(e.pointerId) === dir) {
      this._activePointers.delete(e.pointerId);
    }
    const stillHeld = Array.from(this._activePointers.values()).includes(dir);
    if (!stillHeld) el.classList.remove('pressed');
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
}
```
Add `#btnTurbo` to `_bindTouch()` following exact same pattern:
```javascript
const turbo = document.getElementById('btnTurbo');
if (turbo) this._bindButton(turbo, 'turbo');
```

**getIntent return pattern** (`game/Controls.js` lines 48–56):
```javascript
getIntent() {
  const touchLeft  = Array.from(this._activePointers.values()).includes('left');
  const touchRight = Array.from(this._activePointers.values()).includes('right');
  return {
    left:    this._keyState.left  || touchLeft,
    right:   this._keyState.right || touchRight,
    forward: this._keyState.forward,
  };
}
```
Add turbo field following exact same OR-merge pattern:
```javascript
const touchTurbo = Array.from(this._activePointers.values()).includes('turbo');
return {
  left:    this._keyState.left  || touchLeft,
  right:   this._keyState.right || touchRight,
  forward: this._keyState.forward,
  turbo:   this._keyState.turbo || touchTurbo,
};
```

**destroy() reset pattern** (`game/Controls.js` lines 58–61):
```javascript
destroy() {
  this._keyState = { left: false, right: false, forward: false };
  this._activePointers.clear();
}
```
Extend keyState reset to include turbo:
```javascript
this._keyState = { left: false, right: false, forward: false, turbo: false };
```

---

### `game/Camera.js` — MODIFY (service, request-response)

**Analog:** self — additive extension to `follow()`

**Constructor field initialization pattern** (`game/Camera.js` lines 16–25):
```javascript
constructor(aspect) {
  this.instance = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  this._offset = new THREE.Vector3(0, 3, 8);
  this.instance.position.set(0, 3, 8);
}
```
Add shake state fields after `this._offset`:
```javascript
this._shakeAmplitude = 0;
this._shakeElapsed   = 0;
this._shakeVec       = new THREE.Vector3();  // pre-allocated — NEVER allocate in follow()
```
Constants defined above constructor (module-level, mirrors `Track.js` pool constants at lines 4–7):
```javascript
const SHAKE_DURATION  = 0.3;   // seconds (informational — decay governs actual end)
const SHAKE_DECAY     = 15;    // exp decay rate — higher = faster fade
const SHAKE_INTENSITY = 0.35;  // world units at peak
```

**follow() core lerp pattern** (`game/Camera.js` lines 34–46):
```javascript
follow(carMesh, deltaTime) {
  // .clone() is CRITICAL — localToWorld mutates the vector in place
  const targetPos = carMesh.localToWorld(this._offset.clone());

  const alpha = 1 - Math.exp(-10 * deltaTime);
  this.instance.position.lerp(targetPos, alpha);
  this.instance.lookAt(carMesh.position);
}
```
Shake offset inserts between `targetPos` computation and `lerp` call:
```javascript
follow(carMesh, deltaTime) {
  const targetPos = carMesh.localToWorld(this._offset.clone());

  // Additive shake offset (FEEL-03)
  if (this._shakeAmplitude > 0.001) {
    this._shakeElapsed += deltaTime;
    const amp = this._shakeAmplitude * Math.exp(-SHAKE_DECAY * this._shakeElapsed);
    if (amp < 0.001) {
      this._shakeAmplitude = 0;
    } else {
      this._shakeVec.randomDirection().multiplyScalar(amp);  // reuse pre-alloc'd vec
      targetPos.add(this._shakeVec);
    }
  }

  const alpha = 1 - Math.exp(-10 * deltaTime);
  this.instance.position.lerp(targetPos, alpha);
  this.instance.lookAt(carMesh.position);
}
```

**New public method** (new addition, no prior analog — simple setter):
```javascript
startShake() {
  this._shakeAmplitude = SHAKE_INTENSITY;
  this._shakeElapsed   = 0;
}
```

---

### `game/HUD.js` — MODIFY (component, request-response)

**Analog:** self — extend existing update/DOM pattern

**Constructor DOM ref pattern** (`game/HUD.js` lines 2–7):
```javascript
constructor() {
  this._scoreEl = document.getElementById('hudScore');
  this._speedEl = document.getElementById('hudSpeed');
  this._lastScore = -1;
  this._lastSpeed = -1;
}
```
Add turbo button ref and last-state tracker:
```javascript
this._turboBtnEl  = document.getElementById('btnTurbo');
this._lastTurboState = '';
```

**update() dirty-check pattern** (`game/HUD.js` lines 8–18):
```javascript
update(state) {
  const s = Math.floor(state.score);
  if (s !== this._lastScore) {
    this._scoreEl.textContent = String(s);
    this._lastScore = s;
  }
  if (state.speed !== this._lastSpeed) {
    this._speedEl.textContent = String(state.speed);
    this._lastSpeed = state.speed;
  }
}
```
Extend with turbo state dirty-check following exact same guard pattern:
```javascript
if (state.turboState !== this._lastTurboState && this._turboBtnEl) {
  this._turboBtnEl.classList.remove('boosting', 'cooling');
  if (state.turboState !== 'idle') {
    this._turboBtnEl.classList.add(state.turboState);
  }
  this._turboBtnEl.style.setProperty('--cooldown-ratio', state.turboCooldownRatio ?? 0);
  this._lastTurboState = state.turboState;
}
```

---

### `index.html` — MODIFY (config)

**Analog:** existing `#btnLeft` / `#btnRight` buttons inside `#touchControls`

**Touch button HTML pattern** (existing in index.html — btnLeft/btnRight inside #touchControls):
```html
<div id="touchControls" class="hidden">
  <button id="btnLeft"  class="touch-btn" type="button" aria-label="Virar esquerda">&#9664;</button>
  <button id="btnRight" class="touch-btn" type="button" aria-label="Virar direita">&#9654;</button>
</div>
```
Add `#btnTurbo` alongside, inside the same `#touchControls` div, between btnLeft and btnRight:
```html
<button id="btnTurbo" class="touch-btn touch-btn-turbo" type="button" aria-label="Turbo boost">TURBO</button>
```

---

### `style.css` — MODIFY (config)

**Analog:** existing `.touch-btn` styles

**Touch button CSS pattern** (existing .touch-btn in style.css — reference for sizing/positioning conventions):
Copy `.touch-btn` selector as base, then add `.touch-btn-turbo` override and state classes:
```css
.touch-btn-turbo {
  width: 20vw;
  max-width: 120px;
  min-width: 80px;
  min-height: 70px;
  font-size: 14px;
  position: relative;
  overflow: hidden;
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

.touch-btn-turbo.cooling::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%;
  height: calc(var(--cooldown-ratio, 0) * 100%);
  background: rgba(255, 238, 0, 0.25);
  pointer-events: none;
}
```

---

## Shared Patterns

### Module Structure
**Source:** `game/Car.js` lines 1–2, `game/Track.js` lines 1–2
**Apply to:** `game/ParticleSystem.js`
```javascript
import * as THREE from 'three';
// (import CANNON only if needed — ParticleSystem does not need it)
```
All game modules are ES modules with named default class export. No barrel index files.

### Constructor Dependencies
**Source:** `game/Car.js` lines 9–21, `game/Track.js` lines 15–31
**Apply to:** `game/ParticleSystem.js`
```javascript
constructor(scene, physicsWorld) {
  this._scene = scene;
  this._physicsWorld = physicsWorld;
  // ... build all pools here, never in update()
}
```
ParticleSystem takes only `scene` (no physics needed).

### Pool Discipline — Zero Runtime Allocation
**Source:** `game/Track.js` lines 38–99 (all `_build*` methods) + comment at line 4–7
**Apply to:** `game/ParticleSystem.js`
```javascript
// Pool constants — never change these after init (pool discipline)
const SEGMENT_COUNT = 12;
const SEGMENT_LENGTH = 20;
```
Build all objects (InstancedMesh, particle state array, dummy Object3D) in constructor. `burst()` and `update()` must not call `new` — only mutate pre-allocated objects.

### MeshBasicMaterial / MeshLambertMaterial Rule
**Source:** `CLAUDE.md` constraint "Never Use PBR" + `game/Car.js` line 91 + `game/Track.js` line 80
**Apply to:** `game/ParticleSystem.js`
```javascript
// Car.js — Lambert for lit objects
const mat = new THREE.MeshLambertMaterial({ color: 0x00ffff });
// Particles — Basic for zero-lighting-cost emissive sparks
const mat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
```
Never use `MeshStandardMaterial` or `MeshPhysicalMaterial`.

### DOM Dirty-Check Pattern
**Source:** `game/HUD.js` lines 9–17
**Apply to:** `game/HUD.js` turbo extension
```javascript
if (s !== this._lastScore) {
  this._scoreEl.textContent = String(s);
  this._lastScore = s;
}
```
Only write to DOM when value changes — avoids forced layout on every tick.

### Event Handler Delegation (Collision)
**Source:** `game/Car.js` lines 23–26, `game/Game.js` line 64
**Apply to:** `game/Game.js` extended `_handleCarCollision`
```javascript
// Car.js: delegates to external handler to avoid circular imports
this.body.addEventListener('collide', (event) => {
  if (this._onCollide) this._onCollide(event);
});
// Game.js: wires the handler
this.car.onCollide((event) => this._handleCarCollision(event));
```

### Haptic Guard
**Source:** MDN Web Docs pattern — no existing codebase analog
**Apply to:** `game/Game.js` as private method
```javascript
_triggerHaptic(durationMs) {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(durationMs);
  }
}
```
Always guard with `typeof ... === 'function'` — never `if (navigator.vibrate)` — because `undefined` and `false` both pass falsy checks but the function check is precise.

### Cannon-es Contact Object Reuse Warning
**Source:** cannon-es source `cannon-es.js` L12759 (event object is pooled/reused)
**Apply to:** `game/Game.js` `_handleCarCollision`
```javascript
// CORRECT — extract values immediately before any async or deferred code
const impactPos = new THREE.Vector3(
  this.car.body.position.x + event.contact.ri.x,
  this.car.body.position.y + event.contact.ri.y,
  this.car.body.position.z + event.contact.ri.z,
);
// WRONG — storing reference: this._lastContact = event.contact
// The object is reused next collision step and values will be overwritten.
```

---

## No Analog Found

All files for Phase 3 have close analogs in the existing codebase. The `ParticleSystem.js` module is new but follows the pool pattern from `Track.js` directly.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | — |

---

## Metadata

**Analog search scope:** `game/` directory (all 7 source files read)
**Files scanned:** 7 source files (Game.js, Car.js, Controls.js, Camera.js, HUD.js, Track.js, PhysicsWorld.js)
**Phase directory:** `.planning/phases/03-game-feel/`
**Pattern extraction date:** 2026-05-27
