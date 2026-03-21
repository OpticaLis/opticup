// debt-documents.js — Documents tab (Phase 4d+5.5e+8)
let _docData = [], _docTypes = [], _docSuppliers = [];
var _pendingNewDocFile = null;
var _docPrepaidSet = {}; // Phase 8: supplier_id → deal object for active prepaid deals
const DOC_STATUS_MAP = {
  open:            { he: '\u05E4\u05EA\u05D5\u05D7',        cls: 'dst-open' },
  partially_paid:  { he: '\u05E9\u05D5\u05DC\u05DD \u05D7\u05DC\u05E7\u05D9\u05EA',  cls: 'dst-partial' },
  paid:            { he: '\u05E9\u05D5\u05DC\u05DD',        cls: 'dst-paid' },
  linked:          { he: '\u05DE\u05E7\u05D5\u05E9\u05E8',       cls: 'dst-linked' },
  cancelled:       { he: '\u05DE\u05D1\u05D5\u05D8\u05DC',       cls: 'dst-cancel' }
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
    renderDocFilterBar();
    applyDocFilters();
  } catch (e) {
    console.error('loadDocumentsTab error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', 'e');
  } finally {
    hideLoading();
  }
}

// renderDocFilterBar() and applyDocFilters() are in debt-doc-filters.js

function renderDocumentsTable(docs) {
  var wrap = $('doc-table-wrap');
  if (!wrap) return;
  if (!docs.length) { wrap.innerHTML = '<div class="empty-state">\u05D0\u05D9\u05DF \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05DC\u05D4\u05E6\u05D2\u05D4</div>'; return; }
  var typeMap = {}, supMap = {};
  _docTypes.forEach(function(t) { typeMap[t.id] = t; });
  _docSuppliers.forEach(function(s) { supMap[s.id] = s.name; });
  var rows = docs.map(function(d) {
    var type = typeMap[d.document_type_id] || {};
    var balance = (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0);
    var st = DOC_STATUS_MAP[d.status] || { he: d.status, cls: '' };
    var isDeliveryNote = type.code === 'delivery_note';
    var linkBtn = (isDeliveryNote && d.status !== 'linked')
      ? ' <button class="btn-sm btn-lnk" onclick="openLinkToInvoiceModal(\'' + d.id + '\')">\u05E7\u05E9\u05E8 \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA</button>' : '';
    var hasPrepaid = !!_docPrepaidSet[d.supplier_id];
    var ppBadge = hasPrepaid ? '<span style="background:#f59e0b;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px">\u05DE\u05E7\u05D3\u05DE\u05D4</span>' : '';
    var ppBtn = (hasPrepaid && balance > 0 && (d.status === 'open' || d.status === 'partially_paid'))
      ? ' <button class="btn-sm" style="background:#f59e0b;color:#fff" onclick="openPrepaidDeductModal(\'' + d.id + '\')">\u05E7\u05D6\u05D6 \u05DE\u05E2\u05E1\u05E7\u05D4</button>' : '';
    var uploadedAt = d.created_at ? new Date(d.created_at).toLocaleString('he-IL') : '';
    return '<tr>' +
      '<td title="' + escapeHtml('\u05D4\u05D5\u05E2\u05DC\u05D4: ' + uploadedAt) + '">' + escapeHtml(d.document_date || '') + '</td>' +
      '<td>' + escapeHtml(type.name_he || '') + '</td>' +
      '<td>' + escapeHtml(d.document_number || '') + '</td>' +
      '<td>' + escapeHtml(d.internal_number || '') + '</td>' +
      '<td>' + ppBadge + escapeHtml(supMap[d.supplier_id] || '') + '</td>' +
      '<td>' + formatILS(d.total_amount) + '</td>' +
      '<td>' + formatILS(d.paid_amount) + '</td>' +
      '<td>' + formatILS(balance) + '</td>' +
      '<td><span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></td>' +
      '<td>' +
        '<button class="btn-sm" onclick="viewDocument(\'' + d.id + '\')">\u05E6\u05E4\u05D4</button> ' +
        '<button class="btn-sm" title="' + (d.file_url ? '\u05D4\u05D7\u05DC\u05E3 \u05DE\u05E1\u05DE\u05DA' : '\u05E6\u05E8\u05E3 \u05DE\u05E1\u05DE\u05DA') + '" onclick="_attachFileToDoc(\'' + d.id + '\',\'' + d.supplier_id + '\')">&#128206;</button> ' +
        '<button class="btn-sm" onclick="switchDebtTab(\'payments\')">\u05E9\u05DC\u05DD</button>' + linkBtn + ppBtn +
        (d.status === 'open' ? ' <button class="btn-sm btn-d" onclick="cancelDocument(\'' + d.id + '\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' : '') +
      '</td></tr>';
  }).join('');
  wrap.innerHTML =
    '<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:.88rem">' +
      '<thead><tr><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th>\u05E1\u05D5\u05D2</th><th>\u05DE\u05E1\u05E4\u05E8</th><th>\u05DE\u05E1\u05E4\u05E8 \u05E4\u05E0\u05D9\u05DE\u05D9</th><th>\u05E1\u05E4\u05E7</th>' +
        '<th>\u05E1\u05DB\u05D5\u05DD</th><th>\u05E9\u05D5\u05DC\u05DD</th><th>\u05D9\u05EA\u05E8\u05D4</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th><th>\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
}

