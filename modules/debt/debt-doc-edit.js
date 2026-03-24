// debt-doc-edit.js — Document edit modal with AI learning (split from debt-documents.js)
// Load after: debt-documents.js, supabase-alerts-ocr.js
// Provides: editDocument(), saveDocumentEdits(), _editDocCalc()
// Note: Per-file scan buttons removed — single scan button via _buildDocActionToolbar()

// =========================================================
// Edit document modal
// =========================================================
async function editDocument(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;
  var typeMap = {}, supMap = {};
  _docTypes.forEach(function(t) { typeMap[t.id] = t; });
  _docSuppliers.forEach(function(s) { supMap[s.id] = s.name; });
  var type = typeMap[doc.document_type_id] || {};
  var st = DOC_STATUS_MAP[doc.status] || { he: doc.status, cls: '' };

  // File gallery (multi-file support — loaded async after modal render)
  var docFiles = await fetchDocFiles(docId, doc.file_url, doc.file_name);

  // OCR / manual items (editable — via debt-doc-items.js)
  var ocrItems = [];
  try {
    var { data: ocrRows } = await sb.from('ocr_extractions').select('extracted_data')
      .eq('supplier_document_id', docId).eq('tenant_id', getTenantId()).limit(1);
    if (ocrRows && ocrRows.length && ocrRows[0].extracted_data) {
      var ocrData = ocrRows[0].extracted_data;
      var rawItems = (ocrData.items && typeof ocrData.items === 'object' && 'value' in ocrData.items) ? ocrData.items.value : ocrData.items;
      if (Array.isArray(rawItems)) ocrItems = rawItems;
    }
  } catch (e) { console.warn('OCR items load skipped:', e.message); }
  var ocrItemsHtml = _buildEditableItemsHtml(ocrItems, docId);

  // Receipt line items (read-only — via debt-doc-items.js)
  var receiptItemsHtml = '';
  if (doc.goods_receipt_id) {
    try {
      var { data: rcptItems, error: riErr } = await sb.from(T.RCPT_ITEMS)
        .select('barcode, brand, model, color, size, quantity, unit_cost, po_match_status')
        .eq('receipt_id', doc.goods_receipt_id)
        .eq('tenant_id', getTenantId());
      if (!riErr && rcptItems && rcptItems.length) {
        receiptItemsHtml = _buildReceiptItemsHtml(rcptItems);
      }
    } catch (e) { console.warn('Receipt items load skipped:', e.message); }
  }

  // Comparison table (PO vs Receipt vs Invoice)
  var comparisonHtml = '';
  if (doc.goods_receipt_id && typeof buildComparisonSection === 'function') {
    try { comparisonHtml = await buildComparisonSection(doc); }
    catch (e) { console.warn('Comparison section skipped:', e.message); }
  }

  // Type dropdown
  var typeOpts = _docTypes.map(function(t) {
    return '<option value="' + t.id + '"' + (t.id === doc.document_type_id ? ' selected' : '') + '>' + escapeHtml(t.name_he) + '</option>';
  }).join('');

  var uploadedAt = doc.created_at ? new Date(doc.created_at).toLocaleString('he-IL') : '';

  var html =
    '<div class="modal-overlay" id="edit-doc-modal" style="display:flex" onclick="if(event.target===this)closeAndRemoveModal(\'edit-doc-modal\')">' +
    '<div class="modal" style="max-width:650px;width:95%;max-height:90vh;overflow-y:auto">' +
      '<h3 style="margin:0 0 12px">\u05E2\u05E8\u05D9\u05DB\u05EA \u05DE\u05E1\u05DE\u05DA ' + escapeHtml(doc.internal_number || '') + '</h3>' +
      '<div id="edit-doc-alert"></div>' +
      // Read-only info row
      '<div style="display:flex;gap:12px;font-size:.85rem;color:var(--g500);margin-bottom:10px;flex-wrap:wrap">' +
        '<span>\u05E1\u05E4\u05E7: <strong style="color:var(--g700)">' + escapeHtml(supMap[doc.supplier_id] || '') + '</strong></span>' +
        '<span>\u05E1\u05D8\u05D8\u05D5\u05E1: <span class="doc-badge ' + st.cls + '">' + escapeHtml(st.he) + '</span></span>' +
        (uploadedAt ? '<span>\u05D4\u05D5\u05E2\u05DC\u05D4: ' + escapeHtml(uploadedAt) + '</span>' : '') +
      '</div>' +
      // Editable fields — amounts locked when receipt-linked (unless missing_price)
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.88rem">' +
        '<label>\u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA<select id="ed-type" class="nd-field">' + typeOpts + '</select></label>' +
        '<label>\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E1\u05DE\u05DA<input id="ed-number" class="nd-field" value="' + escapeHtml(doc.document_number || '') + '"></label>' +
        '<label>\u05EA\u05D0\u05E8\u05D9\u05DA \u05DE\u05E1\u05DE\u05DA<input type="date" id="ed-date" class="nd-field" value="' + (doc.document_date || '') + '"></label>' +
        '<label>\u05EA\u05D0\u05E8\u05D9\u05DA \u05EA\u05E9\u05DC\u05D5\u05DD<input type="date" id="ed-due" class="nd-field" value="' + (doc.due_date || '') + '"></label>' +
        '<label>\u05E1\u05DB\u05D5\u05DD \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DD<input type="number" id="ed-subtotal" step="0.01" class="nd-field" value="' + (Number(doc.subtotal) || 0) + '" oninput="_editDocCalc()"' + (doc.goods_receipt_id && !doc.missing_price ? ' disabled style="background:var(--g100)"' : '') + '></label>' +
        '<label>% \u05DE\u05E2"\u05DD<input type="number" id="ed-vat-rate" step="0.01" class="nd-field" value="' + (Number(doc.vat_rate) || 17) + '" oninput="_editDocCalc()"' + (doc.goods_receipt_id && !doc.missing_price ? ' disabled style="background:var(--g100)"' : '') + '></label>' +
        '<label>\u05DE\u05E2"\u05DD<input type="number" id="ed-vat" class="nd-field" value="' + (Number(doc.vat_amount) || 0).toFixed(2) + '" readonly style="background:var(--g100)"></label>' +
        '<label>\u05E1\u05D4"\u05DB<input type="number" id="ed-total" class="nd-field" value="' + (Number(doc.total_amount) || 0).toFixed(2) + '" readonly style="background:var(--g100)"></label>' +
        (doc.goods_receipt_id
          ? (doc.missing_price
              ? '<div style="font-size:.8rem;color:#92400e;margin-top:2px;grid-column:1/-1">\u26A0\uFE0F \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05D7\u05E1\u05E8\u05D9\u05DD \u2014 \u05E2\u05D3\u05DB\u05DF \u05D0\u05EA \u05D4\u05E1\u05DB\u05D5\u05DE\u05D9\u05DD \u05DB\u05E9\u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05DE\u05D2\u05D9\u05E2\u05D4</div>'
              : '<div style="font-size:.8rem;color:var(--g500);margin-top:2px;grid-column:1/-1">\u05E1\u05DB\u05D5\u05DE\u05D9\u05DD \u05D7\u05D5\u05E9\u05D1\u05D5 \u05DE\u05E7\u05D1\u05DC\u05EA \u05D4\u05E1\u05D7\u05D5\u05E8\u05D4 \u2014 \u05DC\u05E2\u05E8\u05D9\u05DB\u05D4 \u05D9\u05E9 \u05DC\u05E9\u05E0\u05D5\u05EA \u05D1\u05E7\u05D1\u05DC\u05D4</div>')
          : '') +
        '<label style="grid-column:1/-1">\u05D4\u05E2\u05E8\u05D5\u05EA<textarea id="ed-notes" rows="2" class="nd-field">' + escapeHtml(doc.notes || '') + '</textarea></label>' +
      '</div>' +
      // File gallery (rendered async)
      '<div style="background:var(--g100);border:1px solid var(--g200);border-radius:8px;padding:12px;margin-top:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<strong style="font-size:.88rem">\uD83D\uDCCE \u05E7\u05D1\u05E6\u05D9\u05DD' +
            (docFiles.length ? ' (' + docFiles.length + ')' : '') + '</strong>' +
          '<button class="btn btn-sm" style="background:var(--primary,#1a73e8);color:#fff" ' +
            'onclick="_editDocAttachMore(\'' + docId + '\',\'' + doc.supplier_id + '\')">\uD83D\uDCCE \u05E6\u05E8\u05E3 \u05E7\u05D1\u05E6\u05D9\u05DD</button>' +
        '</div>' +
        '<div id="edit-doc-files"></div>' +
      '</div>' +
      comparisonHtml +
      ocrItemsHtml +
      receiptItemsHtml +
      // Action toolbar — actions moved from table rows into this modal
      _buildDocActionToolbar(doc, type, docFiles) +
      // Buttons
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'edit-doc-modal\')">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="saveDocumentEdits(\'' + docId + '\')">\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD</button>' +
      '</div>' +
    '</div></div>';

  var existing = $('edit-doc-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);

  // Render file gallery async
  if (docFiles.length) {
    await renderFileGallery(docFiles, 'edit-doc-files');
  }
  // Calculate initial items total
  if (typeof _edItemRecalcTotal === 'function') _edItemRecalcTotal();
}

// Attach more files from edit modal — with OCR scan option
async function _editDocAttachMore(docId, supplierId) {
  pickAndUploadFiles(supplierId, function(results) {
    // Show choice: upload only vs upload + OCR scan
    _showAttachChoiceModal(docId, supplierId, results);
  });
}

// Choice modal: save only or save + OCR
function _showAttachChoiceModal(docId, supplierId, uploadResults) {
  var names = uploadResults.map(function(r) { return r.fileName; }).join(', ');
  var old = $('attach-choice-modal'); if (old) old.remove();
  var html =
    '<div class="modal-overlay" id="attach-choice-modal" style="display:flex;z-index:10005" ' +
      'onclick="if(event.target===this)closeAndRemoveModal(\'attach-choice-modal\')">' +
    '<div class="modal" style="max-width:400px;text-align:center">' +
      '<h3 style="margin:0 0 10px">\u05DE\u05D4 \u05DC\u05E2\u05E9\u05D5\u05EA \u05E2\u05DD \u05D4\u05E7\u05D1\u05E6\u05D9\u05DD?</h3>' +
      '<div style="font-size:.85rem;color:var(--g500);margin-bottom:14px">' + escapeHtml(names) + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn" style="background:#059669;color:#fff;width:100%" ' +
          'onclick="_doAttachFiles(\'' + docId + '\',\'' + supplierId + '\',false)">' +
          '\uD83D\uDCCE \u05E9\u05DE\u05D5\u05E8 \u05D1\u05DC\u05D1\u05D3</button>' +
        '<button class="btn" style="background:#7c3aed;color:#fff;width:100%" ' +
          'onclick="_doAttachFiles(\'' + docId + '\',\'' + supplierId + '\',true)">' +
          '\uD83E\uDD16 \u05E9\u05DE\u05D5\u05E8 \u05D5\u05E1\u05E8\u05D5\u05E7 \u05E2\u05DD AI</button>' +
      '</div>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  // Store results for the action handler
  window._pendingAttachResults = uploadResults;
}

// Execute the attach action (save files + optional OCR)
async function _doAttachFiles(docId, supplierId, withOCR) {
  var results = window._pendingAttachResults || [];
  window._pendingAttachResults = null;
  closeAndRemoveModal('attach-choice-modal');
  if (!results.length) return;

  try {
    // Save files to DB
    var existingFiles = await fetchDocFiles(docId);
    var maxSort = existingFiles.reduce(function(m, f) { return Math.max(m, f.sort_order || 0); }, -1);
    for (var i = 0; i < results.length; i++) {
      await saveDocFile(docId, results[i].url, results[i].fileName, maxSort + 1 + i);
    }
    // Update primary file_url if first file
    var doc = _docData.find(function(d) { return d.id === docId; });
    if (doc && !doc.file_url) {
      await batchUpdate(T.SUP_DOCS, [{ id: docId, file_url: results[0].url, file_name: results[0].fileName }]);
      doc.file_url = results[0].url;
      doc.file_name = results[0].fileName;
    }
    toast(results.length + ' \u05E7\u05D1\u05E6\u05D9\u05DD \u05E6\u05D5\u05E8\u05E4\u05D5');

    if (withOCR && typeof triggerOCR === 'function') {
      // Trigger OCR on the first uploaded file
      closeAndRemoveModal('edit-doc-modal');
      triggerOCR(results[0].url, supplierId, null, docId);
    } else {
      // Refresh edit modal
      closeAndRemoveModal('edit-doc-modal');
      editDocument(docId);
    }
  } catch (e) {
    console.error('_doAttachFiles error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E6\u05D9\u05E8\u05D5\u05E3: ' + (e.message || ''), 'e');
  }
}

// =========================================================
// Auto-calc VAT + total
// =========================================================
function _editDocCalc() {
  var sub = Number(($('ed-subtotal') || {}).value) || 0;
  var rate = Number(($('ed-vat-rate') || {}).value) || 0;
  var vat = Math.round(sub * rate) / 100;
  if ($('ed-vat')) $('ed-vat').value = vat.toFixed(2);
  if ($('ed-total')) $('ed-total').value = (sub + vat).toFixed(2);
}

// =========================================================
// Save edits + AI learning
// =========================================================
async function saveDocumentEdits(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;

  var newNumber = (($('ed-number') || {}).value || '').trim();
  var newDate = ($('ed-date') || {}).value;
  var newDue = ($('ed-due') || {}).value || null;
  var newTypeId = ($('ed-type') || {}).value;
  var newSubtotal = Number(($('ed-subtotal') || {}).value) || 0;
  var newVatRate = Number(($('ed-vat-rate') || {}).value) || 0;
  var newVat = Number(($('ed-vat') || {}).value) || 0;
  var newTotal = Number(($('ed-total') || {}).value) || 0;
  var newNotes = (($('ed-notes') || {}).value || '').trim();

  if (!newNumber) { setAlert('edit-doc-alert', '\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05DE\u05E1\u05E4\u05E8 \u05DE\u05E1\u05DE\u05DA', 'e'); return; }
  if (!newDate) { setAlert('edit-doc-alert', '\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05EA\u05D0\u05E8\u05D9\u05DA', 'e'); return; }

  showLoading('\u05E9\u05D5\u05DE\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD...');
  try {
    // Build changes log
    var changes = {};
    if (doc.document_number !== newNumber) changes.document_number = { old: doc.document_number, new: newNumber };
    if (doc.document_date !== newDate) changes.document_date = { old: doc.document_date, new: newDate };
    if (doc.document_type_id !== newTypeId) changes.document_type_id = { old: doc.document_type_id, new: newTypeId };
    if (Number(doc.subtotal) !== newSubtotal) changes.subtotal = { old: doc.subtotal, new: newSubtotal };
    if (Number(doc.total_amount) !== newTotal) changes.total_amount = { old: doc.total_amount, new: newTotal };

    var updateRow = {
      id: docId,
      document_type_id: newTypeId,
      document_number: newNumber,
      document_date: newDate,
      due_date: newDue,
      subtotal: newSubtotal,
      vat_rate: newVatRate,
      vat_amount: newVat,
      total_amount: newTotal,
      notes: newNotes || null
    };
    // Draft → open transition on save
    if (doc.status === 'draft') updateRow.status = 'open';
    await batchUpdate(T.SUP_DOCS, [updateRow]);

    // Save edited items (non-blocking)
    if (typeof _saveEditedItems === 'function') {
      await _saveEditedItems(docId);
    }

    await writeLog('document_edited', null, {
      reason: '\u05DE\u05E1\u05DE\u05DA \u05E2\u05D5\u05D3\u05DB\u05DF',
      source_ref: docId,
      changes: changes
    });

    // AI learning — non-blocking
    try {
      var typeMap = {};
      _docTypes.forEach(function(t) { typeMap[t.id] = t; });
      var docType = typeMap[newTypeId] || {};
      await _learnFromDocumentEdits(doc, docType.code, {
        document_number: newNumber, document_date: newDate,
        subtotal: newSubtotal, vat_rate: newVatRate, total_amount: newTotal
      });
    } catch (e) { console.warn('AI learning skipped:', e); }

    closeAndRemoveModal('edit-doc-modal');
    toast('\u05DE\u05E1\u05DE\u05DA \u05E2\u05D5\u05D3\u05DB\u05DF \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');
    await loadDocumentsTab();
  } catch (e) {
    console.error('saveDocumentEdits error:', e);
    setAlert('edit-doc-alert', '\u05E9\u05D2\u05D9\u05D0\u05D4: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}

// =========================================================
// AI Learning — compare edits with OCR extraction
// =========================================================
async function _learnFromDocumentEdits(doc, docTypeCode, newValues) {
  if (!doc.supplier_id || typeof updateOCRTemplate !== 'function') return;
  // Find OCR extraction for this document
  var { data: extractions } = await sb.from('ocr_extractions')
    .select('extracted_data, corrections')
    .eq('supplier_document_id', doc.id)
    .eq('tenant_id', getTenantId())
    .limit(1);
  if (!extractions || !extractions.length) return;

  var ext = extractions[0].extracted_data || {};
  var fv = function(f) { var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };

  // Build corrections: only for fields where OCR value differs from user edit
  var corrections = {};
  var fields = ['document_number', 'document_date', 'subtotal', 'vat_rate', 'total_amount'];
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var aiVal = fv(f);
    var userVal = newValues[f];
    if (aiVal != null && userVal != null && String(aiVal) !== String(userVal)) {
      corrections[f] = { ai: aiVal, user: userVal };
    }
  }

  if (!Object.keys(corrections).length) return;
  console.log('AI learning from document edit:', corrections);
  await updateOCRTemplate(doc.supplier_id, docTypeCode || 'invoice', corrections, ext);
}

// =========================================================
// Action toolbar for View modal (buttons moved from table rows)
// =========================================================
function _buildDocActionToolbar(doc, type, docFiles) {
  var docId = doc.id;
  var suppId = doc.supplier_id;
  var balance = (Number(doc.total_amount) || 0) - (Number(doc.paid_amount) || 0);
  var isOpen = doc.status === 'open' || doc.status === 'partially_paid';
  var isInvoice = type.code === 'invoice' || type.code === 'tax_invoice';
  var hasFiles = docFiles && docFiles.length > 0;
  var hasPrepaid = typeof _docPrepaidSet !== 'undefined' && !!_docPrepaidSet[suppId];

  var btns = [];
  // Group 1: Files
  btns.push('<button class="btn btn-sm" style="background:var(--primary,#1a73e8);color:#fff" ' +
    'onclick="_editDocAttachMore(\'' + docId + '\',\'' + suppId + '\')">\uD83D\uDCCE \u05E6\u05E8\u05E3 \u05E7\u05D1\u05E6\u05D9\u05DD</button>');
  if (hasFiles && typeof triggerOCR === 'function' && !doc.goods_receipt_id) {
    // Use multi-file scan if document has multiple files, otherwise single scan
    var ocrFn = docFiles && docFiles.length > 1 && typeof scanDocumentAllFiles === 'function'
      ? 'closeAndRemoveModal(\'edit-doc-modal\');scanDocumentAllFiles(\'' + docId + '\',\'' + suppId + '\',null)'
      : 'closeAndRemoveModal(\'edit-doc-modal\');triggerOCR(\'' + escapeHtml(doc.file_url || '') + '\',\'' + suppId + '\',null,\'' + docId + '\')';
    var ocrLabel = docFiles && docFiles.length > 1
      ? '\uD83E\uDD16 \u05E1\u05E8\u05D5\u05E7 ' + docFiles.length + ' \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD'
      : '\uD83E\uDD16 \u05E1\u05E8\u05D5\u05E7 \u05E2\u05DD AI';
    btns.push('<button class="btn btn-sm" style="background:#7c3aed;color:#fff" onclick="' + ocrFn + '">' + ocrLabel + '</button>');
  }
  // Group 2: Linking + Prepaid
  if (isInvoice && isOpen && typeof openLinkDeliveryNotesModal === 'function') {
    btns.push('<button class="btn btn-sm" style="background:#3b82f6;color:#fff" ' +
      'onclick="closeAndRemoveModal(\'edit-doc-modal\');openLinkDeliveryNotesModal(\'' + docId + '\')">' +
      '\u05E7\u05E9\u05E8 \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA</button>');
  }
  if (hasPrepaid && balance > 0 && isOpen && typeof openPrepaidDeductModal === 'function') {
    btns.push('<button class="btn btn-sm" style="background:#f59e0b;color:#fff" ' +
      'onclick="closeAndRemoveModal(\'edit-doc-modal\');openPrepaidDeductModal(\'' + docId + '\')">' +
      '\u05E7\u05D6\u05D6 \u05DE\u05E2\u05E1\u05E7\u05D4</button>');
  }
  // Group 3: Delete (cancelled only, soft delete)
  if (doc.status === 'cancelled') {
    btns.push('<button class="btn btn-sm" style="background:#ef4444;color:#fff" ' +
      'onclick="_softDeleteDocument(\'' + docId + '\')">\u05DE\u05D7\u05E7</button>');
  }

  if (!btns.length) return '';
  return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid var(--g200)">' +
    btns.join('') + '</div>';
}

// Soft delete a cancelled document (from View modal)
async function _softDeleteDocument(docId) {
  var ok = await confirmDialog('\u05DE\u05D7\u05D9\u05E7\u05EA \u05DE\u05E1\u05DE\u05DA', '\u05D4\u05D0\u05DD \u05DC\u05DE\u05D7\u05D5\u05E7 \u05DE\u05E1\u05DE\u05DA \u05D6\u05D4? \u05D4\u05DE\u05E1\u05DE\u05DA \u05DC\u05D0 \u05D9\u05D5\u05E6\u05D2 \u05D1\u05E8\u05E9\u05D9\u05DE\u05D5\u05EA.');
  if (!ok) return;
  promptPin('\u05DE\u05D7\u05D9\u05E7\u05EA \u05DE\u05E1\u05DE\u05DA \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
    showLoading('\u05DE\u05D5\u05D7\u05E7...');
    try {
      await batchUpdate(T.SUP_DOCS, [{ id: docId, is_deleted: true, updated_at: new Date().toISOString() }]);
      // TODO: pg_cron job to permanently delete after 30 days
      await writeLog('doc_soft_delete', null, { document_id: docId, deleted_by: emp.id });
      closeAndRemoveModal('edit-doc-modal');
      toast('\u05DE\u05E1\u05DE\u05DA \u05E0\u05DE\u05D7\u05E7');
      if (typeof _detailSupplierId !== 'undefined' && _detailSupplierId) {
        await openSupplierDetail(_detailSupplierId);
        _switchDetailTab('docs');
      } else {
        await loadDocumentsTab();
      }
    } catch (e) {
      console.error('_softDeleteDocument error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
    } finally { hideLoading(); }
  });
}
