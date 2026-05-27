# Roadmap: RetroRacer 3D

## Milestones

- ✅ **v1.0 MVP** — Phases 1–2 (shipped 2026-05-27)
- 📋 **v2.0 Content & Polish** — Phases 3–7 (in planning)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–2) — SHIPPED 2026-05-27</summary>

- [x] Phase 1: Physics Foundation and Core Gameplay Loop (3/3 plans) — completed 2026-05-25
- [x] Phase 2: UI Screens, Storage, and Mobile Hardening (5/5 plans) — completed 2026-05-26

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 📋 v2.0 Content & Polish

- [ ] **Phase 3: Game Feel** — Turbo, partículas, camera shake, haptic + cleanup console.log
- [ ] **Phase 4: Fase 2 — Autodromo Arcade** — nova pista com curvas selecionável no menu
- [ ] **Phase 5: Fase 3 — Rodovia Infinita** — pool de segmentos tamanho fixo, zero alloc runtime
- [ ] **Phase 6: AI Cars + Stars** — inimigos lane-based + sistema 1-3 estrelas por fase
- [ ] **Phase 7: Sons 8-bit** — Web Audio API + botão mudo persistido

## Phase Details

### Phase 3: Game Feel
**Goal**: O jogo recompensa o jogador com feedback sensorial imediato — turbo ativável, partículas na colisão, camera shake e vibração haptic.
**Depends on**: Phase 2 (game loop, colisão, HUD, storage estabelecidos)
**Requirements**: FEEL-01, FEEL-02, FEEL-03, FEEL-04
**Tech debt covered**: Remover `console.log` periódico em `Game.js` ~L276

**Plans** (5 planos estimados):
1. `03-01-remove-console-log-debt` — remover log periódico de Game.js; verificar ausência de logs em produção
2. `03-02-implement-turbo-boost` — botão TURBO na HUD (touch + teclado), lógica 2s boost / 5s cooldown, indicador visual de cooldown no botão
3. `03-03-add-collision-particles` — sistema de partículas pooladas (≤20, MeshBasicMaterial), burst ao colidir, zero alloc runtime
4. `03-04-add-camera-shake` — offset noise no lerp target da câmera por ~300ms pós-colisão, retorno suave
5. `03-05-add-haptic-feedback` — `navigator.vibrate()` no turbo (50ms) e colisão (100ms), fallback silencioso

**Success Criteria** (o que deve ser verdade ao final):
1. Jogador pressiona TURBO no mobile, sente vibração e o indicador de cooldown bloqueia reativação pelos 5s seguintes
2. Toda colisão produz burst de partículas visível + camera shake + vibração — sem queda de FPS (medido via DevTools no Chrome mobile)

**UI hint**: yes

---

### Phase 4: Fase 2 — Autodromo Arcade
**Goal**: Uma segunda pista com curvas é selecionável no menu e oferece visual e desafio distintos da Fase 1.
**Depends on**: Phase 3 (game feel aplicado a todas as fases), Phase 2 (fase selector no menu)
**Requirements**: PROG-01

**Plans** (4 planos estimados):
1. `04-01-track-curve-segments` — novos segmentos de pista angulados em `Track.js` (ou subclasse), geometria compatível com pool de reciclagem por carZ relativo
2. `04-02-autodromo-theme` — paleta visual distinta: asfalto escuro, grades de corrida, guarda-corpos temáticos (MeshLambertMaterial, < 300 tri/segmento)
3. `04-03-wire-phase2-to-menu` — Fase 2 aparece na tela de seleção de fase, carrega Track e obstáculos corretos ao iniciar
4. `04-04-playtest-phase2-tuning` — ajuste de curva, dificuldade, spawn de obstáculos; certificar reciclagem de segmento sem pop/gap

**Success Criteria**:
1. Jogador seleciona "Fase 2" no menu, inicia a corrida e vê pista com segmentos curvos e visual temático diferente da Fase 1
2. Pista recicla segmentos corretamente (sem gap, sem falha de física) ao longo de pelo menos 500 unidades de distância

---

### Phase 5: Fase 3 — Rodovia Infinita
**Goal**: Uma terceira pista pré-aloca todo o pool no init — uso de memória estável e zero alocação em runtime após carregamento.
**Depends on**: Phase 4 (Fase 2 validou padrão multi-fase, menu de seleção funcional)
**Requirements**: PROG-02