async function viewDocument(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;
  var typeMap = {}, supMap = {};
  _docTypes.forEach(function(t) { typeMap[t.id] = t; });
  _docSuppliers.forEach(function(s) { supMap[s.id] = s.name; });
  var type = typeMap[doc.document_type_id] || {};
  var st = DOC_STATUS_MAP[doc.status] || { he: doc.status, cls: '' };
  var balance = (Number(doc.total_amount) || 0) - (Number(doc.paid_amount) || 0);
  var fileUrl = doc.file_url ? await getSupplierFileUrl(doc.file_url) : null;
  var fileSection;
  if (fileUrl) {
    var ext = (doc.file_name || doc.file_url || '').split('.').pop().toLowerCase();
    fileSection = (ext === 'pdf')
      ? '<iframe src="' + escapeHtml(fileUrl) + '" style="width:100%;height:350px;border:1px solid var(--g200);border-radius:6px" title="PDF"></iframe>'
      : '<img src="' + escapeHtml(fileUrl) + '" style="max-width:100%;max-height:350px;border-radius:6px;border:1px solid var(--g200)">';
    fileSection += '<div style="margin-top:6px;font-size:.82rem;color:var(--g500)">' + escapeHtml(doc.file_name || '') + '</div>';
  } else {
    fileSection = '<div style="text-align:center;padding:24px;color:var(--g400);font-size:.88rem">\u05D0\u05D9\u05DF \u05E7\u05D5\u05D1\u05E5 \u05DE\u05E6\u05D5\u05E8\u05E3' +
      '<div style="margin-top:8px"><button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" onclick="_attachFileToDoc(\'' + doc.id + '\',\'' + doc.supplier_id + '\')">&#128206; \u05E6\u05E8\u05E3 \u05DE\u05E1\u05DE\u05DA</button></div></div>';
  }
  var html =
    '<div class="modal-overlay" id="view-doc-modal" style="display:flex" onclick="if(event.target===this)closeAndRemoveModal(\'view-doc-modal\')">' +
      '<div class="modal" style="max-width:650px;width:95%">' +
        '<h3 style="margin:0 0 12px">\u05DE\u05E1\u05DE\u05DA ' + escapeHtml(doc.document_number || doc.internal_number || '') + '</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.88rem;margin-bottom:14px">' +
          '<div>\u05E1\u05D5\u05D2: <strong>' + escapeHtml(type.name_he || '') + '</strong></div>' +
          '<div>\u05E1\u05E4\u05E7: <strong>' + escapeHtml(supMap[doc.supplier_id] || '') + '</strong></div>' +
          '<div>\u05EA\u05D0\u05E8\u05D9\u05DA: <strong>' + escapeHtml(doc.document_date || '') + '</strong></div>' +
          '<div>\u05EA\u05D0\u05E8\u05D9\u05DA \u05EA\u05E9\u05DC\u05D5\u05DD: <strong>' + escapeHtml(doc.due_date || '') + '</strong></div>' +
          '<div>\u05E1\u05DB\u05D5\u05DD: <strong>' + formatILS(doc.total_amount) + '</strong></div>' +
          '<div>\u05E9\u05D5\u05DC\u05DD: <strong>' + formatILS(doc.paid_amount) + '</strong></div>' +
          '<div>\u05D9\u05EA\u05E8\u05D4: <strong>' + formatILS(balance) + '</strong></div>' +
          '<div>\u05E1\u05D8\u05D8\u05D5\u05E1: <span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></div>' +
          (doc.created_at ? '<div style="grid-column:1/-1;color:var(--g500);font-size:.82rem">\u05D4\u05D5\u05E2\u05DC\u05D4: ' + escapeHtml(new Date(doc.created_at).toLocaleString('he-IL')) + '</div>' : '') +
        '</div>' +
        '<div style="border-top:1px solid var(--g200);padding-top:12px">' + fileSection + '</div>' +
        '<div style="text-align:left;margin-top:14px"><button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'view-doc-modal\')">\u05E1\u05D2\u05D5\u05E8</button></div>' +
      '</div></div>';
  var existing = $('view-doc-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function _attachFileToDoc(docId, supplierId) {
  pickAndUploadFile(supplierId, async function(result) {
    try {
      await batchUpdate(T.SUP_DOCS, [{ id: docId, file_url: result.url, file_name: result.fileName }]);
      var doc = _docData.find(function(d) { return d.id === docId; });
      if (doc) { doc.file_url = result.url; doc.file_name = result.fileName; }
      toast('\u05E7\u05D5\u05D1\u05E5 \u05E6\u05D5\u05E8\u05E3 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');
      var viewModal = $('view-doc-modal');
      if (viewModal) { viewModal.remove(); viewDocument(docId); }
      applyDocFilters();
    } catch (e) {
      console.error('_attachFileToDoc error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E6\u05D9\u05E8\u05D5\u05E3 \u05E7\u05D5\u05D1\u05E5: ' + (e.message || ''), 'e');
    }
  });
}

function openNewDocumentModal() {
  _pendingNewDocFile = null;
  var supOpts = _docSuppliers.map(function(s) {
    return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  }).join('');
  var typeOpts = _docTypes.map(function(t) {
    return '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name_he) + '</option>';
  }).join('');
  var modal = document.createElement('div');
  modal.id = 'new-doc-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:480px">' +
      '<h3 style="margin:0 0 14px">\u05DE\u05E1\u05DE\u05DA \u05E1\u05E4\u05E7 \u05D7\u05D3\u05E9</h3>' +
      '<div id="new-doc-alert"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<label style="grid-column:1/-1">\u05E1\u05E4\u05E7<select id="nd-supplier" class="nd-field">' + supOpts + '</select></label>' +
        '<label>\u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA<select id="nd-type" class="nd-field">' + typeOpts + '</select></label>' +
        '<label>\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E1\u05DE\u05DA<input id="nd-number" class="nd-field" placeholder="\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E1\u05DE\u05DA"></label>' +
        '<label>\u05EA\u05D0\u05E8\u05D9\u05DA \u05DE\u05E1\u05DE\u05DA<input type="date" id="nd-date" class="nd-field"></label>' +
        '<label>\u05EA\u05D0\u05E8\u05D9\u05DA \u05EA\u05E9\u05DC\u05D5\u05DD<input type="date" id="nd-due" class="nd-field"></label>' +
        '<label>\u05E1\u05DB\u05D5\u05DD \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DD<input type="number" id="nd-subtotal" step="0.01" min="0" class="nd-field" oninput="calcNewDocTotal()"></label>' +
        '<label>% \u05DE\u05E2"\u05DD<input type="number" id="nd-vat-rate" value="' + (getTenantConfig('vat_rate') || 17) + '" step="0.01" class="nd-field" oninput="calcNewDocTotal()"></label>' +
        '<label>\u05DE\u05E2"\u05DD<input type="number" id="nd-vat" readonly class="nd-field" style="background:var(--g100)"></label>' +
        '<label>\u05E1\u05D4"\u05DB<input type="number" id="nd-total" readonly class="nd-field" style="background:var(--g100);font-weight:700"></label>' +
        '<label style="grid-column:1/-1">\u05D4\u05E2\u05E8\u05D5\u05EA<textarea id="nd-notes" rows="2" class="nd-field"></textarea></label>' +
      '</div>' +
      '<div style="margin-top:10px"><label>\u05DE\u05E1\u05DE\u05DA \u05DE\u05E6\u05D5\u05E8\u05E3</label>' +
        '<button class="btn btn-g btn-sm" id="nd-attach-btn" onclick="_pickNewDocFile()" style="width:100%">&#128206; \u05E6\u05E8\u05E3 \u05DE\u05E1\u05DE\u05DA</button>' +
        '<span id="nd-attach-name" style="font-size:.78rem;color:var(--g600);display:block;margin-top:2px"></span></div>' +
      '<label style="display:block;margin-top:10px">\u05E7\u05D5\u05D3 \u05E2\u05D5\u05D1\u05D3 (PIN)' +
        '<input type="password" id="nd-pin" maxlength="10" class="nd-field" inputmode="numeric"></label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn btn-g" onclick="closeAndRemoveModal(\'new-doc-modal\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        '<button class="btn btn-s" onclick="saveNewDocument()">\u05E9\u05DE\u05D5\u05E8</button></div></div>';
  document.body.appendChild(modal);
  $('nd-date').value = new Date().toISOString().slice(0, 10);
  var due = new Date(); due.setDate(due.getDate() + 30);
  $('nd-due').value = due.toISOString().slice(0, 10);
}

function closeAndRemoveModal(id) { var el = $(id); if (el) el.remove(); }

function _pickNewDocFile() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png';
  inp.onchange = function() {
    var f = inp.files[0]; if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast('\u05E7\u05D5\u05D1\u05E5 \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9 \u2014 \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 10MB', 'e'); return; }
    _pendingNewDocFile = f;
    var btn = $('nd-attach-btn'); if (btn) btn.style.display = 'none';
    var nm = $('nd-attach-name'); if (!nm) return;
    nm.innerHTML = '';
    var span = document.createElement('span');
    span.textContent = '\uD83D\uDCCE ' + (f.name.length > 20 ? f.name.slice(0, 20) + '...' : f.name);
    var rb = document.createElement('button');
    rb.className = 'btn btn-d btn-sm'; rb.style.cssText = 'margin-right:6px;font-size:.75rem';
    rb.textContent = '\u2716 \u05D4\u05E1\u05E8'; rb.onclick = _removeNewDocFile;
    nm.appendChild(span); nm.appendChild(rb);
  };
  inp.click();
}

