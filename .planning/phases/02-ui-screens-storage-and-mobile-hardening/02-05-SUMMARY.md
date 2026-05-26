---
phase: "02"
plan: "05"
subsystem: "context-loss"
tags: ["WebGL", "context-loss", "webglcontextlost", "webglcontextrestored", "overlay", "mobile-hardening"]
dependency_graph:
  requires: ["02-02 menu overlay pattern"]
  provides:
    - "game/Game.js — webglcontextlost/webglcontextrestored handlers; _paused flag; TOQUE PARA RECARREGAR overlay"
    - "index.html — #contextLoss.overlay.hidden overlay"
    - "style.css — .ctx-loss-msg style"
  affects: ["index.html", "style.css", "game/Game.js"]
tech_stack:
  added: []
  patterns:
    - "event.preventDefault() como PRIMEIRO statement em webglcontextlost — habilita recovery"
    - "_paused flag para pausar RAF durante context loss"
    - "pointerup no overlay → window.location.reload() como fallback de recuperação"
key_files:
  created: []
  modified:
    - index.html
    - style.css
    - game/Game.js
decisions:
  - "event.preventDefault() OBRIGATÓRIO antes de qualquer outra lógica em webglcontextlost — sem ele, recovery não funciona"
  - "renderer.forceContextRestore() em try/catch — não disponível em todos os builds de Three.js"
  - "Overlay separado #contextLoss (não reutiliza #gameOver) — semântica diferente, mensagem diferente"
  - "pointerup no overlay → reload — fallback simples quando restore automático falha"
metrics:
  duration: "~20 min"
  completed: "2026-05-25T21:10:51Z"
  tasks_completed: 2
  files_created: 0
  files_modified: 3
---

# Phase 02 Plan 05: WebGL Context Loss Handler — Summary

## One-liner

Handler de perda de contexto WebGL: overlay "TOQUE PARA RECARREGAR" aparece em `webglcontextlost`, tenta restore automático em `webglcontextrestored`; toque no overlay faz `window.location.reload()` como fallback.

## What Was Built

### T1 — index.html + style.css

**index.html:** `#contextLoss.overlay.hidden` adicionado após o `#gameOver` overlay:
```html
<div id="contextLoss" class="overlay hidden" aria-hidden="true">
  <div class="overlay-inner">
    <p class="ctx-loss-msg">TOQUE PARA RECARREGAR</p>
  </div>
</div>
```

**style.css:** `.ctx-loss-msg` estilizado para exibição clara (cor branca/cyan, Press Start 2P, tamanho legível em mobile).

### T2 — game/Game.js

**Construtor:**
- `this._contextLossEl = document.getElementById('contextLoss')` — ref DOM

**Event handlers no canvas:**
```js
this.canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault(); // MANDATORY — habilita recovery
  this._paused = true;
  this._contextLossEl.classList.remove('hidden');
  this._contextLossEl.setAttribute('aria-hidden', 'false');
}, false);

this.canvas.addEventListener('webglcontextrestored', () => {
  try {
    if (typeof this.renderer.forceContextRestore === 'function') {
      this.renderer.forceContextRestore();
    }
    this.renderer.render(this.scene, this.camera.instance);
    this._contextLossEl.classList.add('hidden');
    this._contextLossEl.setAttribute('aria-hidden', 'true');
    this._paused = false;
    this._lastTime = performance.now();
  } catch (e) {
    console.error('[RetroRacer] WebGL context restore failed:', e);
  }
}, false);

this._contextLossEl.addEventListener('pointerup', () => {
  window.location.reload();
});
```

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| T1 | Context loss overlay HTML + CSS | 36e5f25 | index.html, style.css |
| T2 | webglcontextlost/restored handlers + _paused flag | 36e5f25 | game/Game.js |

## Deviations from Plan

Nenhuma — implementação seguiu o plano exatamente. `event.preventDefault()` como PRIMEIRO statement em `webglcontextlost` implementado conforme especificado.

## Self-Check

- [x] `#contextLoss.overlay.hidden` existe em `index.html`
- [x] `webglcontextlost` listener: `event.preventDefault()` como primeiro statement
- [x] `webglcontextlost` seta `_paused = true` e exibe `#contextLoss`
- [x] `webglcontextrestored` chama `forceContextRestore()` em try/catch, esconde overlay, reseta `_lastTime`
- [x] `pointerup` no `#contextLoss` overlay → `window.location.reload()`
- [x] Sem alterações em localStorage ou novos endpoints

## Self-Check: PASSED

## Threat Flags

`window.location.reload()` é operação segura (page reload). Sem novos endpoints de rede, auth paths, ou localStorage. Mudanças são DOM/CSS/JS puros no browser.
