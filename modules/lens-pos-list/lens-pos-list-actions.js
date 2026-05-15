// lens-pos-list-actions.js — row actions: cancel, mark-sent, view-pdf
// Cancel uses cancel_purchase_order RPC (M1B0). Mark-sent uses mark_po_sent RPC (M1B0).
// View-PDF deep-links to lens-purchase-order.html?po_id=... (display-mode rendering deferred to PO screen — see Phase 2).

(function () {
  'use strict';

  function escapeHtmlSafe(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function bind() {
    const c = document.getElementById('table-container');
    if (!c) return;
    c.querySelectorAll('button[data-act="mark-sent"]').forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.stopPropagation(); markSent(b.getAttribute('data-po-id')); });
    });
    c.querySelectorAll('button[data-act="cancel"]').forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.stopPropagation(); openCancelModal(b.getAttribute('data-po-id')); });
    });
    c.querySelectorAll('button[data-act="view-pdf"]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const pid = b.getAttribute('data-po-id');
        // Phase 1B Day-1: deep-link to PO screen with the po_id; the PO screen does not yet
        // have a "load existing PO + print" mode — Phase 2 follow-up. For now, navigate +
        // show a toast hint so the user knows to use the screen's Print button.
        if (window.Toast) Toast.info ? Toast.info('הצפייה ב-PDF להזמנה קיימת תהיה זמינה בשלב הבא. כרגע ניתן לייצא PDF להזמנה חדשה במסך ההזמנה.') : Toast.success('PDF: Phase 2');
      });
    });
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
      await window.LensPOsListTable.loadAndRender();
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
    const po = window.LensPOsList.pos.find(function (p) { return p.id === poId; });
    if (!po) return;
    const body = '<div style="padding:8px 4px; font-size:13px;">' +
      '<div style="margin-bottom:10px;">האם לבטל את הזמנה <strong>' + escapeHtmlSafe(po.po_number || poId.slice(0, 8)) + '</strong>?</div>' +
      '<label style="font-size:12px; color:#475569;">סיבת ביטול (חובה)</label>' +
      '<textarea id="cancel-reason" rows="3" style="width:100%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:5px; margin-top:4px;" placeholder="למשל: כפול, ספק לא יכול לספק, שינוי דרישה..."></textarea>' +
      '<div id="cancel-error" style="color:#dc2626; font-size:12px; display:none; margin-top:6px;"></div>' +
    '</div>';
    const modal = Modal.show({
      size: 'sm',
      title: '❌ ביטול הזמנה',
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
        const { error: rpcErr } = await sb.rpc('cancel_purchase_order', { p_tenant_id: getTenantId(), p_po_id: poId, p_reason: reason });
        if (rpcErr) throw rpcErr;
        modal.close();
        if (window.Toast) Toast.success('ההזמנה בוטלה');
        if (typeof writeLog === 'function') writeLog('lens.po.cancelled', null, { po_id: poId, reason: reason });
        await window.LensPOsListTable.loadAndRender();
      } catch (e) {
        err.textContent = 'ביטול נכשל: ' + (e.message || e);
        err.style.display = 'block';
        console.error('[lens-pos-list] cancel_purchase_order failed', e);
      }
    });
  }

  window.LensPOsListActions = { bind };
})();
