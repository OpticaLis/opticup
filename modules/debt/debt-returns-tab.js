// =========================================================
// debt-returns-tab.js — Global Returns/Credits Tab (suppliers-debt.html)
// Load after: shared.js, supabase-ops.js, debt-returns.js
// Provides: initDebtReturnsTab(), loadDebtReturns(), renderDebtReturnsFilters(),
//   renderDebtReturnsList(), applyDebtReturnsFilters(), toggleDebtReturnsHistory()
// Actions in: debt-returns-tab-actions.js
// =========================================================

window._debtReturnsData = [];
window._debtReturnsShowHistory = false;
window._debtRetExpandedIdx = -1;

// =========================================================
// Init — called when user clicks the returns tab
// =========================================================
async function initDebtReturnsTab() {
  var container = $('debt-returns-tab-content');
  if (!container) return;
  container.innerHTML =
    '<div style="padding:16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">' +
        '<h2 style="margin:0;font-size:1.15rem;color:var(--primary)">&#128260; זיכויים — מעקב כולל</h2>' +
        '<button class="btn btn-p" onclick="exportDebtReturnsExcel()" style="padding:8px 14px;font-size:.88rem">&#128229; ייצוא Excel</button>' +
      '</div>' +
      '<div id="debt-ret-help-wrap"></div>' +
      '<div id="debt-ret-supplier-note" style="display:none;background:#e3f0ff;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:.88rem;color:#1a5fb4"></div>' +
      '<div id="debt-ret-filters"></div>' +
      '<div id="debt-ret-summary" style="margin-bottom:8px"></div>' +
      '<div id="debt-ret-list"></div>' +
    '</div>';
  renderHelpBanner($('debt-ret-help-wrap'), 'help_debt_returns',
    '<strong>זיכויים — מעקב כולל</strong><br>' +
    'מסך זה מציג את כל הפריטים שנשלחו או נאספו ע"י סוכן וממתינים לזיכוי מהספק.' +
    '<ul><li><strong>ממתין לזיכוי</strong> — ברירת המחדל. מציג פריטים בסטטוס "נשלח" + "סוכן לקח".</li>' +
    '<li><strong>סמן כזוכה</strong> — בחר פריטים ולחץ ✅ לסימון. נדרשת סיסמת עובד.</li>' +
    '<li><strong>הצג היסטוריה</strong> — מציג גם פריטים שכבר זוכו.</li></ul>');
  renderDebtReturnsFilters();
  await loadDebtReturns();
}

