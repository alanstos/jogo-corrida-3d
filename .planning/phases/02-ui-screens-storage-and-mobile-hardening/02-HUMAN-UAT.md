---
status: partial
phase: 02-ui-screens-storage-and-mobile-hardening
source: [02-VERIFICATION.md]
started: 2026-05-26T00:00:00Z
updated: 2026-05-26T00:00:00Z
---

## Current Test

[aguardando teste humano]

## Tests

### 1. Dificuldade visivelmente diferente (FÁCIL vs DIFÍCIL)

expected: DIFÍCIL deve ter claramente mais obstáculos simultâneos (até 12 vs 6 para FÁCIL) e velocidade de scroll visivelmente mais rápida (speedMultiplier 1.4 vs 0.75, diferença de 87%)
result: [pending]

**Como testar:**
1. Abrir o jogo no browser (`npm run dev` → `http://localhost:5173`)
2. Selecionar FÁCIL, pressionar INICIAR — observar densidade de obstáculos e velocidade nos primeiros 15 segundos
3. Colidir com um obstáculo para ir ao game-over, voltar ao menu
4. Selecionar DIFÍCIL, pressionar INICIAR — comparar visivelmente a diferença

---

### 2. WebGL context loss não trava o jogo nem deixa canvas em branco

expected: overlay "TOQUE PARA RECARREGAR" aparece ao perder contexto; restaurar contexto esconde o overlay e retoma gameplay; tocar no overlay faz reload da página
result: [pending]

**Como testar (Chrome DevTools):**
1. Abrir o jogo no Chrome. Pressionar INICIAR para iniciar gameplay.
2. Abrir DevTools Console (F12) e executar:
   ```js
   const canvas = document.getElementById('gameCanvas');
   const ext = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
   ext.loseContext();
   ```
3. Verificar: overlay "TOQUE PARA RECARREGAR" deve aparecer imediatamente
4. Executar no console: `ext.restoreContext()`
5. Verificar: overlay desaparece, jogo retoma
6. Repetir passo 2-3, então tocar/clicar no overlay — verificar se a página recarrega

---

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
