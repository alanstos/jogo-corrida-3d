import Game from './game/Game.js';

const DIFFICULTY_CONFIG = {
  facil:   { speedMultiplier: 0.75, obstacleCount: 6  },
  medio:   { speedMultiplier: 1.0,  obstacleCount: 8  },
  dificil: { speedMultiplier: 1.4,  obstacleCount: 12 },
};

function init() {
  const game = new Game(document.getElementById('gameCanvas'));

  const menuEl = document.getElementById('menu');
  const hudEl = document.getElementById('hud');
  const touchEl = document.getElementById('touchControls');
  const btnIniciar = document.getElementById('btnIniciar');
  const difficultyBtns = document.querySelectorAll('.difficulty-btn');

  let selectedDifficulty = 'medio';

  difficultyBtns.forEach((btn) => {
    btn.addEventListener('pointerup', () => {
      difficultyBtns.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedDifficulty = btn.dataset.difficulty;
    });
  });

  if (btnIniciar) {
    btnIniciar.addEventListener('pointerup', () => {
      menuEl.classList.add('hidden');
      menuEl.setAttribute('aria-hidden', 'true');
      hudEl.classList.remove('hidden');
      touchEl.classList.remove('hidden');
      game.start(DIFFICULTY_CONFIG[selectedDifficulty]);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
