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
  // M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION (2026-05-17): scan-in + bulk-add
  // now funnel through the shared Quick Receipt drawer (Brief decision #9). The old
  // direct-to-stock LensInvQuickScan path is retired; scan-in opens the scan modal
  // which (on submit) opens the drawer. Bulk wizard funnel happens via the
  // bulk-wizard-stage-to-drawer button handler (see _attachBulkWizardFunnel).
  function attachHeaderActionDispatcher() {
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('[data-lens-inv-action]');
      if (!btn) return;
      const action = btn.dataset.lensInvAction;
      switch (action) {
        case 'reports':   openReportsModal(); break;
        case 'scan-in':
          // Round 2 mockup: scan modal still opens for IN mode, but its submit
          // funnels to Quick Receipt drawer (handled in _attachScanInFunnel).
          openScanModal('in');
          break;
        case 'scan-out':  openScanModal('out'); break;
        case 'bulk-add':  openWizardModal(); break;
        case 'receive-goods':
          // Top-header "קבל סחורה" — opens drawer empty for direct delivery-note + items entry.
          if (window.LensInv && window.LensInv.quickReceiptDrawer) {
            window.LensInv.quickReceiptDrawer.open();
          } else if (window.Toast) {
            Toast.error('טיוטת קבלה לא מוכנה עדיין — נסה שוב מאוחר יותר');
          }
          break;
        case 'export':
          if (window.Toast) Toast.info('ייצוא Excel — יחובר לכפתור Export בלשונית הבאה');
          break;
        case 'search':
          if (window.Toast) Toast.info('חיפוש מתקדם — מודאל ייבנה בלשונית הבאה');
          break;
      }
    });
  }

  // Scan modal IN-mode submit → close modal + open Quick Receipt drawer.
  // (OUT-mode submit retains the legacy direct-decrement flow; not handled here.)
  function _attachScanInFunnel() {
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.id === 'scanSubmitBtn' ? e.target : null;
      if (!btn) return;
      // Only IN-mode (header has modal-header-green class on the parent modal)
      const modal = document.getElementById('scanModal');
      const header = document.getElementById('scanModalHeader');
      const isIn = header && header.classList.contains('modal-header-green');
      if (!isIn) return; // OUT-mode keeps its own handler
      _setActive(modal, false);
      if (window.LensInv && window.LensInv.quickReceiptDrawer) {
        window.LensInv.quickReceiptDrawer.open();
      }
    });
  }

  // Bulk wizard "העבר לטיוטת קבלה" → close wizard + open drawer.
  // Full N-row staging from wizard inputs is a future SPEC; this commit only
  // honors the funnel rule (no direct-to-stock from wizard).
  function _attachBulkWizardFunnel() {
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.id === 'bulk-wizard-stage-to-drawer' ? e.target : null;
      if (!btn) return;
      _setActive(document.getElementById('bulkModal'), false);
      if (window.LensInv && window.LensInv.quickReceiptDrawer) {
        window.LensInv.quickReceiptDrawer.open();
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

  // Manual-add panel: SPEC 4a (2026-05-17) — supplier dropdown now disabled
  // (supplier captured once in Quick Receipt drawer Section A). Direct-write
  // _submitAddStock + _loadSuppliersForManualAdd were retired as part of the
  // funnel rule (Brief decision #9). Atomic receipt creation lives in
  // lens-inventory-main.js handleQuickReceiptSubmit.
  function _resolveVariantContext() {
    var v = document.getElementById('filter-variant');
    return {
      variant_id: v && v.value ? v.value : null,
      design_id:  (document.getElementById('filter-design') || {}).value || null
    };
  }

  // M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION (2026-05-17): manual-add no longer
  // direct-writes to stock. It STAGES the item into the Quick Receipt drawer's
  // Section B; the user then completes delivery-note metadata in Section A and
  // persists everything via "סיים קבלה". This honors Brief decision #9 (drawer =
  // sole entry path). The supplier dropdown in the manual-add card is disabled —
  // supplier is captured once in the drawer.
  function _attachManualAddHandler() {
    var btn = document.getElementById('manual-add-submit');
    if (!btn || btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', function() {
      var ctx = _resolveVariantContext();
      var sph = (document.getElementById('manual-sph') || {}).value;
      var cyl = (document.getElementById('manual-cyl') || {}).value;
      var qty = parseInt((document.getElementById('manual-qty') || {}).value, 10) || 1;
      var cost = (document.getElementById('manual-cost') || {}).value;
      var barcode = (document.getElementById('manual-barcode') || {}).value;
      if (!(window.LensInv && window.LensInv.quickReceiptDrawer)) {
        if (window.Toast) Toast.error('טיוטת קבלה לא מוכנה — נסה שוב');
        return;
      }
      // Build a staged item shape per QuickReceiptDrawer API:
      //   { id, name, variant?, qty, unitCost?, meta?: { sph, cyl, ... } }
      var itemId = 'manual-' + Date.now();
      var item = {
        id: itemId,
        name: barcode ? ('ברקוד: ' + barcode) : (ctx.variant_id ? 'וריאציה נבחרת' : 'הוספה ידנית'),
        variant: ctx.variant_id || null,
        qty: qty,
        unitCost: cost ? Number(String(cost).replace(/[^0-9.\-]/g, '')) || null : null,
        meta: (sph || cyl) ? { sph: sph || '—', cyl: cyl || '—' } : null,
        // Carry the variant_id + sph/cyl for the onSubmit RPC mapping
        _line: {
          variant_id: ctx.variant_id || null,
          sph: sph || null,
          cyl: cyl || null,
          qty_received: qty,
          unit_cost: cost ? Number(String(cost).replace(/[^0-9.\-]/g, '')) || 0 : 0,
          is_manual_addition: !ctx.variant_id
        }
      };
      window.LensInv.quickReceiptDrawer.stageItem(item);
      window.LensInv.quickReceiptDrawer.open();
      // Clear manual-add inputs (supplier stays disabled).
      ['manual-sph','manual-cyl','manual-qty','manual-cost','manual-barcode'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
      });
    });
  }

  function attach() {
    _attachCloseHandlers();
    _attachRptTabs();
    _attachScanReasonChips();
    _attachSidePanelQtyControls();
    attachHeaderActionDispatcher();
    // SPEC 4a — Quick Receipt drawer funnel wiring
    _attachScanInFunnel();
    _attachBulkWizardFunnel();
    // Phase C — Manual Add panel wiring (now stages to drawer per SPEC 4a)
    _attachManualAddHandler();
  }

  window.LensInvModalShows = {
    openReportsModal, openScanModal, openWizardModal, closeModal, attach
  };
})();