**Plans** (3 planos estimados):
1. `05-01-fixed-pool-track` — implementar `Track` com pool de tamanho fixo pré-alocado no construtor; benchmark heap (Chrome DevTools Memory tab) antes e depois para confirmar zero alloc
2. `05-02-rodovia-theme` — visual de rodovia aberta: linhas de pista mais largas, horizonte diferente, paleta diurna ou noturna distinta das fases 1-2 (MeshLambertMaterial)
3. `05-03-wire-phase3-to-menu` — Fase 3 selecionável no menu, inicia com pool correto; regressão rápida das fases 1 e 2

**Success Criteria**:
1. Após carregamento da Fase 3, snapshot de heap no Chrome DevTools não mostra alocações crescentes durante gameplay normal por 60s
2. Jogador consegue jogar Fase 3 do menu sem recarregar a página — fases 1 e 2 ainda funcionam na mesma sessão

---

### Phase 6: AI Cars + Stars
**Goal**: Carros inimigos criam obstáculos dinâmicos em lanes e o sistema de 1-3 estrelas motiva re-plays com metas por dificuldade.
**Depends on**: Phase 5 (todas as 3 pistas existem; colisão = game over já funciona)
**Requirements**: PROG-03, PROG-04

**Plans** (5 planos estimados):
1. `06-01-enemy-car-pool` — pool de carros inimigos (tamanho fixo, construção no init), mesh < 200 tri, sincronização posição sem física Cannon-es (cinemático)
2. `06-02-enemy-spawn-logic` — spawn em lanes aleatórias à frente do jogador, velocidade levemente abaixo do jogador, despawn ao passar para trás; taxa controlada por dificuldade
3. `06-03-enemy-collision-detection` — detecção de colisão jogador ↔ inimigo (AABB ou distância), dispara game over + efeitos de Phase 3 (partículas, shake, haptic)
4. `06-04-star-rating-criteria` — definir thresholds de distância-score por fase × dificuldade para 1/2/3 estrelas; persistir melhor resultado por fase via safeSet
5. `06-05-star-rating-ui` — exibir estrelas ganhas no overlay game-over; exibir melhor avaliação salva na tela de seleção de fase

**Success Criteria**:
1. Inimigo aparece em lane à frente do jogador, avança, e colisão termina a corrida com partículas/shake — sem crash ou spawn fora da pista
2. Ao terminar uma corrida, o jogador vê quantas estrelas ganhou baseado na distância; re-jogar com score maior atualiza a avaliação exibida na seleção de fase

**UI hint**: yes

---

### Phase 7: Sons 8-bit
**Goal**: O jogo tem trilha sonora de motor, som de turbo e som de colisão em 8-bit sintetizados via Web Audio API — silenciáveis e sem erro de autoplay bloqueado.
**Depends on**: Phase 6 (todos os eventos de gameplay existem: turbo, colisão, game over)
**Requirements**: POLISH-01, POLISH-02

**Plans** (4 planos estimados):
1. `07-01-audio-engine` — módulo `AudioEngine.js`: contexto Web Audio API, unlock na primeira interação (pointerdown/touchstart/keydown), sem erro se autoplay bloqueado
2. `07-02-synthesize-sounds` — sintetizar 3 sons 8-bit com Web Audio (OscillatorNode/GainNode): motor loop (sawtooth com pitch dinâmico por velocidade), turbo (frequency sweep), colisão (noise burst)
3. `07-03-mute-button` — botão de mudo na HUD (ícone), toggle silencia/reativa todos os nós de gain; estado salvo via safeSet e restaurado no init
4. `07-04-wire-sounds-to-events` — conectar AudioEngine aos eventos do game loop: motor ao PLAYING, pitch ao velocidade, turbo ao FEEL-01, colisão ao impacto

**Success Criteria**:
1. No primeiro toque/clique no mobile, sons iniciam sem erro de console — mudo persiste entre recarregamentos via localStorage
2. Motor muda de pitch conforme o carro acelera; turbo e colisão disparam sons distintos sincronizados ao evento visual

**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Physics Foundation and Core Gameplay Loop | v1.0 | 3/3 | Complete | 2026-05-25 |
| 2. UI Screens, Storage, and Mobile Hardening | v1.0 | 5/5 | Complete | 2026-05-26 |
| 3. Game Feel | v2.0 | 0/5 | Not started | — |
| 4. Fase 2 — Autodromo Arcade | v2.0 | 0/4 | Not started | — |
| 5. Fase 3 — Rodovia Infinita | v2.0 | 0/3 | Not started | — |
| 6. AI Cars + Stars | v2.0 | 0/5 | Not started | — |
| 7. Sons 8-bit | v2.0 | 0/4 | Not started | — |
