export default class HUD {
  constructor() {
    this._scoreEl = document.getElementById('hudScore');
    this._speedEl = document.getElementById('hudSpeed');
    this._lastScore = -1;
    this._lastSpeed = -1;
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
  }
}
