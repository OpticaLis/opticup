// debt-documents.js — Documents tab (Phase 4d+5.5e+8)
let _docData = [], _docTypes = [], _docSuppliers = [];
var _docPrepaidSet = {}; // Phase 8: supplier_id → deal object for active prepaid deals
var _docSortField = 'created_at'; // default: sort by upload date (newest first)
var _docStatusFilters = null; // { open: true, paid: false, cancelled: false } — loaded from sessionStorage
// Payable doc types — only these get "שלם" button and appear in payment allocation
var _PAYABLE_DOC_CODES = { invoice: true, tax_invoice: true, credit_note: true, debit_note: true };
function _isPayableDocType(code) { return !!_PAYABLE_DOC_CODES[code]; }

const DOC_STATUS_MAP = {
  draft:           { he: '\u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC', cls: 'dst-draft' },
  pending_invoice: { he: '\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC', cls: 'dst-draft' },
  open:            { he: '\u05E4\u05EA\u05D5\u05D7',        cls: 'dst-open' },
  partially_paid:  { he: '\u05E9\u05D5\u05DC\u05DD \u05D7\u05DC\u05E7\u05D9\u05EA',  cls: 'dst-partial' },
  paid:            { he: '\u05E9\u05D5\u05DC\u05DD',        cls: 'dst-paid' },
  linked:          { he: '\u05DE\u05E7\u05D5\u05E9\u05E8',       cls: 'dst-linked' },
  cancelled:       { he: '\u05DE\u05D1\u05D5\u05D8\u05DC',       cls: 'dst-cancel' },
  pending_review:  { he: '\u05DC\u05D1\u05D9\u05E8\u05D5\u05E8',      cls: 'dst-review' }
};

async function loadDocumentsTab() {
  const tid = getTenantId();
  if (!tid) return;
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD...');
  try {
    const [docs, types, sups, deals] = await Promise.all([
      fetchAll(T.SUP_DOCS, [['is_deleted', 'eq', false]]),
      fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]]),
      fetchAll(T.SUPPLIERS, [['active', 'eq', true]]),
      fetchAll(T.PREPAID_DEALS, [['status', 'eq', 'active'], ['is_deleted', 'eq', false]])
    ]);
    _docData = docs;
    _docTypes = types;
    _docSuppliers = sups;
    _docPrepaidSet = {};
    deals.forEach(function(d) { _docPrepaidSet[d.supplier_id] = d; });
    // Load file counts per document (non-blocking, for badge display)
    _loadDocFileCounts(docs);
    renderDocFilterBar();
    applyDocFilters();
  } catch (e) {
    console.error('loadDocumentsTab error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', 'e');
  } finally {
    hideLoading();
  }
}

// Load file counts for all docs (sets doc._fileCount for badge display)
async function _loadDocFileCounts(docs) {
  try {
    var { data } = await sb.from(T.DOC_FILES)
      .select('document_id')
      .eq('tenant_id', getTenantId());
    if (!data) return;
    var counts = {};
    data.forEach(function(r) {
      counts[r.document_id] = (counts[r.document_id] || 0) + 1;
    });
    docs.forEach(function(d) { d._fileCount = counts[d.id] || 0; });
  } catch (e) { console.warn('_loadDocFileCounts error:', e.message); }
}

// renderDocFilterBar() and applyDocFilters() are in debt-doc-filters.js

function setDocSort(field) {
  _docSortField = field;
  var btns = document.querySelectorAll('.doc-sort-btn');
  btns.forEach(function(b) {
    var active = b.getAttribute('data-sort') === field;
    b.style.background = active ? '#1a73e8' : '#e5e7eb';
    b.style.color = active ? '#fff' : '#1e293b';
  });
  if (typeof applyDocFilters === 'function') applyDocFilters();
}

function _getDocStatusFilters() {
  if (!_docStatusFilters) {
    try { var raw = sessionStorage.getItem('debt_docStatusFilters'); _docStatusFilters = raw ? JSON.parse(raw) : null; } catch (e) {}
    if (!_docStatusFilters) _docStatusFilters = { open: true, paid: false, cancelled: false, pending_review: false };
  }
  return _docStatusFilters;
}
function toggleDocStatusFilter(key) {
  var f = _getDocStatusFilters();
  f[key] = !f[key];
  try { sessionStorage.setItem('debt_docStatusFilters', JSON.stringify(f)); } catch (e) {}
  _updateStatusBtnStyles();
  if (typeof applyDocFilters === 'function') applyDocFilters();
}
function _updateStatusBtnStyles() {
  var f = _getDocStatusFilters();
  ['open', 'paid', 'cancelled', 'pending_review'].forEach(function(k) {
    var btn = document.querySelector('.doc-status-btn[data-status="' + k + '"]');
    if (!btn) return;
    btn.style.background = f[k] ? '#1a73e8' : '#e5e7eb';
    btn.style.color = f[k] ? '#fff' : '#6b7280';
  });
}

