export default class Controls {
  constructor() {
    this._keyState = { left: false, right: false, forward: false };
    this._activePointers = new Map();
    this._bindKeyboard();
    this._bindTouch();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')  this._keyState.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this._keyState.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')    this._keyState.forward = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')  this._keyState.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this._keyState.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')    this._keyState.forward = false;
    });
  }

  _bindTouch() {
    const left = document.getElementById('btnLeft');
    const right = document.getElementById('btnRight');
    if (left)  this._bindButton(left, 'left');
    if (right) this._bindButton(right, 'right');
  }

  _bindButton(el, dir) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      this._activePointers.set(e.pointerId, dir);
      el.classList.add('pressed');
    });
    const release = (e) => {
      if (this._activePointers.get(e.pointerId) === dir) {
        this._activePointers.delete(e.pointerId);
      }
      const stillHeld = Array.from(this._activePointers.values()).includes(dir);
      if (!stillHeld) el.classList.remove('pressed');
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
  }

  getIntent() {
    const touchLeft  = Array.from(this._activePointers.values()).includes('left');
    const touchRight = Array.from(this._activePointers.values()).includes('right');
    return {
      left:    this._keyState.left  || touchLeft,
      right:   this._keyState.right || touchRight,
      forward: this._keyState.forward,
    };
  }

  destroy() {
    this._keyState = { left: false, right: false, forward: false };
    this._activePointers.clear();
  }
}
