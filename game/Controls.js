export default class Controls {
  constructor() {
    this.state = { left: false, right: false, turbo: false }
    this._btns = {}
    this._bindMobile()
    this._bindKeyboard()
  }

  _bindMobile() {
    document.querySelectorAll('.ctrl-btn[data-action]').forEach(btn => {
      const action = btn.dataset.action
      this._btns[action] = btn

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault()
        this.state[action] = true
        btn.classList.add('pressed')
        if (navigator.vibrate) navigator.vibrate(20)
      }, { passive: false })

      btn.addEventListener('touchend', (e) => {
        e.preventDefault()
        this.state[action] = false
        btn.classList.remove('pressed')
      }, { passive: false })

      btn.addEventListener('touchcancel', (e) => {
        e.preventDefault()
        this.state[action] = false
        btn.classList.remove('pressed')
      }, { passive: false })
    })
  }

  _bindKeyboard() {
    const keyMap = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      Space: 'turbo',
      ArrowUp: 'turbo',
      KeyW: 'turbo',
    }

    window.addEventListener('keydown', (e) => {
      const action = keyMap[e.code]
      if (action) {
        e.preventDefault()
        this.state[action] = true
        if (this._btns[action]) this._btns[action].classList.add('pressed')
      }
    })

    window.addEventListener('keyup', (e) => {
      const action = keyMap[e.code]
      if (action) {
        this.state[action] = false
        if (this._btns[action]) this._btns[action].classList.remove('pressed')
      }
    })
  }

  destroy() {
    // Limpar listeners se necessário (reutilizado entre fases, então geralmente não destruído)
  }
}
