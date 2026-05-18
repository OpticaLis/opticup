// lens-purchase-order-main.js — orchestrator + permission gate + state + wizard mount
// M1_LENS_PURCHASE_ORDER_REBUILD 2026-05-18. 1:1 mockup rebuild.
// Iron Rule 7: every DB write via sb.rpc. Iron Rule 8: escapeHtml from shared.js.

(function () {
  'use strict';

  const STEP_SUPPLIER = 0;
  const STEP_ITEMS    = 1;
  const STEP_REVIEW   = 2;
  const STEP_SEND     = 3;

  window.LensPO = {
    supplierId: null,
    supplierRow: null,
    supplierLensVatRate: 0.18,
    expectedDeliveryAt: null,
    notes: '',
    locationId: null,
    lines: [],
    suppliers: [],
    locations: [],
    poId: null,
    poNumber: null,
    poStatus: null,
    currentStep: STEP_SUPPLIER,
    wizard: null,
  };

  async function gateOrRedirect() {
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('[lens-purchase-order] hasPermission not available — gating disabled');
      return true;
    }
    if (!hasPermission('lens.po.create')) {
      const gate = document.getElementById('access-gate');
      if (gate) gate.style.display = 'block';
      const app = document.getElementById('app');
      if (app) app.style.display = 'none';
      return false;
    }
    const gate = document.getElementById('access-gate'); if (gate) gate.style.display = 'none';
    const app  = document.getElementById('app');         if (app)  app.style.display  = 'block';
    return true;
  }

  function mountWizard() {
    const host = document.getElementById('lens-po-wizard-mount');
    if (!host || !window.WizardSteps) return;
    window.LensPO.wizard = WizardSteps.init(host, {
      steps: [
        { id: 'supplier', label: 'בחירת ספק' },
        { id: 'items',    label: 'פריטים להזמנה' },
        { id: 'review',   label: 'בדיקה וסיכום' },
        { id: 'send',     label: 'שליחה לספק' },
      ],
      activeIndex: window.LensPO.currentStep,
    });
  }

  function setStep(idx) {
    if (typeof idx !== 'number' || idx < STEP_SUPPLIER || idx > STEP_SEND) return;
    window.LensPO.currentStep = idx;
    if (window.LensPO.wizard) window.LensPO.wizard.setActiveIndex(idx);
    const advanceBtn = document.getElementById('btn-advance-review');
    const backBtn    = document.getElementById('btn-back-step');
    const createBtn  = document.getElementById('btn-create-po');
    const sentBtn    = document.getElementById('btn-mark-sent');
    const cancelBtn  = document.getElementById('btn-cancel-po');
    if (advanceBtn) advanceBtn.style.display = (idx <= STEP_ITEMS) ? '' : 'none';
    if (backBtn)    backBtn.style.display    = (idx === STEP_REVIEW) ? '' : 'none';
    if (createBtn)  createBtn.style.display  = (idx === STEP_REVIEW) ? '' : 'none';
    if (sentBtn)    sentBtn.style.display    = (idx === STEP_SEND && window.LensPO.poStatus === 'draft') ? '' : 'none';
    if (cancelBtn)  cancelBtn.style.display  = (idx === STEP_SEND && window.LensPO.poStatus && window.LensPO.poStatus !== 'cancelled') ? '' : 'none';
  }

  function recomputeSummary() {
    const lines = window.LensPO.lines.filter(l => !l._removed);
    const units = lines.reduce((s, l) => s + (parseInt(l.qty_ordered, 10) || 0), 0);
    const stockLines  = lines.filter(l => l.source === 'stock');
    const manualLines = lines.filter(l => l.source === 'manual');
    const customLines = lines.filter(l => l.source === 'custom');
    const stockUnits  = stockLines.reduce((s, l) => s + (parseInt(l.qty_ordered, 10) || 0), 0);
    const manualUnits = manualLines.reduce((s, l) => s + (parseInt(l.qty_ordered, 10) || 0), 0);
    const net = lines.reduce((s, l) => {
      const q = parseInt(l.qty_ordered, 10) || 0;
      const c = parseFloat(l.unit_cost)    || 0;
      return s + q * c;
    }, 0);
    const vat   = net * (window.LensPO.supplierLensVatRate || 0);
    const total = net + vat;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sum-lines',  String(lines.length));
    set('sum-units',  String(units));
    set('sum-stock',  (stockLines.length + customLines.length) + ' שורות / ' + stockUnits + ' יח׳');
    set('sum-manual', manualLines.length + ' שורות / ' + manualUnits + ' יח׳');
    set('sum-net',    '₪' + net.toFixed(2));
    set('sum-vat',    '₪' + vat.toFixed(2));
    set('sum-total',  '₪' + total.toFixed(2));
    set('line-count-display', String(lines.length));
    const createBtn = document.getElementById('btn-create-po');
    if (createBtn) {
      const ready = !!(window.LensPO.supplierId && lines.length > 0 && !window.LensPO.poId);
      createBtn.disabled = !ready;
    }
    const advanceBtn = document.getElementById('btn-advance-review');
    if (advanceBtn) advanceBtn.disabled = !(window.LensPO.supplierId && lines.length > 0);
  }

  function bindHeaderInputs() {
    const exp  = document.getElementById('po-expected-delivery');
    const expS = document.getElementById('po-expected-delivery-side');
    function syncExp(v) {
      window.LensPO.expectedDeliveryAt = v || null;
      if (exp  && exp.value  !== v) exp.value  = v || '';
      if (expS && expS.value !== v) expS.value = v || '';
    }
    if (exp)  exp.addEventListener('change',  () => syncExp(exp.value));
    if (expS) expS.addEventListener('change', () => syncExp(expS.value));
    const nts  = document.getElementById('po-notes');
    const ntsS = document.getElementById('po-notes-side');
    function syncNotes(v) {
      window.LensPO.notes = v || '';
      if (nts  && nts.value  !== v) nts.value  = v || '';
      if (ntsS && ntsS.value !== v) ntsS.value = v || '';
    }
    if (nts)  nts.addEventListener('input',  () => syncNotes(nts.value));
    if (ntsS) ntsS.addEventListener('input', () => syncNotes(ntsS.value));
    const loc = document.getElementById('po-location-select');
    if (loc) loc.addEventListener('change', () => { window.LensPO.locationId = loc.value || null; });
    const refreshBtn = document.getElementById('btn-refresh-shortages');
    if (refreshBtn) refreshBtn.addEventListener('click', () => window.LensPOShortages.reloadForCurrentSupplier());
    const addManualBtn = document.getElementById('btn-add-manual');
    if (addManualBtn) addManualBtn.addEventListener('click', () => window.LensPOManual.openAddManualModal());
    const clearBtn = document.getElementById('btn-clear-all');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      window.LensPO.lines = [];
      window.LensPOShortages.renderLines();
      recomputeSummary();
    });
    const createBtn = document.getElementById('btn-create-po');
    if (createBtn) createBtn.addEventListener('click', () => window.LensPOCreate.create());
    const exportBtn = document.getElementById('btn-export-pdf');
    if (exportBtn) exportBtn.addEventListener('click', () => window.LensPOPdf.exportPDF());
    const sentBtn = document.getElementById('btn-mark-sent');
    if (sentBtn) sentBtn.addEventListener('click', () => window.LensPOCreate.markSent());
    const cancelBtn = document.getElementById('btn-cancel-po');
    if (cancelBtn) cancelBtn.addEventListener('click', () => window.LensPOCreate.cancel());
    const advanceBtn = document.getElementById('btn-advance-review');
    if (advanceBtn) advanceBtn.addEventListener('click', () => setStep(STEP_REVIEW));
    const backBtn = document.getElementById('btn-back-step');
    if (backBtn) backBtn.addEventListener('click', () => setStep(STEP_ITEMS));
  }

  async function loadLocations() {
    const tid = getTenantId();
    if (!tid) return;
    try {
      const rows = await fetchAll(T.TENANT_LOCATIONS || 'tenant_location');
      const sel = document.getElementById('po-location-select');
      window.LensPO.locations = rows || [];
      if (sel) {
        sel.innerHTML = '<option value="">— ברירת מחדל —</option>';
        (rows || []).forEach(loc => {
          const opt = document.createElement('option');
          opt.value = loc.id;
          opt.textContent = '📍 ' + (loc.name || '(ללא שם)');
          sel.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('[lens-purchase-order] location load failed', e);
    }
  }

  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;
    try {
      bindHeaderInputs();
      mountWizard();
      setStep(STEP_SUPPLIER);
      await window.LensPOSupplier.loadSuppliers();
      await loadLocations();
      recomputeSummary();
      console.log('[lens-purchase-order] bootstrap complete');
    } catch (err) {
      console.error('[lens-purchase-order] bootstrap failed', err);
      if (window.Toast) Toast.error('שגיאה בטעינת המסך: ' + (err.message || err));
    }
  }

  window.LensPO.recomputeSummary = recomputeSummary;
  window.LensPO.setStep = setStep;
  window.LensPO.STEP = { SUPPLIER: STEP_SUPPLIER, ITEMS: STEP_ITEMS, REVIEW: STEP_REVIEW, SEND: STEP_SEND };
  window.LensPO.bootstrap = bootstrap;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