function _removeNewDocFile() {
  _pendingNewDocFile = null;
  var btn = $('nd-attach-btn'); if (btn) btn.style.display = '';
  var nm = $('nd-attach-name'); if (nm) nm.innerHTML = '';
}

function calcNewDocTotal() {
  var sub = Number(($('nd-subtotal') || {}).value) || 0;
  var rate = Number(($('nd-vat-rate') || {}).value) || 0;
  var vat = Math.round(sub * rate) / 100;
  if ($('nd-vat')) $('nd-vat').value = vat.toFixed(2);
  if ($('nd-total')) $('nd-total').value = (sub + vat).toFixed(2);
}

async function saveNewDocument() {
  var supplierId = ($('nd-supplier') || {}).value;
  var typeId     = ($('nd-type') || {}).value;
  var docNumber  = (($('nd-number') || {}).value || '').trim();
  var docDate    = ($('nd-date') || {}).value;
  var dueDate    = ($('nd-due') || {}).value;
  var subtotal   = Number(($('nd-subtotal') || {}).value) || 0;
  var vatRate    = Number(($('nd-vat-rate') || {}).value) || 0;
  var notes      = (($('nd-notes') || {}).value || '').trim();
  var pin        = (($('nd-pin') || {}).value || '').trim();
  if (!supplierId) { setAlert('new-doc-alert', '\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05E4\u05E7', 'e'); return; }
  if (!typeId)     { setAlert('new-doc-alert', '\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA', 'e'); return; }
  if (!docNumber)  { setAlert('new-doc-alert', '\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05DE\u05E1\u05E4\u05E8 \u05DE\u05E1\u05DE\u05DA', 'e'); return; }
  if (!docDate)    { setAlert('new-doc-alert', '\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05EA\u05D0\u05E8\u05D9\u05DA \u05DE\u05E1\u05DE\u05DA', 'e'); return; }
  if (subtotal <= 0) { setAlert('new-doc-alert', '\u05E1\u05DB\u05D5\u05DD \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D7\u05D9\u05D5\u05D1\u05D9', 'e'); return; }
  if (!pin)        { setAlert('new-doc-alert', '\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E7\u05D5\u05D3 \u05E2\u05D5\u05D1\u05D3', 'e'); return; }
  var dup = _docData.find(function(d) {
    return d.supplier_id === supplierId && d.document_number === docNumber && d.document_type_id === typeId;
  });
  if (dup) { setAlert('new-doc-alert', '\u05DE\u05E1\u05DE\u05DA \u05E2\u05DD \u05DE\u05E1\u05E4\u05E8 \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05DC\u05E1\u05E4\u05E7 \u05D6\u05D4', 'e'); return; }
  var emp = await verifyPinOnly(pin);
  if (!emp) { setAlert('new-doc-alert', '\u05E7\u05D5\u05D3 \u05E2\u05D5\u05D1\u05D3 \u05E9\u05D2\u05D5\u05D9', 'e'); return; }
  showLoading('\u05E9\u05D5\u05DE\u05E8 \u05DE\u05E1\u05DE\u05DA...');
  try {
    var internalNumber = await generateDocInternalNumber();
    var vatAmount = Math.round(subtotal * vatRate) / 100;
    var totalAmount = subtotal + vatAmount;
    var fileUrl = null, fileName = null;
    if (_pendingNewDocFile) {
      var uploadResult = await uploadSupplierFile(_pendingNewDocFile, supplierId);
      if (uploadResult) { fileUrl = uploadResult.url; fileName = uploadResult.fileName; }
    }
    await batchCreate(T.SUP_DOCS, [{
      supplier_id: supplierId, document_type_id: typeId, internal_number: internalNumber,
      document_number: docNumber, document_date: docDate, due_date: dueDate || null,
      subtotal: subtotal, vat_rate: vatRate, vat_amount: vatAmount,
      total_amount: totalAmount, currency: 'ILS', status: 'open',
      notes: notes || null, created_by: emp.id, file_url: fileUrl, file_name: fileName
    }]);
    await writeLog('doc_create', null, {
      reason: '\u05DE\u05E1\u05DE\u05DA \u05E1\u05E4\u05E7 \u05D7\u05D3\u05E9 \u2014 ' + docNumber, source_ref: internalNumber
    });
    _pendingNewDocFile = null;
    closeAndRemoveModal('new-doc-modal');
    toast('\u05DE\u05E1\u05DE\u05DA \u05E0\u05E9\u05DE\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');
    await loadDocumentsTab();
  } catch (e) {
    console.error('saveNewDocument error:', e);
    setAlert('new-doc-alert', '\u05E9\u05D2\u05D9\u05D0\u05D4: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}

async function generateDocInternalNumber() {
  var { data, error } = await sb.rpc('next_internal_doc_number', {
    p_tenant_id: getTenantId(), p_prefix: 'DOC'
  });
  if (error) throw new Error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05DE\u05E1\u05E4\u05E8 \u05E4\u05E0\u05D9\u05DE\u05D9: ' + error.message);
  return data;
}

async function cancelDocument(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc || doc.status !== 'open') { toast('\u05E0\u05D9\u05EA\u05DF \u05DC\u05D1\u05D8\u05DC \u05E8\u05E7 \u05DE\u05E1\u05DE\u05DA \u05E4\u05EA\u05D5\u05D7', 'e'); return; }
  var ok = await confirmDialog('\u05D1\u05D9\u05D8\u05D5\u05DC \u05DE\u05E1\u05DE\u05DA', '\u05D4\u05D0\u05DD \u05DC\u05D1\u05D8\u05DC \u05D0\u05EA \u05D4\u05DE\u05E1\u05DE\u05DA? \u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05EA\u05D0\u05E4\u05E1 \u05D0\u05EA \u05D4\u05D9\u05EA\u05E8\u05D4');
  if (!ok) return;
  promptPin('ביטול מסמך — אימות עובד', async function(pin, emp) {
    showLoading('מבטל מסמך...');
    try {
      await batchUpdate(T.SUP_DOCS, [{ id: docId, status: 'cancelled', total_amount: 0, paid_amount: 0 }]);
      await writeLog('doc_cancel', null, { document_id: docId, document_number: doc.document_number, cancelled_by: emp.id });
      toast('מסמך בוטל');
      await loadDocumentsTab();
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
    '<button class="btn btn-g" onclick="closeAndRemoveModal(\'pp-deduct-modal\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
    '<button class="btn btn-s" style="background:#f59e0b" onclick="_doPrepaidDeduct(\'' + docId + '\',\'' + deal.id + '\')">\u05E7\u05D6\u05D6</button></div></div>';
  document.body.appendChild(m);
}

function _doPrepaidDeduct(docId, dealId) {
  var amt = Number(($('pp-deduct-amt') || {}).value) || 0;
  if (amt <= 0) { setAlert('pp-deduct-alert', '\u05E1\u05DB\u05D5\u05DD \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D7\u05D9\u05D5\u05D1\u05D9', 'e'); return; }
  var maxAmt = Number(($('pp-deduct-amt') || {}).max) || Infinity;
  if (amt > maxAmt) { setAlert('pp-deduct-alert', '\u05E1\u05DB\u05D5\u05DD \u05D7\u05D5\u05E8\u05D2 \u05DE\u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD', 'e'); return; }
  promptPin('\u05E7\u05D9\u05D6\u05D5\u05D6 \u05DE\u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4 \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
    showLoading('\u05DE\u05E7\u05D6\u05D6...'); try {
      var doc = _docData.find(function(d) { return d.id === docId; });
      if (!doc) throw new Error('doc not found');
      await sb.rpc('increment_prepaid_used', { p_deal_id: dealId, p_delta: amt });
      var newPaid = (Number(doc.paid_amount) || 0) + amt;
      await batchUpdate(T.SUP_DOCS, [{ id: docId, paid_amount: newPaid, status: newPaid >= (Number(doc.total_amount) || 0) ? 'paid' : 'partially_paid' }]);
      await writeLog('prepaid_deduction', null, { supplier_id: doc.supplier_id, document_id: docId, deal_id: dealId, amount: amt, deducted_by: emp.id });
      await sb.from(T.ALERTS).update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
        .eq('entity_id', docId).eq('alert_type', 'prepaid_new_document').eq('tenant_id', getTenantId());
      if (typeof refreshAlertsBadge === 'function') refreshAlertsBadge();
      closeAndRemoveModal('pp-deduct-modal');
      toast('\u05E7\u05D5\u05D6\u05D6 ' + formatILS(amt) + ' \u05DE\u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4', 's');
      await loadDocumentsTab();
    } catch (e) { console.error('_doPrepaidDeduct error:', e); toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E7\u05D9\u05D6\u05D5\u05D6: ' + (e.message || ''), 'e');
    } finally { hideLoading(); }
  });
}
