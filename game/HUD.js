export default class HUD {
  constructor() {
    this._el = document.getElementById('hud')
    this._speedEl = document.getElementById('hud-speed')
    this._scoreEl = document.getElementById('hud-score')
    this._lapEl = document.getElementById('hud-lap')
    this._timerEl = document.getElementById('hud-timer')
    this._phaseEl = document.getElementById('hud-phase')
  }

  show() {
    if (this._el) this._el.hidden = false
  }

  hide() {
    if (this._el) this._el.hidden = true
  }

  update({ speed, score, currentLap, totalLaps, timeMs, phase }) {
    if (this._speedEl) this._speedEl.textContent = Math.round(speed * 10)
    if (this._scoreEl) this._scoreEl.textContent = Math.round(score).toLocaleString()
    if (this._lapEl) this._lapEl.textContent = `LAP ${currentLap}/${totalLaps}`
    if (this._timerEl) this._timerEl.textContent = this._formatTime(timeMs)
    if (this._phaseEl) this._phaseEl.textContent = `FASE ${phase}`
  }

  _formatTime(ms) {
    const min = Math.floor(ms / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    const centesimos = Math.floor((ms % 1000) / 10)
    return `${min}:${String(sec).padStart(2, '0')}.${String(centesimos).padStart(2, '0')}`
  }
}
