// debt-prepaid.js — Prepaid Deals tab: loading, toolbar, filters, table, new deal (Phase 4f)
// Load after: shared.js, supabase-ops.js, debt-dashboard.js
// Provides: loadPrepaidTab(), renderPrepaidToolbar(), applyPrepaidFilters(),
//   renderPrepaidTable(), openNewDealModal(), _dealAutoName(), saveNewDeal()
// Globals: _prepaidDeals, _prepaidChecks, _prepaidSuppliers, DEAL_STATUS_MAP, CHECK_STATUS_MAP

let _prepaidDeals = [], _prepaidChecks = [], _prepaidSuppliers = [];

const DEAL_STATUS_MAP = {
  active:    { he: 'פעיל',    cls: 'dst-paid' },
  completed: { he: 'הושלם',   cls: 'dst-cancel' },
  cancelled: { he: 'מבוטל',   cls: 'pst-red' }
};

const CHECK_STATUS_MAP = {
  pending:   { he: 'ממתין',   cls: 'dst-open' },
  cashed:    { he: 'נפרע',    cls: 'dst-paid' },
  bounced:   { he: 'חזר',     cls: 'pst-red' },
  cancelled: { he: 'מבוטל',   cls: 'dst-cancel' }
};

// =========================================================
// Load + render
// =========================================================
async function loadPrepaidTab() {
  var tid = getTenantId();
  if (!tid) return;
  showLoading('טוען עסקאות מראש...');
  try {
    var results = await Promise.all([
      fetchAll(T.PREPAID_DEALS, [['is_deleted', 'eq', false]]),
      fetchAll(T.PREPAID_CHECKS, []),
      fetchAll(T.SUPPLIERS, [['active', 'eq', true]])
    ]);
    _prepaidDeals = results[0];
    _prepaidChecks = results[1];
    _prepaidSuppliers = results[2];
    renderPrepaidToolbar();
    renderPrepaidTable(_prepaidDeals);
  } catch (e) {
    console.error('loadPrepaidTab error:', e);
    toast('שגיאה בטעינת עסקאות מראש', 'e');
  } finally {
    hideLoading();
  }
}

// =========================================================
// Toolbar
// =========================================================
function renderPrepaidToolbar() {
  var container = $('dtab-prepaid');
  var supOpts = _prepaidSuppliers.map(function(s) {
    return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  }).join('');
  container.innerHTML =
    '<div class="doc-toolbar">' +
      '<select id="pp-f-supplier" onchange="applyPrepaidFilters()" class="doc-filter-input">' +
        '<option value="">כל הספקים</option>' + supOpts +
      '</select>' +
      '<select id="pp-f-status" onchange="applyPrepaidFilters()" class="doc-filter-input">' +
        '<option value="">כל הסטטוסים</option>' +
        '<option value="active">פעיל</option>' +
        '<option value="completed">הושלם</option>' +
        '<option value="cancelled">מבוטל</option>' +
      '</select>' +
      '<button class="btn doc-add-btn" style="background:#059669;color:#fff" onclick="openNewDealModal()">+ עסקה חדשה</button>' +
    '</div>' +
    '<div id="pp-table-wrap"></div>';
}

// =========================================================
// Filtering
// =========================================================
function applyPrepaidFilters() {
  var fSup = ($('pp-f-supplier') || {}).value || '';
  var fStatus = ($('pp-f-status') || {}).value || '';
  var filtered = _prepaidDeals.filter(function(d) {
    if (fSup && d.supplier_id !== fSup) return false;
    if (fStatus && d.status !== fStatus) return false;
    return true;
  });
  filtered.sort(function(a, b) {
    return (b.start_date || '').localeCompare(a.start_date || '');
  });
  renderPrepaidTable(filtered);
}

