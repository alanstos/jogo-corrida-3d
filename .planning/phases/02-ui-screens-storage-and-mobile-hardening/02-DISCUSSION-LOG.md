# Phase 2: UI Screens, Storage, and Mobile Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 02-ui-screens-storage-and-mobile-hardening
**Areas discussed:** Menu & game flow

---

## Menu & Game Flow

### Q1: When does Game initialize?

| Option | Description | Selected |
|--------|-------------|----------|
| Game boots behind menu | Game constructor runs immediately, RAF starts on INICIAR. Reuses .overlay pattern. | ✓ |
| Game inits on INICIAR click | No canvas until INICIAR pressed. Lighter menu, but ~100ms init delay before gameplay. | |

**User's choice:** Game boots behind menu (Recommended)
**Notes:** `game.start(difficulty)` called on INICIAR click.

---

### Q2: After game-over, where does RETRY go?

| Option | Description | Selected |
|--------|-------------|----------|
| Back to menu | Both RETRY and MENU return to menu. Player can change difficulty. Highscore shows on menu. | ✓ |
| Restart directly | RETRY restarts gameplay immediately (current behavior). No way to change difficulty without page refresh. | |

**User's choice:** Back to menu (Recommended)
**Notes:** Game-over will show score + highscore badge. Both RETRY and MENU lead to menu.

---

### Q3: Canvas behind menu

| Option | Description | Selected |
|--------|-------------|----------|
| Dark background | Canvas renders `#1a0033` scene behind menu. Zero extra work. | ✓ |
| No canvas render while on menu | RAF doesn't run during menu. Saves GPU, but slight flicker on start. | |

**User's choice:** Just the dark background (Recommended)
**Notes:** No attract-mode animation needed for Phase 2.

---

### Q4: First-run highscore display

| Option | Description | Selected |
|--------|-------------|----------|
| Hide record section | If no localStorage record, RECORD line not rendered on menu. | ✓ |
| Show 0 as placeholder | Always show RECORD: 0 from the start. | |

**User's choice:** Hide record section (Recommended)
**Notes:** Cleaner first-run experience.

---

## Claude's Discretion

- **Difficulty numbers:** Fácil (0.75×, 6 obstacles) / Médio (1.0×, 8) / Difícil (1.4×, 12)
- **Context loss strategy:** DOM overlay + tap-to-reload (not full auto-recovery)
- **localStorage schema:** Only `melhorPontuacao` in Phase 2; tempo and fasesCompletadas deferred

## Deferred Ideas

- Melhor tempo, fases completadas, resetar recordes → v2
- Stars on game over, PRÓXIMA FASE button → v2 (PROG-03)
- Logo glitch CSS animation → v2 (POLISH-03)
- Turbo/boost → v2 (FEEL-01)
- Enemy cars → v2 (PROG-04)
