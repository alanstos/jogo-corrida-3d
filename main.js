import Game from './game/Game.js';

// Ensure overlay DOM elements exist before Game constructor queries them (getElementById)
function init() {
  const game = new Game(document.getElementById('gameCanvas'));
  game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