// =========================================================
// Table
// =========================================================
function renderPrepaidTable(deals) {
  var wrap = $('pp-table-wrap');
  if (!wrap) return;
  if (!deals.length) {
    wrap.innerHTML = '<div class="empty-state">אין עסקאות מראש להצגה</div>';
    return;
  }
  var supMap = {};
  _prepaidSuppliers.forEach(function(s) { supMap[s.id] = s.name; });

  var rows = deals.map(function(d) {
    var st = DEAL_STATUS_MAP[d.status] || { he: d.status, cls: '' };
    var total = Number(d.total_prepaid) || 0;
    var used = Number(d.total_used) || 0;
    var remaining = total - used;
    var pct = total > 0 ? Math.round((used / total) * 100) : 0;
    var threshold = Number(d.alert_threshold_pct) || 20;
    var remainPct = total > 0 ? ((remaining / total) * 100) : 100;
    var barColor = remainPct <= threshold ? 'var(--error)' : '#1a73e8';
    var period = (d.start_date || '') + ' \u2190 ' + (d.end_date || '');

    return '<tr>' +
      '<td>' + escapeHtml(supMap[d.supplier_id] || '') + '</td>' +
      '<td>' + escapeHtml(d.deal_name || '') + '</td>' +
      '<td style="font-size:.82rem">' + escapeHtml(period) + '</td>' +
      '<td>' + formatILS(total) + '</td>' +
      '<td>' + formatILS(used) + '</td>' +
      '<td>' + formatILS(remaining) + '</td>' +
      '<td style="min-width:120px">' +
        '<div style="background:var(--g200);border-radius:4px;height:18px;position:relative;overflow:hidden">' +
          '<div style="background:' + barColor + ';height:100%;width:' + Math.min(pct, 100) + '%;border-radius:4px"></div>' +
          '<span style="position:absolute;top:0;left:0;right:0;text-align:center;font-size:.72rem;line-height:18px;color:var(--g700)">' +
            pct + '%</span>' +
        '</div>' +
        '<span class="doc-badge ' + st.cls + '" style="margin-top:4px;display:inline-block">' +
          escapeHtml(st.he) + '</span>' +
      '</td>' +
      '<td>' +
        '<button class="btn-sm" onclick="viewDealDetail(\'' + d.id + '\')">צפה</button> ' +
        '<button class="btn-sm" onclick="openAddCheckModal(\'' + d.id + '\')">הוסף צ\u05F3ק</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<div style="overflow-x:auto">' +
    '<table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr>' +
        '<th>ספק</th><th>שם עסקה</th><th>תקופה</th><th>סה"כ מראש</th>' +
        '<th>נוצל</th><th>יתרה</th><th>סטטוס</th><th>פעולות</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>';
}

// =========================================================
// New deal modal
// =========================================================
function openNewDealModal() {
  var supOpts = _prepaidSuppliers.map(function(s) {
    return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  }).join('');
  var today = new Date().toISOString().slice(0, 10);
  var yearEnd = new Date().getFullYear() + '-12-31';

  var modal = document.createElement('div');
  modal.id = 'new-deal-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:480px">' +
      '<h3 style="margin:0 0 14px">עסקה מראש חדשה</h3>' +
      '<div id="deal-alert"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<label style="grid-column:1/-1">ספק<select id="deal-supplier" class="nd-field" onchange="_dealAutoName()">' +
          '<option value="">בחר ספק...</option>' + supOpts +
        '</select></label>' +
        '<label style="grid-column:1/-1">שם עסקה<input id="deal-name" class="nd-field" placeholder="ייווצר אוטומטית אם ריק"></label>' +
        '<label>תאריך התחלה<input type="date" id="deal-start" class="nd-field" value="' + today + '"></label>' +
        '<label>תאריך סיום<input type="date" id="deal-end" class="nd-field" value="' + yearEnd + '"></label>' +
        '<label>סכום כולל<input type="number" id="deal-total" step="0.01" min="0" class="nd-field"></label>' +
        '<label>מטבע<input id="deal-currency" class="nd-field" value="ILS" readonly style="background:var(--g100)"></label>' +
        '<label>סף התראה %<input type="number" id="deal-threshold" step="1" min="1" max="100" class="nd-field" value="20"></label>' +
        '<label style="grid-column:1/-1">הערות<textarea id="deal-notes" rows="2" class="nd-field"></textarea></label>' +
      '</div>' +
      '<label style="display:block;margin-top:10px">קוד עובד (PIN)' +
        '<input type="password" id="deal-pin" maxlength="10" class="nd-field" inputmode="numeric">' +
      '</label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'new-deal-modal\')">ביטול</button>' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="saveNewDeal()">שמור</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

function _dealAutoName() {
  var supId = ($('deal-supplier') || {}).value;
  var nameField = $('deal-name');
  if (!supId || !nameField) return;
  if (nameField.value.trim()) return; // don't overwrite manual entry
  var sup = _prepaidSuppliers.find(function(s) { return s.id === supId; });
  if (sup) nameField.value = '\u05E2\u05E1\u05E7\u05EA ' + sup.name + ' ' + new Date().getFullYear();
}

async function saveNewDeal() {
  var supplierId = ($('deal-supplier') || {}).value;
  var dealName   = (($('deal-name') || {}).value || '').trim();
  var startDate  = ($('deal-start') || {}).value;
  var endDate    = ($('deal-end') || {}).value;
  var totalAmt   = Number(($('deal-total') || {}).value) || 0;
  var threshold  = Number(($('deal-threshold') || {}).value) || 20;
  var notes      = (($('deal-notes') || {}).value || '').trim();
  var pin        = (($('deal-pin') || {}).value || '').trim();

  if (!supplierId)  { setAlert('deal-alert', 'יש לבחור ספק', 'e'); return; }
  if (!startDate)   { setAlert('deal-alert', 'יש להזין תאריך התחלה', 'e'); return; }
  if (!endDate)     { setAlert('deal-alert', 'יש להזין תאריך סיום', 'e'); return; }
  if (totalAmt <= 0){ setAlert('deal-alert', 'סכום חייב להיות חיובי', 'e'); return; }
  if (!pin)         { setAlert('deal-alert', 'יש להזין קוד עובד', 'e'); return; }

  var emp = await verifyPinOnly(pin);
  if (!emp) { setAlert('deal-alert', 'קוד עובד שגוי', 'e'); return; }

  // Auto-generate name if empty
  if (!dealName) {
    var sup = _prepaidSuppliers.find(function(s) { return s.id === supplierId; });
    dealName = '\u05E2\u05E1\u05E7\u05EA ' + (sup ? sup.name : '') + ' ' + new Date().getFullYear();
  }

  showLoading('שומר עסקה...');
  try {
    await batchCreate(T.PREPAID_DEALS, [{
      tenant_id: getTenantId(),
      supplier_id: supplierId,
      deal_name: dealName,
      start_date: startDate,
      end_date: endDate,
      total_prepaid: totalAmt,
      currency: 'ILS',
      total_used: 0,
      total_remaining: totalAmt,
      alert_threshold_pct: threshold,
      status: 'active',
      notes: notes || null,
      created_by: emp.id
    }]);

    await writeLog('prepaid_deal_create', null, {
      reason: 'עסקה מראש חדשה — ' + dealName,
      amount: totalAmt
    });

    closeAndRemoveModal('new-deal-modal');
    toast('עסקה מראש נשמרה בהצלחה');
    await loadPrepaidTab();
  } catch (e) {
    console.error('saveNewDeal error:', e);
    setAlert('deal-alert', 'שגיאה: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}

