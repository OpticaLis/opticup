// lens-pos-list-table.js — load purchase_order rows + render table with status chips,
// progress bar, source-type badge, overdue row class. Filtering uses the SAME loaded
// rows; stat counts and table rows derive from one source of truth.

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

  function relativeLabel(ts, anchor) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(d); target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'היום';
    if (diffDays === -1) return 'אתמול';
    if (diffDays === 1) return 'מחר';
    if (diffDays < 0) return anchor === 'past' ? 'לפני ' + (-diffDays) + ' ימים' : 'איחור ' + (-diffDays) + ' ימים';
    return 'בעוד ' + diffDays + ' ימים';
  }

  function chipFor(po) {
    if (window.LensPOsList.isOverdue(po)) {
      return '<span class="chip chip-overdue">⚠️ באיחור</span>';
    }
    const map = {
      draft: 'chip-draft', sent: 'chip-sent', partial: 'chip-partial',
      fully_received: 'chip-received', cancelled: 'chip-cancelled',
    };
    const labels = {
      draft: 'טיוטה', sent: 'נשלח לספק', partial: 'חלקית התקבל',
      fully_received: 'התקבל', cancelled: 'בוטל',
    };
    return '<span class="chip ' + (map[po.status] || 'chip-draft') + '">' + (labels[po.status] || po.status) + '</span>';
  }

  function srcBadge(po) {
    const s = window.LensPOsList.sourceOf(po);
    if (s === 'mixed')  return '<span class="src-badge src-mixed">מעורב</span>';
    if (s === 'custom') return '<span class="src-badge src-custom">ייצור</span>';
    return '<span class="src-badge src-stock">מדף</span>';
  }

  async function loadAndRender() {
    const tid = getTenantId();
    if (!tid) throw new Error('tenant_id missing');
    const { data, error } = await sb
      .from('purchase_order')
      .select('id, po_number, status, ordered_at, sent_to_supplier_at, expected_delivery_at, cancelled_at, supplier_id, suppliers!inner(id, name, supplier_number, payment_terms), purchase_order_line(id, qty_ordered, qty_received, unit_cost, currency_code, sale_order_id)')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .order('ordered_at', { ascending: false });
    if (error) throw error;
    window.LensPOsList.pos = (data || []).map(po => {
      const lines = po.purchase_order_line || [];
      const lineCount = lines.length;
      const ordered  = lines.reduce((s, l) => s + (l.qty_ordered || 0), 0);
      const received = lines.reduce((s, l) => s + (l.qty_received || 0), 0);
      const total    = lines.reduce((s, l) => s + (l.qty_ordered || 0) * parseFloat(l.unit_cost || 0), 0);
      return Object.assign({}, po, { _line_count: lineCount, _ordered: ordered, _received: received, _total: total });
    });
    const supplierSet = {};
    window.LensPOsList.pos.forEach(po => {
      if (po.suppliers && !supplierSet[po.suppliers.id]) supplierSet[po.suppliers.id] = po.suppliers;
    });
    window.LensPOsList.suppliers = Object.values(supplierSet);
    window.LensPOsListFilters.populateSupplierFilter();
  }

  function applyFilters(pos) {
    const st = window.LensPOsList;
    return pos.filter(po => {
      if (st.includeCancelled === 'exclude' && po.status === 'cancelled') return false;
      if (st.includeCancelled === 'only'    && po.status !== 'cancelled') return false;
      if (st.statusFilter === 'overdue') {
        if (!st.isOverdue(po)) return false;
      } else if (st.statusFilter !== 'all') {
        if (po.status !== st.statusFilter) return false;
      }
      if (st.sourceFilter !== 'all') {
        if (st.sourceOf(po) !== st.sourceFilter) return false;
      }
      if (st.supplierFilter && po.supplier_id !== st.supplierFilter) return false;
      if (st.searchText) {
        const q = st.searchText.toLowerCase();
        const hay = (po.po_number || '').toLowerCase() + ' ' +
                    ((po.suppliers && po.suppliers.name) || '').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderProgress(po) {
    const ordered  = po._ordered  || 0;
    const received = po._received || 0;
    if (ordered === 0) return '<div style="font-size:10px; color:#94a3b8;">—</div>';
    const pct = Math.round((received / ordered) * 100);
    let fillClass = 'progress-fill';
    if (pct === 0)         fillClass += ' empty';
    else if (pct < 100)    fillClass += ' partial';
    return '<div class="progress-wrapper">' +
      '<div class="progress-bar"><div class="' + fillClass + '" style="width:' + pct + '%;"></div></div>' +
      '<span class="progress-label">' + pct + '%</span>' +
    '</div>' +
    '<div style="font-size:10px; color:#94a3b8; margin-top:3px;">' + received + ' / ' + ordered + ' יח׳</div>';
  }

  function renderRow(po) {
    const supplier = po.suppliers || { name: '(ללא)' };
    const overdue = window.LensPOsList.isOverdue(po);
    const expRelative = po.expected_delivery_at
      ? '<span class="date-sub">' + esc(relativeLabel(po.expected_delivery_at, overdue ? 'overdue' : 'future')) + '</span>'
      : '';
    const expClass = overdue ? 'date-cell overdue' : 'date-cell';
    return '<tr data-po-id="' + esc(po.id) + '"' + (overdue ? ' class="overdue-row"' : '') + '>' +
      '<td><div class="po-id">' + esc(po.po_number || po.id.slice(0, 8)) + '<span class="po-sub">נוצר ' + fmtDate(po.ordered_at) + '</span></div></td>' +
      '<td><div class="supplier-name">' + esc(supplier.name) + (supplier.payment_terms ? '<span class="supplier-sub">' + esc(supplier.payment_terms) + '</span>' : '') + '</div></td>' +
      '<td class="date-cell">' + fmtDate(po.ordered_at) + '<span class="date-sub">' + esc(relativeLabel(po.ordered_at, 'past')) + '</span></td>' +
      '<td class="' + expClass + '">' + fmtDate(po.expected_delivery_at) + expRelative + '</td>' +
      '<td>' + chipFor(po) + '</td>' +
      '<td>' + srcBadge(po) + '</td>' +
      '<td>' + po._line_count + ' שורות / ' + po._ordered + ' יח׳</td>' +
      '<td>' + renderProgress(po) + '</td>' +
      '<td style="font-weight:700;">₪' + Math.round(po._total).toLocaleString('he-IL') + '</td>' +
      '<td><div class="row-actions">' +
        (po.status === 'draft' ? '<button class="row-action primary" data-act="mark-sent" data-po-id="' + esc(po.id) + '" type="button">📨 סמן כנשלח</button>' : '') +
        '<button class="row-action primary" data-act="open" data-po-id="' + esc(po.id) + '" type="button">👁 פתח</button>' +
        (po.status !== 'cancelled' && po.status !== 'fully_received' ? '<button class="row-action danger" data-act="cancel" data-po-id="' + esc(po.id) + '" type="button">⛔</button>' : '') +
      '</div></td>' +
    '</tr>';
  }

  function renderFooter(filtered) {
    const host = document.getElementById('lens-pos-footer');
    const totals = document.getElementById('lens-pos-footer-totals');
    const alerts = document.getElementById('lens-pos-footer-alerts');
    if (!host || !totals || !alerts) return;
    if (filtered.length === 0) { host.style.display = 'none'; return; }
    const units = filtered.reduce((s, p) => s + (p._ordered || 0), 0);
    const sum   = filtered.reduce((s, p) => s + (p._total   || 0), 0);
    const overdueCount = filtered.filter(window.LensPOsList.isOverdue).length;
    const partialCount = filtered.filter(p => p.status === 'partial').length;
    totals.innerHTML = 'סה"כ: <strong>' + filtered.length + ' הזמנות</strong> · <strong>' + units + ' יחידות</strong> בהמתנה · <strong>₪' + Math.round(sum).toLocaleString('he-IL') + '</strong> ערך מצטבר';
    alerts.innerHTML = (overdueCount > 0 ? '<span style="color:#dc2626; font-weight:700;">⚠️ ' + overdueCount + ' הזמנות באיחור</span>' : '') +
                       (overdueCount > 0 && partialCount > 0 ? ' · ' : '') +
                       (partialCount > 0 ? '<span style="color:#d97706; font-weight:700;">' + partialCount + ' חלקיות</span>' : '');
    host.style.display = 'flex';
  }

  function renderTable() {
    const c = document.getElementById('table-container');
    if (!c) return;
    const filtered = applyFilters(window.LensPOsList.pos);
    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = 'מציג ' + filtered.length + ' מתוך ' + window.LensPOsList.pos.length + ' הזמנות';
    if (filtered.length === 0) {
      c.innerHTML = '<div class="empty-state">לא נמצאו הזמנות בסינון הנוכחי.</div>';
      renderFooter(filtered);
      return;
    }
    let html = '<table class="po-table"><thead><tr>';
    html += '<th>PO #</th><th>ספק</th><th>תאריך הזמנה</th><th>צפי אספקה</th>';
    html += '<th>סטטוס</th><th>סוג</th><th>שורות</th><th>התקבל</th><th>ערך</th><th>פעולות</th>';
    html += '</tr></thead><tbody>';
    filtered.forEach(po => { html += renderRow(po); });
    html += '</tbody></table>';
    c.innerHTML = html;
    renderFooter(filtered);
    if (window.LensPOsListActions) window.LensPOsListActions.bind();
  }

  window.LensPOsListTable = { loadAndRender, renderTable };
})();
