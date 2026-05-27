# Retrospective: RetroRacer 3D

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-27
**Phases:** 2 | **Plans:** 8

### What Was Built

- PhysicsWorld + Car com todos os 4 bug-fixes do impl anterior (01-01)
- Track pool reciclado por posição relativa ao carro + obstáculos + câmera chase (01-02)
- HUD pixel-font + controles multi-touch via Pointer Events API (01-03)
- Storage module com safeGet/safeSet error-wrapping (02-01)
- Menu overlay + returnToMenu() + state machine MENU/PLAYING/GAME_OVER (02-02)
- Seletor de dificuldade FÁCIL/MÉDIO/DIFÍCIL com pool parameterizado (02-03)
- Game-over revamp com NOVO RECORDE badge e highscore persistido (02-04)
- WebGL context loss handler com overlay TOQUE PARA RECARREGAR (02-05)

### What Worked

- **GSD hard gate em Phase 1**: garantir que o carro move antes de qualquer UI foi correto — evitou construir em cima de física quebrada
- **Root cause analysis antes do planejamento**: documentar as 4 causas simultâneas em PITFALLS.md antes de escrever código eliminou o risco de reintroduzir os bugs
- **Pool pattern estabelecido em 01-02**: pool fixo no construtor, nunca no update — padrão claro que foi reutilizado em 02-03 sem atrito
- **Planos pequenos e atômicos**: nenhum plano levou mais de ~35 min — fácil de verificar e commitar
- **UAT humano no final**: os 2 testes de browser (dificuldade perceptível + context loss) foram rápidos de executar e confirmaram o comportamento que análise estática não pode verificar

### What Was Inefficient

- Rebuild do zero consumiu tempo que poderia ter sido poupado com diagnóstico mais profundo na implementação anterior (mas o planejamento GSD compensou com velocidade de execução)
- A ordem dos loops de física foi a causa raiz mais sutil — um teste de integração mínimo antes do abandono do código anterior teria identificado isso

### Patterns Established

- `allowSleep: false` obrigatório em corpos de veículo — default `true` é silencioso e destrutivo
- `applyLocalForce` em vez de `applyForce` — world space é errado para propulsão de veículo
- Loop order invariante: applyInput → step → syncMesh → render (comentado como invariante no código)
- Track recycling por `carZ` relativo — nunca threshold absoluto
- Pool sempre no construtor, `setDifficulty(n)` apenas muda o cap `_activeLimit`
- `event.preventDefault()` PRIMEIRO em `webglcontextlost` — sem isso recovery não funciona
- `safeSet` antes de `classList.remove('hidden')` — persistência antes de render

### Key Lessons

1. Documentar causas raiz *antes* de planejar o rebuild — economiza tempo e evita reintrodução de bugs
2. Hard gates funcionam: Phase 1 como pré-requisito inquebrável de Phase 2 impediu construir UI em cima de física quebrada
3. Pool pattern com cap separado é mais flexível que pool de tamanho variável
4. Testes UAT humanos no final do milestone são baratos e necessários para comportamentos perceptuais/runtime

### Cost Observations

- Sessions: ~4-5 sessões
- Milestone concluído em 4 dias (2026-05-23 → 2026-05-27)
- Nenhum plano precisou de retrabalho significativo após execução

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 2 |
| Plans | 8 |
| Avg min/plan | ~20 |
| Replans needed | 0 |
| UAT failures | 0 |
| Days to ship | 4 |
