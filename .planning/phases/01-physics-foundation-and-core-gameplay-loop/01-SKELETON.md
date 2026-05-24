# Walking Skeleton — RetroRacer 3D

**Phase:** 1
**Generated:** 2026-05-24

## Capability Proven End-to-End

A player opens the LAN dev URL on a real Android phone in landscape orientation, sees a cyan car on a scrolling neon track with HUD and bottom-corner touch buttons, taps the LEFT/RIGHT buttons to steer (the car auto-advances), crashes into an obstacle, sees a Game-Over overlay with their score, taps RETRY, and is immediately back in a fresh run — all in a single page load, with no backend and no login.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Renderer | Three.js ^0.175.0 — `WebGLRenderer({ antialias: !isMobile, stencil: false, powerPreference: 'high-performance' })`, `shadowMap.enabled = false` unconditional, `setPixelRatio(min(devicePixelRatio, 2))` | Industry standard for browser 3D; ES module + tree-shake. Antialias-off on mobile is the single biggest perf win documented in STACK.md. |
| Physics engine | Cannon-es ^0.20.0 — `CANNON.World({ gravity: Vec3(0, -20, 0) })`, `SAPBroadphase`, per-body `allowSleep` override on the car | Lighter than Ammo (~3MB WASM) and Rapier (~1.5MB WASM); no async init. ES module fork actively maintained. -20 gravity gives arcade snap (2x real-world). |
| Build tool | Vite ^6.x with `server.host = true`, `manualChunks` splitting three and cannon-es bundles | Sub-second HMR is decisive during physics debugging. `host: true` exposes the dev server to the LAN so mobile testing runs against the same build. |
| Game loop | Single `requestAnimationFrame` loop in `Game._tick`, **mandatory step order** (locked invariant): RAF schedule → delta cap (`Math.min(rawDelta, 0.05)`) → pause guard → state guard → read intent → `car.applyInput` → `track.update` → `world.step(1/60, safeDt, 3)` → `car.syncMesh` → `camera.follow` → `hud.update` → `renderer.render` | The prior implementation had loop-order bugs that produced "car stays still" symptoms. Locking this exact order as a code invariant (with inline comments) prevents regression in every later phase. |
| Car physics body | `mass: 150`, `allowSleep: false`, `linearDamping: 0.3`, `angularDamping: 0.9`, propulsion via `applyLocalForce(Vec3(0, 0, -force))` exclusively (never `applyForce`) | Four documented root causes of the prior bug (sleep / zero-mass / world-space force / sync-after-render) all eliminated as a unit by these four constraints. |
| Ground plane | `CANNON.Plane` with `quaternion.setFromEuler(-Math.PI / 2, 0, 0)` | Default Plane normal is +Z; without rotation the car falls into infinity (PITFALLS #18). |
| Track architecture | **Segment pool**: 12 fixed road segments × 20 units, repositioned (never recreated) each frame as they pass behind the camera. **Obstacle pool**: 8 fixed static-body cubes, repositioned for spawn, hidden when off-screen. Spawn rate scales with `1 / speedMultiplier`. Lateral limits: invisible CANNON walls at x = ±5.5, visible neon-cyan emissive edges at x = ±5. | Endless-runner contract; allocation during gameplay is forbidden (PITFALLS #9 draw calls and #14 memory growth). Pool architecture decided in Phase 1 even though full endless stress lives in v2. |
| Camera | `THREE.PerspectiveCamera(75, aspect, 0.1, 1000)` chase cam with **exponential smoothing** `alpha = 1 - exp(-10 * dt)`, target = `carMesh.localToWorld(Vec3(0, 3, 8))` each frame | Framerate-independent smoothing (vs delta-based lerp) keeps the lag feel consistent across devices. Avoids motion sickness from snap-tracking (PITFALLS #15). |
| Controls | `pointerdown` / `pointerup` / `pointercancel` (NOT `touchstart` — autopassive blocks `preventDefault` in Chrome 56+). State per-`pointerId` in a `Map` for true multi-touch (PITFALLS #11). Keyboard fallback (Arrow keys + WASD) is a parallel input source ORed with touch state. Auto-advance: car always receives base forward force; `forward` keyboard intent only adds a small boost for desktop testing. | Spec is mobile-first (90% mobile). `pointer*` events are the only correct primitive for touch (PITFALLS #10). Auto-advance is required because the mobile UI has only LEFT/RIGHT buttons (no on-screen forward — defer to v2 turbo design). |
| HUD | DOM overlay (`#hud`) with `pointer-events: none`; per-element textContent diff guards to avoid 60Hz style-recalc churn. Font: Press Start 2P via Google Fonts with `monospace` fallback. | Per ARCHITECTURE.md, HUD writes DOM only — no Three.js involvement. Diff guards are a free mobile perf win. |
| State machine | Phase 1 ships only two states (PLAYING ↔ GAME_OVER) in `Game.state`. Reset via DOM-toggling overlay + `car.reset()` + `track.reset()` — never a page reload (GAME-04: under 500ms). MENU and PHASE_END land in Phase 2. | Minimum viable state for the play-die-retry loop; expanding to MENU is additive in Phase 2 without restructuring. |
| Directory layout | `game/` for engine modules (Game, Car, Track, Camera, Controls, HUD, PhysicsWorld). `main.js` is glue only — no game logic. UI overlays in `index.html`; styles in `style.css`. `assets/` reserved for later (fonts ship via CDN in v1). | Mirrors the structure in inicio.md and ARCHITECTURE.md; one class per concern, no cross-component private references. |
| Mobile orientation | CSS-driven landscape via `<meta viewport>` and full-viewport canvas; no JS orientation lock (unreliable cross-browser). Rotate prompt deferred to Phase 2. | Spec calls for landscape; locking via JS is unreliable and rejected by some browsers without fullscreen. |
| Deployment target | Local Vite dev server + LAN access via `host: true`. Production build via `vite build` (no deploy automation in Phase 1). | Phase 1 success criteria explicitly require real-device testing on the LAN — production deployment is not in scope this phase. |

## Stack Touched in Phase 1

- [x] Project scaffold — Vite vanilla template, package.json with three + cannon-es + vite, manualChunks, `host: true`
- [x] Rendering — Three.js Scene/Camera/Renderer with mobile-correct config, neon palette, ambient + directional light only
- [x] Physics — Cannon-es World with gravity, ground plane (rotated), car body (mass 150, allowSleep false), obstacle bodies, lateral wall bodies
- [x] Game loop — single RAF in `Game._tick` with locked step order, delta cap, visibilitychange pause
- [x] Input — keyboard (Arrow + WASD) and multi-touch pointer events on fixed LEFT/RIGHT buttons
- [x] UI — DOM overlays for HUD (SCORE + SPEED) and Game-Over (score + RETRY button), styled with Press Start 2P pixel font
- [x] State machine — minimal PLAYING ↔ GAME_OVER with reset-without-reload
- [x] On-device run — `npm run dev` exposes a LAN URL reachable from a real Android phone

## Out of Scope (Deferred to Later Slices)

Be explicit: anything in this list is **not** in the skeleton. Future phases must not re-litigate Phase 1's minimalism.

- **Menu screen and difficulty selector** — Phase 2 (UI-01, UI-02). Phase 1 starts directly in PLAYING.
- **localStorage persistence (highscore)** — Phase 2 (STOR-01, STOR-02). Phase 1 score is per-session only; the overlay shows the just-ended run's score, no historical record.
- **WebGL context loss handler** — Phase 2 hardening. `visibilitychange` pause is in place but `webglcontextlost` / `webglcontextrestored` listeners and the "Tap to Resume" overlay land in Phase 2.
- **Phase 2 (Autodromo Arcade) and Phase 3 (Rodovia Infinita) track content** — explicitly v2 per STATE.md deferred items.
- **Turbo, particles, camera shake, haptic** — v2 game feel per STATE.md.
- **Sounds (Web Audio API)** — v2; Web Audio unlock friction on mobile is explicitly deferred.
- **Enemy AI cars** — Phase 3 / v2 (PROG-04).
- **Star rating per phase (1–3 stars)** — Phase 3 / v2 (PROG-03).
- **InstancedMesh for repeated obstacles** — Phase 3 perf optimization once endless stress is the bottleneck. Phase 1 has only 8 obstacles, so pool alone suffices.
- **Memory disposal contract per phase (`geometry.dispose()` / `material.dispose()`)** — Phase 2 hardening. Phase 1 retries do not allocate new geometry, so VRAM stays flat without explicit dispose calls.
- **Photorealistic textures, PBR materials, bloom post-processing, gyroscope/swipe controls, multiplayer, login** — explicitly out of scope per inicio.md and REQUIREMENTS.md.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton **without altering the architectural decisions above** (game loop order, physics body constraints, segment pool, camera smoothing, DOM HUD pattern, pointer-events input model).

- **Phase 2 — UI Screens, Storage, and Mobile Hardening:** Adds MENU state (with difficulty selector) before PLAYING in the state machine; wires difficulty multipliers into Track (speed, spawn rate, lane width); adds Storage module with safeGet/safeSet around localStorage; surfaces highscore on MENU; adds `webglcontextlost`/`webglcontextrestored` handlers and a "Tap to Resume" overlay. Builds entirely on the existing Game, Track, and HUD classes — no architectural shifts.
- **Phase 3+ (v2 / out of milestone):** Phase 2 Autodromo and Phase 3 Rodovia Infinita track content, enemy AI, turbo, particles, haptic, sounds, star rating, victory screen.
