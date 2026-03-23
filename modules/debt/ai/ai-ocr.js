// ai-ocr.js — OCR trigger, save, toolbar injection (Phase 5c)
// Load after: shared.js, supabase-ops.js, file-upload.js, debt-documents.js
// Provides: triggerOCR(), _ocrSave(), _ocrConfDot(), _ocrFV(), _ocrFC(),
//   _injectOCRScanIcons(), _injectOCRToolbarBtn()
// See also: ai-ocr-review.js (showOCRReview, calc helpers — load after this file)

var _ocrExtractionId = null, _ocrOriginalData = null, _ocrCurrentFileUrl = null, _ocrExistingDocId = null;

// --- Confidence helpers ---
function _ocrConfDot(c) {
  return c >= 0.9 ? '<span class="ocr-conf-high" title="ביטחון גבוה">\u2705</span>'
    : c >= 0.7 ? '<span class="ocr-conf-med" title="מומלץ לבדוק">\u26A0\uFE0F</span>'
    : '<span class="ocr-conf-low" title="נדרשת בדיקה">\uD83D\uDD34</span>';
}
function _ocrFV(ext, f) { var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; }
function _ocrFC(ext, f) {
  var v = ext[f];
  if (v && typeof v === 'object' && 'confidence' in v) return v.confidence;
  return (ext.confidence && typeof ext.confidence[f] === 'number') ? ext.confidence[f] : null;
}

// =========================================================
// 1. Trigger OCR — call Edge Function
// =========================================================
async function triggerOCR(fileUrl, supplierId, documentTypeHint, existingDocId) {
  if (!fileUrl) { toast('אין קובץ לסריקה', 'e'); return; }
  var jwt = sessionStorage.getItem('prizma_auth_token') || sessionStorage.getItem('jwt_token');
  if (!jwt) { toast('נדרשת התחברות מחדש', 'e'); return; }
  showLoading('סורק את המסמך...');
  try {
    var res = await fetch(SUPABASE_URL + '/functions/v1/ocr-extract', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_url: fileUrl, supplier_id: supplierId || null,
        document_type_hint: documentTypeHint || null, tenant_id: getTenantId() })
    });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || 'שגיאה בסריקה');
    }
    var result = await res.json();
    hideLoading();
    if (result.success) showOCRReview(result, fileUrl, existingDocId);
    else toast(result.error || 'שגיאה בסריקה', 'e');
  } catch (e) {
    hideLoading(); console.error('triggerOCR error:', e);
    toast(e.message || 'שגיאה בסריקה', 'e');
  }
}

