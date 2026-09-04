// Super Mario Bros. 3 Strategy Guide & Secret Manual Modal
export class GuideModal {
  constructor() {
    this.modalElem = document.getElementById('guide-modal');
    this.closeBtn = document.getElementById('close-guide-modal-btn');
    this.tabs = document.querySelectorAll('.guide-nav-tab');
    this.contents = document.querySelectorAll('.guide-tab-pane');

    this.init();
  }

  init() {
    if (!this.modalElem) return;

    this.closeBtn?.addEventListener('click', () => this.hide());
    this.modalElem.addEventListener('click', (e) => {
      if (e.target === this.modalElem) this.hide();
    });

    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        this.tabs.forEach((t) => t.classList.remove('active'));
        this.contents.forEach((c) => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(targetId)?.classList.add('active');
      });
    });
  }

  show() {
    this.modalElem.classList.add('active');
  }

  hide() {
    this.modalElem.classList.remove('active');
  }
}
