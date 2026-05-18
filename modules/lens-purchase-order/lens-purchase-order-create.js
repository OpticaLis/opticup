// lens-purchase-order-create.js — wraps place_purchase_order / mark_po_sent / cancel_purchase_order RPCs.
// Iron Rule 1+7+22: writes are atomic via RPC; tenant_id passed always; no read→compute→write.

(function () {
  'use strict';

  async function create() {
    const tid = getTenantId();
    const supplierId = window.LensPO.supplierId;
    const lines = window.LensPO.lines.filter(l => !l._removed && (parseInt(l.qty_ordered, 10) || 0) > 0);
    if (!tid)        { if (window.Toast) Toast.error('tenant_id חסר');   return; }
    if (!supplierId) { if (window.Toast) Toast.error('בחר ספק');         return; }
    if (lines.length === 0) { if (window.Toast) Toast.error('אין שורות להזמנה'); return; }

    const linesJson = lines.map(l => ({
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
    }));

    const me = (typeof getCurrentEmployee === 'function') ? getCurrentEmployee() : null;
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
      window.LensPO.poId = typeof data === 'string' ? data : (data && (data.id || data.po_id));
      window.LensPO.poStatus = 'draft';
      window.LensPO.poNumber = null;
      if (window.LensPO.poId) {
        try {
          const { data: row } = await sb
            .from('purchase_order')
            .select('po_number, status')
            .eq('tenant_id', tid)
            .eq('id', window.LensPO.poId)
            .maybeSingle();
          if (row) { window.LensPO.poNumber = row.po_number; window.LensPO.poStatus = row.status; }
        } catch (e) { console.warn('[lens-po-create] header lookup failed', e); }
      }
      updateStatusBadge();
      if (window.LensPO.setStep) window.LensPO.setStep(window.LensPO.STEP.SEND);
      if (window.Toast) Toast.success('הזמנה נוצרה: ' + (window.LensPO.poNumber || window.LensPO.poId));
      if (typeof writeLog === 'function') {
        writeLog('lens.po.created', null, {
          po_id: window.LensPO.poId,
          po_number: window.LensPO.poNumber,
          line_count: lines.length,
        });
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
    const tid  = getTenantId();
    const poId = window.LensPO.poId;
    if (!tid || !poId) { if (window.Toast) Toast.error('אין הזמנה לסימון'); return; }
    try {
      const { error } = await sb.rpc('mark_po_sent', { p_tenant_id: tid, p_po_id: poId });
      if (error) throw error;
      window.LensPO.poStatus = 'sent';
      updateStatusBadge();
      const sentBtn = document.getElementById('btn-mark-sent');
      if (sentBtn) sentBtn.style.display = 'none';
      if (window.Toast) Toast.success('ההזמנה סומנה כנשלחה');
      if (typeof writeLog === 'function') writeLog('lens.po.marked_sent', null, { po_id: poId });
    } catch (err) {
      console.error('[lens-po-create] mark_po_sent failed', err);
      if (window.Toast) Toast.error('סימון "נשלח" נכשל: ' + (err.message || err));
    }
  }

  async function cancel() {
    const tid  = getTenantId();
    const poId = window.LensPO.poId;
    if (!tid || !poId) { if (window.Toast) Toast.error('אין הזמנה לביטול'); return; }
    const reason = (typeof prompt === 'function') ? prompt('הזן סיבת ביטול:') : null;
    if (!reason) return;
    try {
      const { error } = await sb.rpc('cancel_purchase_order', {
        p_tenant_id: tid,
        p_po_id: poId,
        p_reason: reason,
      });
      if (error) throw error;
      window.LensPO.poStatus = 'cancelled';
      updateStatusBadge();
      const sentBtn   = document.getElementById('btn-mark-sent');
      const cancelBtn = document.getElementById('btn-cancel-po');
      if (sentBtn)   sentBtn.style.display   = 'none';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (window.Toast) Toast.success('ההזמנה בוטלה');
      if (typeof writeLog === 'function') writeLog('lens.po.cancelled', null, { po_id: poId, reason });
    } catch (err) {
      console.error('[lens-po-create] cancel_purchase_order failed', err);
      if (window.Toast) Toast.error('ביטול הזמנה נכשל: ' + (err.message || err));
    }
  }

  function updateStatusBadge() {
    const badge = document.getElementById('po-status-badge');
    if (!badge) return;
    const status = window.LensPO.poStatus || 'draft';
    const num    = window.LensPO.poNumber || '';
    badge.textContent = status + (num ? ' · ' + num : '');
  }

  window.LensPOCreate = { create, markSent, cancel };
})();
