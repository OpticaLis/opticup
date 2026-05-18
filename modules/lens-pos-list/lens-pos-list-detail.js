// lens-pos-list-detail.js — SideDetailPanel for selected PO. Read-only summary
// + line items table. Per SPEC: this screen is display-only (cancel + mark-sent
// happen via row actions; the drawer is the read-only "פתח" surface).

(function () {
  'use strict';

  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function chipFor(po) {
    if (window.LensPOsList.isOverdue(po)) return '<span class="chip chip-overdue">⚠️ באיחור</span>';
    const map = {
      draft: 'chip-draft', sent: 'chip-sent', partial: 'chip-partial',
      fully_received: 'chip-received', cancelled: 'chip-cancelled',
    };
    const labels = {
      draft: 'טיוטה', sent: 'נשלח לספק', partial: 'חלקית התקבל',
      fully_received: 'התקבל במלואו', cancelled: 'בוטל',
    };
    return '<span class="chip ' + (map[po.status] || 'chip-draft') + '">' + (labels[po.status] || po.status) + '</span>';
  }

  function buildSections(po) {
    const supplier = po.suppliers || { name: '(ללא)' };
    const overdue = window.LensPOsList.isOverdue(po);
    const ordered = po._ordered || 0;
    const received = po._received || 0;
    const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
    const totalsHtml =
      '<div class="ldd-sec-row"><span class="ldd-key">סה"כ שורות</span><span class="ldd-val">' + po._line_count + '</span></div>' +
      '<div class="ldd-sec-row"><span class="ldd-key">סה"כ יחידות</span><span class="ldd-val">' + ordered + '</span></div>' +
      '<div class="ldd-sec-row"><span class="ldd-key">התקבל</span><span class="ldd-val">' + received + ' / ' + ordered + ' (' + pct + '%)</span></div>' +
      '<div class="ldd-sec-row"><span class="ldd-key">סה"כ ערך</span><span class="ldd-val" style="font-weight:700;">₪' + Math.round(po._total).toLocaleString('he-IL') + '</span></div>';
    const supplierHtml =
      '<div class="ldd-sec-row"><span class="ldd-key">ספק</span><span class="ldd-val">' + esc(supplier.name) + '</span></div>' +
      (supplier.supplier_number ? '<div class="ldd-sec-row"><span class="ldd-key">מספר ספק</span><span class="ldd-val">' + esc(supplier.supplier_number) + '</span></div>' : '') +
      (supplier.payment_terms ? '<div class="ldd-sec-row"><span class="ldd-key">תנאי תשלום</span><span class="ldd-val">' + esc(supplier.payment_terms) + '</span></div>' : '');
    const datesHtml =
      '<div class="ldd-sec-row"><span class="ldd-key">תאריך הזמנה</span><span class="ldd-val">' + fmtDate(po.ordered_at) + '</span></div>' +
      '<div class="ldd-sec-row"><span class="ldd-key">צפי אספקה</span><span class="ldd-val' + (overdue ? ' val-overdue' : '') + '" style="' + (overdue ? 'color:#dc2626;font-weight:700;' : '') + '">' + fmtDate(po.expected_delivery_at) + (overdue ? ' (איחור)' : '') + '</span></div>' +
      (po.sent_to_supplier_at ? '<div class="ldd-sec-row"><span class="ldd-key">נשלח לספק</span><span class="ldd-val">' + fmtDate(po.sent_to_supplier_at) + '</span></div>' : '') +
      (po.cancelled_at ? '<div class="ldd-sec-row"><span class="ldd-key">בוטל</span><span class="ldd-val">' + fmtDate(po.cancelled_at) + '</span></div>' : '') +
      (po.cancelled_reason ? '<div class="ldd-sec-row"><span class="ldd-key">סיבת ביטול</span><span class="ldd-val">' + esc(po.cancelled_reason) + '</span></div>' : '');
    const lines = po.purchase_order_line || [];
    let linesHtml = '<table class="ldd-lines-table" style="width:100%;font-size:11px;border-collapse:collapse;">';
    linesHtml += '<thead><tr><th style="text-align:right;padding:6px;background:#f8fafc;">שורה</th><th style="text-align:center;padding:6px;background:#f8fafc;">הוזמן</th><th style="text-align:center;padding:6px;background:#f8fafc;">התקבל</th><th style="text-align:left;padding:6px;background:#f8fafc;">מחיר יח׳</th></tr></thead><tbody>';
    if (lines.length === 0) {
      linesHtml += '<tr><td colspan="4" style="padding:8px;color:#94a3b8;text-align:center;">אין שורות</td></tr>';
    } else {
      lines.forEach((l, i) => {
        linesHtml += '<tr>' +
          '<td style="padding:6px;border-bottom:1px solid #f1f5f9;">#' + (i + 1) + (l.sale_order_id ? ' <span style="color:#92400e;font-size:10px;">(ייצור)</span>' : '') + '</td>' +
          '<td style="text-align:center;padding:6px;border-bottom:1px solid #f1f5f9;">' + (l.qty_ordered || 0) + '</td>' +
          '<td style="text-align:center;padding:6px;border-bottom:1px solid #f1f5f9;">' + (l.qty_received || 0) + '</td>' +
          '<td style="text-align:left;padding:6px;border-bottom:1px solid #f1f5f9;">₪' + (parseFloat(l.unit_cost) || 0).toFixed(2) + '</td>' +
        '</tr>';
      });
    }
    linesHtml += '</tbody></table>';
    return [
      { id: 'totals',   title: 'סיכום',          html: totalsHtml },
      { id: 'supplier', title: 'ספק',            html: supplierHtml },
      { id: 'dates',    title: 'תאריכים וסטטוס', html: datesHtml },
      { id: 'lines',    title: 'שורות',          html: linesHtml },
    ];
  }

  function open(poId) {
    const po = (window.LensPOsList.pos || []).find(p => p.id === poId);
    if (!po) { if (window.Toast) Toast.error('הזמנה לא נמצאה'); return; }
    const host = document.getElementById('lens-pos-detail-mount');
    if (!host || !window.SideDetailPanel) return;
    if (window.LensPOsList.detailHandle && window.LensPOsList.detailHandle.destroy) {
      try { window.LensPOsList.detailHandle.destroy(); } catch (e) { /* swallow */ }
    }
    window.LensPOsList.detailHandle = SideDetailPanel.init(host, {
      title: '📋 ' + (po.po_number || poId.slice(0, 8)),
      headerVariant: window.LensPOsList.isOverdue(po) ? 'danger' : 'primary',
      subtitle: chipFor(po),
      sections: buildSections(po),
      onClose: function () {
        window.LensPOsList.detailHandle = null;
      },
    });
  }

  function close() {
    if (window.LensPOsList.detailHandle && window.LensPOsList.detailHandle.destroy) {
      try { window.LensPOsList.detailHandle.destroy(); } catch (e) { /* swallow */ }
      window.LensPOsList.detailHandle = null;
    }
  }

  window.LensPOsListDetail = { open, close };
})();
