# DECISIONS — RetroRacer 3D

Registro de decisões arquiteturais tomadas e seus motivos.

---

## D001 — Three.js via npm, não CDN
**Decisão:** Instalar Three.js via `npm install three`.
**Motivo:** Vite usa ES modules nativos. CDN links retornam UMD/IIFE globals que não são compatíveis com `import * as THREE from 'three'` em módulos ES. Usar npm garante resolução correta de imports e tree-shaking no build.

---

## D002 — Cannon-es em vez de Cannon.js
**Decisão:** Usar `cannon-es` (fork moderno) em vez do `cannon` original.
**Motivo:** Cannon.js clássico é um módulo CommonJS que não funciona bem com Vite ES modules. Cannon-es é um fork com suporte nativo a ES modules, mesma API, e manutenção ativa.

---

## D003 — Vanilla JS (sem TypeScript)
**Decisão:** Projeto em JavaScript puro sem TypeScript.
**Motivo:** Zero configuração extra de transpilação. O projeto é pequeno o suficiente para não precisar de tipagem estática. Reduz complexidade do setup para focar no desenvolvimento do jogo.

---

## D004 — Game.js como orquestrador central
**Decisão:** `Game.js` instancia e conecta todos os subsistemas. Nenhum módulo importa outro diretamente (exceto utilitários como Storage).
**Motivo:** Evita dependências circulares. Facilita a troca de fases (dispose + instanciar nova fase) sem afetar outros módulos.

---

## D005 — Touch events, nunca click em controles
**Decisão:** Botões de controle mobile usam apenas `touchstart`/`touchend`.
**Motivo:** Em browsers mobile, um toque dispara `touchstart` + `touchend` + `click` em sequência. Adicionar handler de `click` junto com `touchstart` causa double-fire nos controles.

---

## D006 — AudioContext criado no user gesture
**Decisão:** `new AudioContext()` é chamado dentro do handler do botão INICIAR.
**Motivo:** Política dos browsers modernos (mobile e desktop): AudioContext só pode ser criado ou resumido após interação explícita do usuário. Criar antes bloqueia o áudio.

---

## D007 — world.fixedStep() sem argumentos
**Decisão:** Chamar `world.fixedStep()` sem passar delta ou maxSubSteps.
**Motivo:** O Cannon-es tem um accumulator interno que garante física estável independentemente da variação de delta do requestAnimationFrame. Passar delta manualmente pode causar divergência e tremor visual.

---

## D008 — Sincronizar mesh APÓS fixedStep
**Decisão:** Copiar `body.position` e `body.quaternion` para o mesh Three.js somente após `world.fixedStep()`.
**Motivo:** Se sincronizado antes do step, o renderer exibe a posição do frame anterior, causando lag de 1 frame que se acumula e cria tremor.

---

## D009 — Pool de partículas, nunca spawn/destroy
**Decisão:** `Particles.js` mantém um pool fixo de 50 pontos. Partículas são ativadas/desativadas, nunca criadas ou destruídas.
**Motivo:** Criar e destruir objetos Three.js em alta frequência (colisões repetidas) causa garbage collection que interrompe o frame. Pool elimina este problema.

---

## D010 — Gravity = -20 (arcade feel)
**Decisão:** `world.gravity.y = -20` em vez do padrão -9.8.
**Motivo:** Com -9.8, o carro parece "flutuante" e a física arcade fica estranha. -20 mantém o carro firmemente no chão e dá resposta mais imediata às colisões.
