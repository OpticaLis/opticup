// lens-pos-list-actions.js — row actions: mark-sent, cancel, open (side detail).
// Wraps mark_po_sent + cancel_purchase_order RPCs unchanged. Open delegates to
// the SideDetailPanel via the detail.js module.

(function () {
  'use strict';

  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function bind() {
    const c = document.getElementById('table-container');
    if (!c) return;
    c.querySelectorAll('button[data-act="mark-sent"]').forEach(b =>
      b.addEventListener('click', ev => { ev.stopPropagation(); markSent(b.dataset.poId); }));
    c.querySelectorAll('button[data-act="cancel"]').forEach(b =>
      b.addEventListener('click', ev => { ev.stopPropagation(); openCancelModal(b.dataset.poId); }));
    c.querySelectorAll('button[data-act="open"]').forEach(b =>
      b.addEventListener('click', ev => { ev.stopPropagation(); openDetail(b.dataset.poId); }));
    c.querySelectorAll('tr[data-po-id]').forEach(tr =>
      tr.addEventListener('click', () => openDetail(tr.dataset.poId)));
  }

  function openDetail(poId) {
    if (window.LensPOsListDetail) window.LensPOsListDetail.open(poId);
  }

  async function markSent(poId) {
    if (!hasPermission('lens.po.create')) {
      if (window.Toast) Toast.error('אין הרשאה לסימון "נשלח" (lens.po.create)');
      return;
    }
    const tid = getTenantId();
    try {
      const { error } = await sb.rpc('mark_po_sent', { p_tenant_id: tid, p_po_id: poId });
      if (error) throw error;
      if (window.Toast) Toast.success('הזמנה סומנה כנשלחה');
      if (typeof writeLog === 'function') writeLog('lens.po.marked_sent', null, { po_id: poId });
      await window.LensPOsList.reload();
    } catch (err) {
      console.error('[lens-pos-list] mark_po_sent failed', err);
      if (window.Toast) Toast.error('סימון נכשל: ' + (err.message || err));
    }
  }

  function openCancelModal(poId) {
    if (!hasPermission('lens.po.cancel')) {
      if (window.Toast) Toast.error('אין הרשאה לביטול הזמנה (lens.po.cancel)');
      return;
    }
    const po = window.LensPOsList.pos.find(p => p.id === poId);
    if (!po) return;
    const body = '<div style="padding:8px 4px; font-size:13px;">' +
      '<div style="margin-bottom:10px;">האם לבטל את הזמנה <strong>' + esc(po.po_number || poId.slice(0, 8)) + '</strong>?</div>' +
      '<label style="font-size:12px; color:#475569;">סיבת ביטול (חובה)</label>' +
      '<textarea id="cancel-reason" rows="3" style="width:100%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:5px; margin-top:4px;" placeholder="למשל: כפול, ספק לא יכול לספק, שינוי דרישה..."></textarea>' +
      '<div id="cancel-error" style="color:#dc2626; font-size:12px; display:none; margin-top:6px;"></div>' +
    '</div>';
    const modal = Modal.show({
      size: 'sm',
      title: '⛔ ביטול הזמנה',
      content: body,
      footer:
        '<button type="button" class="btn" id="cancel-cancel">חזרה</button>' +
        '<button type="button" class="btn" style="background:#dc2626; color:#fff; border-color:#dc2626;" id="cancel-confirm">בטל הזמנה</button>',
    });
    const overlay = modal.el;
    overlay.querySelector('#cancel-cancel').addEventListener('click', modal.close);
    overlay.querySelector('#cancel-confirm').addEventListener('click', async function () {
      const reason = (overlay.querySelector('#cancel-reason').value || '').trim();
      const err = overlay.querySelector('#cancel-error');
      if (!reason) { err.textContent = 'סיבת ביטול היא שדה חובה'; err.style.display = 'block'; return; }
      try {
        const { error: rpcErr } = await sb.rpc('cancel_purchase_order', {
          p_tenant_id: getTenantId(),
          p_po_id: poId,
          p_reason: reason,
        });
        if (rpcErr) throw rpcErr;
        modal.close();
        if (window.Toast) Toast.success('ההזמנה בוטלה');
        if (typeof writeLog === 'function') writeLog('lens.po.cancelled', null, { po_id: poId, reason });
        await window.LensPOsList.reload();
      } catch (e) {
        err.textContent = 'ביטול נכשל: ' + (e.message || e);
        err.style.display = 'block';
        console.error('[lens-pos-list] cancel_purchase_order failed', e);
      }
    });
  }

  window.LensPOsListActions = { bind, openDetail };
})();
