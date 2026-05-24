<!-- GSD:project-start source:PROJECT.md -->
## Project

**RetroRacer 3D**

Jogo de corrida 3D para web, otimizado para mobile (90% mobile, 10% desktop). Estética retrô arcade anos 80/90 com Three.js + Cannon-es + Vite. Sem login, sem backend — tudo roda no browser puro. Rebuild do zero após implementação anterior apresentar bugs irrecuperáveis de física do carro.

**Core Value:** O carro se move, responde aos controles touch e o jogador consegue completar uma fase — jogabilidade funcional antes de qualquer polimento.

### Constraints

- **Tech stack**: Three.js + Cannon-es + Vite — decisão tomada, não negociar em v1
- **Platform**: Browser-only, sem backend, sem login
- **Performance**: antialias off em mobile, pixel ratio ≤ 2, polígonos mínimos
- **Controles**: somente botões touch fixos (esq/dir) + turbo opcional — sem giroscópio
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
### Materials — Never Use PBR
### Geometry Budget
- Player car: < 500 triangles
- Enemy cars: < 200 triangles
- Obstacles: < 100 triangles
- Road segments: < 300 triangles
## Physics Game Loop — Cannon-es Integration
### World Setup
## Vite Config
## Installation
## Confidence
| Area | Level | Reason |
|------|-------|--------|
| Core stack choice | HIGH | Stack validated by prior implementation — not the source of bugs |
| Mobile renderer settings | HIGH | Well-documented WebGL best practice |
| Physics loop ordering | HIGH | Root cause of prior car-not-moving bug identified |
| RaycastVehicle pattern | HIGH | Canonical Cannon-es vehicle pattern |
| Exact version numbers | MEDIUM | Verify with npm before pinning |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
