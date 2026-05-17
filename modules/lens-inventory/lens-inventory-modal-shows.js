// lens-inventory-modal-shows.js — Reports / Scan / Wizard modal open-close + UX
// M1_LENS_INVENTORY_MOCKUP_1TO1 Sub-Phase A3 (2026-05-18):
//   • Opens the 3 mockup modals already inline in lens-inventory-partial.html.
//   • Sister file to lens-inventory-modals.js (which owns ➕➖ qty adjustment
//     flow via Modal.* shared component). Separation rationale: the 3 new
//     modals follow the mockup's plain .modal-overlay.active toggle pattern,
//     not the shared Modal.* API. Two patterns, two files, clean responsibility.
//   • Activation: opens on data-lens-inv-action button clicks (reports /
//     scan-in / scan-out / bulk-add). Close handlers via [data-modal-close]
//     attributes + ESC key.
//   • Scan modal supports dynamic IN/OUT mode (green vs red gradient header).
//   • Reports modal rpt-tab switching (single-active highlight).
//   • Scan reason chips single-active toggle (red-themed).

(function () {
  'use strict';

  function _setActive(modal, active) {
    if (!modal) return;
    modal.classList.toggle('active', !!active);
    document.body.style.overflow = active ? 'hidden' : '';
  }

  function openReportsModal() {
    _setActive(document.getElementById('reportsModal'), true);
  }

  function openWizardModal() {
    _setActive(document.getElementById('bulkModal'), true);
  }

  function openScanModal(mode) {
    const modal = document.getElementById('scanModal');
    if (!modal) return;
    const header = document.getElementById('scanModalHeader');
    const title = document.getElementById('scanModalTitle');
    const reasonRow = document.getElementById('scanReasonRow');
    const submit = document.getElementById('scanSubmitBtn');
    const input = document.getElementById('scanInput');

    if (header) {
      header.classList.remove('modal-header-green', 'modal-header-red');
    }
    if (submit) {
      submit.classList.remove('scan-submit-in', 'scan-submit-out');
    }

    if (mode === 'in') {
      if (header) header.classList.add('modal-header-green');
      if (title) title.textContent = '📷 סריקה — הוספה למלאי';
      if (reasonRow) reasonRow.style.display = 'none';
      if (submit) {
        submit.classList.add('scan-submit-in');
        submit.textContent = '✓ הכנס למלאי (5 פריטים)';
      }
    } else {
      if (header) header.classList.add('modal-header-red');
      if (title) title.textContent = '📷 סריקה — הורדה מהמלאי';
      if (reasonRow) reasonRow.style.display = 'block';
      if (submit) {
        submit.classList.add('scan-submit-out');
        submit.textContent = '✓ הורד מהמלאי (5 פריטים)';
      }
    }
    _setActive(modal, true);
    if (input) {
      setTimeout(() => input.focus(), 50);
    }
  }

  function closeModal(id) {
    _setActive(document.getElementById(id), false);
  }

  function _attachCloseHandlers() {
    // Close buttons via [data-modal-close]
    document.addEventListener('click', (e) => {
      const t = e.target;
      const closeAttr = t && t.dataset && t.dataset.modalClose;
      if (closeAttr) {
        closeModal(closeAttr);
        return;
      }
      // Click on overlay (not inner modal) closes
      if (t && t.classList && t.classList.contains('modal-overlay') && t.classList.contains('active')) {
        _setActive(t, false);
      }
    });

    // ESC key closes the topmost open modal
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = document.querySelectorAll('.modal-overlay.active');
      if (open.length) {
        _setActive(open[open.length - 1], false);
      }
    });
  }

  function _attachRptTabs() {
    document.querySelectorAll('[data-rpt-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-rpt-tab]').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        // Real per-tab content reload deferred — visual switch only this Phase.
      });
    });
  }

  function _attachScanReasonChips() {
    document.querySelectorAll('[data-scan-reason]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-scan-reason]').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // Header action button dispatcher — replaces the Toast stub in main.js.
  function attachHeaderActionDispatcher() {
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('[data-lens-inv-action]');
      if (!btn) return;
      const action = btn.dataset.lensInvAction;
      switch (action) {
        case 'reports':   openReportsModal(); break;
        case 'scan-in':   openScanModal('in'); break;
        case 'scan-out':  openScanModal('out'); break;
        case 'bulk-add':  openWizardModal(); break;
        case 'export':
          if (window.Toast) Toast.info('ייצוא Excel — יחובר לכפתור Export בלשונית הבאה');
          break;
        case 'search':
          if (window.Toast) Toast.info('חיפוש מתקדם — מודאל ייבנה בלשונית הבאה');
          break;
      }
    });
  }

  // Side-panel ➕➖ wiring — replaces the inline cell qty-btn pattern
  // (mockup moves the controls to the side panel; we route them to the existing
  // handleAdd / handleReduce in lens-inventory-modals.js, providing the
  // currently selected cell's sph/cyl as context).
  function _attachSidePanelQtyControls() {
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('[data-qty-action]');
      if (!btn) return;
      const action = btn.dataset.qtyAction; // 'plus' | 'minus'
      const selectedCell = document.querySelector('.grid-cell.cell-selected');
      if (!selectedCell) {
        if (window.Toast) Toast.info('בחר תחילה תא בטבלה');
        return;
      }
      const sph = selectedCell.dataset.sph || '';
      const cyl = selectedCell.dataset.cyl || '';
      if (!window.LensInvModals) return;
      if (action === 'plus' && typeof window.LensInvModals.handleAdd === 'function') {
        window.LensInvModals.handleAdd(sph, cyl);
      } else if (action === 'minus' && typeof window.LensInvModals.handleReduce === 'function') {
        window.LensInvModals.handleReduce(sph, cyl);
      }
    });
  }

  function attach() {
    _attachCloseHandlers();
    _attachRptTabs();
    _attachScanReasonChips();
    _attachSidePanelQtyControls();
    attachHeaderActionDispatcher();
  }

  window.LensInvModalShows = {
    openReportsModal, openScanModal, openWizardModal, closeModal, attach
  };
})();
