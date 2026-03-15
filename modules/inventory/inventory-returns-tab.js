// inventory-returns-tab.js — Returns (זיכויים) tab for inventory.html
// Load after: shared.js, supabase-ops.js, debt-returns.js
// Provides: initReturnsTab(), loadReturnsData(), renderReturnsFilters(),
//   renderReturnsList(), getReturnsCount()

window._returnsData = [];
window._returnsShowHistory = false;
window._expandedReturnIdx = -1;
window._returnsCountCache = null;

// =========================================================
// Init — called when user clicks the returns tab
// =========================================================
async function initReturnsTab() {
  var container = $('returns-tab');
  if (!container) return;
  container.innerHTML =
    '<div style="padding:16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">' +
        '<h2 style="margin:0">&#128260; זיכויים</h2>' +
        '<button class="btn btn-p" onclick="exportReturnsExcel()" style="padding:8px 14px;font-size:.88rem">&#128229; ייצוא Excel</button>' +
      '</div>' +
      '<div id="returns-help-wrap"></div>' +
      '<div id="returns-filters"></div>' +
      '<div id="returns-list"></div>' +
    '</div>';
  renderHelpBanner($('returns-help-wrap'), 'help_inv_returns',
    '<strong>טאב זיכויים — מלאי</strong><br>' +
    'כאן מנוהלים פריטים שסומנו להחזרה לספק מתוך המלאי.' +
    '<ul><li><strong>מוכן למשלוח</strong> — פריט מוכן לארגז. לחץ 📦 לשלוח בארגז או 🚶 לסמן סוכן לקח.</li>' +
    '<li><strong>שלח בארגז (בודד/מרובה)</strong> — בחר פריטים מאותו ספק ולחץ 📦 למעלה.</li>' +
    '<li><strong>סוכן לקח</strong> — הנציג איסף פיזית.</li></ul>');
  renderReturnsFilters();
  await loadReturnsData();
}

