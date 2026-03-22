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

    // Calculate summary (Phase 8: respects opening_balance + cutoff date)
    var todayStr = new Date().toISOString().slice(0, 10);
    var cutoff = supplier ? supplier.opening_balance_date : null;
    var totalDebt = supplier ? (Number(supplier.opening_balance) || 0) : 0;
    var overdueAmt = 0;
    docs.forEach(function(d) {
      if (d.status === 'paid' || d.status === 'cancelled') return;
      if (cutoff && d.document_date && d.document_date < cutoff) return;
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

    // Opening balance section
    var ob = supplier ? (Number(supplier.opening_balance) || 0) : 0;
    var obDate = supplier ? (supplier.opening_balance_date || '') : '';
    var obNotes = supplier ? (supplier.opening_balance_notes || '') : '';
    var obBtnLabel = ob > 0 || obDate ? '\u270F\uFE0F \u05E2\u05D3\u05DB\u05DF' : '\u05D4\u05D2\u05D3\u05E8';
    var obLine = ob > 0 || obDate
      ? '<strong>' + formatILS(ob) + '</strong>' + (obDate ? ' \u05E0\u05DB\u05D5\u05DF \u05DC-' + escapeHtml(obDate) : '') + (obNotes ? '<br><span style="color:var(--g500);font-size:.82rem">"' + escapeHtml(obNotes) + '"</span>' : '')
      : '<span style="color:var(--g400)">\u05DC\u05D0 \u05D4\u05D5\u05D2\u05D3\u05E8\u05D4</span>';
    var obSection = '<div style="background:var(--g100);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:.88rem">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><strong>\u05D9\u05EA\u05E8\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4</strong>' +
      '<button class="btn-sm" onclick="openSetOpeningBalance(\'' + supplierId + '\')">' + obBtnLabel + '</button></div>' +
      '<div style="margin-top:4px">' + obLine + '</div></div>';

    // Payment terms section
    var ptDays = supplier ? (supplier.payment_terms_days != null ? supplier.payment_terms_days : '') : '';
    var ptLabel = ptDays !== '' ? '\u05E9\u05D5\u05D8\u05E3 + ' + ptDays + ' \u05D9\u05D5\u05DD' : '\u05DC\u05D0 \u05D4\u05D5\u05D2\u05D3\u05E8 (\u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC: 30)';
    var ptSection = '<div style="background:var(--g100);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:.88rem">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<strong>\u05EA\u05E0\u05D0\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD</strong>' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span>\u05E9\u05D5\u05D8\u05E3 +</span>' +
          '<input type="number" id="sd-payment-terms" min="0" max="365" value="' + (ptDays !== '' ? ptDays : '') + '" ' +
            'placeholder="30" style="width:60px;padding:4px 6px;border:1px solid var(--g300);border-radius:4px;text-align:center" ' +
            'onchange="_savePaymentTerms(\'' + supplierId + '\')">' +
          '<span>\u05D9\u05D5\u05DD</span></div></div>' +
      '<div style="margin-top:4px;color:var(--g500);font-size:.82rem">' + ptLabel + '</div></div>';

    detailPanel.innerHTML =
      '<div style="margin-bottom:16px">' +
        '<a href="#" onclick="event.preventDefault();closeSupplierDetail()" ' +
          'class="back-link" style="font-size:.9rem">\u2192 חזרה לרשימה</a>' +
        '<h2 style="margin:8px 0 0;font-size:1.15rem;color:var(--primary)">' +
          'כרטיס ספק: ' + escapeHtml(_detailSupplierName) + '</h2>' +
      '</div>' +
      obSection + ptSection +
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
// Documents sub-tab — full management, reuses renderDocumentsTable
// =========================================================
async function loadSupplierDocuments(supplierId) {
  var content = $('detail-tab-content');
  if (!content) return;
  try {
    // Ensure _docTypes and _docSuppliers are loaded (may already be from main tab)
    if (!_docTypes.length || !_docSuppliers.length) {
      var [types, sups] = await Promise.all([
        fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]]),
        fetchAll(T.SUPPLIERS, [['active', 'eq', true]])
      ]);
      _docTypes = types;
      _docSuppliers = sups;
    }
    // Fetch docs for this supplier + prepaid deals
    var [docs, deals] = await Promise.all([
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]]),
      fetchAll(T.PREPAID_DEALS, [['status', 'eq', 'active'], ['is_deleted', 'eq', false], ['supplier_id', 'eq', supplierId]])
    ]);
    // Update globals so action buttons (cancelDocument etc.) find the docs
    _docData = docs;
    _docPrepaidSet = {};
    deals.forEach(function(d) { _docPrepaidSet[d.supplier_id] = d; });
    _loadDocFileCounts(docs);

    docs.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

    // Toolbar: new doc + status filters
    content.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px">' +
        '<button class="btn btn-sm" style="background:var(--primary);color:#fff" ' +
          'onclick="_sdNewDoc(\'' + supplierId + '\')">+ \u05DE\u05E1\u05DE\u05DA \u05D7\u05D3\u05E9</button>' +
      '</div>' +
      '<div id="sd-doc-table"></div>';

    // Render full table into the sub-tab container
    renderDocumentsTable(docs, {
      targetEl: $('sd-doc-table'),
      hideSupplierCol: true
    });
  } catch (e) {
    console.error('loadSupplierDocuments error:', e);
    content.innerHTML = '<div class="empty-state">\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD</div>';
  }
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

