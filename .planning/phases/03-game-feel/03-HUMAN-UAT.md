---
status: partial
phase: 03-game-feel
source: [03-VERIFICATION.md]
started: 2026-05-27T18:30:00Z
updated: 2026-05-27T18:30:00Z
---

## Current Test

[aguardando testes humanos]

## Tests

### 1. Vibração no turbo (Android Chrome)
expected: ao pressionar TURBO, dispositivo vibra ~50ms (pattern [50])
result: [pending]

### 2. Vibração na colisão (Android Chrome)
expected: ao bater num obstáculo, dispositivo vibra ~100ms (pattern [100])
result: [pending]

### 3. Graceful degradation em iOS Safari
expected: TURBO e colisão funcionam normalmente, zero console errors relacionados a vibrate
result: [pending]

### 4. Camera shake visual
expected: câmera oscila por ~300ms após colisão, carro NÃO joga — apenas câmera se move
result: [pending]

### 5. Estados visuais do botão TURBO
expected: botão muda para laranja (boosting), depois esmaece com barra de cooldown drenando, depois volta ao estado base
result: [pending]

### 6. Ausência de partículas residuais após RETRY imediato
expected: clicar TENTAR NOVAMENTE imediatamente após colisão não deixa partículas residuais visíveis
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
