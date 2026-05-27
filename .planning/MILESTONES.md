# Milestones: RetroRacer 3D

---

## v1.0 — MVP

**Shipped:** 2026-05-27
**Phases:** 1–2 | **Plans:** 8 | **Timeline:** 2026-05-23 → 2026-05-27 (4 days)
**LOC:** ~5,500 JS + CSS + HTML

**Delivered:** Jogo de corrida 3D arcade totalmente jogável no browser — carro com física coerente, pista infinita, controles touch, menu com dificuldade, highscore persistido e proteção contra perda de contexto WebGL.

**Key accomplishments:**
1. Quatro causas simultâneas de carro parado (prior impl) corrigidas em 01-01 — carro move em input no primeiro run
2. Track recycling por posição relativa (carZ) — evita bug de reciclagem que quebrava em score ~120
3. HUD pixel-font com Press Start 2P + controles multi-touch via Pointer Events API
4. Menu completo com FÁCIL/MÉDIO/DIFÍCIL (speedMultiplier 0.75/1.0/1.4, obstacleCount 6/9/12)
5. Highscore persistido com NOVO RECORDE badge e exibição no menu
6. WebGL context loss handler (event.preventDefault() + TOQUE PARA RECARREGAR overlay)

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`