// --- 3. Save OCR result + create supplier_document ---
async function _ocrSave(mode) {
  var supplierId = ($('ocr-supplier') || {}).value;
  var typeId = ($('ocr-doc-type') || {}).value;
  var docNumber = (($('ocr-doc-number') || {}).value || '').trim();
  var docDate = ($('ocr-doc-date') || {}).value;
  var dueDate = ($('ocr-due-date') || {}).value;
  var subtotal = Number(($('ocr-subtotal') || {}).value) || 0;
  var vatRate = Number(($('ocr-vat-rate') || {}).value) || 0;
  var vatAmt = Number(($('ocr-vat-amount') || {}).value) || 0;
  var totalAmt = Number(($('ocr-total') || {}).value) || 0;
  var currency = ($('ocr-currency') || {}).value || 'ILS';

  if (!supplierId) { toast('יש לבחור ספק', 'e'); return; }
  if (!typeId) { toast('יש לבחור סוג מסמך', 'e'); return; }
  if (!docNumber) { toast('יש להזין מספר מסמך', 'e'); return; }
  if (!docDate) { toast('יש להזין תאריך מסמך', 'e'); return; }
  if (totalAmt < 0) { toast('סכום לא יכול להיות שלילי', 'e'); return; }

  // Gather items
  var items = [], tbody = $('ocr-items-body');
  if (tbody) { for (var i = 0; i < tbody.rows.length; i++) { var it = {};
    tbody.rows[i].querySelectorAll('.ocr-itm').forEach(function(inp) { it[inp.getAttribute('data-f')] = inp.value; });
    if (it.description || it.quantity) items.push(it); } }
  // Build corrections diff
  var corrections = {};
  if (_ocrOriginalData) {
    [['document_number', docNumber], ['document_date', docDate], ['due_date', dueDate],
     ['subtotal', subtotal], ['vat_rate', vatRate], ['total_amount', totalAmt], ['currency', currency]
    ].forEach(function(p) { var orig = _ocrFV(_ocrOriginalData, p[0]);
      if (orig != null && String(orig) !== String(p[1])) corrections[p[0]] = { ai: orig, user: p[1] }; });
  }
  var hasCorr = Object.keys(corrections).length > 0;
  var status = hasCorr ? 'corrected' : mode;

  showLoading('שומר מסמך...');
  try {
    var emp = getCurrentEmployee();
    // Check if document already exists (from batch upload / scan icon) — UPDATE instead of INSERT
    var existingDoc = null, created = null;
    if (_ocrExistingDocId) {
      existingDoc = { id: _ocrExistingDocId };
    }
    var docFields = {
      supplier_id: supplierId, document_type_id: typeId,
      document_number: docNumber, document_date: docDate, due_date: dueDate || null,
      subtotal: subtotal, vat_rate: vatRate, vat_amount: vatAmt,
      total_amount: totalAmt, currency: currency, status: 'open',
      notes: 'נוצר באמצעות סריקת AI'
    };
    if (existingDoc) {
      // Update existing doc — only financial fields + items, NOT identity fields
      // that could trigger unique constraint (supplier_id, document_number)
      var updateFields = {
        document_type_id: typeId, document_date: docDate, due_date: dueDate || null,
        subtotal: subtotal, vat_rate: vatRate, vat_amount: vatAmt,
        total_amount: totalAmt, currency: currency, status: 'open'
      };
      var { error: upErr } = await sb.from(T.SUP_DOCS).update(updateFields)
        .eq('id', existingDoc.id).eq('tenant_id', getTenantId());
      if (upErr) throw upErr;
      created = [{ id: existingDoc.id }];
    } else {
      docFields.internal_number = await generateDocInternalNumber();
      docFields.created_by = emp ? emp.id : null;
      created = await batchCreate(T.SUP_DOCS, [docFields]);
    }
    // Update ocr_extractions record + link to document + save edited items
    if (_ocrExtractionId) {
      try {
        // Build updated extracted_data with user-edited items
        var updatedData = _ocrOriginalData ? JSON.parse(JSON.stringify(_ocrOriginalData)) : {};
        updatedData.items = items;
        updatedData.document_number = docNumber;
        updatedData.document_date = docDate;
        updatedData.due_date = dueDate;
        updatedData.subtotal = subtotal;
        updatedData.vat_rate = vatRate;
        updatedData.vat_amount = vatAmt;
        updatedData.total_amount = totalAmt;
        updatedData.currency = currency;

        var extUpdate = { id: _ocrExtractionId, status: status,
          extracted_data: updatedData,
          corrections: hasCorr ? corrections : null, processed_by: emp ? emp.id : null };
        if (created && created[0]) extUpdate.supplier_document_id = created[0].id;
        await batchUpdate(T.OCR_EXTRACTIONS, [extUpdate]);
      } catch (e) { console.warn('OCR extraction update skipped (RLS):', e.message); }
    }
    await writeLog(existingDoc ? 'doc_ocr_update' : 'doc_create', null, {
      reason: (existingDoc ? 'מסמך עודכן מסריקת AI — ' : 'מסמך מסריקת AI — ') + docNumber,
      source_ref: created && created[0] ? created[0].id : null, ocr_extraction_id: _ocrExtractionId
    });
    // Phase 5e: Update OCR learning template
    var docTypeCode = '';
    var docTypeName = '';
    if (_docTypes) {
      var selectedType = _docTypes.find(function(t) { return t.id === typeId; });
      if (selectedType) { docTypeCode = selectedType.code; docTypeName = selectedType.name_he; }
    }
    await updateOCRTemplate(supplierId, docTypeCode, hasCorr ? corrections : null,
      _ocrOriginalData, docTypeName || docTypeCode);
    closeAndRemoveModal('ocr-review-modal');
    toast('המסמך נשמר בהצלחה');
    if (typeof loadDocumentsTab === 'function') await loadDocumentsTab();
  } catch (e) {
    console.error('_ocrSave error:', e);
    toast('שגיאה בשמירה: ' + (e.message || ''), 'e');
  } finally { hideLoading(); }
}

