// lens-purchase-order-create.js — wraps place_purchase_order + mark_po_sent RPC calls
// Iron Rule 7: every write through the RPC. Iron Rule 22: tenant_id always passed.

(function () {
  'use strict';

  async function create() {
    const tid = getTenantId();
    const supplierId = window.LensPO.supplierId;
    const lines = window.LensPO.lines.filter(function (l) { return !l._removed && (parseInt(l.qty_ordered, 10) || 0) > 0; });
    if (!tid) { if (window.Toast) Toast.error('tenant_id חסר'); return; }
    if (!supplierId) { if (window.Toast) Toast.error('בחר ספק'); return; }
    if (lines.length === 0) { if (window.Toast) Toast.error('אין שורות להזמנה'); return; }

    // Map UI lines to JSONB shape expected by place_purchase_order(p_lines JSONB)
    const linesJson = lines.map(function (l) {
      return {
        source: l.source,
        variant_id: l.variant_id,
        sale_order_id: null,
        sph: l.sph,
        cyl: l.cyl,
        add_value: l.add_value,
        manual_description: l.manual_description,
        qty_ordered: parseInt(l.qty_ordered, 10) || 0,
        unit_cost: parseFloat(l.unit_cost) || 0,
        currency_code: l.currency_code || 'ILS',
      };
    });

    const me = getCurrentEmployee();
    const btn = document.getElementById('btn-create-po');
    if (btn) { btn.disabled = true; btn.textContent = 'יוצר...'; }
    try {
      const { data, error } = await sb.rpc('place_purchase_order', {
        p_tenant_id: tid,
        p_supplier_id: supplierId,
        p_lines: linesJson,
        p_expected_delivery_at: window.LensPO.expectedDeliveryAt || null,
        p_notes: window.LensPO.notes || null,
        p_created_by: me ? me.id : null,
      });
      if (error) throw error;
      // RPC returns the new PO row (id, po_number, status). Shape may be {id, po_number, status} or array.
      const po = Array.isArray(data) ? data[0] : data;
      window.LensPO.poId = po && (po.id || po.po_id);
      window.LensPO.poNumber = po && (po.po_number || null);
      window.LensPO.poStatus = po && (po.status || 'draft');
      const badge = document.getElementById('po-status-badge');
      if (badge) badge.textContent = (window.LensPO.poStatus || 'draft') + ' · ' + (window.LensPO.poNumber || '');
      const sentBtn = document.getElementById('btn-mark-sent');
      if (sentBtn) sentBtn.style.display = 'inline-flex';
      if (window.Toast) Toast.success('הזמנה נוצרה: ' + (window.LensPO.poNumber || window.LensPO.poId));
      if (typeof writeLog === 'function') {
        writeLog('lens.po.created', null, { po_id: window.LensPO.poId, po_number: window.LensPO.poNumber, line_count: lines.length });
      }
    } catch (err) {
      console.error('[lens-po-create] place_purchase_order failed', err);
      if (window.Toast) Toast.error('יצירת הזמנה נכשלה: ' + (err.message || err));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📝 צור הזמנה'; }
      window.LensPO.recomputeSummary();
    }
  }

  async function markSent() {
    const tid = getTenantId();
    const poId = window.LensPO.poId;
    if (!tid || !poId) { if (window.Toast) Toast.error('אין הזמנה לסימון'); return; }
    try {
      const { error } = await sb.rpc('mark_po_sent', { p_tenant_id: tid, p_po_id: poId });
      if (error) throw error;
      window.LensPO.poStatus = 'sent';
      const badge = document.getElementById('po-status-badge');
      if (badge) badge.textContent = 'sent · ' + (window.LensPO.poNumber || '');
      if (window.Toast) Toast.success('ההזמנה סומנה כנשלחה');
      if (typeof writeLog === 'function') writeLog('lens.po.marked_sent', null, { po_id: poId });
    } catch (err) {
      console.error('[lens-po-create] mark_po_sent failed', err);
      if (window.Toast) Toast.error('סימון "נשלח" נכשל: ' + (err.message || err));
    }
  }

  window.LensPOCreate = { create, markSent };
})();
