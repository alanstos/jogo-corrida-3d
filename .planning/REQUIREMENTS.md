# Requirements: RetroRacer 3D

**Defined:** 2026-05-27
**Milestone:** v2.0 Content & Polish
**Core Value:** O carro se move, responde aos controles touch e o jogador consegue completar uma fase — jogabilidade funcional antes de qualquer polimento.

## v2 Requirements

### Game Feel (FEEL)

- [x] **FEEL-01**: Botão TURBO na tela dispara boost de velocidade por 2s com cooldown de 5s — indicador visual do cooldown, não ativável durante cooldown, funciona no touch e teclado
- [x] **FEEL-02**: Colisão com obstáculo ou AI emite burst de partículas no ponto de impacto — ≤ 20 partículas por evento, MeshBasicMaterial, auto-recycle (sem alocação em runtime)
- [x] **FEEL-03**: Câmera treme por ~300ms após colisão (offset noise aplicado ao lerp target) com retorno suave — sem afetar a lógica de física
- [x] **FEEL-04**: `navigator.vibrate()` disparado no uso do turbo (~50ms) e na colisão (~100ms) — graceful degradation silenciosa se API ausente (iOS não suporta)

### Progression (PROG)

- [ ] **PROG-01**: Fase 2 (Autodromo Arcade) selecionável no menu — pista com curvas (segmentos angulados), visual temático distinto da Fase 1, pool reciclado por posição relativa ao carro
- [ ] **PROG-02**: Fase 3 (Rodovia Infinita) selecionável no menu — pool de segmentos com tamanho fixo pré-alocado no init, zero alocação em runtime após carregamento
- [ ] **PROG-03**: Sistema de 1–3 estrelas por fase baseado em distância-score — critérios definidos por dificuldade, exibido no game over e na tela de seleção de fase
- [ ] **PROG-04**: Carros inimigos spawnam em lanes aleatórias à frente do jogador, avançam na pista (velocidade levemente abaixo do jogador), colisão com inimigo = game over — spawn controlado por dificuldade

### Polish (POLISH)

- [ ] **POLISH-01**: Botão de mudo (ícone na HUD) silencia todos os sons — estado salvo em localStorage via safeSet, persiste entre sessões
- [ ] **POLISH-02**: Sons 8-bit via Web Audio API — motor do carro (loop), boost do turbo, colisão — unlock automático na primeira interação do usuário (toque/clique), sem erro em browsers com autoplay bloqueado

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiplayer | Sem backend |
| Texturas fotorrealistas / PBR | Contradiz estética + custo GPU mobile |
| Física de suspensão realista | Arcade, não simulador |
| Giroscópio / swipe steering | Inconsistente entre devices |
| Bloom / post-processing | UnrealBloomPass mata FPS mobile |
| IAP / monetização | Fora do escopo |
| Música de fundo (BGM) | Arquivo de áudio vs. síntese — fora do escopo v2 |
| Fase 4+ (além de 3 pistas) | v3+ |
| Leaderboard online | Sem backend |
| Replays | Complexidade out of scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FEEL-01 | Phase 3 | Complete |
| FEEL-02 | Phase 3 | Complete |
| FEEL-03 | Phase 3 | Complete |
| FEEL-04 | Phase 3 | Complete |
| PROG-01 | Phase 4 | Pending |
| PROG-02 | Phase 5 | Pending |
| PROG-03 | Phase 6 | Pending |
| PROG-04 | Phase 6 | Pending |
| POLISH-01 | Phase 7 | Pending |
| POLISH-02 | Phase 7 | Pending |

**Coverage:**

- v2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-27*
*Last updated: 2026-05-27 after initial definition*
