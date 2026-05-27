export default class HUD {
  constructor() {
    this._scoreEl = document.getElementById('hudScore');
    this._speedEl = document.getElementById('hudSpeed');
    this._lastScore = -1;
    this._lastSpeed = -1;
    this._turboBtnEl = document.getElementById('btnTurbo');
    this._lastTurboState = '';
  }
  update(state) {
    const s = Math.floor(state.score);
    if (s !== this._lastScore) {
      this._scoreEl.textContent = String(s);
      this._lastScore = s;
    }
    if (state.speed !== this._lastSpeed) {
      this._speedEl.textContent = String(state.speed);
      this._lastSpeed = state.speed;
    }
    if (state.turboState !== this._lastTurboState && this._turboBtnEl) {
      this._turboBtnEl.classList.remove('boosting', 'cooling');
      if (state.turboState !== 'idle') {
        this._turboBtnEl.classList.add(state.turboState);
      }
      this._lastTurboState = state.turboState;
    }
    if (state.turboState === 'cooling' && this._turboBtnEl) {
      this._turboBtnEl.style.setProperty('--cooldown-ratio', state.turboCooldownRatio);
    }
  }
}
