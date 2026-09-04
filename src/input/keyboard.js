// Keyboard input handler with customizable bindings
export class KeyboardController {
  constructor(engine, stateManager, options = {}) {
    this.engine = engine;
    this.stateManager = stateManager;
    this.onNotification = options.onNotification || (() => {});
    this.turboIntervals = {};

    this.defaultBindings = {
      up: ['ArrowUp', 'KeyW'],
      down: ['ArrowDown', 'KeyS'],
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
      b: ['KeyZ', 'KeyJ'],
      a: ['KeyX', 'KeyK'],
      turbo_b: ['KeyQ', 'KeyU'],
      turbo_a: ['KeyE', 'KeyI'],
      select: ['ShiftRight', 'ShiftLeft', 'KeyC'],
      start: ['Enter', 'Space'],
      quicksave: ['F1', 'BracketLeft'],
      quickload: ['F2', 'BracketRight'],
      pause: ['KeyP'],
      rewind: ['KeyR'],
      fastforward: ['Tab'],
      fullscreen: ['KeyF'],
    };

    this.bindings = this.loadBindings();
    this.activeKeys = new Set();
    this.init();
  }

  loadBindings() {
    try {
      const saved = localStorage.getItem('smb3_keybindings');
      if (saved) {
        return { ...this.defaultBindings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load keybindings:', e);
    }
    return { ...this.defaultBindings };
  }

  saveBindings(newBindings) {
    this.bindings = { ...this.bindings, ...newBindings };
    try {
      localStorage.setItem('smb3_keybindings', JSON.stringify(this.bindings));
    } catch (e) {
      console.warn('Failed to save keybindings:', e);
    }
  }

  resetBindings() {
    this.bindings = { ...this.defaultBindings };
    try {
      localStorage.removeItem('smb3_keybindings');
    } catch (e) {
      // ignore
    }
  }

  init() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  getActionForKey(code) {
    for (const [action, keys] of Object.entries(this.bindings)) {
      if (keys.includes(code)) return action;
    }
    return null;
  }

  handleKeyDown(e) {
    // If typing in an input element, don't hijack keys
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

    const action = this.getActionForKey(e.code);
    if (!action) return;

    // Prevent default browser actions for game keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'F1', 'F2'].includes(e.code)) {
      e.preventDefault();
    }

    if (this.activeKeys.has(e.code)) return; // ignore repeating key events
    this.activeKeys.add(e.code);

    switch (action) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
      case 'a':
      case 'b':
      case 'select':
      case 'start':
        this.engine.pressDown(action);
        break;

      case 'turbo_a':
        this.startTurbo('a');
        break;

      case 'turbo_b':
        this.startTurbo('b');
        break;

      case 'pause':
        this.engine.togglePause();
        break;

      case 'rewind':
        this.engine.startRewind();
        break;

      case 'fastforward':
        this.engine.setSpeed(2.0);
        break;

      case 'quicksave':
        if (this.stateManager) {
          this.stateManager.quickSave().then((slot) => {
            this.onNotification(`퀵 세이브 완료 (${slot.label})`, 'success');
          }).catch(err => {
            this.onNotification(`퀵 세이브 실패: ${err.message}`, 'error');
          });
        }
        break;

      case 'quickload':
        if (this.stateManager) {
          this.stateManager.quickLoad().then((slot) => {
            this.onNotification(`퀵 로드 완료 (${slot.label})`, 'success');
          }).catch(err => {
            this.onNotification(`퀵 로드 실패: ${err.message}`, 'error');
          });
        }
        break;

      case 'fullscreen':
        this.toggleFullscreen();
        break;
    }
  }

  handleKeyUp(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

    const action = this.getActionForKey(e.code);
    if (!action) return;

    this.activeKeys.delete(e.code);

    switch (action) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
      case 'a':
      case 'b':
      case 'select':
      case 'start':
        this.engine.pressUp(action);
        break;

      case 'turbo_a':
        this.stopTurbo('a');
        break;

      case 'turbo_b':
        this.stopTurbo('b');
        break;

      case 'rewind':
        this.engine.stopRewind();
        break;

      case 'fastforward':
        this.engine.setSpeed(1.0);
        break;
    }
  }

  startTurbo(btn) {
    if (this.turboIntervals[btn]) return;
    let state = false;
    this.turboIntervals[btn] = setInterval(() => {
      state = !state;
      if (state) {
        this.engine.pressDown(btn);
      } else {
        this.engine.pressUp(btn);
      }
    }, 50); // 20 times per second
  }

  stopTurbo(btn) {
    if (this.turboIntervals[btn]) {
      clearInterval(this.turboIntervals[btn]);
      delete this.turboIntervals[btn];
      this.engine.pressUp(btn);
    }
  }

  toggleFullscreen() {
    const elem = document.getElementById('arcade-container') || document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.().catch(console.warn);
    } else {
      document.exitFullscreen?.().catch(console.warn);
    }
  }
}
