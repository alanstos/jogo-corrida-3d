export default class Controls {
  constructor() {
    this.state = { left: false, right: false, turbo: false }
    this._btns = {}
    this._handlers = [] // refs para cleanup no destroy()
    this._bindMobile()
    this._bindKeyboard()
  }

  _bindMobile() {
    document.querySelectorAll('.ctrl-btn[data-action]').forEach(btn => {
      const action = btn.dataset.action
      this._btns[action] = btn

      const onDown = (e) => {
        e.preventDefault()
        this.state[action] = true
        btn.classList.add('pressed')
        if (navigator.vibrate) navigator.vibrate(20)
      }

      const onUp = (e) => {
        e.preventDefault()
        this.state[action] = false
        btn.classList.remove('pressed')
      }

      // pointerdown/pointerup funciona para mouse E touch (sem double-fire)
      btn.addEventListener('pointerdown', onDown)
      btn.addEventListener('pointerup', onUp)
      btn.addEventListener('pointercancel', onUp)
      btn.style.touchAction = 'none' // necessário para pointer events em dispositivos touch

      this._handlers.push(
        { el: btn, event: 'pointerdown', fn: onDown },
        { el: btn, event: 'pointerup', fn: onUp },
        { el: btn, event: 'pointercancel', fn: onUp },
      )
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

    const onKeyDown = (e) => {
      const action = keyMap[e.code]
      if (action) {
        e.preventDefault()
        this.state[action] = true
        if (this._btns[action]) this._btns[action].classList.add('pressed')
      }
    }

    const onKeyUp = (e) => {
      const action = keyMap[e.code]
      if (action) {
        this.state[action] = false
        if (this._btns[action]) this._btns[action].classList.remove('pressed')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    this._handlers.push(
      { el: window, event: 'keydown', fn: onKeyDown },
      { el: window, event: 'keyup', fn: onKeyUp },
    )
  }

  destroy() {
    // Remove todos os event listeners registrados
    this._handlers.forEach(({ el, event, fn }) => el.removeEventListener(event, fn))
    this._handlers = []
    // Limpa estado visual dos botões
    Object.values(this._btns).forEach(btn => btn.classList.remove('pressed'))
    this.state = { left: false, right: false, turbo: false }
  }
}
