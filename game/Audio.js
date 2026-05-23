export default class Audio {
  constructor() {
    this.ctx = null
    this.enabled = false
    this._engineOsc = null
    this._engineGain = null
  }

  // Deve ser chamado dentro de um user gesture (ex: botão INICIAR)
  init() {
    if (this.ctx) return
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      this.enabled = true
      this._initEngine()
    } catch {
      this.enabled = false
    }
  }

  _initEngine() {
    if (!this.ctx) return
    this._engineOsc = this.ctx.createOscillator()
    this._engineGain = this.ctx.createGain()

    this._engineOsc.type = 'sawtooth'
    this._engineOsc.frequency.value = 80
    this._engineGain.gain.value = 0.04

    this._engineOsc.connect(this._engineGain)
    this._engineGain.connect(this.ctx.destination)
    this._engineOsc.start()
  }

  updateEngine(speed) {
    if (!this.enabled || !this._engineOsc) return
    // Frequência proporcional à velocidade: 80Hz a 0, ~300Hz a velocidade máxima
    const freq = 80 + speed * 7
    this._engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1)
  }

  playBeep(freq, duration, type = 'square', volume = 0.15) {
    if (!this.enabled || !this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  playCollision() {
    this.playBeep(80, 0.3, 'sawtooth', 0.2)
  }

  playLapComplete() {
    this.playBeep(880, 0.08, 'square', 0.12)
    setTimeout(() => this.playBeep(1100, 0.15, 'square', 0.12), 100)
    setTimeout(() => this.playBeep(1320, 0.2, 'square', 0.10), 220)
  }

  playGameOver() {
    this.playBeep(440, 0.1, 'square', 0.15)
    setTimeout(() => this.playBeep(330, 0.1, 'square', 0.15), 120)
    setTimeout(() => this.playBeep(220, 0.15, 'square', 0.15), 250)
    setTimeout(() => this.playBeep(110, 0.4, 'sawtooth', 0.2), 380)
  }

  playPhaseComplete() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => this.playBeep(freq, 0.2, 'square', 0.12), i * 150)
    })
  }

  destroy() {
    if (this._engineOsc) {
      this._engineOsc.stop()
      this._engineOsc = null
    }
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
    this.enabled = false
  }
}
