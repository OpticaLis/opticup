// =========================================================
// debt-supplier-tabs.js — Supplier detail sub-tab renderers (split from debt-supplier-detail.js)
// Load after: debt-supplier-detail.js
// Provides: loadSupplierTimeline(), loadSupplierDocuments(), _sdNewDoc(),
//   loadSupplierPayments(), loadSupplierReturns()
// Uses globals: _detailSupplierId, _detailSupplierName (from debt-supplier-detail.js)
// =========================================================

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

    content.innerHTML = _renderTimelineHtml(visible);
    if (limited) {
      content.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:12px"><button class="btn-sm" onclick="_showAllTimeline()">\u05D4\u05E6\u05D2 \u05E2\u05D5\u05D3 (' + (entries.length - 50) + ')</button></div>');
      content._allEntries = entries;
    }
  } catch (e) {
    console.error('loadSupplierTimeline error:', e);
    content.innerHTML = '<div class="empty-state">\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4</div>';
  }
}
function _renderTimelineHtml(entries) {
  var h = '<div style="padding:4px 0">';
  entries.forEach(function(e) {
    h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--g200);font-size:.88rem">' +
      '<span style="font-size:1.1rem">' + e.icon + '</span><span style="color:var(--g500);min-width:80px">' + escapeHtml(e.date || '') + '</span>' +
      '<span style="flex:1">' + escapeHtml(e.label) + '</span><span style="font-weight:600">' + e.amount + '</span></div>';
  }); return h + '</div>';
}
function _showAllTimeline() {
  var c = $('detail-tab-content'); if (!c || !c._allEntries) return;
  c.innerHTML = _renderTimelineHtml(c._allEntries);
}

// =========================================================
// Documents sub-tab — full management with filters
// =========================================================
var _sdAllDocs = []; // all docs for this supplier (unfiltered)

