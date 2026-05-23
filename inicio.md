# 🏎️ RetroRacer 3D — Jogo de Corrida para Mobile

## Visão geral
Crie um jogo de corrida de carros 3D para web, otimizado primariamente para celular (90% mobile, 10% desktop). Sem login, sem backend. Tudo roda no browser puro.

---

## Stack tecnológica
- **Three.js** (via CDN ou npm) para renderização 3D
- **Cannon-es** para física básica do carro
- **HTML5 Canvas / WebGL**
- **localStorage** para histórico de resultados
- Sem frameworks frontend (vanilla JS) ou, se preferir modularidade, Vite + vanilla JS

---

## Tema visual: Retrô Arcade
- Estética anos 80/90: cores vibrantes, saturadas, contrastantes
- Paleta principal: roxo escuro (#1a0033), ciano (#00ffff), amarelo néon (#ffee00), vermelho (#ff2255)
- Pista com blocos geométricos simples, sem texturas fotorrealistas
- Carros com design low-poly cartunizado
- Efeito de scanlines sutil no overlay (CSS) para feel de monitor CRT
- Fonte pixelada (ex: "Press Start 2P" do Google Fonts)
- HUD estilo arcade: velocímetro, pontuação, lap counter em pixel font
- Partículas de faísca ao bater nos obstáculos
- Sons 8-bit opcionais (Web Audio API) — beeps e chiptune simples

---

## Estrutura de telas

### 1. Tela inicial (index.html)
- Logo do jogo com efeito de glitch animado em CSS
- Botão grande "INICIAR" centralizado, fácil de tocar
- Seletor de dificuldade com 3 opções tocáveis:
  - 🟢 FÁCIL — carros lentos, pista larga
  - 🟡 MÉDIO — velocidade normal, obstáculos moderados
  - 🔴 DIFÍCIL — alta velocidade, pistas estreitas, mais inimigos
- Botão "RECORDES" que abre painel com histórico do localStorage
- Painel de recordes mostra: melhor pontuação, melhor tempo, fases completadas

### 2. Tela de jogo (3 fases)
**Fase 1 — Cidade Neon**
- Pista urbana com curvas suaves, poucos obstáculos
- Background: prédios low-poly roxo/ciano no horizonte

**Fase 2 — Autodromo Arcade**
- Circuito fechado com chicanes, obstáculos móveis
- Background: arquibancadas pixeladas, céu laranja néon

**Fase 3 — Rodovia Infinita**
- Pista reta com rolagem infinita (endless), velocidade crescente
- Desviar de carros inimigos e obstáculos
- Background: estrelas, estilo espaço-retrô

### 3. Tela de fim de fase / game over
- Pontuação da fase, tempo, estrelas conquistadas (1–3)
- Botões: "PRÓXIMA FASE", "REPETIR", "MENU"
- Se for a fase 3: tela de vitória com ranking final

---

## Controles mobile (prioridade máxima)
- Dois botões grandes fixos na parte inferior da tela:
  - Botão esquerdo (◀) — vira à esquerda
  - Botão direito (▶) — vira à direita
- Botão central opcional: turbo / freio
- Botões com feedback visual (highlight ao toque) e haptic (navigator.vibrate)
- Touch events (touchstart/touchend), não mouse events
- Sem giroscópio, sem swipe
- Orientação: landscape forçada via CSS (ou aviso para girar o celular)

---

## Câmera
- Câmera em terceira pessoa atrás do carro (chase cam)
- Leve lag suave na câmera para feel arcade
- FOV ~75, altura ~3 unidades acima do carro

---

## Histórico no localStorage
Salvar após cada partida:
```json
{
  "melhorPontuacao": 9999,
  "melhorTempo": "1:23.45",
  "fasesCompletadas": 2
}
```
- Atualizar apenas se o novo resultado for melhor
- Exibir na tela inicial no painel de recordes
- Botão "Resetar recordes" no painel

---

## Performance mobile (obrigatório)
- Renderer com `antialias: false` em mobile (detectar via userAgent ou screen width)
- Geometrias simples, sem texturas de alta resolução
- Máximo 30–60 FPS via `requestAnimationFrame` com delta time
- Limitar polígonos: carro < 500 tris, obstáculos < 100 tris
- Sombras desativadas em mobile
- Pixel ratio: `Math.min(window.devicePixelRatio, 2)`

---

## Estrutura de arquivos sugerida
/
├── index.html
├── style.css
├── main.js
├── game/
│   ├── Game.js         # loop principal
│   ├── Car.js          # carro do jogador
│   ├── Track.js        # geração da pista
│   ├── HUD.js          # interface in-game
│   ├── phases/
│   │   ├── Phase1.js
│   │   ├── Phase2.js
│   │   └── Phase3.js
│   └── Storage.js      # localStorage helper
└── assets/
└── (fontes, sons opcionais)


---

## O que NÃO precisa
- Login / autenticação
- Backend / banco de dados
- Multiplayer
- Texturas fotorrealistas
- Física complexa de suspensão

---

## Comece por
1. Configurar Three.js com uma cena básica rodando no browser
2. Criar o carro low-poly se movendo na pista
3. Implementar os controles de botão mobile
4. Montar a tela inicial com seletor de dificuldade
5. Depois, construir as 3 fases progressivamente