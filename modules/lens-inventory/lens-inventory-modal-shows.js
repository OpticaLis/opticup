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
        case 'scan-in':
          // Phase C C-C3 — replaced sample-data modal with Quick Scan drawer
          if (window.LensInvQuickScan && typeof window.LensInvQuickScan.open === 'function') {
            window.LensInvQuickScan.open();
          } else {
            openScanModal('in'); // fallback (should never trigger; new file loads via shell registry)
          }
          break;
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

  // ==================================================================
  // Phase C — Manual Add panel: supplier dropdown + submit handler
  // Quick Scan drawer + Full Receive modal helpers (shared _submitAddStock).
  // RPC: m1_create_receipt_from_box (10-arg signature, Phase C-C1).
  // ==================================================================
  async function _loadSuppliersForManualAdd() {
    var sel = document.getElementById('manual-supplier');
    if (!sel) return;
    try {
      var tid = getTenantId();
      // Defense-in-depth: explicit tenant filter (Rule 22) + active filter.
      var { data: tenantRow } = await sb.from('tenants')
        .select('default_supplier_id')
        .eq('id', tid)
        .single();
      var defaultId = tenantRow && tenantRow.default_supplier_id || '';
      var { data: suppliers, error } = await sb.from('suppliers')
        .select('id, name')
        .eq('tenant_id', tid)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      var html = '<option value="">— בחר ספק —</option>';
      (suppliers || []).forEach(function(s) {
        var selected = (s.id === defaultId) ? ' selected' : '';
        html += '<option value="' + escapeHtml(s.id) + '"' + selected + '>' + escapeHtml(s.name) + '</option>';
      });
      sel.innerHTML = html;
    } catch (e) {
      console.warn('_loadSuppliersForManualAdd:', e.message);
    }
  }

  function _resolveVariantContext() {
    var v = document.getElementById('filter-variant');
    return {
      variant_id: v && v.value ? v.value : null,
      design_id:  (document.getElementById('filter-design') || {}).value || null
    };
  }

  // Phase C C-C2 DM-3 (Tier C VFV finding): purchase_receipt_line.location_id is NOT NULL.
  // Cache the first tenant_location id for the active tenant.
  var _defaultLocationCache = null;
  async function _resolveDefaultLocationId() {
    if (_defaultLocationCache) return _defaultLocationCache;
    try {
      var tid = getTenantId();
      var { data, error } = await sb.from('tenant_location')
        .select('id, is_default')
        .eq('tenant_id', tid)
        .order('is_default', { ascending: false, nullsFirst: false })
        .limit(1);
      if (error) throw error;
      _defaultLocationCache = (data && data[0] && data[0].id) || null;
      return _defaultLocationCache;
    } catch (e) { console.warn('_resolveDefaultLocationId:', e.message); return null; }
  }

  async function _submitAddStock(params) {
    // params: { variant_id, sph, cyl, qty_received, unit_cost, supplier_id, source }
    // Post-debt-decoupling: delivery_note_number + is_documented + undocumented_reason
    // params REMOVED. Inventory does not track documentation state; that belongs to
    // the supplier-debt module.
    if (!params.supplier_id) {
      Toast.error('בחר ספק לפני שמירה');
      return null;
    }
    var tid = getTenantId();
    var locId = await _resolveDefaultLocationId();
    if (!locId) {
      Toast.error('לא נמצא מיקום מלאי לדייר זה');
      return null;
    }
    var line = {
      variant_id: params.variant_id || null,
      location_id: locId,
      sph: params.sph,
      cyl: params.cyl,
      qty_received: Number(params.qty_received) || 0,
      unit_cost: Number(params.unit_cost) || 0,
      is_manual_addition: !params.variant_id
    };
    if (line.qty_received < 1) {
      Toast.error('כמות חייבת להיות גדולה מ-0');
      return null;
    }
    try {
      var emp = JSON.parse(sessionStorage.getItem('tenant_employee') || '{}');
      var { data, error } = await sb.rpc('m1_create_receipt_from_box', {
        p_tenant_id: tid,
        p_supplier_id: params.supplier_id,
        p_delivery_note_number: null,
        p_lines: [line],
        p_box_id: null,
        p_box_supplier_barcode: null,
        p_supplier_number: null,
        p_confirmed_by: emp.id || null
      });
      if (error) throw error;
      Toast.success('מלאי עודכן (' + (params.source || 'manual') + ')');
      // Trigger grid + lot refresh if the page exposes a reload helper.
      if (window.LensInv && typeof window.LensInv.reloadStock === 'function') {
        try { window.LensInv.reloadStock(); } catch (_) {}
      }
      return data; // receipt_id
    } catch (e) {
      console.error('_submitAddStock:', e);
      Toast.error('שגיאה בהוספת מלאי: ' + (e.message || e));
      return null;
    }
  }

  function _attachManualAddHandler() {
    var btn = document.getElementById('manual-add-submit');
    if (!btn || btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', async function() {
      var ctx = _resolveVariantContext();
      var sph = (document.getElementById('manual-sph') || {}).value;
      var cyl = (document.getElementById('manual-cyl') || {}).value;
      var qty = (document.getElementById('manual-qty') || {}).value;
      var cost = (document.getElementById('manual-cost') || {}).value;
      var supplier = (document.getElementById('manual-supplier') || {}).value;
      var receiptId = await _submitAddStock({
        variant_id: ctx.variant_id,
        sph: sph || null,
        cyl: cyl || null,
        qty_received: qty,
        unit_cost: cost,
        supplier_id: supplier,
        source: 'manual'
      });
      if (receiptId) {
        // Clear inputs after success
        ['manual-sph','manual-cyl','manual-qty','manual-cost'].forEach(function(id) {
          var el = document.getElementById(id); if (el) el.value = '';
        });
      }
    });
  }

  function attach() {
    _attachCloseHandlers();
    _attachRptTabs();
    _attachScanReasonChips();
    _attachSidePanelQtyControls();
    attachHeaderActionDispatcher();
    // Phase C — Manual Add panel wiring
    _loadSuppliersForManualAdd();
    _attachManualAddHandler();
  }

  window.LensInvModalShows = {
    openReportsModal, openScanModal, openWizardModal, closeModal, attach,
    // Phase C exports for Quick Scan drawer + Full Receive modal (C-C3/C-C4)
    _submitAddStock, _loadSuppliersForManualAdd
  };
})();
