// HTML5 Gamepad API Controller with Rumble and Turbo support
export class GamepadController {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onNotification = options.onNotification || (() => {});

    this.connectedGamepadIndex = null;
    this.previousState = {};
    this.polling = false;
    this.turboIntervals = {};
    this.deadZone = 0.35;

    this.init();
  }

  init() {
    window.addEventListener('gamepadconnected', (e) => {
      this.connectedGamepadIndex = e.gamepad.index;
      const name = e.gamepad.id || '게임패드';
      this.onStatusChange(true, name);
      this.onNotification(`게임패드 연결됨: ${name}`, 'success');
      this.playRumble(150, 0.4, 0.4);

      if (!this.polling) {
        this.polling = true;
        this.poll();
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.connectedGamepadIndex === e.gamepad.index) {
        this.connectedGamepadIndex = null;
        this.onStatusChange(false, null);
        this.onNotification('게임패드 연결이 해제되었습니다.', 'warning');
      }
    });
  }

  poll() {
    if (!this.polling) return;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[this.connectedGamepadIndex];

    if (gp && gp.connected) {
      this.processGamepad(gp);
    } else {
      // Find another connected gamepad if any
      const anyGp = Array.from(gamepads).find((g) => g && g.connected);
      if (anyGp) {
        this.connectedGamepadIndex = anyGp.index;
        this.onStatusChange(true, anyGp.id);
      }
    }

    requestAnimationFrame(() => this.poll());
  }

  processGamepad(gp) {
    const currentState = {};

    // Standard buttons
    // 0: A (Cross), 1: B (Circle), 2: X (Square), 3: Y (Triangle)
    // 4: L1, 5: R1, 6: L2, 7: R2, 8: Select, 9: Start
    // 12: D-pad Up, 13: D-pad Down, 14: D-pad Left, 15: D-pad Right
    currentState.a = gp.buttons[0]?.pressed || false;
    currentState.turbo_a = gp.buttons[1]?.pressed || false;
    currentState.b = gp.buttons[2]?.pressed || false;
    currentState.turbo_b = gp.buttons[3]?.pressed || false;

    currentState.select = gp.buttons[8]?.pressed || false;
    currentState.start = gp.buttons[9]?.pressed || false;

    // Triggers
    currentState.rewind = (gp.buttons[4]?.pressed || gp.buttons[6]?.pressed) || false;
    currentState.fastforward = (gp.buttons[5]?.pressed || gp.buttons[7]?.pressed) || false;

    // D-Pad buttons
    const dpadUp = gp.buttons[12]?.pressed || false;
    const dpadDown = gp.buttons[13]?.pressed || false;
    const dpadLeft = gp.buttons[14]?.pressed || false;
    const dpadRight = gp.buttons[15]?.pressed || false;

    // Analog stick (Axis 0: X, Axis 1: Y)
    const stickX = gp.axes[0] || 0;
    const stickY = gp.axes[1] || 0;

    currentState.up = dpadUp || stickY < -this.deadZone;
    currentState.down = dpadDown || stickY > this.deadZone;
    currentState.left = dpadLeft || stickX < -this.deadZone;
    currentState.right = dpadRight || stickX > this.deadZone;

    // Process state changes
    const actions = ['up', 'down', 'left', 'right', 'a', 'b', 'select', 'start'];
    for (const act of actions) {
      if (currentState[act] && !this.previousState[act]) {
        this.engine.pressDown(act);
      } else if (!currentState[act] && this.previousState[act]) {
        this.engine.pressUp(act);
      }
    }

    // Turbo A
    if (currentState.turbo_a && !this.previousState.turbo_a) {
      this.startTurbo('a');
    } else if (!currentState.turbo_a && this.previousState.turbo_a) {
      this.stopTurbo('a');
    }

    // Turbo B
    if (currentState.turbo_b && !this.previousState.turbo_b) {
      this.startTurbo('b');
    } else if (!currentState.turbo_b && this.previousState.turbo_b) {
      this.stopTurbo('b');
    }

    // Rewind
    if (currentState.rewind && !this.previousState.rewind) {
      this.engine.startRewind();
    } else if (!currentState.rewind && this.previousState.rewind) {
      this.engine.stopRewind();
    }

    // Fast forward
    if (currentState.fastforward && !this.previousState.fastforward) {
      this.engine.setSpeed(2.0);
    } else if (!currentState.fastforward && this.previousState.fastforward) {
      this.engine.setSpeed(1.0);
    }

    this.previousState = currentState;
  }

  startTurbo(btn) {
    if (this.turboIntervals[btn]) return;
    let st = false;
    this.turboIntervals[btn] = setInterval(() => {
      st = !st;
      if (st) this.engine.pressDown(btn);
      else this.engine.pressUp(btn);
    }, 50);
  }

  stopTurbo(btn) {
    if (this.turboIntervals[btn]) {
      clearInterval(this.turboIntervals[btn]);
      delete this.turboIntervals[btn];
      this.engine.pressUp(btn);
    }
  }

  playRumble(durationMs = 200, strongMagnitude = 0.5, weakMagnitude = 0.5) {
    try {
      if (this.connectedGamepadIndex === null) return;
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[this.connectedGamepadIndex];
      if (gp?.vibrationActuator?.playEffect) {
        gp.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude,
          strongMagnitude,
        });
      }
    } catch (e) {
      // ignore
    }
  }
}
