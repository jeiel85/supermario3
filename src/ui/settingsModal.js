// Settings Modal: Display Filters, Key Bindings, Audio
export class SettingsModal {
  constructor(engine, keyboardController, touchController, onNotification) {
    this.engine = engine;
    this.keyboardController = keyboardController;
    this.touchController = touchController;
    this.onNotification = onNotification || (() => {});

    this.modalElem = document.getElementById('settings-modal');
    this.closeBtn = document.getElementById('close-settings-modal-btn');
    this.crtSelect = document.getElementById('crt-filter-select');
    this.crtCurveCheckbox = document.getElementById('crt-curve-checkbox');
    this.volumeSlider = document.getElementById('volume-slider');
    this.volumeLabel = document.getElementById('volume-label');
    this.muteCheckbox = document.getElementById('mute-checkbox');
    this.touchToggleBtn = document.getElementById('toggle-touch-controls-btn');
    this.resetKeysBtn = document.getElementById('reset-keybindings-btn');
    this.keyBindingsList = document.getElementById('keybindings-list');

    this.init();
  }

  init() {
    if (!this.modalElem) return;

    this.closeBtn?.addEventListener('click', () => this.hide());
    this.modalElem.addEventListener('click', (e) => {
      if (e.target === this.modalElem) this.hide();
    });

    // CRT Scanline filter change
    this.crtSelect?.addEventListener('change', (e) => {
      const mode = e.target.value;
      const arcadeContainer = document.getElementById('arcade-container');
      if (arcadeContainer) {
        arcadeContainer.classList.remove('crt-off', 'crt-light', 'crt-strong');
        arcadeContainer.classList.add(`crt-${mode}`);
      }
      localStorage.setItem('smb3_crt_filter', mode);
      this.onNotification(`화면 필터: CRT ${mode.toUpperCase()}`, 'info');
    });

    // CRT Screen Curvature
    this.crtCurveCheckbox?.addEventListener('change', (e) => {
      const isCurved = e.target.checked;
      const screenWrapper = document.getElementById('screen-wrapper');
      if (screenWrapper) {
        screenWrapper.classList.toggle('crt-curved', isCurved);
      }
      localStorage.setItem('smb3_crt_curved', isCurved ? '1' : '0');
    });

    // Master Volume
    this.volumeSlider?.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value, 10);
      if (this.volumeLabel) this.volumeLabel.textContent = `${vol}%`;
      // Nostalgist does not have direct gain node exposed without low level API, but we can set retroarch volume
      localStorage.setItem('smb3_volume', vol.toString());
    });

    // Mute toggle
    this.muteCheckbox?.addEventListener('change', (e) => {
      const muted = e.target.checked;
      localStorage.setItem('smb3_muted', muted ? '1' : '0');
      this.onNotification(muted ? '음소거 됨' : '음소거 해제', 'info');
    });

    // Touch controls toggle
    this.touchToggleBtn?.addEventListener('click', () => {
      if (this.touchController) {
        const isVisible = this.touchController.toggleVisibility();
        this.onNotification(
          `가상 터치패드: ${isVisible ? '표시됨' : '숨겨짐'}`,
          'info'
        );
      }
    });

    // Reset keybindings
    this.resetKeysBtn?.addEventListener('click', () => {
      if (this.keyboardController) {
        this.keyboardController.resetBindings();
        this.renderKeybindings();
        this.onNotification('키 설정이 기본값으로 초기화되었습니다.', 'info');
      }
    });

    // Load initial settings
    this.loadSavedSettings();
  }

  loadSavedSettings() {
    const savedFilter = localStorage.getItem('smb3_crt_filter') || 'light';
    if (this.crtSelect) this.crtSelect.value = savedFilter;
    const arcadeContainer = document.getElementById('arcade-container');
    if (arcadeContainer) {
      arcadeContainer.classList.add(`crt-${savedFilter}`);
    }

    const savedCurved = localStorage.getItem('smb3_crt_curved') === '1';
    if (this.crtCurveCheckbox) this.crtCurveCheckbox.checked = savedCurved;
    const screenWrapper = document.getElementById('screen-wrapper');
    if (screenWrapper) {
      screenWrapper.classList.toggle('crt-curved', savedCurved);
    }
  }

  show() {
    this.modalElem.classList.add('active');
    this.renderKeybindings();
  }

  hide() {
    this.modalElem.classList.remove('active');
  }

  renderKeybindings() {
    if (!this.keyBindingsList || !this.keyboardController) return;
    const bindings = this.keyboardController.bindings;
    this.keyBindingsList.innerHTML = '';

    const actionLabels = {
      up: '이동 (위 / Up)',
      down: '이동 (아래 / 쭈그리기)',
      left: '이동 (왼쪽 / Left)',
      right: '이동 (오른쪽 / Right)',
      b: 'B 버튼 (달리기 / 꼬리치기 / 파이어)',
      a: 'A 버튼 (점프 / 수영 / 비행)',
      turbo_b: '터보 B (연타 달리기/꼬리)',
      turbo_a: '터보 A (연타 점프)',
      select: 'SELECT (선택 / 아이템 창)',
      start: 'START (시작 / 일시정지)',
      quicksave: '퀵 세이브 (즉시 저장)',
      quickload: '퀵 로드 (즉시 불러오기)',
      pause: '게임 일시정지 (Pause)',
      rewind: '되감기 (Rewind)',
      fastforward: '가속 배속 (Fast Forward)',
      fullscreen: '전체화면 (Fullscreen)',
    };

    for (const [action, label] of Object.entries(actionLabels)) {
      const keys = bindings[action] || [];
      const row = document.createElement('div');
      row.className = 'keybinding-row';

      const readableKeys = keys
        .map((k) =>
          k
            .replace('Key', '')
            .replace('Arrow', '')
            .replace('BracketLeft', '[')
            .replace('BracketRight', ']')
            .replace('ShiftRight', 'R-Shift')
            .replace('ShiftLeft', 'L-Shift')
        )
        .join(' / ');

      row.innerHTML = `
        <span class="binding-action-name">${label}</span>
        <span class="binding-key-tag">${readableKeys || '없음'}</span>
      `;
      this.keyBindingsList.appendChild(row);
    }
  }
}
