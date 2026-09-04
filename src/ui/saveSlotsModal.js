// Visual Save State Slot Manager Modal
export class SaveSlotsModal {
  constructor(stateManager, onNotification) {
    this.stateManager = stateManager;
    this.onNotification = onNotification || (() => {});
    this.modalElem = document.getElementById('save-slots-modal');
    this.gridElem = document.getElementById('slots-grid');
    this.closeBtn = document.getElementById('close-slots-modal-btn');
    this.importFileInput = document.getElementById('import-state-file-input');

    this.init();
  }

  init() {
    if (!this.modalElem) return;

    this.closeBtn?.addEventListener('click', () => this.hide());
    this.modalElem.addEventListener('click', (e) => {
      if (e.target === this.modalElem) this.hide();
    });

    this.importFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await this.stateManager.importStateFromFile(file);
        this.onNotification(`세이브 파일 가져오기 완료: ${file.name}`, 'success');
        this.renderSlots();
      } catch (err) {
        this.onNotification(`파일 불러오기 실패: ${err.message}`, 'error');
      }
      e.target.value = '';
    });
  }

  async show() {
    this.modalElem.classList.add('active');
    await this.renderSlots();
  }

  hide() {
    this.modalElem.classList.remove('active');
  }

  async renderSlots() {
    if (!this.gridElem) return;
    this.gridElem.innerHTML = '<div class="loading-spinner">슬롯 로딩 중...</div>';

    try {
      const slots = await this.stateManager.getAllSlots();
      this.gridElem.innerHTML = '';

      slots.forEach((slot) => {
        const slotCard = document.createElement('div');
        slotCard.className = `slot-card ${slot.empty ? 'empty' : 'occupied'}`;

        const formattedTime = slot.timestamp
          ? new Date(slot.timestamp).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '비어 있음';

        const thumbHtml = slot.thumbnail
          ? `<img src="${slot.thumbnail}" class="slot-thumbnail-img" alt="슬롯 ${slot.slotIndex + 1} 스크린샷" />`
          : `<div class="slot-no-thumbnail"><span>저장 데이터 없음</span></div>`;

        slotCard.innerHTML = `
          <div class="slot-header">
            <span class="slot-badge">SLOT ${slot.slotIndex + 1}</span>
            <span class="slot-time">${formattedTime}</span>
          </div>
          <div class="slot-preview-box">
            ${thumbHtml}
          </div>
          <div class="slot-label-row">
            <span class="slot-title">${slot.label}</span>
          </div>
          <div class="slot-actions">
            <button class="slot-btn slot-save-btn" data-action="save" data-slot="${slot.slotIndex}">
              💾 저장 (Save)
            </button>
            <button class="slot-btn slot-load-btn ${slot.empty ? 'disabled' : ''}" data-action="load" data-slot="${slot.slotIndex}" ${slot.empty ? 'disabled' : ''}>
              ▶ 로드 (Load)
            </button>
            <button class="slot-btn slot-export-btn ${slot.empty ? 'disabled' : ''}" data-action="export" data-slot="${slot.slotIndex}" title="파일로 다운로드" ${slot.empty ? 'disabled' : ''}>
              ⬇ 파일
            </button>
            <button class="slot-btn slot-delete-btn ${slot.empty ? 'disabled' : ''}" data-action="delete" data-slot="${slot.slotIndex}" title="슬롯 삭제" ${slot.empty ? 'disabled' : ''}>
              🗑️
            </button>
          </div>
        `;

        this.bindSlotEvents(slotCard, slot);
        this.gridElem.appendChild(slotCard);
      });
    } catch (err) {
      console.error('Error rendering save slots:', err);
      this.gridElem.innerHTML = `<div class="error-msg">슬롯 불러오기 실패: ${err.message}</div>`;
    }
  }

  bindSlotEvents(card, slot) {
    const saveBtn = card.querySelector('[data-action="save"]');
    const loadBtn = card.querySelector('[data-action="load"]');
    const exportBtn = card.querySelector('[data-action="export"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    saveBtn?.addEventListener('click', async () => {
      try {
        await this.stateManager.saveSlot(slot.slotIndex, `월드 진행 상황 (슬롯 ${slot.slotIndex + 1})`);
        this.onNotification(`슬롯 ${slot.slotIndex + 1}번에 성공적으로 저장되었습니다!`, 'success');
        await this.renderSlots();
      } catch (err) {
        this.onNotification(`저장 실패: ${err.message}`, 'error');
      }
    });

    loadBtn?.addEventListener('click', async () => {
      try {
        await this.stateManager.loadSlot(slot.slotIndex);
        this.onNotification(`슬롯 ${slot.slotIndex + 1}번 상태를 성공적으로 불러왔습니다!`, 'success');
        this.hide();
      } catch (err) {
        this.onNotification(`불러오기 실패: ${err.message}`, 'error');
      }
    });

    exportBtn?.addEventListener('click', async () => {
      try {
        await this.stateManager.exportStateToFile(slot.slotIndex);
        this.onNotification(`슬롯 ${slot.slotIndex + 1}번 파일 다운로드 시작`, 'info');
      } catch (err) {
        this.onNotification(`내보내기 실패: ${err.message}`, 'error');
      }
    });

    deleteBtn?.addEventListener('click', async () => {
      if (confirm(`슬롯 ${slot.slotIndex + 1}번 저장 데이터를 삭제하시겠습니까?`)) {
        try {
          await this.stateManager.deleteSlot(slot.slotIndex);
          this.onNotification(`슬롯 ${slot.slotIndex + 1}번이 삭제되었습니다.`, 'info');
          await this.renderSlots();
        } catch (err) {
          this.onNotification(`삭제 실패: ${err.message}`, 'error');
        }
      }
    });
  }
}
