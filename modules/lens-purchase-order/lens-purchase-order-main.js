// lens-purchase-order-main.js — entry point + permission gate + state container
// Per SPEC M1_LENS_PHASE_1B_PROCUREMENT Screen #4.
// Iron Rule 7: every DB read through DB.* / sb.rpc — no direct sb.from() in mutations.
// Iron Rule 8: escapeHtml from js/shared.js, never reimplemented.

(function () {
  'use strict';

  window.LensPO = {
    supplierId: null,
    supplierRow: null,
    supplierLensVatRate: 0.18,         // ILS-only Day-1; future tenants override per-supplier
    expectedDeliveryAt: null,
    notes: '',
    lines: [],                          // [{source:'stock'|'manual', variant_id, sph, cyl, add_value, manual_description, qty_ordered, unit_cost, currency_code, _key}]
    suppliers: [],
    poId: null,                         // populated after Create
    poNumber: null,
    poStatus: null,
  };

  async function gateOrRedirect() {
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('[lens-purchase-order] hasPermission not available — gating disabled (early load)');
      return true;
    }
    if (!hasPermission('lens.po.create')) {
      const gate = document.getElementById('access-gate');
      if (gate) gate.style.display = 'block';
      const app = document.getElementById('app');
      if (app) app.style.display = 'none';
      return false;
    }
    document.getElementById('access-gate').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    return true;
  }

  function recomputeSummary() {
    const lines = window.LensPO.lines.filter(function (l) { return !l._removed; });
    const units = lines.reduce(function (s, l) { return s + (parseInt(l.qty_ordered, 10) || 0); }, 0);
    const stockLines = lines.filter(function (l) { return l.source === 'stock'; });
    const manualLines = lines.filter(function (l) { return l.source === 'manual'; });
    const stockUnits = stockLines.reduce(function (s, l) { return s + (parseInt(l.qty_ordered, 10) || 0); }, 0);
    const manualUnits = manualLines.reduce(function (s, l) { return s + (parseInt(l.qty_ordered, 10) || 0); }, 0);
    const net = lines.reduce(function (s, l) {
      const q = parseInt(l.qty_ordered, 10) || 0;
      const c = parseFloat(l.unit_cost) || 0;
      return s + q * c;
    }, 0);
    const vat = net * (window.LensPO.supplierLensVatRate || 0);
    const total = net + vat;
    function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
    set('sum-lines', String(lines.length));
    set('sum-units', String(units));
    set('sum-stock', stockLines.length + ' / ' + stockUnits + ' יח׳');
    set('sum-manual', manualLines.length + ' / ' + manualUnits + ' יח׳');
    set('sum-net', '₪' + net.toFixed(2));
    set('sum-vat', '₪' + vat.toFixed(2));
    set('sum-total', '₪' + total.toFixed(2));
    set('line-count-display', String(lines.length));
    const btn = document.getElementById('btn-create-po');
    if (btn) btn.disabled = !(window.LensPO.supplierId && lines.length > 0 && !window.LensPO.poId);
  }

  function bindHeaderInputs() {
    const exp = document.getElementById('po-expected-delivery');
    if (exp) exp.addEventListener('change', function () { window.LensPO.expectedDeliveryAt = exp.value || null; });
    const nts = document.getElementById('po-notes');
    if (nts) nts.addEventListener('input', function () { window.LensPO.notes = nts.value || ''; });
    const refreshBtn = document.getElementById('btn-refresh-shortages');
    if (refreshBtn) refreshBtn.addEventListener('click', function () { window.LensPOShortages.reloadForCurrentSupplier(); });
    const addManualBtn = document.getElementById('btn-add-manual');
    if (addManualBtn) addManualBtn.addEventListener('click', function () { window.LensPOManual.openAddManualModal(); });
    const createBtn = document.getElementById('btn-create-po');
    if (createBtn) createBtn.addEventListener('click', function () { window.LensPOCreate.create(); });
    const exportBtn = document.getElementById('btn-export-pdf');
    if (exportBtn) exportBtn.addEventListener('click', function () { window.LensPOPdf.exportPDF(); });
    const sentBtn = document.getElementById('btn-mark-sent');
    if (sentBtn) sentBtn.addEventListener('click', function () { window.LensPOCreate.markSent(); });
  }

  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;
    try {
      bindHeaderInputs();
      await window.LensPOSupplier.loadSuppliers();
      recomputeSummary();
      console.log('[lens-purchase-order] bootstrap complete');
    } catch (err) {
      console.error('[lens-purchase-order] bootstrap failed', err);
      if (window.Toast && typeof Toast.error === 'function') Toast.error('שגיאה בטעינת המסך: ' + (err.message || err));
    }
  }

  window.LensPO.recomputeSummary = recomputeSummary;
  window.LensPO.bootstrap = bootstrap;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