// Render documents table into a target element.
// opts.targetEl — DOM element to render into (defaults to $('doc-table-wrap'))
// opts.hideSupplierCol — if true, omit supplier column (for supplier detail view)
function renderDocumentsTable(docs, opts) {
  var o = opts || {};
  var wrap = o.targetEl || $('doc-table-wrap');
  if (!wrap) return;
  if (!docs.length) { wrap.innerHTML = '<div class="empty-state">\u05D0\u05D9\u05DF \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05DC\u05D4\u05E6\u05D2\u05D4</div>'; return; }
  var typeMap = {}, supMap = {};
  _docTypes.forEach(function(t) { typeMap[t.id] = t; });
  _docSuppliers.forEach(function(s) { supMap[s.id] = s.name; });
  var rows = docs.map(function(d) {
    var type = typeMap[d.document_type_id] || {};
    var balance = (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0);
    var st = DOC_STATUS_MAP[d.status] || { he: d.status, cls: '' };
    var hasPrepaid = !!_docPrepaidSet[d.supplier_id];
    var ppBadge = hasPrepaid ? '<span style="background:#f59e0b;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px">\u05DE\u05E7\u05D3\u05DE\u05D4</span>' : '';
    var uploadedAt = d.created_at ? new Date(d.created_at).toLocaleString('he-IL') : '';
    // Source badge: receipt-linked vs standalone vs draft
    var srcBadge = '';
    if (d.status !== 'draft') {
      srcBadge = d.goods_receipt_id
        ? ' <span style="background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:3px;font-size:10px">\uD83D\uDCE6 \u05E7\u05D1\u05DC\u05D4</span>'
        : ' <span style="background:#f3f4f6;color:#6b7280;padding:1px 5px;border-radius:3px;font-size:10px">\u270F\uFE0F \u05D9\u05D3\u05E0\u05D9</span>';
    }
    if (d.missing_price) {
      srcBadge += ' <span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;font-size:10px">\u26A0\uFE0F \u05D7\u05E1\u05E8 \u05DE\u05D7\u05D9\u05E8</span>';
    }
    // Row actions: view + pay + cancel only. All other actions moved to View modal.
    var actionBtns = '<button class="btn-sm" onclick="viewDocument(\'' + d.id + '\')">\u05E6\u05E4\u05D4</button>';
    if (_isPayableDocType(type.code)) {
      actionBtns += ' <button class="btn-sm" onclick="switchDebtTab(\'payments\')">\u05E9\u05DC\u05DD</button>';
    }
    if (d.status === 'open' || d.status === 'partially_paid' || d.status === 'draft') {
      actionBtns += ' <button class="btn-sm" style="background:#ef4444;color:#fff" onclick="cancelDocument(\'' + d.id + '\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>';
    }
    var rowClass = d.status === 'draft' ? ' class="row-draft"' : '';
    return '<tr' + rowClass + '>' +
      '<td title="' + escapeHtml('\u05D4\u05D5\u05E2\u05DC\u05D4: ' + uploadedAt) + '">' + escapeHtml(d.document_date || '') + '</td>' +
      '<td>' + escapeHtml(type.name_he || '') + srcBadge + '</td>' +
      '<td>' + escapeHtml(d.document_number || '') + '</td>' +
      '<td>' + escapeHtml(d.internal_number || '') + '</td>' +
      (o.hideSupplierCol ? '' : '<td>' + ppBadge + escapeHtml(supMap[d.supplier_id] || '') + '</td>') +
      '<td>' + formatILS(d.total_amount) + '</td>' +
      '<td>' + formatILS(d.paid_amount) + '</td>' +
      '<td>' + formatILS(balance) + '</td>' +
      '<td><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '<td>' + actionBtns + '</td></tr>';
  }).join('');
  wrap.innerHTML =
    '<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th>\u05E1\u05D5\u05D2</th><th>\u05DE\u05E1\u05E4\u05E8</th><th>\u05DE\u05E1\u05E4\u05E8 \u05E4\u05E0\u05D9\u05DE\u05D9</th>' +
        (o.hideSupplierCol ? '' : '<th>\u05E1\u05E4\u05E7</th>') +
        '<th>\u05E1\u05DB\u05D5\u05DD</th><th>\u05E9\u05D5\u05DC\u05DD</th><th>\u05D9\u05EA\u05E8\u05D4</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th><th>\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
}

