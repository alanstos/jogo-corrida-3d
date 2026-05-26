import Game from './game/Game.js';

function init() {
  const game = new Game(document.getElementById('gameCanvas'));

  const menuEl = document.getElementById('menu');
  const hudEl = document.getElementById('hud');
  const touchEl = document.getElementById('touchControls');
  const btnIniciar = document.getElementById('btnIniciar');

  // pointerup avoids 300ms mobile delay (not click)
  if (btnIniciar) {
    btnIniciar.addEventListener('pointerup', () => {
      menuEl.classList.add('hidden');
      menuEl.setAttribute('aria-hidden', 'true');
      hudEl.classList.remove('hidden');
      touchEl.classList.remove('hidden');
      // Default difficulty: Médio — Plan 03 passes selected difficulty here
      game.start({ speedMultiplier: 1.0, obstacleCount: 8 });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
