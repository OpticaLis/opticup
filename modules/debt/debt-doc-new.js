// debt-doc-new.js — New document modal (split from debt-documents.js)
// Load after: debt-documents.js, file-upload.js
// Provides: openNewDocumentModal(), saveNewDocument(), generateDocInternalNumber(),
//   calcNewDocTotal(), calcNewDocFromTotal(), _pickNewDocFiles(),
//   _renderNewDocFileList(), _removeNewDocFileAt(), _ndAutoCalcDueDate()
// Uses globals: _docTypes, _docSuppliers, _docData (from debt-documents.js)

var _pendingNewDocFiles = [];

// =========================================================
// Open new document modal
// =========================================================
function openNewDocumentModal() {
  _pendingNewDocFiles = [];
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
        '<label style="grid-column:1/-1">\u05E1\u05E4\u05E7<select id="nd-supplier" class="nd-field" onchange="_ndAutoCalcDueDate()">' + supOpts + '</select></label>' +
        '<label>\u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA<select id="nd-type" class="nd-field">' + typeOpts + '</select></label>' +
        '<label>\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E1\u05DE\u05DA<input id="nd-number" class="nd-field" placeholder="\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E1\u05DE\u05DA"></label>' +
        '<label>\u05EA\u05D0\u05E8\u05D9\u05DA \u05DE\u05E1\u05DE\u05DA<input type="date" id="nd-date" class="nd-field" onchange="_ndAutoCalcDueDate()"></label>' +
        '<label>\u05EA\u05D0\u05E8\u05D9\u05DA \u05EA\u05E9\u05DC\u05D5\u05DD<input type="date" id="nd-due" class="nd-field"></label>' +
        '<label>\u05E1\u05DB\u05D5\u05DD \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DD<input type="number" id="nd-subtotal" step="0.01" min="0" class="nd-field" oninput="calcNewDocTotal()"></label>' +
        '<label>% \u05DE\u05E2"\u05DD<input type="number" id="nd-vat-rate" value="' + (getTenantConfig('vat_rate') || 17) + '" step="0.01" class="nd-field" oninput="calcNewDocTotal()"></label>' +
        '<label>\u05DE\u05E2"\u05DD<input type="number" id="nd-vat" readonly class="nd-field" style="background:var(--g100)"></label>' +
        '<label>\u05E1\u05D4"\u05DB<input type="number" id="nd-total" step="0.01" min="0" class="nd-field" style="font-weight:700" oninput="calcNewDocFromTotal()"></label>' +
        '<label style="grid-column:1/-1">\u05D4\u05E2\u05E8\u05D5\u05EA<textarea id="nd-notes" rows="2" class="nd-field"></textarea></label>' +
      '</div>' +
      '<div style="margin-top:10px"><label>\u05E7\u05D1\u05E6\u05D9\u05DD \u05DE\u05E6\u05D5\u05E8\u05E4\u05D9\u05DD</label>' +
        '<button class="btn btn-sm" id="nd-attach-btn" onclick="_pickNewDocFiles()" style="background:#e5e7eb;color:#1e293b;width:100%">&#128206; \u05E6\u05E8\u05E3 \u05E7\u05D1\u05E6\u05D9\u05DD</button>' +
        '<div id="nd-attach-list" style="font-size:.78rem;color:var(--g600);margin-top:2px"></div></div>' +
      '<label style="display:block;margin-top:10px">\u05E7\u05D5\u05D3 \u05E2\u05D5\u05D1\u05D3 (PIN)' +
        '<input type="password" id="nd-pin" maxlength="10" class="nd-field" inputmode="numeric"></label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'new-doc-modal\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="saveNewDocument()">\u05E9\u05DE\u05D5\u05E8</button></div></div>';
  document.body.appendChild(modal);
  $('nd-date').value = new Date().toISOString().slice(0, 10);
  _ndAutoCalcDueDate();
}

// =========================================================
// File picker for new document modal
// =========================================================
function _pickNewDocFiles() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png'; inp.multiple = true;
  inp.onchange = function() {
    var files = Array.from(inp.files);
    files.forEach(function(f) {
      if (f.size > 10 * 1024 * 1024) { toast(f.name + ' — \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9 (10MB)', 'e'); return; }
      _pendingNewDocFiles.push(f);
    });
    _renderNewDocFileList();
  };
  inp.click();
}

