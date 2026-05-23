# RetroRacer 3D — Contexto do Projeto

## O que é este projeto
Jogo de corrida 3D estilo retrô arcade para web, mobile-first (90% mobile).
Sem backend, sem login — tudo roda no browser puro.
Spec completa: `inicio.md`

## Stack
- **Vite 5.4.21** + vanilla JS ES modules (sem TypeScript, sem frameworks)
- **Three.js 0.165.0** via npm (NÃO CDN — CDN é incompatível com Vite ES modules)
- **Cannon-es 0.20.0** via npm (Cannon-es suporta ES modules; Cannon.js clássico não)

## Como rodar
```
npm install
npm run dev
```
Abre em http://localhost:5173

## Constantes críticas de jogo
- `GRAVITY = -20` (arcade feel, não o padrão -9.8)
- `CAR_MAX_SPEED = 30` (units/s)
- `CAMERA_LAG = 0.08` (lerp factor da chase cam — mais alto = mais rígido)
- `PHYSICS_STEP = 1/60`

## Padrões de código (seguir sempre)
- Todos os arquivos `game/` usam `export default class`
- `Game.js` é o orquestrador central — instancia tudo, **não há estado global**
- Eventos mobile: **APENAS** `touchstart`/`touchend` (nunca `click` em controles — causa double-fire)
- Detectar mobile: `window.innerWidth < 768 || /Mobi/i.test(navigator.userAgent)`
- `AudioContext` criado **APENAS** dentro de handler de user gesture (exigência dos browsers)
- Física: `world.fixedStep()` **sem argumentos** (usa accumulator interno do Cannon-es)
- Sincronizar mesh Three.js com body Cannon-es **APÓS** o fixedStep, nunca antes

## Padrão de dispose entre fases
Cada `Phase` mantém `this.disposables = []`. Ao criar geometry/material/body:
```js
this.disposables.push({ geometry, material, mesh, body })
```
`dispose()` itera e chama `geometry.dispose()`, `material.dispose()`, `scene.remove(mesh)`, `world.removeBody(body)`.

## Padrão de obstacle kinematic (Fase 2)
Obstacles móveis usam `body.type = CANNON.Body.KINEMATIC`.
**NUNCA** setar `body.position` diretamente após adicionar ao mundo.
Mover via `body.velocity`.

## Fluxo de eventos
`Phase → Game → UI → Storage`

## Arquitetura de arquivos
```
main.js              → orquestrador de telas
game/
  Game.js            → loop principal, física, câmera, eventos de fase
  Car.js             → mesh Three.js + corpo Cannon-es + steering
  Track.js           → pista básica estática (Ondas 1-2)
  Controls.js        → touch events + keyboard fallback
  HUD.js             → DOM sobreposto ao canvas
  Particles.js       → pool de faíscas (nunca spawn/destroy — reutilizar)
  Audio.js           → Web Audio API, sons 8-bit
  Storage.js         → localStorage helper
  UI.js              → sistema de telas (menu/game/results)
  phases/
    Phase1.js        → Cidade Neon (pista urbana, 3 voltas)
    Phase2.js        → Autodromo Arcade (chicanes, obstáculos móveis, 5 voltas)
    Phase3.js        → Rodovia Infinita (endless runner, carros inimigos)
```

## Estado atual do desenvolvimento
Ver `PROGRESS.md`