async function viewDocument(docId) {
  // Delegate to edit modal (debt-doc-edit.js)
  if (typeof editDocument === 'function') return editDocument(docId);
  toast('\u05DE\u05D5\u05D3\u05D5\u05DC \u05E2\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D0 \u05E0\u05D8\u05E2\u05DF', 'e');
}

function _attachFileToDoc(docId, supplierId) {
  pickAndUploadFiles(supplierId, async function(results) {
    try {
      // Get current max sort_order from files table
      var existingFiles = await fetchDocFiles(docId);
      var maxSort = existingFiles.reduce(function(m, f) { return Math.max(m, f.sort_order || 0); }, -1);

      for (var i = 0; i < results.length; i++) {
        await saveDocFile(docId, results[i].url, results[i].fileName, maxSort + 1 + i);
      }
      // Update primary file_url if this is the first file
      var doc = _docData.find(function(d) { return d.id === docId; });
      if (doc && !doc.file_url) {
        await batchUpdate(T.SUP_DOCS, [{ id: docId, file_url: results[0].url, file_name: results[0].fileName }]);
        doc.file_url = results[0].url;
        doc.file_name = results[0].fileName;
      }
      toast(results.length + ' \u05E7\u05D1\u05E6\u05D9\u05DD \u05E6\u05D5\u05E8\u05E4\u05D5');
      var viewModal = $('view-doc-modal');
      if (viewModal) { viewModal.remove(); viewDocument(docId); }
      applyDocFilters();
    } catch (e) {
      console.error('_attachFileToDoc error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E6\u05D9\u05E8\u05D5\u05E3 \u05E7\u05D1\u05E6\u05D9\u05DD: ' + (e.message || ''), 'e');
    }
  });
}

// New document modal functions → debt-doc-new.js

function closeAndRemoveModal(id) { var el = $(id); if (el) el.remove(); }

async function cancelDocument(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  var cancellable = ['open', 'draft', 'pending_invoice'];
  if (!doc || cancellable.indexOf(doc.status) < 0) { toast('\u05E0\u05D9\u05EA\u05DF \u05DC\u05D1\u05D8\u05DC \u05E8\u05E7 \u05DE\u05E1\u05DE\u05DA \u05E4\u05EA\u05D5\u05D7/\u05D8\u05D9\u05D5\u05D8\u05D4/\u05DE\u05DE\u05EA\u05D9\u05DF', 'e'); return; }
  var ok = await confirmDialog('\u05D1\u05D9\u05D8\u05D5\u05DC \u05DE\u05E1\u05DE\u05DA', '\u05D4\u05D0\u05DD \u05DC\u05D1\u05D8\u05DC \u05D0\u05EA \u05D4\u05DE\u05E1\u05DE\u05DA? \u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05EA\u05D0\u05E4\u05E1 \u05D0\u05EA \u05D4\u05D9\u05EA\u05E8\u05D4');
  if (!ok) return;
  promptPin('ביטול מסמך — אימות עובד', async function(pin, emp) {
    showLoading('מבטל מסמך...');
    try {
      await batchUpdate(T.SUP_DOCS, [{ id: docId, status: 'cancelled', total_amount: 0, paid_amount: 0 }]);
      await writeLog('doc_cancel', null, { document_id: docId, document_number: doc.document_number, cancelled_by: emp.id });
      toast('מסמך בוטל');
      // Refresh: if in supplier detail view, reload that; otherwise reload main tab
      if (_detailSupplierId) {
        await openSupplierDetail(_detailSupplierId);
        _switchDetailTab('docs');
      } else {
        await loadDocumentsTab();
      }
    } catch (e) {
      console.error('cancelDocument error:', e);
      toast('שגיאה בביטול: ' + (e.message || ''), 'e');
    } finally {
      hideLoading();
    }
  });
}

