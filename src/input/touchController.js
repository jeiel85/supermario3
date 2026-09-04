// Virtual On-Screen Gamepad for Mobile / Tablet Devices
export class TouchController {
  constructor(engine, containerElement) {
    this.engine = engine;
    this.container = containerElement;
    this.turboIntervals = {};
    this.activeDpadDir = null;

    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
    this.bindEvents();

    // Auto-detect mobile / touch capability
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      this.container.classList.add('visible');
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="touch-controls-layout">
        <!-- D-Pad -->
        <div class="touch-cluster touch-dpad-cluster">
          <div class="touch-dpad" id="touch-dpad">
            <button class="dpad-btn dpad-up" data-btn="up" aria-label="Up">▲</button>
            <button class="dpad-btn dpad-left" data-btn="left" aria-label="Left">◀</button>
            <div class="dpad-center"></div>
            <button class="dpad-btn dpad-right" data-btn="right" aria-label="Right">▶</button>
            <button class="dpad-btn dpad-down" data-btn="down" aria-label="Down">▼</button>
          </div>
        </div>

        <!-- Center Select / Start -->
        <div class="touch-cluster touch-center-cluster">
          <div class="pill-btn-group">
            <div class="pill-btn-wrap">
              <button class="touch-pill-btn" data-btn="select">SELECT</button>
              <span class="pill-label">SELECT</span>
            </div>
            <div class="pill-btn-wrap">
              <button class="touch-pill-btn" data-btn="start">START</button>
              <span class="pill-label">START</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons (B, A, Turbo) -->
        <div class="touch-cluster touch-action-cluster">
          <div class="action-btn-group">
            <div class="turbo-btn-row">
              <button class="touch-round-btn turbo-btn" data-btn="turbo_b">TB</button>
              <button class="touch-round-btn turbo-btn" data-btn="turbo_a">TA</button>
            </div>
            <div class="main-btn-row">
              <button class="touch-round-btn nes-btn-b" data-btn="b">B</button>
              <button class="touch-round-btn nes-btn-a" data-btn="a">A</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const buttons = this.container.querySelectorAll('button[data-btn]');
    buttons.forEach((btn) => {
      const btnType = btn.getAttribute('data-btn');

      const handlePress = (e) => {
        e.preventDefault();
        this.vibrate();
        btn.classList.add('active');

        if (btnType === 'turbo_a') {
          this.startTurbo('a');
        } else if (btnType === 'turbo_b') {
          this.startTurbo('b');
        } else {
          this.engine.pressDown(btnType);
        }
      };

      const handleRelease = (e) => {
        e.preventDefault();
        btn.classList.remove('active');

        if (btnType === 'turbo_a') {
          this.stopTurbo('a');
        } else if (btnType === 'turbo_b') {
          this.stopTurbo('b');
        } else {
          this.engine.pressUp(btnType);
        }
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('touchend', handleRelease, { passive: false });
      btn.addEventListener('touchcancel', handleRelease, { passive: false });
      btn.addEventListener('mousedown', handlePress);
      btn.addEventListener('mouseup', handleRelease);
      btn.addEventListener('mouseleave', handleRelease);
    });

    // Touch D-Pad drag handling for fluid 8-way movement
    const dpad = document.getElementById('touch-dpad');
    if (dpad) {
      dpad.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = dpad.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          this.updateDpadFromAngle(angle);
        }
      }, { passive: false });
    }
  }

  updateDpadFromAngle(angle) {
    // -180 to 180 degrees
    const isRight = angle > -67.5 && angle < 67.5;
    const isDown = angle > 22.5 && angle < 157.5;
    const isLeft = angle > 112.5 || angle < -112.5;
    const isUp = angle > -157.5 && angle < -22.5;

    if (isUp) this.engine.pressDown('up'); else this.engine.pressUp('up');
    if (isDown) this.engine.pressDown('down'); else this.engine.pressUp('down');
    if (isLeft) this.engine.pressDown('left'); else this.engine.pressUp('left');
    if (isRight) this.engine.pressDown('right'); else this.engine.pressUp('right');
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

  vibrate() {
    try {
      if (navigator.vibrate) navigator.vibrate(15);
    } catch (e) {
      // ignore
    }
  }

  toggleVisibility() {
    this.container.classList.toggle('visible');
    return this.container.classList.contains('visible');
  }
}
