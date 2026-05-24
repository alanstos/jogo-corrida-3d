export default class Controls {
  constructor() {
    // Internal state — updated by event listeners
    this._state = {
      left: false,
      right: false,
      forward: false,
    };

    this._bindKeyboard();
  }

  _bindKeyboard() {
    const keyMap = {
      ArrowUp:    'forward',
      KeyW:       'forward',
      ArrowLeft:  'left',
      KeyA:       'left',
      ArrowRight: 'right',
      KeyD:       'right',
    };

    const onKeyDown = (e) => {
      const action = keyMap[e.code];
      if (action) {
        e.preventDefault();
        this._state[action] = true;
      }
    };

    const onKeyUp = (e) => {
      const action = keyMap[e.code];
      if (action) {
        this._state[action] = false;
      }
    };

    // Bind on window so focus on canvas is not required
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Store refs for cleanup
    this._keydownHandler = onKeyDown;
    this._keyupHandler = onKeyUp;
  }

  /**
   * Returns a snapshot copy of the current intent.
   * Callers must not mutate the returned object.
   * @returns {{ left: boolean, right: boolean, forward: boolean }}
   */
  getIntent() {
    return {
      left:    this._state.left,
      right:   this._state.right,
      forward: this._state.forward,
    };
  }

  destroy() {
    window.removeEventListener('keydown', this._keydownHandler);
    window.removeEventListener('keyup', this._keyupHandler);
    this._state = { left: false, right: false, forward: false };
  }
}
