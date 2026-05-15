// lens-goods-receipt-main.js — entry + permission gate + state container
// Permission key: lens.gr.create. Manual-line addition gated separately by lens.gr.add_manual_line.

(function () {
  'use strict';

  window.LensGR = {
    supplierId: null,
    supplierRow: null,
    supplierVatRate: 0.18,
    deliveryNote: '',
    receiptDate: null,
    m9BoxId: null,
    suppliers: [],
    expectedLines: [],   // from purchase_order_line where status IN ('sent','partial')
    receiptLines: [],    // user-confirmed receive amounts; mirrors expectedLines plus manual additions
    manualLines: [],     // user-added lines not on any PO; { _key, source:'stock', variant_id|null, sph, cyl, add_value, qty_received, unit_cost, currency_code, _is_manual:true }
    deepLinkVariantId: null,  // populated by pre-fill from ?variant_id
    locations: [],            // tenant_location rows for current tenant
    defaultLocationId: null,  // first tenant_location id; required by m1_create_receipt_from_box
  };

  async function gateOrRedirect() {
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('[lens-goods-receipt] hasPermission not available — gating disabled');
      return true;
    }
    if (!hasPermission('lens.gr.create')) {
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
    const receipt = window.LensGR.receiptLines.filter(function (l) { return (parseInt(l.qty_received, 10) || 0) > 0; });
    const manual = window.LensGR.manualLines;
    const allReceived = receipt.concat(manual);
    const totalUnits = allReceived.reduce(function (s, l) { return s + (parseInt(l.qty_received, 10) || 0); }, 0);
    const completeLines = receipt.filter(function (l) { return (parseInt(l.qty_received, 10) || 0) >= (parseInt(l.qty_expected, 10) || 0); });
    const partialLines = receipt.filter(function (l) { const r = parseInt(l.qty_received, 10) || 0; const e = parseInt(l.qty_expected, 10) || 0; return r > 0 && r < e; });
    const net = allReceived.reduce(function (s, l) { return s + (parseInt(l.qty_received, 10) || 0) * (parseFloat(l.unit_cost) || 0); }, 0);
    const vat = net * (window.LensGR.supplierVatRate || 0);
    function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
    set('sum-receipt-lines', String(allReceived.length));
    set('sum-complete', completeLines.length + ' שורות');
    set('sum-partial', partialLines.length + ' שורות');
    set('sum-manual', manual.length + ' שורות');
    set('sum-total-units', totalUnits + ' יח׳');
    set('sum-debt-net', '₪' + net.toFixed(2));
    set('sum-debt-vat', '₪' + vat.toFixed(2));
    set('sum-debt-total', '₪' + (net + vat).toFixed(2));
    const canClose = !!(window.LensGR.supplierId && window.LensGR.deliveryNote && allReceived.length > 0);
    document.querySelectorAll('#btn-close-receipt, #btn-close-receipt-2').forEach(function (b) { b.disabled = !canClose; });
  }

  function bindHeaderInputs() {
    const dn = document.getElementById('gr-delivery-note');
    if (dn) dn.addEventListener('input', function () {
      window.LensGR.deliveryNote = (dn.value || '').trim();
      if (window.LensGR.deliveryNote && window.LensGR.supplierId) window.LensGRDeliveryNote.maybeFuzzyMatch();
      window.LensGR.recomputeSummary();
    });
    const rd = document.getElementById('gr-receipt-date');
    if (rd) {
      rd.value = new Date().toISOString().slice(0, 10);
      window.LensGR.receiptDate = rd.value;
      rd.addEventListener('change', function () { window.LensGR.receiptDate = rd.value || null; });
    }
    const m9 = document.getElementById('gr-m9-box');
    if (m9) m9.addEventListener('change', function () { window.LensGR.m9BoxId = m9.value || null; });
    document.querySelectorAll('#btn-close-receipt, #btn-close-receipt-2').forEach(function (b) {
      b.addEventListener('click', function () { window.LensGRClose.close(); });
    });
    const cancelBtn = document.getElementById('btn-cancel-receipt');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { window.location.href = 'index.html'; });
  }

  async function loadDefaultLocation() {
    const tid = getTenantId();
    if (!tid) return;
    // tenant_location is required by m1_create_receipt_from_box (stock_lot.location_id NOT NULL).
    // Day-1: pick the first row as default; Phase 2 adds per-line location selection.
    // Iron Rule 7: fetchAll auto-adds tenant_id; pass empty filter array since we want all locations.
    const rows = await fetchAll('tenant_location', []);
    window.LensGR.locations = rows || [];
    if (rows && rows.length > 0) window.LensGR.defaultLocationId = rows[0].id;
    if (!window.LensGR.defaultLocationId && window.Toast) {
      Toast.error('אין מיקום מלאי מוגדר לטננט - לא ניתן לסגור קבלה. צור tenant_location לפני המשך.');
    }
  }

  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;
    try {
      bindHeaderInputs();
      await loadDefaultLocation();
      await window.LensGRSupplier.loadSuppliers();
      window.LensGRPreFill.applyDeepLinkIfPresent();
      window.LensGRShippingBox.bind();
      recomputeSummary();
      console.log('[lens-goods-receipt] bootstrap complete (default_location_id=' + window.LensGR.defaultLocationId + ')');
    } catch (err) {
      console.error('[lens-goods-receipt] bootstrap failed', err);
      if (window.Toast) Toast.error('שגיאה בטעינת המסך: ' + (err.message || err));
    }
  }

  window.LensGR.recomputeSummary = recomputeSummary;
  window.LensGR.bootstrap = bootstrap;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
