import Storage from './Storage.js'

export default class UI {
  constructor() {
    this._screens = {
      menu: document.getElementById('screen-menu'),
      game: document.getElementById('screen-game'),
      results: document.getElementById('screen-results'),
    }
    this._listeners = {}
    this.currentDifficulty = 'medium'
    this._currentPhase = 1

    this._bindMenu()
  }

  // Sistema de eventos simples
  on(event, callback) {
    this._listeners[event] = callback
  }

  _emit(event, data) {
    if (this._listeners[event]) this._listeners[event](data)
  }

  // ---- Navegação entre telas ----

  showMenu() {
    this._show('menu')
    this._renderRecords()
  }

  showGame() {
    this._show('game')
    const hud = document.getElementById('hud')
    if (hud) hud.hidden = false
  }

  showResults({ score, time, stars, phase, isVictory = false }) {
    this._currentPhase = phase
    this._show('results')

    document.getElementById('result-title').textContent = isVictory ? '🏆 VITÓRIA!' : `FIM DA FASE ${phase}`
    document.getElementById('result-score').textContent = score.toLocaleString()
    document.getElementById('result-time').textContent = time

    // Estrelas com animação sequencial
    const starEls = document.querySelectorAll('.star')
    starEls.forEach((el, i) => {
      el.classList.remove('earned')
      if (i < stars) {
        setTimeout(() => el.classList.add('earned'), 300 + i * 300)
      }
    })

    // Botão PRÓXIMA FASE: desabilitado na fase 3 ou vitória
    const btnNext = document.getElementById('btn-next')
    if (btnNext) {
      btnNext.disabled = phase >= 3 || isVictory
    }
  }

  // ---- Menu: bindings ----

  _bindMenu() {
    // Seletor de dificuldade
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.currentDifficulty = btn.dataset.diff
      })
    })

    // Botão INICIAR
    const btnStart = document.getElementById('btn-start')
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        this._emit('start', this.currentDifficulty)
      })
    }

    // Botão RECORDES
    const btnRecords = document.getElementById('btn-records')
    const panel = document.getElementById('records-panel')
    if (btnRecords && panel) {
      btnRecords.addEventListener('click', () => {
        panel.hidden = !panel.hidden
        if (!panel.hidden) this._renderRecords()
      })
    }

    // Botão RESETAR
    const btnReset = document.getElementById('btn-reset-records')
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        Storage.reset()
        this._renderRecords()
      })
    }

    // Botões de resultados
    const btnNext = document.getElementById('btn-next')
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this._emit('next', this._currentPhase + 1)
      })
    }

    const btnRetry = document.getElementById('btn-retry')
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        this._emit('retry', this._currentPhase)
      })
    }

    const btnMenu = document.getElementById('btn-menu')
    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        this._emit('menu')
      })
    }
  }

  _renderRecords() {
    const data = Storage.load()
    const scoreEl = document.getElementById('rec-score')
    const timeEl = document.getElementById('rec-time')
    const phasesEl = document.getElementById('rec-phases')

    if (scoreEl) scoreEl.textContent = data.melhorPontuacao > 0 ? data.melhorPontuacao.toLocaleString() : '---'
    if (timeEl) timeEl.textContent = data.melhorTempo || '---'
    if (phasesEl) phasesEl.textContent = data.fasesCompletadas
  }

  // ---- Utilitários ----

  _show(name) {
    Object.entries(this._screens).forEach(([key, el]) => {
      if (!el) return
      if (key === name) {
        el.classList.remove('hidden')
        el.classList.add('active')
      } else {
        el.classList.remove('active')
        el.classList.add('hidden')
      }
    })
  }
}
