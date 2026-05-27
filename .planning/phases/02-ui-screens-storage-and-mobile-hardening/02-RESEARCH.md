# Phase 2 Research: UI Screens, Storage, and Mobile Hardening

**Researched:** 2026-05-25
**Codebase read:** Game.js, Track.js, main.js, index.html, style.css, HUD.js, all planning artifacts
**Confidence:** HIGH — all findings are direct codebase analysis or well-established browser APIs

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Game constructor runs on page load; RAF starts only when INICIAR is pressed via `game.start(difficulty)`
- D-02: Menu is a DOM overlay using `.overlay.hidden` pattern
- D-03: Dark `#1a0033` background — no attract animation
- D-04: Both RETRY and MENU return to menu; no direct restart
- D-05: Game-over shows score + "NOVO RECORDE!" badge if new high score
- D-06: RECORD line hidden on menu until first score saved
- D-07: Fácil (0.75×, 6 obstacles) / Médio (1.0×, 8) / Difícil (1.4×, 12)
- D-08: Context loss — webglcontextlost + tap-to-reload overlay; webglcontextrestored re-init attempt
- D-09: localStorage schema — only `melhorPontuacao` in Phase 2; safeGet/safeSet with try/catch

### Claude's Discretion
- Difficulty values (confirmed above in D-07)
- Context loss strategy (confirmed above in D-08)
- localStorage schema detail (confirmed above in D-09)

### Deferred Ideas (OUT OF SCOPE)
- Melhor tempo, fases completadas, "Resetar recordes" button
- Stars on game over, PRÓXIMA FASE button
- Logo glitch CSS animation
- Turbo/boost, enemy cars, phase backgrounds
</user_constraints>

---

## 1. DOM Overlay Sequencing

### Current state
`main.js` calls `game.start()` immediately after construction — RAF begins on page load. There is no menu state.

### Required change to `main.js`
```javascript
// AFTER refactor
import Game from './game/Game.js';

function init() {
  const game = new Game(document.getElementById('gameCanvas'));
  // Do NOT call game.start() here — wait for INICIAR

  const menuEl = document.getElementById('menu');
  const btnIniciar = document.getElementById('btnIniciar');
  // difficulty tracking lives in main.js (or Game holds it — see section 2)

  btnIniciar.addEventListener('pointerup', () => {
    const difficulty = /* read selected difficulty from DOM */ getDifficulty();
    menuEl.classList.add('hidden');
    game.start(difficulty);
  });
}
```

**Who owns the INICIAR listener:** `main.js` is the correct owner. It is the orchestration layer. `Game.js` should not reference `#btnIniciar` — that would couple the game engine to a specific DOM structure. `main.js` reads the selected difficulty from the DOM and passes it as an argument to `game.start(difficulty)`.