// =========================================================
// Load returns data with filters
// =========================================================
async function loadDebtReturns(filters) {
  var listEl = $('debt-ret-list');
  if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:30px;color:#999">טוען...</div>';

  filters = filters || {};
  var tid = getTenantId();
  if (!tid) return;

  try {
    var query = sb.from(T.SUP_RETURN_ITEMS)
      .select('id, return_id, inventory_id, barcode, quantity, cost_price, brand_name, model, color, size, return:supplier_returns!inner(id, return_number, status, supplier_id, return_type, reason, created_at, ready_at, shipped_at, agent_picked_at, received_at, credited_at, notes, supplier:suppliers(name, supplier_number))')
      .eq('tenant_id', tid)
      .eq('return.is_deleted', false);

    // Status filter
    var statusFilter = filters.status || 'waiting_credit';
    if (statusFilter === 'waiting_credit') {
      query = query.in('return.status', ['shipped', 'agent_picked']);
    } else if (statusFilter !== 'all') {
      query = query.eq('return.status', statusFilter);
    }

    if (filters.supplier_id) {
      query = query.eq('return.supplier_id', filters.supplier_id);
    }

    if (filters.search) {
      query = query.or('barcode.ilike.%' + filters.search + '%,brand_name.ilike.%' + filters.search + '%');
    }

    query = query.order('created_at', { foreignTable: 'supplier_returns', ascending: false });

    var result = await query;
    if (result.error) throw result.error;
    var data = result.data || [];

    // Date filter (client-side since it's on the join)
    if (filters.dateRange && filters.dateRange !== 'all') {
      var cutoff = new Date();
      if (filters.dateRange === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (filters.dateRange === 'week') cutoff.setDate(cutoff.getDate() - 7);
      else if (filters.dateRange === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
      data = data.filter(function(it) {
        var d = it.return && (it.return.shipped_at || it.return.agent_picked_at || it.return.created_at);
        return d && new Date(d) >= cutoff;
      });
    }

    window._debtReturnsData = data;
    renderDebtReturnsList(data);
    renderDebtReturnsSummary(data, filters.supplier_id);
  } catch (e) {
    console.error('loadDebtReturns error:', e);
    if (listEl) listEl.innerHTML = '<div class="empty-state">שגיאה בטעינת זיכויים</div>';
  }
}

// =========================================================
// Render filters bar
// =========================================================
function renderDebtReturnsFilters() {
  var el = $('debt-ret-filters');
  if (!el) return;

  var supOpts = '<option value="">ספק — הכל</option>';
  if (typeof allSuppliersData !== 'undefined' && allSuppliersData.length) {
    allSuppliersData.filter(function(s) { return s.active !== false; }).forEach(function(s) {
      supOpts += '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
    });
  }

  var histChecked = window._debtReturnsShowHistory ? ' checked' : '';

  el.innerHTML =
    '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px">' +
      '<select id="dret-filter-status" class="filter-select" onchange="applyDebtReturnsFilters()" style="padding:6px 8px;border:1px solid var(--g300);border-radius:6px;font-family:inherit;font-size:.88rem">' +
        '<option value="waiting_credit">ממתין לזיכוי</option>' +
        '<option value="shipped">נשלח בלבד</option>' +
        '<option value="agent_picked">סוכן לקח בלבד</option>' +
        '<option value="credited">זוכה</option>' +
        '<option value="all">הכל</option>' +
      '</select>' +
      '<select id="dret-filter-supplier" class="filter-select" onchange="applyDebtReturnsFilters()" style="padding:6px 8px;border:1px solid var(--g300);border-radius:6px;font-family:inherit;font-size:.88rem">' + supOpts + '</select>' +
      '<select id="dret-filter-date" class="filter-select" onchange="applyDebtReturnsFilters()" style="padding:6px 8px;border:1px solid var(--g300);border-radius:6px;font-family:inherit;font-size:.88rem">' +
        '<option value="all">תאריך — הכל</option>' +
        '<option value="today">היום</option>' +
        '<option value="week">השבוע</option>' +
        '<option value="month">החודש</option>' +
      '</select>' +
      '<input type="text" id="dret-filter-search" placeholder="ברקוד / מותג..." oninput="applyDebtReturnsFilters()" ' +
        'style="width:160px;padding:6px 10px;border:1px solid var(--g300);border-radius:6px;font-family:inherit;font-size:.88rem">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:.85rem;cursor:pointer">' +
        '<input type="checkbox" id="dret-filter-history" onchange="toggleDebtReturnsHistory()"' + histChecked + '> הצג היסטוריה' +
      '</label>' +
    '</div>';
}

function toggleDebtReturnsHistory() {
  var cb = $('dret-filter-history');
  window._debtReturnsShowHistory = cb && cb.checked;
  if (window._debtReturnsShowHistory) {
    var sel = $('dret-filter-status');
    if (sel) sel.value = 'all';
  }
  applyDebtReturnsFilters();
}

function applyDebtReturnsFilters() {
  var filters = {};
  var status = ($('dret-filter-status') || {}).value || 'waiting_credit';
  if (window._debtReturnsShowHistory) status = 'all';
  filters.status = status;
  filters.supplier_id = ($('dret-filter-supplier') || {}).value || '';
  filters.dateRange = ($('dret-filter-date') || {}).value || 'all';
  filters.search = ($('dret-filter-search') || {}).value.trim() || '';
  loadDebtReturns(filters);
}

// =========================================================
// Summary + supplier note
// =========================================================
function renderDebtReturnsSummary(items, supplierId) {
  var summEl = $('debt-ret-summary');
  var noteEl = $('debt-ret-supplier-note');

  var pending = items.filter(function(i) {
    var st = i.return && i.return.status;
    return st === 'shipped' || st === 'agent_picked';
  });
  var pendingQty = pending.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
  var pendingVal = pending.reduce(function(s, i) { return s + (Number(i.cost_price) || 0) * (i.quantity || 1); }, 0);

  if (summEl) {
    summEl.innerHTML = '<div style="font-size:.88rem;color:var(--g600)">' +
      pendingQty + ' פריטים ממתינים לזיכוי, סה"כ ' + formatILS(pendingVal) + '</div>';
  }

  if (noteEl) {
    if (supplierId && pending.length > 0) {
      var supName = pending[0].return && pending[0].return.supplier ? pending[0].return.supplier.name : '';
      noteEl.style.display = 'block';
      noteEl.textContent = 'ספק ' + supName + ': ' + pendingQty + ' פריטים ממתינים לזיכוי, ' + formatILS(pendingVal) + ' שווי';
    } else {
      noteEl.style.display = 'none';
    }
  }
}

// =========================================================
// Render returns table
// =========================================================
function renderDebtReturnsList(items) {
  var el = $('debt-ret-list');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<div class="empty-state">אין זיכויים ממתינים</div>';
    return;
  }

  var html = '<div style="display:flex;justify-content:flex-end;margin-bottom:8px">' +
    '<button class="btn btn-sm" onclick="bulkMarkCredited()" style="padding:6px 14px">&#9989; סמן כזוכה</button>' +
  '</div>';

  html += '<div style="overflow-x:auto;border:1px solid var(--g200);border-radius:8px">' +
    '<table style="width:100%;border-collapse:collapse;font-size:.85rem">' +
    '<thead><tr style="background:var(--primary);color:white;text-align:right">' +
      '<th style="padding:8px;width:32px"><input type="checkbox" id="dret-select-all" onchange="toggleDebtRetSelectAll(this.checked)"></th>' +
      '<th style="padding:8px">ברקוד</th>' +
      '<th style="padding:8px">מותג + דגם</th>' +
      '<th style="padding:8px">ספק</th>' +
      '<th style="padding:8px">סטטוס</th>' +
      '<th style="padding:8px">תאריך שליחה</th>' +
      '<th style="padding:8px">עלות</th>' +
      '<th style="padding:8px">פעולות</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var ret = it.return || {};
    var st = RETURN_STATUS_MAP[ret.status] || { he: ret.status || '?', cls: '' };
    var supName = ret.supplier ? ret.supplier.name : '';
    var isPending = (ret.status === 'shipped' || ret.status === 'agent_picked');
    var dateStr = isPending
      ? ((ret.shipped_at || ret.agent_picked_at || ret.created_at) || '').slice(0, 10)
      : ((ret.credited_at || ret.shipped_at || ret.created_at) || '').slice(0, 10);
    var isExpanded = (window._debtRetExpandedIdx === i);

    var actions = '';
    if (isPending) {
      actions = '<button class="btn-sm" onclick="event.stopPropagation();markDebtCredited(\'' + ret.id + '\',\'' + it.id + '\')" title="סמן כזוכה">&#9989; זוכה</button>';
    }

    html += '<tr style="cursor:pointer;border-bottom:1px solid var(--g200)" onclick="openReturnTimeline(' + i + ')">' +
      '<td style="padding:8px" onclick="event.stopPropagation()"><input type="checkbox" class="dret-cb" data-idx="' + i + '" data-return-id="' + ret.id + '" data-item-id="' + it.id + '" data-status="' + (ret.status || '') + '"' + (isPending ? '' : ' disabled') + '></td>' +
      '<td style="padding:8px;font-family:monospace">' + escapeHtml(it.barcode || '—') + '</td>' +
      '<td style="padding:8px">' + escapeHtml(it.brand_name || '') + ' ' + escapeHtml(it.model || '') + '</td>' +
      '<td style="padding:8px">' + escapeHtml(supName) + '</td>' +
      '<td style="padding:8px"><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '<td style="padding:8px">' + escapeHtml(dateStr) + '</td>' +
      '<td style="padding:8px">' + formatILS(it.cost_price) + '</td>' +
      '<td style="padding:8px">' + actions + '</td>' +
    '</tr>';

    var retType = RETURN_TYPE_MAP[ret.return_type] || ret.return_type || '';
    html += '<tr style="display:' + (isExpanded ? 'table-row' : 'none') + ';background:#f8f9fa">' +
      '<td colspan="8" style="padding:10px 16px;font-size:.84rem">' +
        '<div style="display:flex;flex-wrap:wrap;gap:16px">' +
          '<div>מספר זיכוי: <strong>' + escapeHtml(ret.return_number || '') + '</strong></div>' +
          '<div>סוג: <strong>' + escapeHtml(retType) + '</strong></div>' +
          '<div>צבע: ' + escapeHtml(it.color || '—') + '</div>' +
          '<div>גודל: ' + escapeHtml(it.size || '—') + '</div>' +
          '<div>כמות: ' + (it.quantity || 1) + '</div>' +
          (ret.reason ? '<div>סיבה: ' + escapeHtml(ret.reason) + '</div>' : '') +
          (ret.notes ? '<div>הערות: ' + escapeHtml(ret.notes) + '</div>' : '') +
          (ret.credited_at ? '<div>תאריך זיכוי: ' + escapeHtml(ret.credited_at.slice(0, 10)) + '</div>' : '') +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function toggleDebtRetAccordion(idx) {
  window._debtRetExpandedIdx = (window._debtRetExpandedIdx === idx) ? -1 : idx;
  renderDebtReturnsList(window._debtReturnsData);
}

function toggleDebtRetSelectAll(checked) {
  document.querySelectorAll('.dret-cb:not(:disabled)').forEach(function(cb) { cb.checked = checked; });
}

// =========================================================
// Return Credit Timeline Modal
// =========================================================
function openReturnTimeline(idx) {
  var it = window._debtReturnsData[idx];
  if (!it) return;
  var ret = it.return || {};
  var sup = ret.supplier || {};

  // Timeline steps
  var steps = [
    { key: 'created',              label: 'נוצר',              ts: ret.created_at,       detail: 'הורדת מלאי — נשלח לזיכוי', color: '#2196F3' },
    { key: 'ready_to_ship',        label: 'מוכן למשלוח',       ts: ret.ready_at,         detail: 'ממתין בחנות',               color: '#2196F3' },
    { key: 'agent_picked',         label: 'סוכן לקח',          ts: ret.agent_picked_at,  detail: '',                          color: '#FFC107' },
    { key: 'shipped',              label: 'נשלח',              ts: ret.shipped_at,        detail: '',                          color: '#4CAF50' },
    { key: 'received_by_supplier', label: 'התקבל אצל הספק',    ts: ret.received_at,       detail: '',                          color: '#4CAF50' },
    { key: 'credited',             label: 'זוכה',              ts: ret.credited_at,       detail: '',                          color: '#4CAF50' }
  ];

  // Determine which steps are reached based on status chain
  var statusOrder = ['pending', 'ready_to_ship', 'agent_picked', 'shipped', 'received_by_supplier', 'credited'];
  var currentIdx = statusOrder.indexOf(ret.status || 'pending');

  function fmtDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString('he-IL') + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  var tlHtml = '';
  for (var s = 0; s < steps.length; s++) {
    var step = steps[s];
    var stepIdx = statusOrder.indexOf(step.key === 'created' ? 'pending' : step.key);
    var isReached = step.ts || (step.key === 'created' && ret.created_at);
    var isFuture = !isReached;
    var dotColor = isFuture ? '#ccc' : step.color;
    var dotIcon = isFuture ? '&#9723;' : '&#128309;';
    var textColor = isFuture ? '#999' : '#333';
    var dateText = isReached ? fmtDate(step.ts || ret.created_at) : '(טרם)';
    var detailText = step.detail || '';
    var isLast = (s === steps.length - 1);

    tlHtml +=
      '<div style="display:flex;gap:12px;position:relative;min-height:56px">' +
        '<div style="display:flex;flex-direction:column;align-items:center;width:24px;flex-shrink:0">' +
          '<div style="width:16px;height:16px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;margin-top:2px"></div>' +
          (isLast ? '' : '<div style="width:2px;flex:1;background:' + (isFuture ? '#e0e0e0' : dotColor) + ';margin:2px 0"></div>') +
        '</div>' +
        '<div style="flex:1;padding-bottom:' + (isLast ? '0' : '12px') + '">' +
          '<div style="font-weight:600;font-size:.9rem;color:' + textColor + '">' + step.label + '</div>' +
          '<div style="font-size:.82rem;color:' + (isFuture ? '#bbb' : '#666') + '">' + escapeHtml(dateText) + '</div>' +
          (detailText ? '<div style="font-size:.8rem;color:#888;margin-top:2px">' + escapeHtml(detailText) + '</div>' : '') +
        '</div>' +
      '</div>';
  }

  var retType = RETURN_TYPE_MAP[ret.return_type] || ret.return_type || '';
  var stObj = RETURN_STATUS_MAP[ret.status] || { he: ret.status || '?', cls: '' };

  var html =
    '<div class="modal-overlay" id="dret-timeline-modal" style="display:flex" onclick="if(event.target===this)closeModal(\'dret-timeline-modal\')">' +
      '<div class="modal" style="max-width:480px;max-height:90vh;overflow-y:auto">' +
        '<h3 style="margin:0 0 12px;color:var(--primary)">&#128203; היסטוריית זיכוי</h3>' +
        '<div style="background:#f5f7fa;border-radius:8px;padding:12px;margin-bottom:16px;font-size:.85rem">' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px 20px">' +
            '<div>מספר זיכוי: <strong>' + escapeHtml(ret.return_number || '—') + '</strong></div>' +
            '<div>ספק: <strong>' + escapeHtml(sup.name || '—') + '</strong></div>' +
            '<div>סוג: <strong>' + escapeHtml(retType) + '</strong></div>' +
            '<div>סטטוס: <span class="doc-badge ' + stObj.cls + '">' + escapeHtml(stObj.he) + '</span></div>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px 20px;margin-top:8px">' +
            '<div>ברקוד: <strong style="font-family:monospace">' + escapeHtml(it.barcode || '—') + '</strong></div>' +
            '<div>מותג + דגם: <strong>' + escapeHtml((it.brand_name || '') + ' ' + (it.model || '')) + '</strong></div>' +
            '<div>עלות: <strong>' + formatILS(it.cost_price) + '</strong></div>' +
            '<div>כמות: <strong>' + (it.quantity || 1) + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div style="padding:4px 8px">' + tlHtml + '</div>' +
        '<div style="text-align:center;margin-top:16px">' +
          '<button class="btn" style="background:#e5e7eb;color:#1e293b;padding:8px 24px" onclick="closeModal(\'dret-timeline-modal\')">סגור</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  var existing = $('dret-timeline-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}
