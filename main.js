import UI from './game/UI.js'
import Game from './game/Game.js'
import Storage from './game/Storage.js'

const ui = new UI()
let currentGame = null
let currentPhase = 1

ui.showMenu()

ui.on('start', (difficulty) => {
  currentPhase = 1
  _startGame(difficulty, currentPhase)
})

ui.on('next', (phase) => {
  currentPhase = phase
  const diff = ui.currentDifficulty
  currentGame?.stop()
  currentGame = null
  _startGame(diff, currentPhase)
})

ui.on('retry', (phase) => {
  const diff = ui.currentDifficulty
  currentGame?.stop()
  currentGame = null
  _startGame(diff, phase)
})

ui.on('menu', () => {
  currentGame?.stop()
  currentGame = null
  ui.showMenu()
})

function _startGame(difficulty, phase) {
  const canvas = document.getElementById('game-canvas')
  ui.showGame()

  currentGame = new Game(canvas, difficulty)

  // Inicializar áudio aqui — estamos dentro de um user gesture (clique no INICIAR)
  currentGame.initAudio()

  currentGame.onPhaseComplete = (data) => {
    Storage.updateIfBetter({
      pontuacao: data.score,
      tempo: data.time,
      faseCompletada: phase,
    })
    ui.showResults({
      score: data.score,
      time: data.time,
      stars: data.stars,
      phase,
      isVictory: phase >= 3,
    })
  }

  currentGame.onGameOver = (data) => {
    Storage.updateIfBetter({
      pontuacao: data.score,
      tempo: data.time,
      faseCompletada: phase - 1,
    })
    ui.showResults({
      score: data.score,
      time: data.time,
      stars: data.stars,
      phase,
      isVictory: false,
    })
  }

  currentGame.start(phase)
}
