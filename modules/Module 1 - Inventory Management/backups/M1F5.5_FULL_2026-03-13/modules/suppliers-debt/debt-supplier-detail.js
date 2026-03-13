// =========================================================
// debt-supplier-detail.js — Supplier Detail View (Phase 4g)
// Load after: shared.js, supabase-ops.js, debt-dashboard.js,
//   debt-documents.js, debt-payments.js, debt-returns.js
// Provides: openSupplierDetail(), closeSupplierDetail(),
//   loadSupplierTimeline(), loadSupplierDocuments(),
//   loadSupplierPayments(), loadSupplierReturns(),
//   _switchDetailTab()
// =========================================================

var _detailSupplierId = null;
var _detailSupplierName = '';
var _detailActiveTab = 'timeline';

// =========================================================
// Open / Close
// =========================================================
async function openSupplierDetail(supplierId) {
  _detailSupplierId = supplierId;
  _detailActiveTab = 'timeline';

  // Hide main content, show detail panel
  var mainContent = $('debt-main-content');
  var detailPanel = $('supplier-detail-panel');
  if (mainContent) mainContent.style.display = 'none';
  if (detailPanel) detailPanel.style.display = 'block';

  showLoading('טוען כרטיס ספק...');
  try {
    var results = await Promise.all([
      fetchAll(T.SUPPLIERS, [['id', 'eq', supplierId]]),
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]]),
      fetchAll(T.PREPAID_DEALS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId], ['status', 'eq', 'active']])
    ]);

    var supplier = results[0][0];
    var docs = results[1];
    var deals = results[2];
    _detailSupplierName = supplier ? supplier.name : '';

    // Calculate summary
    var todayStr = new Date().toISOString().slice(0, 10);
    var totalDebt = 0, overdueAmt = 0;
    docs.forEach(function(d) {
      if (d.status === 'paid' || d.status === 'cancelled') return;
      var rate = Number(d.exchange_rate) || 1;
      var remaining = (Number(d.total_amount) - Number(d.paid_amount)) * rate;
      if (remaining <= 0) return;
      totalDebt += remaining;
      if (d.due_date && d.due_date < todayStr) overdueAmt += remaining;
    });

    var deal = deals[0];
    var dealTotal = deal ? (Number(deal.total_prepaid) || 0) : 0;
    var dealRemaining = deal ? dealTotal - (Number(deal.total_used) || 0) : 0;

    // Render header
    var overdueStyle = overdueAmt > 0 ? 'color:var(--error);font-weight:600' : '';
    var dealLine = deal
      ? 'עסקה מראש: ' + formatILS(dealTotal) + ' (נותר: ' + formatILS(dealRemaining) + ')'
      : 'עסקה מראש: \u2014';

    detailPanel.innerHTML =
      '<div style="margin-bottom:16px">' +
        '<a href="#" onclick="event.preventDefault();closeSupplierDetail()" ' +
          'class="back-link" style="font-size:.9rem">\u2192 חזרה לרשימה</a>' +
        '<h2 style="margin:8px 0 0;font-size:1.15rem;color:var(--primary)">' +
          'כרטיס ספק: ' + escapeHtml(_detailSupplierName) + '</h2>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:16px;font-size:.92rem;margin-bottom:16px">' +
        '<div>חוב כולל: <strong>' + formatILS(totalDebt) + '</strong></div>' +
        '<div style="' + overdueStyle + '">באיחור: <strong>' + formatILS(overdueAmt) + '</strong></div>' +
        '<div>' + dealLine + '</div>' +
      '</div>' +
      '<div class="debt-tabs" id="detail-tabs">' +
        '<button class="debt-tab-btn" data-dtab="timeline" onclick="_switchDetailTab(\'timeline\')">היסטוריה</button>' +
        '<button class="debt-tab-btn" data-dtab="docs" onclick="_switchDetailTab(\'docs\')">מסמכים</button>' +
        '<button class="debt-tab-btn" data-dtab="payments" onclick="_switchDetailTab(\'payments\')">תשלומים</button>' +
        '<button class="debt-tab-btn" data-dtab="returns" onclick="_switchDetailTab(\'returns\')">החזרות</button>' +
      '</div>' +
      '<div id="detail-tab-content"></div>';

    // Default tab
    _switchDetailTab('timeline');
  } catch (e) {
    console.error('openSupplierDetail error:', e);
    toast('שגיאה בטעינת כרטיס ספק', 'e');
  } finally {
    hideLoading();
  }
}

