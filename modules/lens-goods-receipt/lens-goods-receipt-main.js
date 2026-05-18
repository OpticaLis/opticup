// lens-goods-receipt-main.js — entry + permission gate + state + summary recompute
// + chip-filter mount + customer-tied list + has_no_invoice toggle wiring.
// M1_LENS_GOODS_RECEIPT_REBUILD 2026-05-18. 1:1 mockup rebuild.
// Per debt-decoupling rule: this module NEVER writes supplier_debt.

(function () {
  'use strict';

  window.LensGR = {
    supplierId: null,
    supplierRow: null,
    supplierVatRate: 0.18,
    deliveryNote: '',
    receiptDate: null,
    m9BoxId: null,
    hasNoInvoice: false,
    suppliers: [],
    expectedLines: [],
    receiptLines: [],
    manualLines: [],
    deepLinkVariantId: null,
    locations: [],
    defaultLocationId: null,
    sourceFilter: 'all',
    chipFilters: null,
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
      const gate = document.getElementById('access-gate'); if (gate) gate.style.display = 'block';
      const app  = document.getElementById('app');         if (app)  app.style.display  = 'none';
      return false;
    }
    const gate = document.getElementById('access-gate'); if (gate) gate.style.display = 'none';
    const app  = document.getElementById('app');         if (app)  app.style.display  = 'block';
    return true;
  }

  function mountChipFilters() {
    const host = document.getElementById('gr-chip-filters-mount');
    if (!host || !window.ChipFilter) return;
    window.LensGR.chipFilters = ChipFilter.init(host, {
      label: 'סינון מהיר:',
      activeIds: ['all'],
      multiSelect: false,
      chips: [
        { id: 'all',     label: 'הכל' },
        { id: 'stock',   label: '📦 מדף' },
        { id: 'custom',  label: '🏭 ייצור (ללקוח)' },
        { id: 'received', label: '✓ סומן כהתקבל' },
      ],
      onSelect: function (activeIds) {
        window.LensGR.sourceFilter = (activeIds && activeIds[0]) || 'all';
        if (window.LensGRLines) window.LensGRLines.renderTable();
      },
    });
  }

  function renderCustomerTiedList() {
    const host = document.getElementById('customer-tied-list');
    if (!host) return;
    const receipt = window.LensGR.receiptLines.filter(l =>
      l.sale_order_id && (parseInt(l.qty_received, 10) || 0) > 0);
    if (receipt.length === 0) {
      host.innerHTML = '<div style="font-size:12px; color:#94a3b8;">אין עדשות ייצור מקושרות ללקוחות בקבלה זו.</div>';
      return;
    }
    const esc = (s) => (typeof escapeHtml === 'function') ? escapeHtml(s) :
      String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    let html = '<div style="font-size:12px; color:#475569; margin-bottom:10px;">עדשות ייצור בקבלה זו שיוקצו למכירת לקוח:</div>';
    receipt.forEach(l => {
      const customer = l._customer_label || ('לקוח · ' + esc((l.sale_order_id || '').slice(0, 8)));
      html += '<div style="font-size:12px; padding:8px 10px; background:#f0fdf4; border-radius:5px; margin-bottom:6px;">' +
        '✅ <strong>' + esc(customer) + '</strong>' +
        '<br><span style="color:#64748b; font-size:11px;">→ M9 lab_job יתקדם: "עדשה הגיעה — מוכן למיסגור"</span>' +
      '</div>';
    });
    host.innerHTML = html;
  }

  function recomputeSummary() {
    const receipt = window.LensGR.receiptLines;
    const manual = window.LensGR.manualLines;
    const received = receipt.filter(l => (parseInt(l.qty_received, 10) || 0) > 0);
    const allReceived = received.concat(manual);
    const totalUnits = allReceived.reduce((s, l) => s + (parseInt(l.qty_received, 10) || 0), 0);
    const completeLines = received.filter(l => (parseInt(l.qty_received, 10) || 0) >= (parseInt(l.qty_expected, 10) || 0));
    const partialLines  = received.filter(l => {
      const r = parseInt(l.qty_received, 10) || 0;
      const e = parseInt(l.qty_expected, 10) || 0;
      return r > 0 && r < e;
    });
    const missingLines  = receipt.filter(l => (parseInt(l.qty_received, 10) || 0) === 0);
    const net = allReceived.reduce((s, l) => s + (parseInt(l.qty_received, 10) || 0) * (parseFloat(l.unit_cost) || 0), 0);
    const vat = net * (window.LensGR.supplierVatRate || 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sum-receipt-lines', String(allReceived.length));
    set('sum-complete', completeLines.length + ' שורות');
    set('sum-partial', partialLines.length + ' שורות');
    set('sum-missing', missingLines.length + ' שורות');
    set('sum-manual', manual.length + ' שורות');
    set('sum-total-units', totalUnits + ' יח׳');
    set('sum-debt-net', '₪' + net.toFixed(2));
    set('sum-debt-vat', '₪' + vat.toFixed(2));
    set('sum-debt-total', '₪' + (net + vat).toFixed(2));
    set('debt-preview-dn', window.LensGR.deliveryNote || '—');
    renderCustomerTiedList();
    const canClose = !!(window.LensGR.supplierId && window.LensGR.deliveryNote && allReceived.length > 0);
    document.querySelectorAll('#btn-close-receipt, #btn-close-receipt-2').forEach(b => { b.disabled = !canClose; });
  }

  function bindHeaderInputs() {
    const dn = document.getElementById('gr-delivery-note');
    if (dn) dn.addEventListener('input', function () {
      window.LensGR.deliveryNote = (dn.value || '').trim();
      if (window.LensGR.deliveryNote && window.LensGR.supplierId && window.LensGRDeliveryNote) {
        window.LensGRDeliveryNote.maybeFuzzyMatch();
      }
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
    const noInv = document.getElementById('gr-has-no-invoice');
    if (noInv) noInv.addEventListener('change', function () {
      window.LensGR.hasNoInvoice = !!noInv.checked;
    });
    document.querySelectorAll('#btn-close-receipt, #btn-close-receipt-2').forEach(b =>
      b.addEventListener('click', () => window.LensGRClose.close()));
    const cancelBtn = document.getElementById('btn-cancel-receipt');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
  }

  async function loadDefaultLocation() {
    const tid = getTenantId();
    if (!tid) return;
    const rows = await fetchAll('tenant_location', []);
    window.LensGR.locations = rows || [];
    if (rows && rows.length > 0) window.LensGR.defaultLocationId = rows[0].id;
    if (!window.LensGR.defaultLocationId && window.Toast) {
      Toast.error('אין מיקום מלאי מוגדר — לא ניתן לסגור קבלה. צור tenant_location לפני המשך.');
    }
  }

  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;
    try {
      bindHeaderInputs();
      mountChipFilters();
      await loadDefaultLocation();
      await window.LensGRSupplier.loadSuppliers();
      if (window.LensGRPreFill) window.LensGRPreFill.applyDeepLinkIfPresent();
      if (window.LensGRShippingBox) window.LensGRShippingBox.bind();
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
