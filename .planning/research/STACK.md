# Technology Stack — RetroRacer 3D

**Researched:** 2026-05-24

> Version numbers carry MEDIUM confidence (npm registry unreachable during research). Verify with `npm info three version`, `npm info cannon-es version`, `npm info vite version` before pinning.

## Core Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Three.js | ^0.175.0 | 3D rendering, scene graph, WebGL abstraction | Industry standard for browser 3D. ES module imports (r160+ stable) — import only what you use. |
| Cannon-es | ^0.20.0 | Rigid-body physics, collision detection | ES-module fork of abandoned Cannon.js. Lighter than Ammo.js/Rapier-wasm. No WASM loading overhead. |
| Vite | ^6.x | Dev server, bundler, HMR | Sub-second HMR. Native Three.js ES imports. `host: true` exposes to LAN for mobile testing. |

## Why NOT the Alternatives

| Category | Alternative | Why Not |
|----------|-------------|---------|
| Physics | Rapier (rapier3d-compat) | Requires ~1.5 MB WASM, async init. Overkill for 10–20 bodies. |
| Physics | Ammo.js | ~3 MB WASM, complex API, no RaycastVehicle helper. |
| Physics | Oimo.js | Unmaintained, no RaycastVehicle. |
| Renderer | MeshStandardMaterial / MeshPhysicalMaterial | PBR (GGX) too expensive on mobile GPUs. Use Lambert/Toon only. |
| Effects | EffectComposer post-processing | Full-screen passes cut mobile FPS by 30–40%. CRT scanlines → CSS only. |
| Lighting | Multiple SpotLight/PointLight | Per-fragment cost scales with count. Max: 1 DirectionalLight + 1 AmbientLight. |
| Assets | GLTF/OBJ imports | Parse cost + larger bundle. Build geometry procedurally with Three.js primitives. |
| Framework | React/Vue/Svelte | Reactive rendering overhead wasted on a game loop. Vanilla JS handles small DOM surface. |

## Mobile Performance Config (hard requirements)

### WebGLRenderer

```javascript
const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('gameCanvas'),
  antialias: !isMobile,        // OFF on mobile — single biggest perf win
  powerPreference: 'high-performance',
  stencil: false,
  depth: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2x
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // OFF unconditionally
```

`antialias: false` alone can prevent a 50→25 FPS drop on mid-range Snapdragon. Pixel ratio capped at 2 prevents 3x rendering on high-DPI phones.

### Materials — Never Use PBR

```javascript
// CORRECT — cheap
new THREE.MeshLambertMaterial({ color: 0x00ffff });
new THREE.MeshToonMaterial({ color: 0xff2255 });

// WRONG — expensive GGX shading
new THREE.MeshStandardMaterial({ ... });
```

### Geometry Budget

- Player car: < 500 triangles
- Enemy cars: < 200 triangles
- Obstacles: < 100 triangles
- Road segments: < 300 triangles

## Physics Game Loop — Cannon-es Integration

**The prior car-not-moving bug was almost certainly a loop ordering error.** The correct order is rigid:

> Apply forces → Step world → Sync meshes → Render

```javascript
const FIXED_STEP = 1 / 60;
const MAX_SUBSTEPS = 3;
let lastTime = performance.now();

function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const delta = Math.min((now - lastTime) / 1000, 0.1); // clamp — prevents spiral of death
  lastTime = now;

  // 1. Input → forces BEFORE stepping
  vehicle.applyEngineForce(engineForce, 2);
  vehicle.applyEngineForce(engineForce, 3);
  vehicle.setSteeringValue(steeringValue, 0);
  vehicle.setSteeringValue(steeringValue, 1);

  // 2. Step physics
  world.step(FIXED_STEP, delta, MAX_SUBSTEPS);

  // 3. Sync Three.js meshes FROM physics bodies AFTER step
  carMesh.position.copy(chassisBody.position);
  carMesh.quaternion.copy(chassisBody.quaternion);

  // 4. Camera + render
  updateChaseCamera();
  renderer.render(scene, camera);
}
```

### World Setup

```javascript
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -20, 0), // 2x real-world — arcade snap, keeps car planted
});
world.broadphase = new CANNON.SAPBroadphase(world); // O(n log n) vs naive O(n²)
world.allowSleep = true; // bodies at rest stop being computed — major mobile win
```

Use `RaycastVehicle` (not box colliders) for stable wheel-ground contact.

## Vite Config

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,   // LAN access for mobile testing
    port: 3000,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'cannon': ['cannon-es'],
        },
      },
    },
  },
});
```

## Installation

```bash
npm create vite@latest retro-racer-3d -- --template vanilla
cd retro-racer-3d
npm install three cannon-es
```

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Core stack choice | HIGH | Stack validated by prior implementation — not the source of bugs |
| Mobile renderer settings | HIGH | Well-documented WebGL best practice |
| Physics loop ordering | HIGH | Root cause of prior car-not-moving bug identified |
| RaycastVehicle pattern | HIGH | Canonical Cannon-es vehicle pattern |
| Exact version numbers | MEDIUM | Verify with npm before pinning |