// --- Phase 8: Opening balance modal ---
function openSetOpeningBalance(supplierId) {
  var sup = null;
  _docSuppliers.forEach(function(s) { if (s.id === supplierId) sup = s; });
  var name = sup ? sup.name : _detailSupplierName;
  var curBal = sup ? (Number(sup.opening_balance) || 0) : 0;
  var curDate = sup ? (sup.opening_balance_date || '') : '';
  var curNotes = sup ? (sup.opening_balance_notes || '') : '';
  var m = document.createElement('div'); m.id = 'ob-modal'; m.className = 'modal-overlay'; m.style.display = 'flex';
  m.onclick = function(e) { if (e.target === m) m.remove(); };
  m.innerHTML = '<div class="modal" style="max-width:420px"><h3 style="margin:0 0 12px">\u05D9\u05EA\u05E8\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4 \u2014 ' + escapeHtml(name) + '</h3>' +
    '<div id="ob-alert"></div>' +
    '<label>\u05E1\u05DB\u05D5\u05DD (\u20AA)<input type="number" id="ob-amount" class="nd-field" step="0.01" min="0" value="' + curBal + '"></label>' +
    '<label>\u05EA\u05D0\u05E8\u05D9\u05DA cutoff<input type="date" id="ob-date" class="nd-field" value="' + escapeHtml(curDate) + '"></label>' +
    '<div style="font-size:.78rem;color:var(--g500);margin:-6px 0 8px">\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05D5\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DC\u05E4\u05E0\u05D9 \u05EA\u05D0\u05E8\u05D9\u05DA \u05D6\u05D4 \u05DC\u05D0 \u05D9\u05D9\u05E1\u05E4\u05E8\u05D5. \u05E8\u05E7 \u05DE\u05D4 \u05E9\u05D0\u05D7\u05E8\u05D9.</div>' +
    '<label>\u05D4\u05E2\u05E8\u05D5\u05EA<textarea id="ob-notes" rows="2" class="nd-field">' + escapeHtml(curNotes) + '</textarea></label>' +
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
    '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'ob-modal\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
    '<button class="btn" style="background:#059669;color:#fff" onclick="_saveOpeningBalance(\'' + supplierId + '\')">\u05E9\u05DE\u05D5\u05E8</button></div></div>';
  document.body.appendChild(m);
}

function _saveOpeningBalance(supplierId) {
  var amt = Number(($('ob-amount') || {}).value) || 0;
  var dt = ($('ob-date') || {}).value || null;
  var notes = (($('ob-notes') || {}).value || '').trim();
  if (amt < 0) { setAlert('ob-alert', '\u05E1\u05DB\u05D5\u05DD \u05DC\u05D0 \u05D9\u05DB\u05D5\u05DC \u05DC\u05D4\u05D9\u05D5\u05EA \u05E9\u05DC\u05D9\u05DC\u05D9', 'e'); return; }
  promptPin('\u05D9\u05EA\u05E8\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4 \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
    showLoading('\u05E9\u05D5\u05DE\u05E8...'); try {
      var prev = 0; var sups = await fetchAll(T.SUPPLIERS, [['id', 'eq', supplierId]]);
      if (sups[0]) prev = Number(sups[0].opening_balance) || 0;
      await batchUpdate(T.SUPPLIERS, [{ id: supplierId, opening_balance: amt, opening_balance_date: dt,
        opening_balance_notes: notes || null, opening_balance_set_by: emp.id }]);
      await writeLog('opening_balance_set', null, { supplier_id: supplierId, amount: amt, date: dt, notes: notes, previous_balance: prev, set_by: emp.id });
      closeAndRemoveModal('ob-modal');
      toast('\u05D9\u05EA\u05E8\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4 \u2014 ' + formatILS(amt), 's');
      await openSupplierDetail(supplierId);
      if (typeof loadDebtSummary === 'function') loadDebtSummary();
      if (typeof loadSuppliersTab === 'function') loadSuppliersTab();
    } catch (e) { console.error('_saveOpeningBalance error:', e); toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
    } finally { hideLoading(); }
  });
}

// BUG-15: save payment_terms_days inline
async function _savePaymentTerms(supplierId) {
  var inp = $('sd-payment-terms');
  var val = inp ? (inp.value !== '' ? Number(inp.value) : null) : null;
  try {
    await batchUpdate(T.SUPPLIERS, [{ id: supplierId, payment_terms_days: val }]);
    toast('\u05EA\u05E0\u05D0\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5');
  } catch (e) { toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e'); }
}