function closeSupplierDetail() {
  _detailSupplierId = null;
  var mainContent = $('debt-main-content');
  var detailPanel = $('supplier-detail-panel');
  if (mainContent) mainContent.style.display = '';
  if (detailPanel) {
    detailPanel.style.display = 'none';
    detailPanel.innerHTML = '';
  }
}

function _switchDetailTab(tabName) {
  _detailActiveTab = tabName;
  document.querySelectorAll('#detail-tabs .debt-tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-dtab') === tabName);
  });
  var content = $('detail-tab-content');
  if (!content) return;
  content.innerHTML = '<div class="empty-state">טוען...</div>';

  if (tabName === 'timeline') loadSupplierTimeline(_detailSupplierId);
  else if (tabName === 'docs') loadSupplierDocuments(_detailSupplierId);
  else if (tabName === 'payments') loadSupplierPayments(_detailSupplierId);
  else if (tabName === 'returns') loadSupplierReturns(_detailSupplierId);
}

// =========================================================
// Timeline sub-tab
// =========================================================
async function loadSupplierTimeline(supplierId) {
  var content = $('detail-tab-content');
  if (!content) return;
  try {
    var results = await Promise.all([
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]]),
      fetchAll(T.SUP_PAYMENTS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]]),
      fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]])
    ]);
    var docs = results[0];
    var payments = results[1];
    var typeMap = {};
    results[2].forEach(function(t) { typeMap[t.id] = t; });

    // Merge into timeline entries
    var entries = [];
    docs.forEach(function(d) {
      var type = typeMap[d.document_type_id] || {};
      entries.push({
        date: d.document_date || d.created_at,
        icon: '\uD83D\uDCC4',
        label: (type.name_he || 'מסמך') + ' #' + (d.document_number || d.internal_number || ''),
        amount: formatILS(d.total_amount),
        sortDate: d.document_date || (d.created_at || '').slice(0, 10)
      });
    });
    payments.forEach(function(p) {
      entries.push({
        date: p.payment_date,
        icon: '\uD83D\uDCB0',
        label: 'תשלום' + (p.reference_number ? ' — ' + p.reference_number : ''),
        amount: formatILS(p.amount),
        sortDate: p.payment_date || (p.created_at || '').slice(0, 10)
      });
    });

    // Sort newest first
    entries.sort(function(a, b) {
      return (b.sortDate || '').localeCompare(a.sortDate || '');
    });

    if (!entries.length) {
      content.innerHTML = '<div class="empty-state">אין פעילות לספק זה</div>';
      return;
    }

    // Limit to 50 with "show more"
    var limited = entries.length > 50;
    var visible = limited ? entries.slice(0, 50) : entries;

    var html = '<div style="padding:4px 0">';
    visible.forEach(function(e) {
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;' +
        'border-bottom:1px solid var(--g200);font-size:.88rem">' +
        '<span style="font-size:1.1rem">' + e.icon + '</span>' +
        '<span style="color:var(--g500);min-width:80px">' + escapeHtml(e.date || '') + '</span>' +
        '<span style="flex:1">' + escapeHtml(e.label) + '</span>' +
        '<span style="font-weight:600">' + e.amount + '</span>' +
      '</div>';
    });
    html += '</div>';

    if (limited) {
      html += '<div style="text-align:center;padding:12px">' +
        '<button class="btn-sm" onclick="_showAllTimeline()">הצג עוד (' +
        (entries.length - 50) + ')</button></div>';
    }

    content.innerHTML = html;

    // Store full entries for "show more"
    if (limited) content._allEntries = entries;
  } catch (e) {
    console.error('loadSupplierTimeline error:', e);
    content.innerHTML = '<div class="empty-state">שגיאה בטעינת היסטוריה</div>';
  }
}

function _showAllTimeline() {
  var content = $('detail-tab-content');
  if (!content || !content._allEntries) return;
  var entries = content._allEntries;
  var html = '<div style="padding:4px 0">';
  entries.forEach(function(e) {
    html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;' +
      'border-bottom:1px solid var(--g200);font-size:.88rem">' +
      '<span style="font-size:1.1rem">' + e.icon + '</span>' +
      '<span style="color:var(--g500);min-width:80px">' + escapeHtml(e.date || '') + '</span>' +
      '<span style="flex:1">' + escapeHtml(e.label) + '</span>' +
      '<span style="font-weight:600">' + e.amount + '</span>' +
    '</div>';
  });
  html += '</div>';
  content.innerHTML = html;
}

