// Super Mario Bros. 3 WebAssembly NES Emulation Engine
import { Nostalgist } from 'nostalgist';

export class EmulatorEngine {
  constructor(options = {}) {
    this.canvasContainer = options.canvasContainer || document.getElementById('screen-wrapper');
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onNotification = options.onNotification || (() => {});

    this.nostalgist = null;
    this.currentRomName = 'Super Mario Bros. 3 (USA)';
    this.isPaused = false;
    this.isMuted = false;
    this.volume = 1.0;
    this.speedRate = 1.0;
    this.isRewinding = false;
    this.fps = 60;
    this.lastFrameTime = performance.now();
  }

  async launch(romSource = null, romName = 'Super Mario Bros. 3 (USA)') {
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
      
      let finalRomSource = romSource;
      if (!finalRomSource) {
        finalRomSource = new URL(`${baseUrl}roms/smb3.nes`, window.location.href).href;
      } else if (typeof finalRomSource === 'string' && !finalRomSource.startsWith('http://') && !finalRomSource.startsWith('https://') && !finalRomSource.startsWith('blob:') && !finalRomSource.startsWith('data:')) {
        finalRomSource = new URL(finalRomSource, window.location.href).href;
      }

      this.onStatusChange('loading', '슈퍼마리오 3 엔진 시동 중...');
      this.currentRomName = romName;

      // Clean up previous instance if exists
      if (this.nostalgist) {
        try {
          await this.nostalgist.exit({ removeCanvas: true });
        } catch (e) {
          console.warn('Error exiting previous nostalgist:', e);
        }
        this.nostalgist = null;
      }

      // Empty container
      if (this.canvasContainer) {
        this.canvasContainer.innerHTML = '';
      }

      const canvas = document.createElement('canvas');
      canvas.id = 'nes-canvas';
      canvas.className = 'nes-display-canvas';
      canvas.tabIndex = 1;
      this.canvasContainer.appendChild(canvas);

      // Launch with local core and fallback
      this.nostalgist = await Nostalgist.launch({
        core: 'fceumm',
        rom: finalRomSource,
        element: canvas,
        respondToGlobalEvents: true,
        async resolveCoreJs(core) {
          try {
            const url = new URL(`${baseUrl}cores/fceumm_libretro.js`, window.location.href).href;
            const res = await fetch(url);
            if (res.ok) return await res.blob();
          } catch (e) {
            console.warn('Local core JS fetch failed, falling back to CDN:', e);
          }
          const cdnRes = await fetch('https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/fceumm_libretro.js');
          return await cdnRes.blob();
        },
        async resolveCoreWasm(core) {
          try {
            const url = new URL(`${baseUrl}cores/fceumm_libretro.wasm`, window.location.href).href;
            const res = await fetch(url);
            if (res.ok) return await res.blob();
          } catch (e) {
            console.warn('Local core WASM fetch failed, falling back to CDN:', e);
          }
          const cdnRes = await fetch('https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/fceumm_libretro.wasm');
          return await cdnRes.blob();
        },
        retroarchConfig: {
          video_vsync: true,
          video_smooth: false, // keep crisp pixel art
          rewind_enable: true,
          rewind_buffer_size: 25 * 1024 * 1024,
          rewind_granularity: 2,
          savestate_thumbnail_enable: true,
          audio_enable: true,
          input_player1_b: 'z',
          input_player1_a: 'x',
          input_player1_y: 'a',
          input_player1_x: 's',
          input_player1_start: 'enter',
          input_player1_select: 'rshift',
          input_player1_up: 'up',
          input_player1_down: 'down',
          input_player1_left: 'left',
          input_player1_right: 'right',
        },
        retroarchCoreConfig: {
          fceumm_turbo_enable: 'Both',
          fceumm_zapper_mode: 'clightgun',
        },
      });

      // Ensure canvas focuses
      canvas.focus();
      this.isPaused = false;
      this.onStatusChange('running', '실행 중');
      this.onNotification('슈퍼마리오 브라더스 3 가 성공적으로 시작되었습니다!', 'success');

      // Setup user gesture listener for AudioContext auto-unlock
      this.setupAudioUnlock();

      return true;
    } catch (err) {
      console.error('Failed to launch emulator:', err);
      this.onStatusChange('error', `오류 발생: ${err.message}`);
      this.onNotification(`에뮬레이터 실행 실패: ${err.message}`, 'error');
      throw err;
    }
  }

  setupAudioUnlock() {
    const unlock = () => {
      try {
        // Find any suspended audio contexts in window
        if (window.AudioContext || window.webkitAudioContext) {
          // If retroarch created audio context
          const emscripten = this.nostalgist?.getEmscriptenModule?.();
          if (emscripten?.AL?.currentCtx?.audioCtx?.state === 'suspended') {
            emscripten.AL.currentCtx.audioCtx.resume();
          }
        }
      } catch (e) {
        // ignore
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }

  togglePause() {
    if (!this.nostalgist) return;
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  pause() {
    if (!this.nostalgist || this.isPaused) return;
    this.nostalgist.pause();
    this.isPaused = true;
    this.onStatusChange('paused', '일시 정지됨');
    this.onNotification('게임 일시 정지 (P키로 재개)', 'info');
  }

  resume() {
    if (!this.nostalgist || !this.isPaused) return;
    this.nostalgist.resume();
    this.isPaused = false;
    this.onStatusChange('running', '실행 중');
    this.onNotification('게임 재개됨', 'info');
  }

  restart() {
    if (!this.nostalgist) return;
    this.nostalgist.restart();
    this.isPaused = false;
    this.onStatusChange('running', '게임 리셋됨');
    this.onNotification('게임이 처음부터 다시 시작되었습니다.', 'warning');
  }

  setSpeed(rate) {
    if (!this.nostalgist) return;
    this.speedRate = rate;
    // Nostalgist / RetroArch fast forward command
    if (rate > 1) {
      this.nostalgist.sendCommand('FAST_FORWARD');
      this.onNotification(`배속: ${rate}x 가속 모드`, 'info');
    } else {
      // Normal speed
      this.onNotification('배속: 보통 (1.0x)', 'info');
    }
  }

  startRewind() {
    if (!this.nostalgist || this.isRewinding) return;
    this.isRewinding = true;
    this.nostalgist.sendCommand('REWIND');
    this.onNotification('되감기 진행 중 (R 키 해제 시 멈춤)...', 'warning');
  }

  stopRewind() {
    if (!this.nostalgist || !this.isRewinding) return;
    this.isRewinding = false;
    // Nostalgist does not have an explicit stop rewind command, sending pause/resume or normal frame continues
    this.onNotification('되감기 완료', 'info');
  }

  pressDown(button) {
    if (!this.nostalgist) return;
    try {
      this.nostalgist.pressDown(button, 1);
    } catch (e) {
      // fallback
    }
  }

  pressUp(button) {
    if (!this.nostalgist) return;
    try {
      this.nostalgist.pressUp(button, 1);
    } catch (e) {
      // fallback
    }
  }

  captureCanvasScreenshot() {
    const canvas = this.getCanvas();
    if (!canvas) return null;
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Screenshot capture failed:', e);
      return null;
    }
  }

  getCanvas() {
    if (!this.nostalgist) return null;
    try {
      return this.nostalgist.getCanvas();
    } catch (e) {
      return document.getElementById('nes-canvas');
    }
  }
}