// =========================================================
// Multi-file OCR: scan all files for a document + merge results
// =========================================================
async function scanDocumentAllFiles(docId, supplierId, docTypeHint) {
  var files = await fetchDocFiles(docId);
  // Fallback: if no rows in supplier_document_files, use file_url from doc
  if (!files || !files.length) {
    var { data: docRec } = await sb.from(T.SUP_DOCS).select('file_url, file_name')
      .eq('id', docId).eq('tenant_id', getTenantId()).single();
    if (docRec && docRec.file_url) files = [{ file_url: docRec.file_url, file_name: docRec.file_name, sort_order: 0 }];
  }
  if (!files || !files.length) { toast('\u05D0\u05D9\u05DF \u05E7\u05D1\u05E6\u05D9\u05DD \u05DC\u05E1\u05E8\u05D9\u05E7\u05D4', 'e'); return; }
  // Single file → standard scan
  if (files.length === 1) { triggerOCR(files[0].file_url, supplierId, docTypeHint, docId); return; }
  // Multi-file sequential scan
  var jwt = sessionStorage.getItem('prizma_auth_token') || sessionStorage.getItem('jwt_token');
  if (!jwt) { toast('\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9', 'e'); return; }
  files.sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
  showLoading('\uD83E\uDD16 \u05E1\u05D5\u05E8\u05E7 \u05E2\u05DE\u05D5\u05D3 1 \u05DE\u05EA\u05D5\u05DA ' + files.length + '...');
  var results = [];
  for (var i = 0; i < files.length; i++) {
    showLoading('\uD83E\uDD16 \u05E1\u05D5\u05E8\u05E7 \u05E2\u05DE\u05D5\u05D3 ' + (i + 1) + ' \u05DE\u05EA\u05D5\u05DA ' + files.length + '...');
    try {
      var res = await fetch(SUPABASE_URL + '/functions/v1/ocr-extract', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: files[i].file_url, supplier_id: supplierId || null,
          document_type_hint: docTypeHint || null, tenant_id: getTenantId() })
      });
      if (!res.ok) { var err = await res.json().catch(function() { return {}; }); throw new Error(err.error || '\u05E9\u05D2\u05D9\u05D0\u05D4'); }
      var result = await res.json();
      results.push(result.success ? result : null);
    } catch (e) {
      console.warn('\u05E1\u05E8\u05D9\u05E7\u05EA \u05E2\u05DE\u05D5\u05D3 ' + (i + 1) + ' \u05E0\u05DB\u05E9\u05DC\u05D4:', e.message);
      results.push(null);
    }
  }
  hideLoading();
  var merged = _mergeOCRResults(results, files);
  if (merged.success) showOCRReview(merged, files[0].file_url, docId);
  else toast('\u05DB\u05DC \u05D4\u05E1\u05E8\u05D9\u05E7\u05D5\u05EA \u05E0\u05DB\u05E9\u05DC\u05D5', 'e');
}

