// lens-goods-receipt-close.js — assemble JSONB lines + call m1_create_receipt_from_box
// K2 RPC creates: purchase_receipt + N purchase_receipt_line + N stock_lot + N stock_movement
// + 1 supplier_debt (via m1_create_supplier_debt_from_receipt — internal). UPDATEs PO line/header.

(function () {
  'use strict';

  async function close() {
    const tid = getTenantId();
    const supplierId = window.LensGR.supplierId;
    const dn = window.LensGR.deliveryNote;
    if (!tid || !supplierId || !dn) {
      if (window.Toast) Toast.error('חסרים שדות חובה (ספק / תעודת משלוח / tenant)');
      return;
    }
    const receiptLines = window.LensGR.receiptLines.filter(function (l) { return (parseInt(l.qty_received, 10) || 0) > 0; });
    const manualLines = window.LensGR.manualLines;
    const allLines = receiptLines.concat(manualLines);
    if (allLines.length === 0) {
      if (window.Toast) Toast.error('אין שורות התקבלו');
      return;
    }

    // Build JSONB shape expected by m1_create_receipt_from_box (p_lines).
    // Each line includes: po_line_id (null for manual), variant_id, sph/cyl/add_value,
    // qty_received, unit_cost, currency, sale_order_id, is_manual_addition, manual_description.
    const linesJson = allLines.map(function (l) {
      return {
        po_line_id: l.po_line_id || null,
        variant_id: l.variant_id || null,
        sale_order_id: l.sale_order_id || null,
        sph: l.sph,
        cyl: l.cyl,
        add_value: l.add_value,
        qty_received: parseInt(l.qty_received, 10) || 0,
        ordered_qty: parseInt(l.qty_expected, 10) || null,
        unit_cost: parseFloat(l.unit_cost) || 0,
        unit_cost_currency: l.currency_code || 'ILS',
        is_manual_addition: !!l._is_manual,
        manual_description: l.manual_description || null,
      };
    });

    const me = getCurrentEmployee();
    const buttons = document.querySelectorAll('#btn-close-receipt, #btn-close-receipt-2');
    buttons.forEach(function (b) { b.disabled = true; b.textContent = 'יוצר...'; });

    try {
      const { data, error } = await sb.rpc('m1_create_receipt_from_box', {
        p_tenant_id: tid,
        p_supplier_id: supplierId,
        p_delivery_note_number: dn,
        p_lines: linesJson,
        p_box_id: window.LensGR.m9BoxId || null,
        p_box_supplier_barcode: null,
        p_supplier_number: window.LensGR.supplierRow ? String(window.LensGR.supplierRow.supplier_number || '') || null : null,
        p_confirmed_by: me ? me.id : null,
      });
      if (error) throw error;
      const receipt = Array.isArray(data) ? data[0] : data;
      const receiptId = receipt && (receipt.purchase_receipt_id || receipt.id);
      if (window.Toast) Toast.success('קבלה נוצרה בהצלחה (' + (receiptId ? receiptId.slice(0, 8) : 'OK') + '). מלאי + חוב עודכנו.');
      const badge = document.getElementById('gr-status-badge');
      if (badge) badge.textContent = 'נסגר ✓';
      if (typeof writeLog === 'function') writeLog('lens.gr.created', null, { receipt_id: receiptId, line_count: allLines.length, manual_count: manualLines.length, supplier_id: supplierId });
      // Lock the form after success
      document.querySelectorAll('input, select, button.row-action, #btn-add-manual').forEach(function (el) { el.disabled = true; });
      buttons.forEach(function (b) { b.disabled = true; b.textContent = '✓ נסגר'; });
      setTimeout(function () { window.location.href = 'lens-pos-list.html'; }, 1800);
    } catch (err) {
      console.error('[lens-gr-close] m1_create_receipt_from_box failed', err);
      if (window.Toast) Toast.error('סגירת קבלה נכשלה: ' + (err.message || err));
      buttons.forEach(function (b) { b.disabled = false; b.textContent = '✅ אשר וצור רשומות מלאי'; });
    }
  }

  window.LensGRClose = { close };
})();