// =========================================================
// Documents sub-tab (filtered to this supplier)
// =========================================================
async function loadSupplierDocuments(supplierId) {
  var content = $('detail-tab-content');
  if (!content) return;
  try {
    var results = await Promise.all([
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]]),
      fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]])
    ]);
    var docs = results[0];
    var typeMap = {};
    results[1].forEach(function(t) { typeMap[t.id] = t; });

    docs.sort(function(a, b) { return (b.document_date || '').localeCompare(a.document_date || ''); });

    if (!docs.length) {
      content.innerHTML = '<div class="empty-state">אין מסמכים לספק זה</div>';
      return;
    }

    var rows = docs.map(function(d) {
      var type = typeMap[d.document_type_id] || {};
      var balance = (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0);
      var st = DOC_STATUS_MAP[d.status] || { he: d.status, cls: '' };
      return '<tr>' +
        '<td>' + escapeHtml(d.document_date || '') + '</td>' +
        '<td>' + escapeHtml(type.name_he || '') + '</td>' +
        '<td>' + escapeHtml(d.document_number || '') + '</td>' +
        '<td>' + formatILS(d.total_amount) + '</td>' +
        '<td>' + formatILS(d.paid_amount) + '</td>' +
        '<td>' + formatILS(balance) + '</td>' +
        '<td><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '</tr>';
    }).join('');

    content.innerHTML =
      '<div style="overflow-x:auto">' +
      '<table class="data-table" style="width:100%;font-size:.88rem">' +
        '<thead><tr>' +
          '<th>תאריך</th><th>סוג</th><th>מספר</th><th>סכום</th>' +
          '<th>שולם</th><th>יתרה</th><th>סטטוס</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>';
  } catch (e) {
    console.error('loadSupplierDocuments error:', e);
    content.innerHTML = '<div class="empty-state">שגיאה בטעינת מסמכים</div>';
  }
}

// =========================================================
// Payments sub-tab (filtered to this supplier)
// =========================================================
async function loadSupplierPayments(supplierId) {
  var content = $('detail-tab-content');
  if (!content) return;
  try {
    var results = await Promise.all([
      fetchAll(T.SUP_PAYMENTS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]]),
      fetchAll(T.PAY_METHODS, [['is_active', 'eq', true]])
    ]);
    var payments = results[0];
    var methMap = {};
    results[1].forEach(function(m) { methMap[m.code] = m.name_he; });

    payments.sort(function(a, b) { return (b.payment_date || '').localeCompare(a.payment_date || ''); });

    if (!payments.length) {
      content.innerHTML = '<div class="empty-state">אין תשלומים לספק זה</div>';
      return;
    }

    var rows = payments.map(function(p) {
      var net = Number(p.net_amount) || (Number(p.amount) - (Number(p.withholding_tax_amount) || 0));
      var st = PAY_STATUS_MAP[p.status] || { he: p.status, cls: '' };
      return '<tr>' +
        '<td>' + escapeHtml(p.payment_date || '') + '</td>' +
        '<td>' + formatILS(p.amount) + '</td>' +
        '<td>' + formatILS(net) + '</td>' +
        '<td>' + escapeHtml(methMap[p.payment_method] || p.payment_method || '') + '</td>' +
        '<td>' + escapeHtml(p.reference_number || '\u2014') + '</td>' +
        '<td><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '</tr>';
    }).join('');

    content.innerHTML =
      '<div style="overflow-x:auto">' +
      '<table class="data-table" style="width:100%;font-size:.88rem">' +
        '<thead><tr>' +
          '<th>תאריך</th><th>סכום</th><th>נטו</th><th>אמצעי</th>' +
          '<th>אסמכתא</th><th>סטטוס</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>';
  } catch (e) {
    console.error('loadSupplierPayments error:', e);
    content.innerHTML = '<div class="empty-state">שגיאה בטעינת תשלומים</div>';
  }
}

// =========================================================
// Returns sub-tab (delegates to debt-returns.js)
// =========================================================
function loadSupplierReturns(supplierId) {
  if (typeof loadReturnsForSupplier === 'function') {
    loadReturnsForSupplier(supplierId);
  } else {
    var content = $('detail-tab-content');
    if (content) content.innerHTML = '<div class="empty-state">אין החזרות</div>';
  }
}
