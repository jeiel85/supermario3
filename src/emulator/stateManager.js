// IndexedDB-based Visual Save State Manager for Super Mario Bros. 3

const DB_NAME = 'SMB3_SaveStates_DB';
const DB_VERSION = 1;
const STORE_NAME = 'save_slots';
export const TOTAL_SLOTS = 6;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slotIndex' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class StateManager {
  constructor(engine) {
    this.engine = engine;
    this.currentSlot = 0;
  }

  async getAllSlots() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const list = request.result || [];
        const slots = [];
        for (let i = 0; i < TOTAL_SLOTS; i++) {
          const found = list.find((s) => s.slotIndex === i);
          slots.push(
            found || {
              slotIndex: i,
              empty: true,
              label: `슬롯 ${i + 1}`,
              timestamp: null,
              thumbnail: null,
            }
          );
        }
        resolve(slots);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSlot(slotIndex, label = '') {
    if (!this.engine || !this.engine.nostalgist) {
      throw new Error('에뮬레이터가 아직 실행 중이 아닙니다.');
    }

    const { state, thumbnail } = await this.engine.nostalgist.saveState();

    let thumbDataUrl = null;
    if (thumbnail) {
      thumbDataUrl = await this.blobToDataUrl(thumbnail);
    } else {
      thumbDataUrl = this.engine.captureCanvasScreenshot();
    }

    const slotData = {
      slotIndex,
      empty: false,
      label: label.trim() || `슬롯 ${slotIndex + 1}`,
      timestamp: new Date().toISOString(),
      thumbnail: thumbDataUrl,
      stateBlob: state,
    };

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(slotData);
      req.onsuccess = () => {
        this.currentSlot = slotIndex;
        resolve(slotData);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async loadSlot(slotIndex) {
    if (!this.engine || !this.engine.nostalgist) {
      throw new Error('에뮬레이터가 아직 실행 중이 아닙니다.');
    }

    const db = await openDatabase();
    const slotData = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(slotIndex);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!slotData || !slotData.stateBlob) {
      throw new Error(`슬롯 ${slotIndex + 1}번에 저장된 데이터가 없습니다.`);
    }

    await this.engine.nostalgist.loadState(slotData.stateBlob);
    this.currentSlot = slotIndex;
    return slotData;
  }

  async deleteSlot(slotIndex) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(slotIndex);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async quickSave() {
    return this.saveSlot(this.currentSlot, `퀵 세이브 (슬롯 ${this.currentSlot + 1})`);
  }

  async quickLoad() {
    return this.loadSlot(this.currentSlot);
  }

  async exportStateToFile(slotIndex) {
    const db = await openDatabase();
    const slotData = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(slotIndex);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!slotData || !slotData.stateBlob) {
      throw new Error('저장된 세이브 데이터가 없습니다.');
    }

    const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `SMB3_Slot${slotIndex + 1}_${now}.state`;
    const url = URL.createObjectURL(slotData.stateBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async importStateFromFile(file, slotIndex = this.currentSlot) {
    if (!file) throw new Error('파일이 지정되지 않았습니다.');
    const blob = file instanceof Blob ? file : new Blob([file]);

    // Test loading it immediately to verify it works
    if (this.engine && this.engine.nostalgist) {
      await this.engine.nostalgist.loadState(blob);
    }

    // Save into chosen slot
    const thumbDataUrl = this.engine ? this.engine.captureCanvasScreenshot() : null;
    const slotData = {
      slotIndex,
      empty: false,
      label: `가져온 파일: ${file.name || 'SMB3.state'}`,
      timestamp: new Date().toISOString(),
      thumbnail: thumbDataUrl,
      stateBlob: blob,
    };

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(slotData);
      req.onsuccess = () => resolve(slotData);
      req.onerror = () => reject(req.error);
    });
  }

  blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }
}