// =========================================================
// Load returns data with filters
// =========================================================
async function loadReturnsData(filters) {
  var listEl = $('returns-list');
  if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:30px;color:#999">טוען...</div>';

  filters = filters || {};
  var tid = getTenantId();

  try {
    var query = sb.from(T.SUP_RETURN_ITEMS)
      .select('id, return_id, inventory_id, barcode, quantity, cost_price, brand_name, model, color, size, return:supplier_returns!inner(id, return_number, status, supplier_id, return_type, reason, created_at, shipped_at, notes, supplier:suppliers(id, name))')
      .eq('tenant_id', tid);

    // Status filter
    var statusFilter = filters.status || 'ready_to_ship';
    if (statusFilter !== 'all') {
      query = query.eq('return.status', statusFilter);
    }

    // Supplier filter
    if (filters.supplier_id) {
      query = query.eq('return.supplier_id', filters.supplier_id);
    }

    // Barcode / brand search
    if (filters.search) {
      query = query.or('barcode.ilike.%' + filters.search + '%,brand_name.ilike.%' + filters.search + '%');
    }

    query = query.order('created_at', { foreignTable: 'supplier_returns', ascending: false });

    var { data, error } = await query;
    if (error) throw error;

    // Date filter (client-side since it's on the join)
    if (filters.dateRange && filters.dateRange !== 'all') {
      var now = new Date();
      var cutoff = new Date();
      if (filters.dateRange === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (filters.dateRange === 'week') cutoff.setDate(now.getDate() - 7);
      else if (filters.dateRange === 'month') cutoff.setMonth(now.getMonth() - 1);
      data = (data || []).filter(function(it) {
        return it.return && it.return.created_at && new Date(it.return.created_at) >= cutoff;
      });
    }

    window._returnsData = data || [];
    renderReturnsList(window._returnsData);
  } catch (e) {
    console.error('loadReturnsData error:', e);
    if (listEl) listEl.innerHTML = '<div class="empty-state">שגיאה בטעינת זיכויים</div>';
  }
}

// =========================================================
// Render filters bar
// =========================================================
function renderReturnsFilters() {
  var el = $('returns-filters');
  if (!el) return;

  // Build supplier options from cache
  var supOpts = '<option value="">ספק — הכל</option>';
  if (typeof allSuppliersData !== 'undefined' && allSuppliersData.length) {
    allSuppliersData.filter(function(s) { return s.active !== false; }).forEach(function(s) {
      supOpts += '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
    });
  }

  var histChecked = window._returnsShowHistory ? ' checked' : '';

  el.innerHTML =
    '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px">' +
      '<select id="ret-filter-status" class="filter-select" onchange="applyReturnsFilters()">' +
        '<option value="ready_to_ship">מוכן למשלוח</option>' +
        '<option value="shipped">נשלח</option>' +
        '<option value="agent_picked">סוכן לקח</option>' +
        '<option value="credited">זוכה</option>' +
        '<option value="pending">ממתין</option>' +
        '<option value="all">הכל</option>' +
      '</select>' +
      '<select id="ret-filter-supplier" class="filter-select" onchange="applyReturnsFilters()">' + supOpts + '</select>' +
      '<select id="ret-filter-date" class="filter-select" onchange="applyReturnsFilters()">' +
        '<option value="all">תאריך — הכל</option>' +
        '<option value="today">היום</option>' +
        '<option value="week">השבוע</option>' +
        '<option value="month">החודש</option>' +
      '</select>' +
      '<input type="text" id="ret-filter-search" class="filter-input" placeholder="ברקוד / מותג..." ' +
        'oninput="applyReturnsFilters()" style="width:160px;padding:6px 10px;border:1px solid var(--g300);border-radius:6px">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:.85rem;cursor:pointer">' +
        '<input type="checkbox" id="ret-filter-history" onchange="toggleReturnsHistory()"' + histChecked + '> הצג היסטוריה' +
      '</label>' +
    '</div>';
}

function toggleReturnsHistory() {
  var cb = $('ret-filter-history');
  window._returnsShowHistory = cb && cb.checked;
  if (window._returnsShowHistory) {
    var sel = $('ret-filter-status');
    if (sel) sel.value = 'all';
  }
  applyReturnsFilters();
}

function applyReturnsFilters() {
  var filters = {};
  var status = ($('ret-filter-status') || {}).value || 'ready_to_ship';
  if (window._returnsShowHistory) status = 'all';
  filters.status = status;
  filters.supplier_id = ($('ret-filter-supplier') || {}).value || '';
  filters.dateRange = ($('ret-filter-date') || {}).value || 'all';
  filters.search = ($('ret-filter-search') || {}).value.trim() || '';
  loadReturnsData(filters);
}

// =========================================================
// Render returns list
// =========================================================
function renderReturnsList(items) {
  var el = $('returns-list');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<div class="empty-state">אין זיכויים ממתינים</div>';
    return;
  }

  // Summary
  var totalQty = items.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
  var totalVal = items.reduce(function(s, i) { return s + (Number(i.cost_price) || 0) * (i.quantity || 1); }, 0);

  // Select-all checkbox
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">' +
    '<div style="font-size:.88rem;color:var(--g600)">' + totalQty + ' פריטים, סה"כ ' + formatILS(totalVal) + '</div>' +
    '<div style="display:flex;gap:6px">' +
      '<button class="btn btn-sm" onclick="bulkSendToBox()" title="שלח בארגז">&#128230; שלח בארגז</button> ' +
      '<button class="btn btn-sm" onclick="bulkAction(\'agent_picked\')" title="סוכן לקח">&#128694; סוכן לקח</button>' +
    '</div>' +
  '</div>';

  html += '<div style="overflow-x:auto;border:1px solid var(--g200);border-radius:8px">' +
    '<table style="width:100%;border-collapse:collapse;font-size:.85rem">' +
    '<thead><tr style="background:var(--primary);color:white;text-align:right">' +
      '<th style="padding:8px;width:32px"><input type="checkbox" id="ret-select-all" onchange="toggleReturnSelectAll(this.checked)"></th>' +
      '<th style="padding:8px">ברקוד</th>' +
      '<th style="padding:8px">מותג + דגם</th>' +
      '<th style="padding:8px">צבע</th>' +
      '<th style="padding:8px">גודל</th>' +
      '<th style="padding:8px">ספק</th>' +
      '<th style="padding:8px">סטטוס</th>' +
      '<th style="padding:8px">תאריך</th>' +
      '<th style="padding:8px">עלות</th>' +
      '<th style="padding:8px">פעולות</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var ret = it.return || {};
    var st = RETURN_STATUS_MAP[ret.status] || { he: ret.status || '?', cls: '' };
    var supName = ret.supplier ? ret.supplier.name : '';
    var dateStr = ret.created_at ? ret.created_at.slice(0, 10) : '';
    var isExpanded = (window._expandedReturnIdx === i);

    // Action buttons based on status — only ready_to_ship gets actions
    var actions = '';
    if (ret.status === 'ready_to_ship') {
      actions = '<button class="btn-sm" onclick="event.stopPropagation();sendToBox(\'' + ret.id + '\',\'' + (ret.supplier_id || '') + '\')" title="שלח בארגז">&#128230;</button> ' +
        '<button class="btn-sm" onclick="event.stopPropagation();markAgentPicked(\'' + ret.id + '\',\'' + it.id + '\')" title="סוכן לקח">&#128694;</button>';
    }

    html += '<tr style="cursor:pointer;border-bottom:1px solid var(--g200)" onclick="toggleReturnAccordion(' + i + ')">' +
      '<td style="padding:8px" onclick="event.stopPropagation()"><input type="checkbox" class="ret-cb" data-idx="' + i + '" data-return-id="' + ret.id + '" data-item-id="' + it.id + '" data-status="' + (ret.status || '') + '"></td>' +
      '<td style="padding:8px;font-family:monospace">' + escapeHtml(it.barcode || '—') + '</td>' +
      '<td style="padding:8px">' + escapeHtml(it.brand_name || '') + ' ' + escapeHtml(it.model || '') + '</td>' +
      '<td style="padding:8px">' + escapeHtml(it.color || '') + '</td>' +
      '<td style="padding:8px">' + escapeHtml(it.size || '') + '</td>' +
      '<td style="padding:8px">' + escapeHtml(supName) + '</td>' +
      '<td style="padding:8px"><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '<td style="padding:8px">' + escapeHtml(dateStr) + '</td>' +
      '<td style="padding:8px">' + formatILS(it.cost_price) + '</td>' +
      '<td style="padding:8px">' + actions + '</td>' +
    '</tr>';

    // Accordion detail row
    html += '<tr class="ret-detail-row" style="display:' + (isExpanded ? 'table-row' : 'none') + ';background:#f8f9fa">' +
      '<td colspan="10" style="padding:10px 16px;font-size:.84rem">' +
        '<div style="display:flex;flex-wrap:wrap;gap:16px">' +
          '<div>מספר זיכוי: <strong>' + escapeHtml(ret.return_number || '') + '</strong></div>' +
          '<div>סוג: <strong>' + escapeHtml((RETURN_TYPE_MAP[ret.return_type] || ret.return_type || '')) + '</strong></div>' +
          (ret.reason ? '<div>סיבה: ' + escapeHtml(ret.reason) + '</div>' : '') +
          (ret.notes ? '<div>הערות: ' + escapeHtml(ret.notes) + '</div>' : '') +
          '<div>כמות: ' + (it.quantity || 1) + '</div>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function toggleReturnAccordion(idx) {
  window._expandedReturnIdx = (window._expandedReturnIdx === idx) ? -1 : idx;
  renderReturnsList(window._returnsData);
}

function toggleReturnSelectAll(checked) {
  document.querySelectorAll('.ret-cb').forEach(function(cb) { cb.checked = checked; });
}

// =========================================================
// Get pending returns count (for badge)
// =========================================================
async function getReturnsCount() {
  if (window._returnsCountCache !== null) return window._returnsCountCache;
  try {
    var tid = getTenantId();
    var { count, error } = await sb.from(T.SUP_RETURN_ITEMS)
      .select('id, return:supplier_returns!inner(status)', { count: 'exact', head: true })
      .eq('tenant_id', tid)
      .eq('return.status', 'ready_to_ship');
    if (!error) window._returnsCountCache = count || 0;
    return window._returnsCountCache || 0;
  } catch (e) { return 0; }
}
