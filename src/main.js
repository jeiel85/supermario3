// Main Application Entry Point
// Safely handle WakeLock permission denial in headless or restricted browser environments
if (typeof navigator !== 'undefined' && navigator.wakeLock) {
  const origRequest = navigator.wakeLock.request.bind(navigator.wakeLock);
  navigator.wakeLock.request = async (type) => {
    try {
      return await origRequest(type);
    } catch (e) {
      return { release: async () => {} };
    }
  };
}
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Wake Lock') || e.reason?.name === 'NotAllowedError') {
    e.preventDefault();
  }
});

import { EmulatorEngine } from './emulator/engine.js';
import { StateManager } from './emulator/stateManager.js';
import { CheatManager } from './emulator/cheats.js';
import { KeyboardController } from './input/keyboard.js';
import { GamepadController } from './input/gamepad.js';
import { TouchController } from './input/touchController.js';
import { SaveSlotsModal } from './ui/saveSlotsModal.js';
import { CheatsModal } from './ui/cheatsModal.js';
import { GuideModal } from './ui/guideModal.js';
import { SettingsModal } from './ui/settingsModal.js';

// Toast Notification Helper
function showNotification(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message ${type}`;

  const icon =
    type === 'success' ? '✅' :
    type === 'error' ? '❌' :
    type === 'warning' ? '⚠️' : 'ℹ️';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

// Update Engine Status Badge
function updateEngineStatus(state, label) {
  const badge = document.getElementById('engine-status-pill');
  if (!badge) return;

  if (state === 'running') {
    badge.className = 'status-pill active';
    badge.textContent = '60.0 FPS';
  } else if (state === 'paused') {
    badge.className = 'status-pill';
    badge.textContent = 'PAUSED';
  } else if (state === 'loading') {
    badge.className = 'status-pill';
    badge.textContent = 'LOADING...';
  } else if (state === 'error') {
    badge.className = 'status-pill';
    badge.style.borderColor = '#e52521';
    badge.style.color = '#e52521';
    badge.textContent = 'ERROR';
  }
}

// Update Gamepad Status Badge
function updateGamepadStatus(connected, name) {
  const badge = document.getElementById('gamepad-status-pill');
  if (!badge) return;

  if (connected) {
    badge.className = 'status-pill gamepad-pill connected';
    badge.textContent = '🎮 패드 연결됨';
    badge.title = name || 'Gamepad';
  } else {
    badge.className = 'status-pill gamepad-pill';
    badge.textContent = '🎮 패드 미연결';
    badge.title = '연결된 게임패드가 없습니다.';
  }
}

// Initialize Application
async function initApp() {
  console.log('Super Mario Bros. 3 WebApp Initializing...');

  // 1. Instantiate Core Engine
  const engine = new EmulatorEngine({
    canvasContainer: document.getElementById('canvas-host') || document.getElementById('screen-wrapper'),
    onStatusChange: (state, label) => updateEngineStatus(state, label),
    onNotification: (msg, type) => showNotification(msg, type),
  });
  window.__smb3_engine = engine;

  // 2. Instantiate State & Cheat Managers
  const stateManager = new StateManager(engine);
  const cheatManager = new CheatManager(engine);

  // 3. Instantiate Controllers
  const keyboardController = new KeyboardController(engine, stateManager, {
    onNotification: showNotification,
  });

  const gamepadController = new GamepadController(engine, {
    onStatusChange: updateGamepadStatus,
    onNotification: showNotification,
  });

  const touchContainer = document.getElementById('touch-controls');
  const touchController = new TouchController(engine, touchContainer);

  // 4. Instantiate Modals
  const saveSlotsModal = new SaveSlotsModal(stateManager, showNotification);
  const cheatsModal = new CheatsModal(cheatManager, showNotification);
  const guideModal = new GuideModal();
  const settingsModal = new SettingsModal(
    engine,
    keyboardController,
    touchController,
    showNotification
  );

  // 5. Bind Header Toolbar Actions
  document.getElementById('btn-quick-save')?.addEventListener('click', async () => {
    try {
      const slot = await stateManager.quickSave();
      showNotification(`퀵 세이브 완료! (${slot.label})`, 'success');
    } catch (err) {
      showNotification(`저장 실패: ${err.message}`, 'error');
    }
  });

  document.getElementById('btn-quick-load')?.addEventListener('click', async () => {
    try {
      const slot = await stateManager.quickLoad();
      showNotification(`퀵 로드 완료! (${slot.label})`, 'success');
    } catch (err) {
      showNotification(`불러오기 실패: ${err.message}`, 'error');
    }
  });

  document.getElementById('btn-open-slots')?.addEventListener('click', () => {
    saveSlotsModal.show();
  });

  document.getElementById('btn-toggle-pause')?.addEventListener('click', () => {
    engine.togglePause();
    const pauseTag = document.getElementById('hud-pause-tag');
    if (pauseTag) pauseTag.style.display = engine.isPaused ? 'block' : 'none';
  });

  let isFast = false;
  document.getElementById('btn-fast-forward')?.addEventListener('click', () => {
    isFast = !isFast;
    engine.setSpeed(isFast ? 2.0 : 1.0);
    const speedTag = document.getElementById('hud-speed-tag');
    if (speedTag) speedTag.style.display = isFast ? 'block' : 'none';
    const btn = document.getElementById('btn-fast-forward');
    if (btn) btn.textContent = isFast ? '⏩ 1x 보통' : '⏩ 2x 배속';
  });

  const rewindBtn = document.getElementById('btn-rewind');
  if (rewindBtn) {
    const startRewindAction = (e) => {
      e.preventDefault();
      engine.startRewind();
      const rewindTag = document.getElementById('hud-rewind-tag');
      if (rewindTag) rewindTag.style.display = 'block';
    };
    const stopRewindAction = (e) => {
      e.preventDefault();
      engine.stopRewind();
      const rewindTag = document.getElementById('hud-rewind-tag');
      if (rewindTag) rewindTag.style.display = 'none';
    };
    rewindBtn.addEventListener('mousedown', startRewindAction);
    rewindBtn.addEventListener('mouseup', stopRewindAction);
    rewindBtn.addEventListener('touchstart', startRewindAction, { passive: false });
    rewindBtn.addEventListener('touchend', stopRewindAction, { passive: false });
  }

  document.getElementById('btn-restart')?.addEventListener('click', () => {
    if (confirm('게임을 처음부터 다시 시작하시겠습니까?')) {
      engine.restart();
    }
  });

  document.getElementById('btn-open-cheats')?.addEventListener('click', () => {
    cheatsModal.show();
  });

  document.getElementById('btn-open-demo-guide')?.addEventListener('click', () => {
    guideModal.show();
    document.querySelectorAll('.guide-nav-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.guide-tab-pane').forEach((p) => p.classList.remove('active'));
    document.querySelector('.guide-nav-tab[data-tab="tab-demo"]')?.classList.add('active');
    document.getElementById('tab-demo')?.classList.add('active');
  });

  document.getElementById('btn-open-guide')?.addEventListener('click', () => {
    guideModal.show();
  });

  // Start Demo Splash Action
  const startDemoBtn = document.getElementById('btn-start-demo-action');
  const startSplash = document.getElementById('start-demo-splash');
  if (startDemoBtn && startSplash) {
    startDemoBtn.addEventListener('click', async () => {
      startSplash.classList.add('hidden');
      if (!engine.nostalgist) {
        try {
          await engine.launch();
        } catch (e) {
          showNotification(`엔진 시동 실패: ${e.message}`, 'error');
          startSplash.classList.remove('hidden');
          return;
        }
      }
      engine.resume();
      engine.getCanvas()?.focus();
      showNotification('라이브 데모가 시작되었습니다! 60FPS 칩튠 사운드 활성화 완료', 'success');
    });
  }

  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    settingsModal.show();
  });

  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    const container = document.getElementById('arcade-container');
    if (!document.fullscreenElement) {
      container?.requestFullscreen?.().catch(console.warn);
    } else {
      document.exitFullscreen?.().catch(console.warn);
    }
  });

  // 6. Custom ROM input & Drag-and-Drop
  const romInput = document.getElementById('custom-rom-input');
  romInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadRomFile(file);
    e.target.value = '';
  });

  const screenWrapper = document.getElementById('screen-wrapper');
  if (screenWrapper) {
    screenWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      screenWrapper.style.outline = '4px dashed var(--mario-yellow)';
    });
    screenWrapper.addEventListener('dragleave', () => {
      screenWrapper.style.outline = 'none';
    });
    screenWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      screenWrapper.style.outline = 'none';
      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.nes')) {
        loadRomFile(file);
      } else {
        showNotification('.nes 형식의 ROM 파일만 불러올 수 있습니다.', 'error');
      }
    });
  }

  async function loadRomFile(file) {
    try {
      showNotification(`ROM 로딩 중: ${file.name}...`, 'info');
      const titleElem = document.getElementById('cabinet-rom-title');
      if (titleElem) titleElem.textContent = file.name.toUpperCase();

      await engine.launch(file, file.name);
      showNotification(`새 ROM이 성공적으로 시작되었습니다: ${file.name}`, 'success');
    } catch (err) {
      showNotification(`ROM 시작 실패: ${err.message}`, 'error');
    }
  }

  // 7. Auto-Launch Super Mario Bros. 3 (USA Rev 1)
  try {
    await engine.launch();
  } catch (err) {
    console.warn('Initial launch error, fallback available on Start Demo:', err);
  }
}

// Start on DOMContentLoaded
window.addEventListener('DOMContentLoaded', initApp);