function _renderNewDocFileList() {
  var wrap = $('nd-attach-list'); if (!wrap) return;
  if (!_pendingNewDocFiles.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = _pendingNewDocFiles.map(function(f, i) {
    var name = f.name.length > 25 ? f.name.slice(0, 22) + '...' : f.name;
    return '<div style="display:flex;align-items:center;gap:4px;padding:2px 0">' +
      '<span>\uD83D\uDCCE ' + escapeHtml(name) + '</span>' +
      '<button class="btn-sm" style="background:#ef4444;color:#fff;font-size:.65rem;padding:1px 4px" ' +
        'onclick="_removeNewDocFileAt(' + i + ')">\u2716</button></div>';
  }).join('');
}

function _removeNewDocFileAt(idx) {
  _pendingNewDocFiles.splice(idx, 1);
  _renderNewDocFileList();
}

// =========================================================
// VAT calculation helpers
// =========================================================
function calcNewDocTotal() {
  var sub = Number(($('nd-subtotal') || {}).value) || 0;
  var rate = Number(($('nd-vat-rate') || {}).value) || 0;
  var vat = Math.round(sub * rate) / 100;
  if ($('nd-vat')) $('nd-vat').value = vat.toFixed(2);
  if ($('nd-total')) $('nd-total').value = (sub + vat).toFixed(2);
}

// BUG-12 fix: reverse calc — total → pre-VAT + VAT
function calcNewDocFromTotal() {
  var total = Number(($('nd-total') || {}).value) || 0;
  var rate = Number(($('nd-vat-rate') || {}).value) || 0;
  var sub = rate > 0 ? Math.round(total / (1 + rate / 100) * 100) / 100 : total;
  var vat = Math.round((total - sub) * 100) / 100;
  if ($('nd-subtotal')) $('nd-subtotal').value = sub.toFixed(2);
  if ($('nd-vat')) $('nd-vat').value = vat.toFixed(2);
}

// BUG-16 fix: auto-calc due_date from supplier payment_terms_days
function _ndAutoCalcDueDate() {
  var dateVal = ($('nd-date') || {}).value;
  if (!dateVal) return;
  var supplierId = ($('nd-supplier') || {}).value;
  var sup = _docSuppliers.find(function(s) { return s.id === supplierId; });
  var terms = (sup && sup.payment_terms_days != null) ? sup.payment_terms_days : 30;
  var d = new Date(dateVal);
  d.setDate(d.getDate() + terms);
  if ($('nd-due')) $('nd-due').value = d.toISOString().slice(0, 10);
}

// =========================================================
// Save new document
// =========================================================
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
  if (subtotal < 0) { setAlert('new-doc-alert', '\u05E1\u05DB\u05D5\u05DD \u05DC\u05D0 \u05D9\u05DB\u05D5\u05DC \u05DC\u05D4\u05D9\u05D5\u05EA \u05E9\u05DC\u05D9\u05DC\u05D9', 'e'); return; }
  if (!pin)        { setAlert('new-doc-alert', '\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E7\u05D5\u05D3 \u05E2\u05D5\u05D1\u05D3', 'e'); return; }
  // Server-side duplicate check (real-time DB query, not client cache)
  var { data: dupes } = await sb.from(T.SUP_DOCS)
    .select('id, internal_number')
    .eq('supplier_id', supplierId)
    .eq('document_number', docNumber)
    .eq('document_type_id', typeId)
    .eq('tenant_id', getTenantId())
    .eq('is_deleted', false)
    .limit(1);
  if (dupes && dupes.length > 0) {
    var override = await confirmDialog(
      '\u05DE\u05E1\u05DE\u05DA \u05DB\u05E4\u05D5\u05DC',
      '\u05DE\u05E1\u05DE\u05DA ' + docNumber + ' \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05DC\u05E1\u05E4\u05E7 \u05D6\u05D4 (' + (dupes[0].internal_number || '') + '). \u05DC\u05D9\u05E6\u05D5\u05E8 \u05D1\u05DB\u05DC \u05D6\u05D0\u05EA?'
    );
    if (!override) return;
  }
  var emp = await verifyPinOnly(pin);
  if (!emp) { setAlert('new-doc-alert', '\u05E7\u05D5\u05D3 \u05E2\u05D5\u05D1\u05D3 \u05E9\u05D2\u05D5\u05D9', 'e'); return; }
  showLoading('\u05E9\u05D5\u05DE\u05E8 \u05DE\u05E1\u05DE\u05DA...');
  try {
    var internalNumber = await generateDocInternalNumber();
    var vatAmount = Math.round(subtotal * vatRate) / 100;
    var totalAmount = subtotal + vatAmount;
    // Upload files
    var fileUrl = null, fileName = null;
    var uploadedFiles = [];
    for (var fi = 0; fi < _pendingNewDocFiles.length; fi++) {
      var uploadResult = await uploadSupplierFile(_pendingNewDocFiles[fi], supplierId);
      if (uploadResult) uploadedFiles.push(uploadResult);
    }
    if (uploadedFiles.length) { fileUrl = uploadedFiles[0].url; fileName = uploadedFiles[0].fileName; }
    var created = await batchCreate(T.SUP_DOCS, [{
      supplier_id: supplierId, document_type_id: typeId, internal_number: internalNumber,
      document_number: docNumber, document_date: docDate, due_date: dueDate || null,
      subtotal: subtotal, vat_rate: vatRate, vat_amount: vatAmount,
      total_amount: totalAmount, currency: 'ILS', status: 'open',
      notes: notes || null, created_by: emp.id, file_url: fileUrl, file_name: fileName
    }]);
    // Save file records to supplier_document_files
    if (created && created[0] && uploadedFiles.length) {
      for (var fj = 0; fj < uploadedFiles.length; fj++) {
        await saveDocFile(created[0].id, uploadedFiles[fj].url, uploadedFiles[fj].fileName, fj);
      }
    }
    await writeLog('doc_create', null, {
      reason: '\u05DE\u05E1\u05DE\u05DA \u05E1\u05E4\u05E7 \u05D7\u05D3\u05E9 \u2014 ' + docNumber, source_ref: internalNumber
    });
    _pendingNewDocFiles = [];
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

// =========================================================
// Generate internal document number via RPC
// =========================================================
async function generateDocInternalNumber() {
  var { data, error } = await sb.rpc('next_internal_doc_number', {
    p_tenant_id: getTenantId(), p_prefix: 'DOC'
  });
  if (error) throw new Error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05DE\u05E1\u05E4\u05E8 \u05E4\u05E0\u05D9\u05DE\u05D9: ' + error.message);
  return data;
}