### MENU state in `_tick()`
The RAF loop must NOT start before `game.start()` is called (D-01). Therefore, `_tick()` does not need to handle a MENU state during the menu phase — the loop simply is not running. When the player is on the menu, there is no active RAF. The canvas renders its initial dark purple scene once during constructor (Three.js renders nothing implicitly — the canvas stays `#1a0033` from `body` background CSS because the renderer hasn't rendered a frame yet).

**Implication:** No MENU guard is needed in `_tick()`. The state machine for `_tick()` remains: PLAYING runs everything; GAME_OVER renders frozen frame only. When game ends and player goes back to menu, `stop()` or equivalent halts the RAF.

### Showing the menu on load
The `#menu` overlay must NOT have `class="hidden"` in HTML. It is visible by default. The game-over overlay and context-loss overlay must start hidden. This is the opposite of the current game-over div which starts `hidden`.

### Back-to-menu path (from game-over)
1. Player taps RETRY or MENU button on game-over overlay
2. Game-over overlay gets `.hidden` added
3. `game.reset()` is called (resets car, track, score)
4. RAF is cancelled via a new `game.stop()` call (or `game.returnToMenu()`)
5. Menu overlay gets `.hidden` removed

The RAF must be cancelled when returning to menu. A live RAF loop during the menu wastes GPU when D-03 explicitly says no attract animation is needed.

**Risk:** The current `reset()` method does NOT cancel the RAF — it only resets state and flips `this.state = 'PLAYING'`. A new method `returnToMenu()` must cancel RAF and show menu. Do not reuse `reset()` for this path.

---

## 2. Difficulty Parameterization

### What needs to change in `Track.js`
`OBSTACLE_COUNT = 8` is a module-level constant on line 8. It is referenced only in `_buildObstaclePool()` on line 81.

**Minimal change — make it a constructor parameter:**
```javascript
// Track.js constructor signature change
constructor(scene, physicsWorld, obstacleCount = 8) {
  // ...
  this._obstacleCount = obstacleCount;
  // ...
  this._buildObstaclePool();  // uses this._obstacleCount internally
}

_buildObstaclePool() {
  for (let i = 0; i < this._obstacleCount; i++) {
    // unchanged pool build logic
  }
}
```

The module-level `const OBSTACLE_COUNT = 8` can remain as documentation but must not be used in the loop — only `this._obstacleCount` is used.

### How `speedMultiplier` propagates
`Track.update()` already accepts `speedMultiplier` as its second parameter (line 125 of Track.js). The call site in `Game._tick()` passes `1.0` hardcoded (line 186). This just needs to become `this._speedMultiplier` stored on Game.

### `game.start(difficulty)` signature
```javascript
// Game.js
start({ speedMultiplier = 1.0, obstacleCount = 8 } = {}) {
  this._speedMultiplier = speedMultiplier;
  // Track was already constructed in constructor with default 8
  // BUT: if obstacleCount differs, Track pool must match
  // ...
  this._lastTime = performance.now();
  this._rafHandle = requestAnimationFrame((ts) => this._tick(ts));
}
```

**Critical problem: Track is constructed in the Game constructor before difficulty is known (D-01).** The obstacle pool is built at construction time with a fixed size. If the player picks Difícil (12 obstacles) but Track was built with 8, the pool is too small.

**Solution options:**

A. Build Track with MAX pool size (12) always, use `obstacleCount` only to limit active spawning. Pool has 12 slots; Fácil only spawns from 6.

B. Rebuild Track on each `start(difficulty)` call (destroy old physics bodies, create new pool).

C. Build Track lazily — not in constructor, but in `start()`.

**Recommended: Option A.** It is the least disruptive. The pool size difference (8 vs 12 bodies) is negligible for physics performance. `Track.js` builds 12 bodies in constructor; `this._activeLimit` caps how many can be active at once; spawn logic checks `active count < this._activeLimit` instead of pool exhaustion.

```javascript
// Track constructor: always builds MAX (12) pool bodies
// Track gets obstacleCount only to set the active limit
setDifficulty(obstacleCount) {
  this._activeLimit = obstacleCount;
}
```

Then in `_trySpawnObstacle`: replace `this._obstacles.find(o => !o.active)` with a check that also counts active obstacles against `this._activeLimit`.

### Does `Track.reset()` need difficulty params?
Yes (D-04: player can change difficulty between runs). When player returns to menu and picks a new difficulty, `game.start(newDifficulty)` is called again. `reset()` itself does not need params — difficulty is set via `track.setDifficulty(obstacleCount)` before `reset()` runs. Order:

```
game.start(difficulty)
  → this._speedMultiplier = difficulty.speedMultiplier
  → this.track.setDifficulty(difficulty.obstacleCount)
  → this.track.reset()                    // resets positions and timers, not pool
  → this.car.reset()
  → this.score = 0
  → RAF starts
```

---

## 3. localStorage safeGet/safeSet

### Failure modes that must be caught
- `localStorage` throws in private browsing / Safari ITP when storage quota is 0
- `JSON.parse(null)` throws if key was never set (returns `null`)
- `JSON.parse(undefined)` throws
- `localStorage.setItem()` throws `QuotaExceededError` when storage is full
- Corrupt stored value (e.g., hand-edited): `JSON.parse` throws

### Correct pattern
```javascript
// game/Storage.js — standalone module (not inside Game.js)
export function safeGet(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (_e) {
    return defaultValue;
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_e) {
    // Silent fail — private browsing or quota exceeded
    // Do not propagate; loss of highscore is acceptable degradation
  }
}
```

### Where to put the helpers
**Standalone module: `game/Storage.js`** — this matches the architecture spec in `inicio.md` and `ARCHITECTURE.md` which both list `Storage.js` as a planned component. Game.js imports from Storage.js, not the reverse.

### When to read vs. write
- **Read:** In `Game` constructor, after all DOM setup. Store `this._highScore = safeGet('melhorPontuacao', 0)`. This initializes once and populates the menu RECORD display.
- **Write:** In `_handleCarCollision()`, immediately after confirming `this.score > this._highScore`. Write before showing the game-over overlay, so the badge logic and the stored value are always in sync.

```javascript
// In _handleCarCollision, after confirming obstacle hit:
const finalScore = Math.floor(this.score);
const isNewRecord = finalScore > this._highScore;
if (isNewRecord) {
  this._highScore = finalScore;
  safeSet('melhorPontuacao', finalScore);
}
// Then show game-over overlay, passing isNewRecord to control badge visibility
```

---

## 4. "NOVO RECORDE!" Badge

### When to show vs. hide
The badge element exists in the DOM always (inside `#gameOver .overlay-inner`). It is shown/hidden per-run. Toggle a `hidden` class on the badge element — same `.hidden { display: none }` pattern already in `style.css`.

```javascript
// In _handleCarCollision (or a _showGameOver helper):
this._goRecordBadgeEl.classList.toggle('hidden', !isNewRecord);
```

`classList.toggle(cls, force)` — the boolean `force` arg: `true` adds the class, `false` removes it. `!isNewRecord` means: add `hidden` when it is NOT a new record.

### DOM structure that fits `.overlay-inner`
`.overlay-inner` is a flex column with `gap: 24px` and `align-items: center`. The badge fits as a sibling `<p>` between the score and the buttons:

```html
<div id="gameOver" class="overlay hidden" aria-hidden="true">
  <div class="overlay-inner">
    <h1 class="go-title">GAME OVER</h1>
    <p class="go-score">SCORE: <span id="goScoreValue">0</span></p>
    <p id="goRecordBadge" class="go-record-badge hidden">NOVO RECORDE!</p>
    <p class="go-highscore">RECORDE: <span id="goHighScoreValue">0</span></p>
    <button id="menuButton" type="button">MENU</button>
  </div>
</div>
```

**Note:** The existing `#retryButton` is renamed to `#menuButton` (or kept as MENU). Per D-04, both RETRY and MENU go to menu — there is only one button needed unless the design explicitly wants two labeled differently. CONTEXT.md says "Both RETRY and MENU buttons return to menu" which implies two separate buttons in the overlay. The safer reading: keep a MENU button labeled "MENU" and optionally add a RETRY button also labeled — both trigger `game.returnToMenu()`.

### CSS for the badge
```css
.go-record-badge {
  margin: 0;
  color: #ffee00;
  font-size: 18px;
  text-shadow: 0 0 10px #ffee00;
  animation: none; /* v2 — glitch/pulse deferred */
}
```

No animation in Phase 2 (glitch effect is deferred per CONTEXT.md deferred section).

---

## 5. WebGL Context Loss

### `event.preventDefault()` — what it does and why required
On `webglcontextlost`, calling `event.preventDefault()` tells the browser "I want to restore this context, do not discard it." Without it, Chrome/Android permanently destroys the WebGL context and `webglcontextrestored` never fires. This is a browser-level protocol, not a Three.js concern.

```javascript
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault(); // MANDATORY — must be first line of handler
  this._paused = true;
  this._contextLossEl.classList.remove('hidden');
}, false);
```

`false` (third arg) — use bubbling phase, not capture. Standard for this event.

### What must be recreated on `webglcontextrestored`
Three.js WebGLRenderer internally holds references to WebGL objects (programs, buffers, textures) that are invalidated when context is lost. After context restore:

- The renderer's internal state is corrupted but the JS object still exists
- Three.js r152+ has `renderer.forceContextRestore()` which triggers internal re-upload of all GPU resources — [ASSUMED based on Three.js changelog knowledge; verify against current r175 docs before implementing]
- Geometry `BufferAttribute` data and material uniforms live in CPU memory and survive context loss — they are re-uploaded automatically on next render after `forceContextRestore()`
- The scene graph (meshes, lights) lives in JS and is unaffected
- Physics world (Cannon-es) is entirely CPU-side — completely unaffected

**Minimum viable re-init sequence:**
```javascript
canvas.addEventListener('webglcontextrestored', () => {
  try {
    this.renderer.forceContextRestore(); // re-uploads GPU resources
    this._contextLossEl.classList.add('hidden');
    this._paused = false;
    // RAF is still running (Step 1 of _tick schedules next frame),
    // so unpausing is sufficient
  } catch (e) {
    // forceContextRestore failed — keep overlay visible
    // Player must reload the page
    console.error('[context restore failed]', e);
  }
}, false);
```

If `forceContextRestore()` does not exist on the installed Three.js version, the fallback is `window.location.reload()` — always survivable.

### Should the context-loss overlay block touch controls?
Yes. The overlay must sit at `z-index` above the touch controls (`z-index: 75` currently) and have `pointer-events: auto`. This prevents accidental game input while the context is dead. The overlay copy "TOQUE PARA RECARREGAR" implies tapping the overlay itself triggers reload — wire `pointerup` on the overlay div to `window.location.reload()` as the fallback if `webglcontextrestored` does not fire or re-init fails.

```javascript
this._contextLossEl.addEventListener('pointerup', () => {
  window.location.reload();
});
```

This is a safety net only — primary path is the `webglcontextrestored` handler.

---

## 6. State Flow: MENU → GAME_OVER → MENU

### Correct order of operations for each transition

**INICIAR pressed (MENU → PLAYING):**
1. `menuEl.classList.add('hidden')` — hide menu overlay (fires before RAF starts, no race condition)
2. `game.start(difficulty)` — sets `_speedMultiplier`, calls `track.setDifficulty()`, calls `track.reset()`, calls `car.reset()`, sets `this.state = 'PLAYING'`, starts RAF

**Obstacle hit (PLAYING → GAME_OVER):**
1. `this.state = 'GAME_OVER'` — immediately stops physics path on next tick
2. Compute `isNewRecord`, conditionally write localStorage, update `this._highScore`
3. Set `#goScoreValue` textContent
4. Toggle `#goRecordBadge` hidden class
5. Show `#goHighScoreValue` (the persisted record, for comparison)
6. `this._gameOverEl.classList.remove('hidden')` — show game-over overlay
7. `this._gameOverEl.setAttribute('aria-hidden', 'false')`

**MENU or RETRY button tapped (GAME_OVER → MENU):**
1. `this._gameOverEl.classList.add('hidden')` — hide game-over overlay
2. Cancel RAF: `cancelAnimationFrame(this._rafHandle); this._rafHandle = null`
3. `this.state = 'MENU'` — (or any non-PLAYING value; loop is stopped so this is informational)
4. Update menu RECORD display with new `this._highScore`
5. `menuEl.classList.remove('hidden')` — show menu overlay

**Important:** Steps 2 and 5 must not be swapped. Cancel RAF before showing menu to ensure there is no one stray frame rendered with wrong state.

### Camera/physics while canvas renders behind menu
When RAF is stopped, the Three.js scene is frozen on the last rendered frame. The canvas is visible behind the dark menu overlay (`rgba(26, 0, 51, 0.85)` background). The car, track, and obstacles are visible but static — this is intentional and acceptable (D-03: no attract animation). Physics is CPU-only and does nothing without `world.step()` being called, so Cannon-es poses are also frozen. No reset of camera or physics positions is needed while on the menu.

### Do car/physics need resetting before going back to menu?
No — they should be reset at `game.start()` time, not at menu-display time. This way, when the player goes from GAME_OVER to menu, the frozen last frame is still visible behind the overlay (which looks fine through the semi-transparent overlay). When they press INICIAR, `start()` resets to initial positions. If car position were reset before menu shows, the frozen canvas would snap to a reset position while the menu is still visible — a minor but unnecessary visual artifact.

---

## 7. Mobile-Specific Pitfalls

### `pointerup` vs `click` for INICIAR and difficulty buttons
Use `pointerup` on all interactive overlay buttons. This is already the established pattern in Game.js (retryButton uses `pointerup`). On Android Chrome, `click` has a 300ms delay on elements without `touch-action: manipulation` or `user-scalable=no`. Since the viewport meta already has `user-scalable=no`, `click` would technically work — but `pointerup` is more consistent and is the established project convention. Do not mix `click` and `pointerup` in the same codebase.

**Exception:** Do NOT use `pointerdown` for INICIAR — it fires before the finger lifts and can trigger accidental starts if the player's palm grazes the button while picking up the phone.

### `touch-action: none` placement
New overlay buttons need `touch-action: none` to prevent browser scroll gestures from intercepting the touch sequence. Pattern from existing `#retryButton`:
```css
#btnIniciar, .difficulty-btn, #btnMenu, #btnRetry {
  touch-action: none;
}
```
The canvas already has `touch-action: none` on `#gameCanvas`. The overlay containers (`#menu`, `#gameOver`) do not need it because they use `pointer-events: auto` and the browser won't scroll a fixed-position fullscreen overlay anyway.

### `passive: false` for overlay buttons
Not needed. `pointerup` is never passive by default (only `touchstart`/`touchmove` are auto-passive in Chrome 56+). The overlay buttons do not need `{ passive: false }` in their `addEventListener` calls. This was a concern for the game canvas touch controls, not for regular button elements.

### Difficulty selector highlight on mobile
The difficulty selector needs clear visual state — current selection must be highlighted. Use a CSS class toggle (`.selected` or `.active`) rather than relying on `:active` pseudo-class, which only fires during the press and does not persist. On mobile, `:focus` does not persist either after tap. Store selection in JS and apply a class.

```javascript
let selectedDifficulty = 'medio'; // default (D-07)
difficultyBtns.forEach(btn => {
  btn.addEventListener('pointerup', () => {
    difficultyBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedDifficulty = btn.dataset.difficulty;
  });
});
```

### `aria-hidden` on menu overlay
The game-over overlay already uses `aria-hidden="true/false"` toggling. Apply the same pattern to the menu overlay so assistive technology does not read the menu content when it is hidden (and vice versa).

### Safari private browsing: localStorage throws on access, not on quota exceeded
On Safari in private mode, `localStorage` is defined but `setItem` throws immediately (QuotaExceededError with quota 0). `getItem` returns `null` without throwing. Both `safeGet` and `safeSet` wrappers handle this correctly as documented in section 3.

---

## Key Integration Points

| File | What Changes | Risk |
|------|-------------|------|
| `main.js` | Remove `game.start()` call; add INICIAR listener + difficulty read; pass difficulty to `game.start()` | LOW — small orchestration change |
| `game/Game.js` | `start()` signature accepts difficulty object; add `returnToMenu()` method; `_handleCarCollision` writes localStorage + controls badge; store `this._highScore`; wire context-loss listeners in constructor | MEDIUM — multiple additions, no logic removal |
| `game/Track.js` | Constructor accepts `obstacleCount = 8` param (or max-pool + `setDifficulty()`); `_trySpawnObstacle` checks active count against limit | LOW — localized change, pool is still built once |
| `game/Storage.js` | New file: `safeGet` + `safeSet` exports | LOW — net new, no side effects |
| `index.html` | Add `#menu` overlay with logo, `#btnIniciar`, difficulty buttons; add `#goRecordBadge` and `#goHighScoreValue` inside `#gameOver`; add `#contextLoss` overlay; rename/add menu/retry buttons in game-over | LOW — additive DOM changes |
| `style.css` | Add `.selected` for difficulty buttons; `.go-record-badge`; `#contextLoss` overlay style; `#btnIniciar` tap target sizing; difficulty button styles | LOW — additive CSS |

---

## Pitfalls to Flag in Plan

1. **RAF must be STOPPED when returning to menu.** The current `reset()` does not cancel RAF — it flips state to PLAYING. A `returnToMenu()` method is required. If RAF keeps running during menu, physics and track keep ticking invisibly, wasting CPU/GPU and causing score accumulation.

2. **Track obstacle pool size vs. difficulty.** Build the pool at MAX size (12) in the constructor, not at the difficulty-selected size. The constructor runs before difficulty is known. Use a runtime active-count limit to cap spawning per difficulty level.

3. **`event.preventDefault()` on `webglcontextlost` must be the first line.** If any synchronous code before it throws an exception, the default is not prevented and context recovery is impossible. Put `event.preventDefault()` as the literal first statement.

4. **Do not reset car/track position when returning to menu.** Reset at `game.start()` time only. Resetting at menu-show time causes a visible snap in the frozen canvas behind the semi-transparent menu overlay.

5. **`localStorage.getItem()` returns `null` (not `undefined`) when key is absent.** `JSON.parse(null)` returns `null` (does not throw). The `safeGet` wrapper must check `raw === null` before passing to `JSON.parse`, otherwise `null` is returned as the value instead of `defaultValue`.

6. **Difficulty button selection must use a JS-toggled CSS class**, not `:active` or `:focus` pseudo-classes. Mobile browsers do not persist these states after tap. Without a persistent `.selected` class, the user cannot see which difficulty is currently selected after lifting their finger.

7. **Game-over overlay rename: RETRY → MENU (or add MENU button).** The current `#retryButton` triggers `reset()` which goes back to PLAYING state. Per D-04, it must instead trigger `returnToMenu()`. Either rename the button or add a second button. Both must call `returnToMenu()`, not `reset()`.

8. **`webglcontextrestored` may fire before the canvas is ready.** The handler should re-render one frame after restoring (call `this.renderer.render(this.scene, this.camera.instance)`) before unpausing the loop, to verify GPU state is valid before RAF resumes.

9. **`safeSet` must be called before showing the game-over overlay**, not after. If the overlay show triggers any re-render or reflow before the write completes (unlikely but possible in a tight frame), the badge and stored value could diverge. Write first, then show.

10. **HUD and touch controls must be hidden while menu is showing.** Currently HUD and touch controls are always visible in HTML. Add `.hidden` to them on load; reveal them only when `game.start()` is called. Showing touch controls behind the menu overlay is visually wrong and could confuse tap targets.
