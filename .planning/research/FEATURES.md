# Feature Landscape — RetroRacer 3D

**Researched:** 2026-05-24
**Confidence:** HIGH — genre conventions are stable and consistent

## Table Stakes

Features players expect. Missing any causes immediate abandonment.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Car moves and steers | Core contract of any racing game | Low | Must work before anything else ships — was the critical bug in v0 |
| Responsive touch controls | 90% mobile audience | Low-Med | Two fixed buttons (left/right) — proven pattern; avoid virtual joystick (imprecise) |
| Collision detection with outcome | Hitting something must matter; no collision = no game | Med | Box/sphere colliders sufficient; no mesh-perfect collision needed |
| Infinite/long-enough track | Endless runner contract: the track does not run out | Med | Procedural segment recycling; pool 3-5 segments ahead, despawn behind |
| Score counter visible during play | Players orient via score | Low | DOM overlay on canvas; pixel font reinforces aesthetic |
| Speed feedback | Player needs to feel acceleration | Low | Speed number in HUD + camera FOV shift |
| Game over state | Collision must end the run; no stakes = no engagement | Low | Clear transition: freeze, show score, offer retry |
| Retry without reload | Players retry 5-10x per session | Low | Reset game state in JS, never reload the page |
| 30+ FPS on mid-range Android | Below 30 FPS = unplayable | Med | antialias off, shadows off, poly budget enforced |
| Landscape orientation | Racing games always landscape | Low | CSS `orientation: landscape` + rotate prompt fallback |
| Visual lane/road boundary | Player must know track edges | Low | Colored edge lines or geometry boundary |

## Differentiators

Features that create identity and retention.

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Retro neon aesthetic (CRT/arcade) | Instantly recognizable identity; nostalgia | Low-Med | Scanline CSS overlay + Press Start 2P + neon palette; zero texture cost |
| Phase progression with distinct themes | Gives players a goal beyond score | Med | Phase 1 (Neon City), Phase 2 (Arcade Circuit), Phase 3 (Infinite Highway) each with unique palette |
| Star rating on phase completion (1-3) | Classic mobile retention loop; players replay to improve | Low | Threshold-based on time or score |
| Turbo mechanic | Skill expression; satisfying risk/reward burst | Low-Med | Short speed burst + cooldown bar in HUD |
| Haptic feedback on collision/turbo | Tactile confirmation; cheap delight | Low | `navigator.vibrate([50])` — one line |
| Enemy AI cars | Makes Phase 3 feel alive | Med | Simple lane-based spawner; no pathfinding |
| Difficulty selector at start | Pacing for casual vs. skilled players | Low | Affects speed, spawn rate, track width — 3 multiplier presets |
| localStorage highscore persistence | Personal record to beat | Low | Single JSON blob, 3 keys maximum |
| Glitch effect on logo/title | Aesthetic signature | Low | Pure CSS animation |

## Anti-Features

Things to deliberately NOT build in v1.

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Physics-accurate suspension | Tuning takes weeks; no arcade fun |
| Virtual joystick / swipe steering | Imprecise; thumb obscures view |
| Gyroscope / tilt steering | Inconsistent across devices; fatiguing |
| Multiplayer / real-time leaderboard | Requires backend, WebSockets, auth |
| Login / user accounts | Backend dependency; kills casual feel |
| IAP / monetization | Premature; corrupts design |
| Photorealistic textures / PBR | Bandwidth + GPU cost; contradicts aesthetic |
| Particle system with 100+ emitters | Kills FPS on Android; max 20-30 pooled particles |
| Sound in v1 | Web Audio API unlock friction on mobile — defer to v2 |
| Bloom post-processing (`UnrealBloomPass`) | Kills mobile framerate; use emissive color instead |

## Core Gameplay Loop

```
Start run
  → Steer to avoid obstacles/enemies
  → Score ticks up with distance
  → Use turbo for burst (risk: less reaction time, reward: faster score)
  → Collision ends run
End run
  → See score, compare to personal best
  → 1-3 stars if in phase mode
  → Retry (one tap, instant reset)
```

**Critical constraint:** Time from "game over" to "playing again" must be under 500ms felt latency.

## HUD Elements

| Element | Position | Notes |
|---------|----------|-------|
| Score counter | Top center | Pixel font, ticks with distance |
| Speed indicator | Top or bottom | Numeric km/h |
| Phase indicator | Top-left | "FASE 1" or phase name |
| Turbo cooldown bar | Near turbo button | Depletes and refills |
| Star progress | Top area | 3 hollow stars fill as thresholds met |

**Do NOT add:** minimap, tachometer needle, health bar (unless lives system designed).

## Mobile Touch Control Patterns

**What works:**
- Fixed large buttons bottom corners (40-50% screen width) — muscle memory
- Visual press state (highlight/scale on active)
- `pointerdown`/`pointerup` — unified mouse+touch, fewer edge cases than touchstart/end
- `touch-action: none` on canvas — prevents scroll/zoom interference

**What doesn't work:**
- Small buttons (< 80px) — miss-taps blame the game
- Buttons repositioning on viewport changes
- Turbo on swipe gesture — accidental triggers

## Scoring System

```
score = distance_units × speed_multiplier × difficulty_multiplier
```

| Difficulty | Base Speed | Enemy Density | Track Width | Score Multiplier |
|------------|------------|---------------|-------------|------------------|
| Easy | 0.6x | Low | Wide | 0.8x |
| Medium | 1.0x | Medium | Normal | 1.0x |
| Hard | 1.5x | High | Narrow | 1.5x |

## Critical Path to MVP

```
Core physics → Car movement → Touch controls → Track generation → Collision → Game over → Score
```

Everything else (turbo, stars, enemy AI, Phase 2/3, highscores) is additive on this path.

## Open Questions

- Specific score thresholds for 1/2/3 stars — requires playtesting to calibrate
- Is Phase 2 (Autodromo) endless or lap-based? Spec implies circuit with laps — different win condition needed
- Turbo cooldown duration: 3s vs 5s changes skill expression significantly