async function loadSupplierDocuments(supplierId) {
  var content = $('detail-tab-content');
  if (!content) return;
  try {
    if (!_docTypes.length || !_docSuppliers.length) {
      var [types, sups] = await Promise.all([
        fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]]),
        fetchAll(T.SUPPLIERS, [['active', 'eq', true]])
      ]);
      _docTypes = types;
      _docSuppliers = sups;
    }
    var [docs, deals] = await Promise.all([
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]]),
      fetchAll(T.PREPAID_DEALS, [['status', 'eq', 'active'], ['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]])
    ]);
    _docData = docs;
    _sdAllDocs = docs;
    _docPrepaidSet = {};
    deals.forEach(function(d) { _docPrepaidSet[d.supplier_id] = d; });
    _loadDocFileCounts(docs);
    docs.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

    var typeOpts = '<option value="">\u05D4\u05DB\u05DC</option>';
    (_docTypes || []).forEach(function(t) { typeOpts += '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name_he) + '</option>'; });

    content.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px">' +
        '<button class="btn btn-sm" style="background:var(--primary);color:#fff" ' +
          'onclick="_sdNewDoc(\'' + supplierId + '\')">+ \u05DE\u05E1\u05DE\u05DA \u05D7\u05D3\u05E9</button>' +
        '<span id="sd-filter-count" style="font-size:.82rem;color:var(--g500)"></span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-bottom:10px;background:var(--white);border:1px solid var(--g200);border-radius:6px;padding:8px">' +
        '<div><label style="font-size:.75rem;color:var(--g600)">\u05E1\u05D8\u05D8\u05D5\u05E1</label>' +
          '<select id="sdf-status" class="doc-filter-input" style="width:100%" onchange="_sdApplyFilters()">' +
            '<option value="">\u05D4\u05DB\u05DC</option><option value="draft">\u05D8\u05D9\u05D5\u05D8\u05D4</option>' +
            '<option value="open">\u05E4\u05EA\u05D5\u05D7</option><option value="partially_paid">\u05D7\u05DC\u05E7\u05D9</option>' +
            '<option value="paid">\u05E9\u05D5\u05DC\u05DD</option><option value="cancelled">\u05DE\u05D1\u05D5\u05D8\u05DC</option>' +
          '</select></div>' +
        '<div><label style="font-size:.75rem;color:var(--g600)">\u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA</label>' +
          '<select id="sdf-type" class="doc-filter-input" style="width:100%" onchange="_sdApplyFilters()">' + typeOpts + '</select></div>' +
        buildMonthPickerHtml('sdf', '_sdApplyFilters') +
        '<div><label style="font-size:.75rem;color:var(--g600)">\u05E1\u05DB\u05D5\u05DD \u05DE:</label>' +
          '<input type="number" id="sdf-amount-from" class="doc-filter-input" style="width:100%" step="0.01" min="0" onchange="_sdApplyFilters()"></div>' +
        '<div><label style="font-size:.75rem;color:var(--g600)">\u05E1\u05DB\u05D5\u05DD \u05E2\u05D3:</label>' +
          '<input type="number" id="sdf-amount-to" class="doc-filter-input" style="width:100%" step="0.01" min="0" onchange="_sdApplyFilters()"></div>' +
      '</div>' +
      '<div id="sd-doc-table"></div>';

    _sdUpdateCount(docs.length, docs.length);
    renderDocumentsTable(docs, { targetEl: $('sd-doc-table'), hideSupplierCol: true });
  } catch (e) {
    console.error('loadSupplierDocuments error:', e);
    content.innerHTML = '<div class="empty-state">\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD</div>';
  }
}

function _sdApplyFilters() {
  var f = {
    status: ($('sdf-status') || {}).value || '',
    document_type_id: ($('sdf-type') || {}).value || '',
    date_from: ($('sdf-date-from') || {}).value || '',
    date_to: ($('sdf-date-to') || {}).value || '',
    amount_from: ($('sdf-amount-from') || {}).value || '',
    amount_to: ($('sdf-amount-to') || {}).value || ''
  };
  var filtered = applyDocFilterSet(_sdAllDocs, f);
  filtered.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
  _sdUpdateCount(filtered.length, _sdAllDocs.length);
  _docData = filtered;
  renderDocumentsTable(filtered, { targetEl: $('sd-doc-table'), hideSupplierCol: true });
}

function _sdUpdateCount(shown, total) {
  var el = $('sd-filter-count'); if (!el) return;
  el.textContent = shown === total
    ? '\u05DE\u05E6\u05D9\u05D2 ' + total + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD'
    : '\u05DE\u05E6\u05D9\u05D2 ' + shown + ' \u05DE\u05EA\u05D5\u05DA ' + total + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD';
  if (shown < total) { el.style.fontWeight = '600'; el.style.color = 'var(--primary)'; }
  else { el.style.fontWeight = ''; el.style.color = 'var(--g500)'; }
}

// Open new document modal pre-filled with supplier
function _sdNewDoc(supplierId) {
  if (typeof openNewDocumentModal !== 'function') return;
  openNewDocumentModal();
  // Pre-select the supplier after modal renders
  setTimeout(function() {
    var sel = $('nd-supplier');
    if (sel) { sel.value = supplierId; if (typeof _ndAutoCalcDueDate === 'function') _ndAutoCalcDueDate(); }
  }, 100);
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
      return '<tr><td>' + escapeHtml(p.payment_date || '') + '</td><td>' + formatILS(p.amount) + '</td><td>' + formatILS(net) + '</td>' +
        '<td>' + escapeHtml(methMap[p.payment_method] || p.payment_method || '') + '</td><td>' + escapeHtml(p.reference_number || '\u2014') + '</td>' +
        '<td><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td></tr>';
    }).join('');
    content.innerHTML = '<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th>\u05E1\u05DB\u05D5\u05DD</th><th>\u05E0\u05D8\u05D5</th><th>\u05D0\u05DE\u05E6\u05E2\u05D9</th><th>\u05D0\u05E1\u05DE\u05DB\u05EA\u05D0</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
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
    if (content) content.innerHTML = '<div class="empty-state">\u05D0\u05D9\u05DF \u05D4\u05D7\u05D6\u05E8\u05D5\u05EA</div>';
  }
}
