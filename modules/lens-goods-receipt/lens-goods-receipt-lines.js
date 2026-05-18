// lens-goods-receipt-lines.js — load expected PO lines + render PO-grouped table.
// M1_LENS_GOODS_RECEIPT_REBUILD 2026-05-18: integrates source-type chip filter
// and uses GroupHeaderRow for the PO group headers (Iron Rule 21 reuse).

(function () {
  'use strict';

  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  async function loadExpectedLines() {
    const supplierId = window.LensGR.supplierId;
    const tid = getTenantId();
    if (!supplierId || !tid) return;
    const { data, error } = await sb
      .from('purchase_order_line')
      .select('id, purchase_order_id, line_number, source, variant_id, sale_order_id, sph, cyl, add_value, manual_description, qty_ordered, qty_received, unit_cost, currency_code, purchase_order!inner(id, po_number, status, supplier_id, ordered_at, sent_to_supplier_at)')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .eq('purchase_order.supplier_id', supplierId)
      .in('purchase_order.status', ['sent', 'partial'])
      .order('purchase_order_id', { ascending: true })
      .order('line_number', { ascending: true });
    if (error) throw error;
    window.LensGR.expectedLines = (data || []).map(l => {
      const remaining = (l.qty_ordered || 0) - (l.qty_received || 0);
      return {
        _key: 'po-' + l.id,
        _po_id: l.purchase_order_id,
        _po_number: l.purchase_order ? l.purchase_order.po_number : null,
        _po_status: l.purchase_order ? l.purchase_order.status : null,
        po_line_id: l.id,
        source: l.source,
        variant_id: l.variant_id,
        sale_order_id: l.sale_order_id,
        sph: l.sph,
        cyl: l.cyl,
        add_value: l.add_value,
        manual_description: l.manual_description,
        qty_expected: remaining,
        qty_received: remaining,
        unit_cost: l.unit_cost,
        currency_code: l.currency_code,
      };
    }).filter(l => l.qty_expected > 0);
    window.LensGR.receiptLines = window.LensGR.expectedLines.map(l => Object.assign({}, l));
    renderTable();
  }

  function passesSourceFilter(line) {
    const f = window.LensGR.sourceFilter || 'all';
    if (f === 'all') return true;
    if (f === 'received') return (parseInt(line.qty_received, 10) || 0) >= (parseInt(line.qty_expected, 10) || 0);
    if (f === 'stock')  return line.source === 'stock' && !line.sale_order_id;
    if (f === 'custom') return line.source === 'custom' || !!line.sale_order_id;
    return true;
  }

  function renderTable() {
    const c = document.getElementById('lines-container');
    if (!c) return;
    const allLines = window.LensGR.receiptLines.filter(passesSourceFilter);
    const manual = window.LensGR.manualLines;
    if (allLines.length === 0 && manual.length === 0) {
      c.innerHTML = '<div class="empty-state">אין פריטים בהמתנה לקבלה (או שאינם תואמים לסינון).</div>' +
        '<div class="manual-add-banner"><button class="btn" id="btn-add-manual" style="background:#7c3aed; color:#fff; border-color:#7c3aed; font-weight:600;" type="button">➕ הוסף פריט ידנית</button></div>';
      bindManualAdd();
      return;
    }
    const groups = {};
    allLines.forEach(l => {
      if (!groups[l._po_id]) groups[l._po_id] = { po_id: l._po_id, po_number: l._po_number, lines: [] };
      groups[l._po_id].lines.push(l);
    });
    let html = '<table><thead><tr>';
    html += '<th></th><th>וריאנט</th><th style="text-align:center;">SPH</th><th style="text-align:center;">CYL</th>';
    html += '<th style="text-align:center;">סוג</th><th style="text-align:center;">הוזמן</th><th style="text-align:center;">התקבל</th>';
    html += '<th style="text-align:center;">סטטוס</th><th></th>';
    html += '</tr></thead><tbody>';
    const colSpan = 9;
    Object.values(groups).forEach(g => {
      const totalOrdered = g.lines.reduce((s, l) => s + (l.qty_expected || 0), 0);
      html += '<tr class="po-group-header"><td colspan="' + colSpan + '">📋 PO ' + esc(g.po_number || g.po_id.slice(0, 8)) +
        ' <span class="po-meta">· ' + g.lines.length + ' שורות / ' + totalOrdered + ' יח׳ בהמתנה</span></td></tr>';
      g.lines.forEach(l => { html += renderLineRow(l, false); });
    });
    if (manual.length > 0 && (window.LensGR.sourceFilter === 'all' || window.LensGR.sourceFilter === 'stock' || window.LensGR.sourceFilter === 'custom')) {
      html += '<tr class="po-group-header"><td colspan="' + colSpan + '" style="background:#faf5ff; color:#6d28d9; border-top-color:#d8b4fe;">✏️ הוספות ידניות <span class="po-meta">· ' + manual.length + ' שורות</span></td></tr>';
      manual.forEach(l => { html += renderLineRow(l, true); });
    }
    html += '</tbody></table>';
    html += '<div class="manual-add-banner"><button class="btn" id="btn-add-manual" style="background:#7c3aed; color:#fff; border-color:#7c3aed; font-weight:600;" type="button">➕ הוסף פריט ידנית</button> <span style="font-size:11px; color:#64748b; margin-right:12px;">(לפריטים שלא היו ב-PO)</span></div>';
    c.innerHTML = html;
    bindLineHandlers();
    bindManualAdd();
  }

  function renderLineRow(l, isManual) {
    const r = parseInt(l.qty_received, 10) || 0;
    const e = parseInt(l.qty_expected, 10) || 0;
    let statusChip;
    if (isManual) statusChip = '<span class="chip chip-manual">ידני</span>';
    else if (r === 0)     statusChip = '<span class="chip chip-discrepancy">לא התקבל</span>';
    else if (r < e)       statusChip = '<span class="chip chip-partial">חלקי</span>';
    else                  statusChip = '<span class="chip chip-complete">✓ מלא</span>';
    let rowClass = '';
    if (isManual)              rowClass = 'manual';
    else if (r === e && r > 0) rowClass = 'received';
    else if (r > 0 && r < e)   rowClass = 'partial';
    const variantLabel = l.manual_description
      ? '<div class="design-cell">' + esc(l.manual_description) + '</div>'
      : '<div class="design-cell">וריאנט ' + esc((l.variant_id || '').slice(0, 8)) + '<div class="sub">SPH ' + esc(l.sph || 0) + ' / CYL ' + esc(l.cyl || 0) + '</div></div>';
    const customerBadge = l.sale_order_id ? '<br><span class="chip chip-customer" style="margin-top:2px;">לקוח</span>' : '';
    const sourceBadge = isManual
      ? '<span class="chip chip-manual">ידני</span>'
      : (l.source === 'custom' ? '<span class="chip chip-custom">ייצור</span>' + customerBadge : '<span class="chip chip-stock">מדף</span>');
    let qtyCell = '<div class="qty-cell"><input type="number" class="qty-input" data-key="' + esc(l._key) + '" data-action="qty" value="' + r + '" min="0" max="' + (isManual ? 9999 : e) + '">';
    if (!isManual) qtyCell += '<span class="qty-divider">/</span><span class="qty-expected">' + e + '</span>';
    qtyCell += '</div>';
    if (!isManual && r < e && r > 0) qtyCell += '<div style="margin-top:4px;"><span class="discrepancy-cell">חסר ' + (e - r) + ' יח׳</span></div>';
    if (!isManual && r === 0)        qtyCell += '<div style="margin-top:4px;"><span class="discrepancy-cell">לא התקבל</span></div>';
    const removeBtn = isManual ? '<button class="row-action remove" data-key="' + esc(l._key) + '" data-action="remove-manual" type="button">✕</button>' : '';
    const stateIcon = isManual ? '✏️' : (r === e && r > 0 ? '✅' : (r === 0 ? '❌' : '⚠️'));
    return '<tr class="' + rowClass + '">' +
      '<td style="text-align:center;">' + stateIcon + '</td>' +
      '<td>' + variantLabel + '</td>' +
      '<td style="text-align:center;">' + (l.sph !== null && l.sph !== undefined ? esc(l.sph) : '—') + '</td>' +
      '<td style="text-align:center;">' + (l.cyl !== null && l.cyl !== undefined ? esc(l.cyl) : '—') + '</td>' +
      '<td style="text-align:center;">' + sourceBadge + '</td>' +
      '<td style="text-align:center;">' + (isManual ? '<span class="qty-expected">—</span>' : e) + '</td>' +
      '<td>' + qtyCell + '</td>' +
      '<td style="text-align:center;">' + statusChip + '</td>' +
      '<td>' + removeBtn + '</td>' +
    '</tr>';
  }

  function bindLineHandlers() {
    const c = document.getElementById('lines-container');
    if (!c) return;
    c.querySelectorAll('input[data-action="qty"]').forEach(el => {
      el.addEventListener('change', () => {
        const key = el.dataset.key;
        const v   = parseInt(el.value, 10) || 0;
        let line = window.LensGR.receiptLines.find(l => l._key === key);
        if (!line) line = window.LensGR.manualLines.find(l => l._key === key);
        if (line) line.qty_received = v;
        renderTable();
        window.LensGR.recomputeSummary();
      });
    });
    c.querySelectorAll('button[data-action="remove-manual"]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.key;
        window.LensGR.manualLines = window.LensGR.manualLines.filter(l => l._key !== key);
        renderTable();
        window.LensGR.recomputeSummary();
      });
    });
  }

  function bindManualAdd() {
    const btn = document.getElementById('btn-add-manual');
    if (btn) btn.addEventListener('click', () => window.LensGRManual.openAddManualModal());
  }

  window.LensGRLines = { loadExpectedLines, renderTable };
})();