// --- Phase 8: Prepaid deduction modal ---
function openPrepaidDeductModal(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;
  var deal = _docPrepaidSet[doc.supplier_id];
  if (!deal) { toast('\u05D0\u05D9\u05DF \u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4 \u05E4\u05E2\u05D9\u05DC\u05D4', 'e'); return; }
  var supName = ''; _docSuppliers.forEach(function(s) { if (s.id === doc.supplier_id) supName = s.name; });
  var bal = (Number(doc.total_amount) || 0) - (Number(doc.paid_amount) || 0);
  var rem = (Number(deal.total_prepaid) || 0) - (Number(deal.total_used) || 0);
  var def = Math.min(bal, rem);
  var m = document.createElement('div'); m.id = 'pp-deduct-modal'; m.className = 'modal-overlay'; m.style.display = 'flex';
  m.onclick = function(e) { if (e.target === m) m.remove(); };
  m.innerHTML = '<div class="modal" style="max-width:420px"><h3 style="margin:0 0 12px">\u05E7\u05D9\u05D6\u05D5\u05D6 \u05DE\u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4</h3><div id="pp-deduct-alert"></div>' +
    '<div style="font-size:.9rem;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">' +
    '<div>\u05E1\u05E4\u05E7: <strong>' + escapeHtml(supName) + '</strong></div><div>\u05E2\u05E1\u05E7\u05D4: <strong>' + escapeHtml(deal.deal_name || '') + '</strong></div>' +
    '<div>\u05D9\u05EA\u05E8\u05D4 \u05D1\u05E2\u05E1\u05E7\u05D4: <strong>' + formatILS(rem) + '</strong></div><div>\u05D9\u05EA\u05E8\u05D4 \u05D1\u05DE\u05E1\u05DE\u05DA: <strong>' + formatILS(bal) + '</strong></div></div>' +
    '<label>\u05E1\u05DB\u05D5\u05DD \u05DC\u05E7\u05D9\u05D6\u05D5\u05D6<input type="number" id="pp-deduct-amt" class="nd-field" step="0.01" min="0.01" max="' + def + '" value="' + def.toFixed(2) + '"></label>' +
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
    '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'pp-deduct-modal\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
    '<button class="btn" style="background:#f59e0b;color:#fff" onclick="_doPrepaidDeduct(\'' + docId + '\',\'' + deal.id + '\')">\u05E7\u05D6\u05D6</button></div></div>';
  document.body.appendChild(m);
}

function _doPrepaidDeduct(docId, dealId) {
  var amt = Number(($('pp-deduct-amt') || {}).value) || 0;
  if (amt <= 0) { toast('\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05DB\u05D5\u05DD \u05D7\u05D9\u05D5\u05D1\u05D9', 'e'); return; }
  var maxAmt = Number(($('pp-deduct-amt') || {}).max) || Infinity;
  if (amt > maxAmt) { toast('\u05D4\u05E1\u05DB\u05D5\u05DD \u05D7\u05D5\u05E8\u05D2 \u05DE\u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD', 'e'); return; }
  promptPin('\u05E7\u05D9\u05D6\u05D5\u05D6 \u05DE\u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4 \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
    showLoading('\u05DE\u05E7\u05D6\u05D6...'); try {
      var doc = _docData.find(function(d) { return d.id === docId; });
      if (!doc) throw new Error('doc not found');
      // Server-side validation: check deal's actual remaining balance
      var { data: dealRow, error: dealErr } = await sb.from(T.PREPAID_DEALS)
        .select('total_prepaid, total_used').eq('id', dealId).eq('tenant_id', getTenantId()).single();
      if (dealErr) throw dealErr;
      var serverRemaining = (Number(dealRow.total_prepaid) || 0) - (Number(dealRow.total_used) || 0);
      if (amt > serverRemaining) { toast('\u05D4\u05E1\u05DB\u05D5\u05DD \u05D7\u05D5\u05E8\u05D2 \u05DE\u05D9\u05EA\u05E8\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4', 'e'); hideLoading(); return; }
      await sb.rpc('increment_prepaid_used', { p_deal_id: dealId, p_delta: amt });
      var newPaid = (Number(doc.paid_amount) || 0) + amt;
      await batchUpdate(T.SUP_DOCS, [{ id: docId, paid_amount: newPaid, status: newPaid >= (Number(doc.total_amount) || 0) ? 'paid' : 'partially_paid' }]);
      await writeLog('prepaid_deduction', null, { supplier_id: doc.supplier_id, document_id: docId, deal_id: dealId, amount: amt, deducted_by: emp.id });
      await sb.from(T.ALERTS).update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
        .eq('entity_id', docId).eq('alert_type', 'prepaid_new_document').eq('tenant_id', getTenantId());
      if (typeof refreshAlertsBadge === 'function') refreshAlertsBadge();
      closeAndRemoveModal('pp-deduct-modal');
      toast('\u05E7\u05D5\u05D6\u05D6 ' + formatILS(amt) + ' \u05DE\u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4', 's');
      if (_detailSupplierId) {
        await openSupplierDetail(_detailSupplierId);
        _switchDetailTab('docs');
      } else {
        await loadDocumentsTab();
      }
    } catch (e) { console.error('_doPrepaidDeduct error:', e); toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E7\u05D9\u05D6\u05D5\u05D6: ' + (e.message || ''), 'e');
    } finally { hideLoading(); }
  });
}
