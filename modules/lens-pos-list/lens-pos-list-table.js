// lens-pos-list-table.js — load purchase_order rows + render the table with status chips
// Joins suppliers (name, supplier_number) and aggregates line counts + computed totals.

(function () {
  'use strict';

  function escapeHtmlSafe(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function chipFor(status) {
    const map = { draft: 'chip-draft', sent: 'chip-sent', partial: 'chip-partial', fully_received: 'chip-received', cancelled: 'chip-cancelled' };
    const labels = { draft: 'טיוטה', sent: 'נשלח', partial: 'חלקי', fully_received: 'התקבל', cancelled: 'בוטל' };
    return '<span class="chip ' + (map[status] || 'chip-draft') + '">' + (labels[status] || status) + '</span>';
  }

  async function loadAndRender() {
    const tid = getTenantId();
    if (!tid) throw new Error('tenant_id missing');
    // Iron Rule 7: read via DB join — single SELECT with embedded supplier + line aggregate.
    const { data, error } = await sb
      .from('purchase_order')
      .select('id, po_number, status, ordered_at, sent_to_supplier_at, expected_delivery_at, cancelled_at, supplier_id, suppliers!inner(id, name, supplier_number, payment_terms_days), purchase_order_line(id, qty_ordered, qty_received, unit_cost, currency_code)')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .order('ordered_at', { ascending: false });
    if (error) throw error;
    window.LensPOsList.pos = (data || []).map(function (po) {
      const lines = po.purchase_order_line || [];
      const lineCount = lines.length;
      const ordered = lines.reduce(function (s, l) { return s + (l.qty_ordered || 0); }, 0);
      const received = lines.reduce(function (s, l) { return s + (l.qty_received || 0); }, 0);
      const total = lines.reduce(function (s, l) { return s + (l.qty_ordered || 0) * parseFloat(l.unit_cost || 0); }, 0);
      return Object.assign({}, po, { _line_count: lineCount, _ordered: ordered, _received: received, _total: total });
    });
    // Build supplier filter dropdown
    const supplierSet = {};
    window.LensPOsList.pos.forEach(function (po) {
      if (po.suppliers && !supplierSet[po.suppliers.id]) supplierSet[po.suppliers.id] = po.suppliers;
    });
    window.LensPOsList.suppliers = Object.values(supplierSet);
    populateSupplierFilter();
    renderStats();
    renderTable();
  }

  function populateSupplierFilter() {
    const sel = document.getElementById('filter-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">🏢 ספק: הכל</option>';
    window.LensPOsList.suppliers.forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = (s.supplier_number ? '#' + s.supplier_number + ' · ' : '') + (s.name || '(ללא)');
      sel.appendChild(opt);
    });
  }

  function applyFilters(pos) {
    const st = window.LensPOsList;
    return pos.filter(function (po) {
      if (st.includeCancelled === 'exclude' && po.status === 'cancelled') return false;
      if (st.includeCancelled === 'only' && po.status !== 'cancelled') return false;
      if (st.statusFilter !== 'all' && po.status !== st.statusFilter) return false;
      if (st.supplierFilter && po.supplier_id !== st.supplierFilter) return false;
      if (st.searchText) {
        const q = st.searchText.toLowerCase();
        const hay = (po.po_number || '').toLowerCase() + ' ' + ((po.suppliers && po.suppliers.name) || '').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderStats() {
    const pos = window.LensPOsList.pos;
    const counts = { all: 0, draft: 0, sent: 0, partial: 0, fully_received: 0, cancelled: 0 };
    pos.forEach(function (po) { counts.all++; counts[po.status] = (counts[po.status] || 0) + 1; });
    function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = String(v); }
    set('stat-all', counts.all);
    set('stat-draft', counts.draft);
    set('stat-sent', counts.sent);
    set('stat-partial', counts.partial);
    set('stat-received', counts.fully_received);
    const badge = document.getElementById('pos-count-badge');
    if (badge) badge.textContent = counts.all + ' הזמנות';
  }

  function renderTable() {
    const c = document.getElementById('table-container');
    if (!c) return;
    const filtered = applyFilters(window.LensPOsList.pos);
    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = 'מציג ' + filtered.length + ' מתוך ' + window.LensPOsList.pos.length + ' הזמנות';
    if (filtered.length === 0) {
      c.innerHTML = '<div class="empty-state">לא נמצאו הזמנות בסינון הנוכחי.</div>';
      return;
    }
    let html = '<table class="po-table"><thead><tr>';
    html += '<th>PO #</th><th>ספק</th><th>תאריך הזמנה</th><th>צפי אספקה</th><th>סטטוס</th><th>שורות</th><th>התקבל</th><th>ערך משוער</th><th>פעולות</th>';
    html += '</tr></thead><tbody>';
    filtered.forEach(function (po) {
      const supplier = po.suppliers || { name: '(ללא)' };
      const progress = po._ordered > 0 ? Math.round((po._received / po._ordered) * 100) : 0;
      html += '<tr data-po-id="' + escapeHtmlSafe(po.id) + '">';
      html += '<td><div class="po-id">' + escapeHtmlSafe(po.po_number || po.id.slice(0, 8)) + '<span class="po-sub">' + fmtDate(po.ordered_at) + '</span></div></td>';
      html += '<td><div class="supplier-name">' + escapeHtmlSafe(supplier.name) + '</div></td>';
      html += '<td>' + fmtDate(po.ordered_at) + '</td>';
      html += '<td>' + fmtDate(po.expected_delivery_at) + '</td>';
      html += '<td>' + chipFor(po.status) + '</td>';
      html += '<td>' + po._line_count + ' / ' + po._ordered + ' יח׳</td>';
      html += '<td>' + po._received + ' / ' + po._ordered + ' (' + progress + '%)</td>';
      html += '<td style="font-weight:700;">₪' + po._total.toFixed(0) + '</td>';
      html += '<td><div class="row-actions">';
      if (po.status === 'draft') html += '<button class="row-action primary" data-act="mark-sent" data-po-id="' + escapeHtmlSafe(po.id) + '" type="button">📨 סמן כנשלח</button>';
      if (po.status !== 'cancelled' && po.status !== 'fully_received') html += '<button class="row-action danger" data-act="cancel" data-po-id="' + escapeHtmlSafe(po.id) + '" type="button">❌ ביטול</button>';
      html += '<button class="row-action" data-act="view-pdf" data-po-id="' + escapeHtmlSafe(po.id) + '" type="button">📄 PDF</button>';
      html += '</div></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    c.innerHTML = html;
    // Bind row-action delegation via Actions module
    window.LensPOsListActions.bind();
  }

  window.LensPOsListTable = { loadAndRender, renderTable };
})();