function _mergeOCRResults(results, files) {
  var mergedItems = [], scanned = [], failed = [];
  var firstResult = null, lastResult = null;
  var confSum = 0, confCount = 0;
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (!r || !r.extracted_data) { failed.push(files[i].file_name || 'file ' + (i + 1)); continue; }
    scanned.push(files[i].file_name || 'file ' + (i + 1));
    if (!firstResult) firstResult = r;
    lastResult = r;
    if (r.confidence_score) { confSum += r.confidence_score; confCount++; }
    // Collect items from every page, dedup by description+qty+price
    var pageItems = r.extracted_data.items;
    if (pageItems && typeof pageItems === 'object' && 'value' in pageItems) pageItems = pageItems.value;
    if (Array.isArray(pageItems)) {
      pageItems.forEach(function(item) {
        var isDupe = mergedItems.some(function(ex) {
          return ex.description === item.description && ex.quantity === item.quantity && ex.unit_price === item.unit_price;
        });
        if (!isDupe) mergedItems.push(item);
      });
    }
  }
  if (!firstResult) return { success: false };
  var fv = function(d, f) { var v = d[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
  var fe = firstResult.extracted_data, le = lastResult.extracted_data;
  return {
    success: true,
    extracted_data: {
      supplier_name: fe.supplier_name, document_number: fv(fe, 'document_number'),
      document_date: fv(fe, 'document_date'), document_type: fv(fe, 'document_type'),
      due_date: fv(fe, 'due_date'),
      subtotal: fv(le, 'subtotal'), vat_rate: fv(le, 'vat_rate'),
      vat_amount: fv(le, 'vat_amount'), total_amount: fv(le, 'total_amount'),
      currency: fv(le, 'currency'), items: mergedItems
    },
    confidence_score: confCount > 0 ? confSum / confCount : 0,
    supplier_match: firstResult.supplier_match,
    extraction_id: firstResult.extraction_id,
    _merge_meta: { scanned: scanned, failed: failed, total: files.length }
  };
}

// --- 4. OCR scan buttons — moved into View modal (debt-doc-edit.js) ---
// _injectOCRScanIcons removed: OCR scan is now available inside the View modal
// via _buildDocActionToolbar(), not as row-level buttons in the documents table.
function _injectOCRScanIcons() { /* no-op — scan moved to View modal */ }

// --- 5. Add OCR toolbar button + patch documents rendering ---
function _injectOCRToolbarBtn() {
  // Find the documents tab toolbar specifically (not suppliers/payments toolbars)
  var docWrap = $('doc-table-wrap');
  var toolbar = docWrap ? docWrap.closest('.tab-content, [id*="doc"]')?.querySelector('.doc-toolbar')
    : document.querySelector('#documents-tab .doc-toolbar');
  if (!toolbar) toolbar = document.querySelector('.doc-toolbar');
  if (!toolbar || toolbar.querySelector('.ocr-toolbar-btn')) return;
  var btn = document.createElement('button');
  btn.className = 'btn btn-sm ocr-toolbar-btn';
  btn.style.cssText = 'background:#7c3aed;color:#fff;display:inline-flex;align-items:center;gap:4px';
  btn.innerHTML = '\uD83E\uDD16 \u05E1\u05E8\u05D5\u05E7 \u05DE\u05E1\u05DE\u05DA';
  btn.title = '\u05D4\u05E2\u05DC\u05D4 \u05E7\u05D5\u05D1\u05E5 \u05D5\u05E1\u05E8\u05D5\u05E7 \u05E2\u05DD AI';
  btn.onclick = function() {
    pickAndUploadFile('_ocr', function(r) { if (r && r.url) triggerOCR(r.url, null, null); });
  };
  var addBtn = toolbar.querySelector('.doc-add-btn');
  if (addBtn) toolbar.insertBefore(btn, addBtn); else toolbar.appendChild(btn);
}
// Patch loadDocumentsTab to inject OCR UI after rendering
(function() {
  var _origLoad = typeof loadDocumentsTab === 'function' ? loadDocumentsTab : null;
  if (!_origLoad) return;
  var _origRender = typeof renderDocumentsTable === 'function' ? renderDocumentsTable : null;
  window.loadDocumentsTab = async function() { await _origLoad(); _injectOCRToolbarBtn();
    if (_origRender && renderDocumentsTable === _origRender)
      window.renderDocumentsTable = function(docs) { _origRender(docs); _injectOCRScanIcons(docs); };
    if (typeof applyDocFilters === 'function') applyDocFilters(); };
})();
