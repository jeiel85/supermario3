// Game Genie Cheats Modal
export class CheatsModal {
  constructor(cheatManager, onNotification) {
    this.cheatManager = cheatManager;
    this.onNotification = onNotification || (() => {});
    this.modalElem = document.getElementById('cheats-modal');
    this.listElem = document.getElementById('cheats-list');
    this.closeBtn = document.getElementById('close-cheats-modal-btn');
    this.customForm = document.getElementById('add-custom-cheat-form');

    this.init();
  }

  init() {
    if (!this.modalElem) return;

    this.closeBtn?.addEventListener('click', () => this.hide());
    this.modalElem.addEventListener('click', (e) => {
      if (e.target === this.modalElem) this.hide();
    });

    this.customForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const codeInput = document.getElementById('cheat-code-input');
      const nameInput = document.getElementById('cheat-name-input');
      const code = codeInput?.value;
      const name = nameInput?.value;

      try {
        const added = this.cheatManager.addCustomCheat(code, name);
        this.onNotification(`치트 추가됨: ${added.name} [${added.code}]`, 'success');
        if (codeInput) codeInput.value = '';
        if (nameInput) nameInput.value = '';
        this.renderCheats();
      } catch (err) {
        this.onNotification(err.message, 'error');
      }
    });
  }

  show() {
    this.modalElem.classList.add('active');
    this.renderCheats();
  }

  hide() {
    this.modalElem.classList.remove('active');
  }

  renderCheats() {
    if (!this.listElem) return;
    const cheats = this.cheatManager.getCheats();
    this.listElem.innerHTML = '';

    cheats.forEach((cheat) => {
      const item = document.createElement('div');
      item.className = `cheat-item ${cheat.enabled ? 'active' : ''}`;

      item.innerHTML = `
        <div class="cheat-info">
          <div class="cheat-title-row">
            <span class="cheat-name">${cheat.name}</span>
            <span class="cheat-code-tag">${cheat.code}</span>
          </div>
          <p class="cheat-desc">${cheat.desc}</p>
        </div>
        <div class="cheat-action">
          <label class="toggle-switch">
            <input type="checkbox" class="cheat-toggle-checkbox" data-id="${cheat.id}" ${cheat.enabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
          ${
            cheat.custom
              ? `<button class="delete-cheat-btn" data-id="${cheat.id}" title="삭제">✕</button>`
              : ''
          }
        </div>
      `;

      const checkbox = item.querySelector('.cheat-toggle-checkbox');
      checkbox?.addEventListener('change', () => {
        const isEnabled = this.cheatManager.toggleCheat(cheat.id);
        item.classList.toggle('active', isEnabled);
        this.onNotification(
          `${cheat.name}: ${isEnabled ? '활성화됨 (ON)' : '비활성화됨 (OFF)'}`,
          isEnabled ? 'success' : 'info'
        );
      });

      const delBtn = item.querySelector('.delete-cheat-btn');
      delBtn?.addEventListener('click', () => {
        this.cheatManager.removeCheat(cheat.id);
        this.onNotification(`치트 삭제됨: ${cheat.name}`, 'info');
        this.renderCheats();
      });

      this.listElem.appendChild(item);
    });
  }
}
