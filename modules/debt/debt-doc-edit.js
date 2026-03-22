// debt-doc-edit.js — Document edit modal with AI learning (split from debt-documents.js)
// Load after: debt-documents.js, supabase-alerts-ocr.js
// Provides: editDocument(), saveDocumentEdits(), _editDocCalc()

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

  // OCR items (if any)
  var ocrItemsHtml = '';
  try {
    var { data: ocrRows } = await sb.from('ocr_extractions').select('extracted_data')
      .eq('supplier_document_id', docId).eq('tenant_id', getTenantId()).limit(1);
    if (ocrRows && ocrRows.length && ocrRows[0].extracted_data) {
      var ocrData = ocrRows[0].extracted_data;
      var ocrItems = (ocrData.items && typeof ocrData.items === 'object' && 'value' in ocrData.items) ? ocrData.items.value : ocrData.items;
      if (Array.isArray(ocrItems) && ocrItems.length) {
        var rows = ocrItems.map(function(it) {
          var disc = it.discount ? it.discount + '%' : '';
          return '<tr><td>' + escapeHtml(it.description || '') + '</td><td>' + (it.quantity || '') +
            '</td><td>' + (it.unit_price || '') + '</td><td>' + disc + '</td><td>' + (it.total || '') + '</td></tr>';
        }).join('');
        ocrItemsHtml = '<div style="border-top:1px solid var(--g200);padding-top:10px;margin-top:10px">' +
          '<strong style="font-size:.88rem">\uD83E\uDD16 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05E1\u05E8\u05D9\u05E7\u05D4</strong>' +
          '<table class="data-table" style="width:100%;font-size:.82rem;margin-top:6px"><thead><tr>' +
          '<th>\u05EA\u05D9\u05D0\u05D5\u05E8</th><th>\u05DB\u05DE\u05D5\u05EA</th><th>\u05DE\u05D7\u05D9\u05E8 \u05DC\u05D9\u05D7\'</th><th>% \u05D4\u05E0\u05D7\u05D4</th><th>\u05E1\u05D4"\u05DB</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table></div>';
      }
    }
  } catch (e) { console.warn('OCR items load skipped:', e.message); }

  // Receipt line items (from goods_receipt_items via goods_receipt_id FK)
  var receiptItemsHtml = '';
  if (doc.goods_receipt_id) {
    try {
      var { data: rcptItems, error: riErr } = await sb.from(T.RCPT_ITEMS)
        .select('barcode, brand, model, color, size, quantity, unit_cost, po_match_status')
        .eq('receipt_id', doc.goods_receipt_id)
        .eq('tenant_id', getTenantId());
      if (!riErr && rcptItems && rcptItems.length) {
        var riRows = rcptItems
          .filter(function(ri) { return ri.po_match_status !== 'returned'; })
          .map(function(ri) {
            var lineTotal = ((ri.unit_cost || 0) * (ri.quantity || 0)).toFixed(2);
            return '<tr>' +
              '<td>' + escapeHtml(ri.barcode || '') + '</td>' +
              '<td>' + escapeHtml(ri.brand || '') + '</td>' +
              '<td>' + escapeHtml(ri.model || '') + '</td>' +
              '<td style="text-align:center">' + (ri.quantity || 0) + '</td>' +
              '<td style="text-align:center">' + (ri.unit_cost != null ? Number(ri.unit_cost).toFixed(2) : '') + '</td>' +
              '<td style="text-align:center">' + lineTotal + '</td></tr>';
          }).join('');
        if (riRows) {
          receiptItemsHtml = '<div style="border-top:1px solid var(--g200);padding-top:10px;margin-top:10px">' +
            '<strong style="font-size:.88rem">\u{1F4E6} \u05E4\u05E8\u05D9\u05D8\u05D9 \u05E7\u05D1\u05DC\u05D4</strong>' +
            '<table class="data-table" style="width:100%;font-size:.82rem;margin-top:6px"><thead><tr>' +
            '<th>\u05D1\u05E8\u05E7\u05D5\u05D3</th><th>\u05DE\u05D5\u05EA\u05D2</th><th>\u05D3\u05D2\u05DD</th>' +
            '<th>\u05DB\u05DE\u05D5\u05EA</th><th>\u05DE\u05D7\u05D9\u05E8</th><th>\u05E1\u05D4"\u05DB</th>' +
            '</tr></thead><tbody>' + riRows + '</tbody></table></div>';
        }
      }
    } catch (e) { console.warn('Receipt items load skipped:', e.message); }
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
      // Editable fields
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.88rem">' +
        '<label>\u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA<select id="ed-type" class="nd-field">' + typeOpts + '</select></label>' +
        '<label>\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E1\u05DE\u05DA<input id="ed-number" class="nd-field" value="' + escapeHtml(doc.document_number || '') + '"></label>' +
        '<label>\u05EA\u05D0\u05E8\u05D9\u05DA \u05DE\u05E1\u05DE\u05DA<input type="date" id="ed-date" class="nd-field" value="' + (doc.document_date || '') + '"></label>' +
        '<label>\u05EA\u05D0\u05E8\u05D9\u05DA \u05EA\u05E9\u05DC\u05D5\u05DD<input type="date" id="ed-due" class="nd-field" value="' + (doc.due_date || '') + '"></label>' +
        '<label>\u05E1\u05DB\u05D5\u05DD \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DD<input type="number" id="ed-subtotal" step="0.01" class="nd-field" value="' + (Number(doc.subtotal) || 0) + '" oninput="_editDocCalc()"></label>' +
        '<label>% \u05DE\u05E2"\u05DD<input type="number" id="ed-vat-rate" step="0.01" class="nd-field" value="' + (Number(doc.vat_rate) || 17) + '" oninput="_editDocCalc()"></label>' +
        '<label>\u05DE\u05E2"\u05DD<input type="number" id="ed-vat" class="nd-field" value="' + (Number(doc.vat_amount) || 0).toFixed(2) + '" readonly style="background:var(--g100)"></label>' +
        '<label>\u05E1\u05D4"\u05DB<input type="number" id="ed-total" class="nd-field" value="' + (Number(doc.total_amount) || 0).toFixed(2) + '" readonly style="background:var(--g100)"></label>' +
        '<label style="grid-column:1/-1">\u05D4\u05E2\u05E8\u05D5\u05EA<textarea id="ed-notes" rows="2" class="nd-field">' + escapeHtml(doc.notes || '') + '</textarea></label>' +
      '</div>' +
      // File gallery (rendered async)
      '<div style="border-top:1px solid var(--g200);padding-top:10px;margin-top:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
          '<strong style="font-size:.88rem">\uD83D\uDCCE \u05E7\u05D1\u05E6\u05D9\u05DD \u05DE\u05E6\u05D5\u05E8\u05E4\u05D9\u05DD' +
            (docFiles.length ? ' (' + docFiles.length + ')' : '') + '</strong>' +
          '<button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" ' +
            'onclick="_editDocAttachMore(\'' + docId + '\',\'' + doc.supplier_id + '\')">\uD83D\uDCCE \u05E6\u05E8\u05E3 \u05E2\u05D5\u05D3</button>' +
        '</div>' +
        '<div id="edit-doc-files"></div>' +
      '</div>' +
      ocrItemsHtml +
      receiptItemsHtml +
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
    renderFileGallery(docFiles, 'edit-doc-files');
  }
}

// Attach more files from edit modal
async function _editDocAttachMore(docId, supplierId) {
  pickAndUploadFiles(supplierId, async function(results) {
    try {
      // Get current max sort_order
      var existing = await fetchDocFiles(docId);
      var maxSort = existing.reduce(function(m, f) { return Math.max(m, f.sort_order || 0); }, -1);

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
      // Refresh modal
      closeAndRemoveModal('edit-doc-modal');
      editDocument(docId);
    } catch (e) {
      console.error('_editDocAttachMore error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E6\u05D9\u05E8\u05D5\u05E3: ' + (e.message || ''), 'e');
    }
  });
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

    await batchUpdate(T.SUP_DOCS, [{
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
    }]);

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
