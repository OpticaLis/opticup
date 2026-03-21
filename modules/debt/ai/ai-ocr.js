// ai-ocr.js — OCR trigger, review screen, correction flow (Phase 5c)
// Load after: shared.js, supabase-ops.js, file-upload.js, debt-documents.js
// Provides: triggerOCR(), showOCRReview(), _ocrSave(), _ocrCalcTotal(), _ocrAddItemRow()

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

// =========================================================
// 2. Review screen (modal)
// =========================================================
async function showOCRReview(result, fileUrl, existingDocId) {
  var ext = result.extracted_data || {};
  var conf = result.confidence_score || 0;
  var supMatch = result.supplier_match;
  _ocrExtractionId = result.extraction_id;
  _ocrOriginalData = JSON.parse(JSON.stringify(ext));
  _ocrCurrentFileUrl = fileUrl;
  _ocrExistingDocId = existingDocId || null;

  var fv = function(f) { return _ocrFV(ext, f); };
  var fc = function(f) { var c = _ocrFC(ext, f); return c != null ? _ocrConfDot(c) : ''; };
  var wc = function(f) { var c = _ocrFC(ext, f); return (c != null && c < 0.7) ? ' ocr-field-warn' : ''; };

  var docType = fv('document_type') || '';
  var subtotal = fv('subtotal'), vatRate = fv('vat_rate'), vatAmt = fv('vat_amount'), total = fv('total_amount');
  if (vatRate == null) vatRate = Number(getTenantConfig('vat_rate')) || 17;
  if (subtotal != null && vatAmt == null) vatAmt = Math.round(subtotal * vatRate) / 100;
  if (subtotal != null && total == null) total = subtotal + (vatAmt || 0);
  var currency = fv('currency') || 'ILS';
  var items = fv('items') || [];

  // Supplier dropdown
  var sups = _docSuppliers || [], supOpts = '<option value="">בחר ספק</option>';
  sups.forEach(function(s) {
    supOpts += '<option value="' + escapeHtml(s.id) + '"' + (supMatch && supMatch.id === s.id ? ' selected' : '') + '>' + escapeHtml(s.name) + '</option>';
  });
  // Doc type dropdown
  var types = _docTypes || [], typeOpts = '<option value="">בחר סוג</option>';
  types.forEach(function(t) {
    typeOpts += '<option value="' + escapeHtml(t.id) + '"' + (t.code === docType ? ' selected' : '') + '>' + escapeHtml(t.name_he) + '</option>';
  });
  // Currency dropdown
  var curOpts = ['ILS', 'USD', 'EUR'].map(function(c) {
    return '<option value="' + c + '"' + (currency === c ? ' selected' : '') + '>' + c + '</option>';
  }).join('');

  // Items rows
  var itemRows = '';
  (Array.isArray(items) ? items : []).forEach(function(it, i) {
    var disc = it.discount || 0;
    itemRows += '<tr><td><input class="ocr-itm" data-i="' + i + '" data-f="description" value="' + escapeHtml(it.description || '') + '"></td>' +
      '<td><input type="number" class="ocr-itm" data-i="' + i + '" data-f="quantity" value="' + (it.quantity || '') + '" step="1" min="0" oninput="_ocrCalcItemRow(this)"></td>' +
      '<td><input type="number" class="ocr-itm" data-i="' + i + '" data-f="unit_price" value="' + (it.unit_price || '') + '" step="0.01" oninput="_ocrCalcItemRow(this)"></td>' +
      '<td><input type="number" class="ocr-itm" data-i="' + i + '" data-f="discount" value="' + disc + '" step="0.01" min="0" max="100" oninput="_ocrCalcItemRow(this)"></td>' +
      '<td><input type="number" class="ocr-itm" data-i="' + i + '" data-f="total" value="' + (it.total || '') + '" step="0.01"></td></tr>';
  });

  // Document preview (signed URL)
  var signedUrl = await getSupplierFileUrl(fileUrl);
  var preview;
  if (signedUrl) {
    var fext = (fileUrl || '').split('.').pop().toLowerCase();
    preview = fext === 'pdf'
      ? '<iframe src="' + escapeHtml(signedUrl) + '" style="width:100%;height:100%;border:none" title="PDF"></iframe>'
      : '<img src="' + escapeHtml(signedUrl) + '" style="max-width:100%;max-height:100%;object-fit:contain">';
  } else {
    preview = '<div style="text-align:center;color:var(--g400);padding:24px">לא ניתן לטעון תצוגה מקדימה</div>';
  }

  var confPct = Math.round(conf * 100);
  var confClr = confPct >= 85 ? '#27ae60' : confPct >= 70 ? '#f39c12' : '#e74c3c';
  var aiHint = fv('supplier_name') ? '<div class="ocr-ai-hint">AI זיהה: ' + escapeHtml(fv('supplier_name')) + '</div>' : '';

  // Query OCR stats for this supplier (Phase 5e)
  var statsHtml = '';
  if (supMatch && supMatch.id) { try {
    var templates = await fetchAll(T.OCR_TEMPLATES, [['supplier_id', 'eq', supMatch.id]]);
    if (templates && templates.length) { var tmpl = templates[0];
      var accPct = tmpl.accuracy_rate != null ? Math.round(tmpl.accuracy_rate) : '\u2014';
      statsHtml = '<div class="ocr-stats-bar" style="background:#e8f5e9;border-radius:6px;padding:6px 12px;margin-bottom:8px;font-size:.85rem;color:#2e7d32">' +
        '\uD83D\uDCCA \u05E1\u05E4\u05E7 \u05D6\u05D4 \u05E0\u05E1\u05E8\u05E7 ' + (tmpl.times_used || 0) +
        ' \u05E4\u05E2\u05DE\u05D9\u05DD | \u05D3\u05D9\u05D5\u05E7: ' + accPct + '%</div>'; }
  } catch (e) { /* ignore stats error */ } }

  function fld(lbl, id, type, val, cf, ex) {
    return '<label class="ocr-flbl' + wc(cf) + '">' + escapeHtml(lbl) + ' ' + fc(cf) +
      '<input' + (type ? ' type="' + type + '"' : '') + ' id="' + id + '" class="nd-field" value="' +
      escapeHtml(val != null ? String(val) : '') + '"' + (ex || '') + '></label>';
  }

  var html =
    '<div class="modal-overlay" id="ocr-review-modal" style="display:flex" onclick="if(event.target===this)closeAndRemoveModal(\'ocr-review-modal\')">' +
    '<div class="modal ocr-modal-box">' +
      '<div class="ocr-header"><h3 style="margin:0;font-size:1.1rem">\uD83E\uDD16 תוצאות סריקה</h3>' +
        '<button class="btn-sm" onclick="closeAndRemoveModal(\'ocr-review-modal\')">\u2715</button></div>' +
      statsHtml +
      '<div class="ocr-body">' +
        '<div class="ocr-fields-panel"><div class="ocr-fields-grid">' +
          '<label class="ocr-flbl' + wc('supplier_name') + '">ספק ' + fc('supplier_name') +
            '<select id="ocr-supplier" class="nd-field">' + supOpts + '</select>' + aiHint + '</label>' +
          '<label class="ocr-flbl' + wc('document_type') + '">סוג מסמך ' + fc('document_type') +
            '<select id="ocr-doc-type" class="nd-field">' + typeOpts + '</select></label>' +
          fld('מספר מסמך', 'ocr-doc-number', '', fv('document_number') || '', 'document_number', '') +
          fld('תאריך מסמך', 'ocr-doc-date', 'date', fv('document_date') || '', 'document_date', '') +
          fld('תאריך תשלום', 'ocr-due-date', 'date', fv('due_date') || '', 'due_date', '') +
          fld('סכום לפני מע"מ', 'ocr-subtotal', 'number', subtotal, 'subtotal', ' step="0.01" oninput="_ocrCalcTotal()"') +
          fld('מע"מ %', 'ocr-vat-rate', 'number', vatRate, 'vat_rate', ' step="0.01" oninput="_ocrCalcTotal()"') +
          fld('סכום מע"מ', 'ocr-vat-amount', 'number', vatAmt, '', '') +
          fld('סה"כ', 'ocr-total', 'number', total, 'total_amount', ' step="0.01" style="font-weight:700"') +
          '<label class="ocr-flbl">מטבע<select id="ocr-currency" class="nd-field">' + curOpts + '</select></label>' +
        '</div>' +
        '<div class="ocr-items-section">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0 6px">' +
            '<strong style="font-size:.9rem">פריטים</strong>' +
            '<button class="btn-sm" onclick="_ocrAddItemRow()">+ הוסף שורה</button></div>' +
          '<div style="overflow-x:auto"><table class="data-table ocr-items-tbl" style="width:100%;font-size:.85rem">' +
            '<thead><tr><th>תיאור</th><th>כמות</th><th>מחיר ליח\'</th><th>% הנחה</th><th>סה"כ</th></tr></thead>' +
            '<tbody id="ocr-items-body">' + itemRows + '</tbody></table></div>' +
        '</div></div>' +
        '<div class="ocr-preview-panel">' + preview + '</div>' +
      '</div>' +
      '<div class="ocr-footer">' +
        '<div class="ocr-conf-bar"><span style="font-size:.85rem;white-space:nowrap">רמת ביטחון: ' + confPct + '%</span>' +
          '<div style="flex:1;height:6px;background:var(--g200);border-radius:3px;overflow:hidden">' +
            '<div style="width:' + confPct + '%;height:100%;background:' + confClr + ';border-radius:3px"></div></div></div>' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="closeAndRemoveModal(\'ocr-review-modal\')">&#10060; בטל</button>' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="_ocrSave(\'corrected\')">&#9999;&#65039; ערוך ושמור</button>' +
        '<button class="btn" style="background:#27ae60;color:#fff" onclick="_ocrSave(\'accepted\')">&#10004; אשר הכל</button>' +
      '</div>' +
    '</div></div>';

  var ex = $('ocr-review-modal'); if (ex) ex.remove();
  document.body.insertAdjacentHTML('beforeend', html);

  // Validate OCR data and highlight errors
  if (typeof validateOCRData === 'function') {
    var vResults = validateOCRData(Object.assign({}, ext, { supplier_match: supMatch }));
    var fMap = { total_amount: 'ocr-total', document_date: 'ocr-doc-date', due_date: 'ocr-due-date', vat_rate: 'ocr-vat-rate', supplier: 'ocr-supplier' };
    vResults.forEach(function(v) {
      var el = $(fMap[v.field]); if (!el) return;
      var lbl = el.closest('.ocr-flbl') || el.parentElement; if (!lbl) return;
      var clr = v.level === 'error' ? '#e74c3c' : '#f39c12';
      lbl.insertAdjacentHTML('beforeend', '<div style="color:' + clr + ';font-size:.8rem;margin-top:2px">' +
        (v.level === 'error' ? '\uD83D\uDD34' : '\u26A0\uFE0F') + ' ' + escapeHtml(v.msg) + '</div>');
      if (v.level === 'error') el.style.borderColor = '#e74c3c';
    });
  }
}

// Auto-calc VAT + total
function _ocrCalcTotal() {
  var sub = Number(($('ocr-subtotal') || {}).value) || 0;
  var rate = Number(($('ocr-vat-rate') || {}).value) || 0;
  var vat = Math.round(sub * rate) / 100;
  if ($('ocr-vat-amount')) $('ocr-vat-amount').value = vat.toFixed(2);
  if ($('ocr-total')) $('ocr-total').value = (sub + vat).toFixed(2);
}

// Add item row
function _ocrAddItemRow() {
  var tbody = $('ocr-items-body'); if (!tbody) return;
  var idx = tbody.rows.length;
  tbody.insertAdjacentHTML('beforeend',
    '<tr><td><input class="ocr-itm" data-i="' + idx + '" data-f="description"></td>' +
    '<td><input type="number" class="ocr-itm" data-i="' + idx + '" data-f="quantity" step="1" min="0" oninput="_ocrCalcItemRow(this)"></td>' +
    '<td><input type="number" class="ocr-itm" data-i="' + idx + '" data-f="unit_price" step="0.01" oninput="_ocrCalcItemRow(this)"></td>' +
    '<td><input type="number" class="ocr-itm" data-i="' + idx + '" data-f="discount" value="0" step="0.01" min="0" max="100" oninput="_ocrCalcItemRow(this)"></td>' +
    '<td><input type="number" class="ocr-itm" data-i="' + idx + '" data-f="total" step="0.01"></td></tr>');
}

// Auto-calc item row total: qty × price × (1 - discount/100)
function _ocrCalcItemRow(inp) {
  var row = inp.closest('tr'); if (!row) return;
  var v = function(f) { return Number(row.querySelector('[data-f="' + f + '"]').value) || 0; };
  var t = row.querySelector('[data-f="total"]');
  if (t) t.value = (v('quantity') * v('unit_price') * (1 - v('discount') / 100)).toFixed(2);
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
      var { error: upErr } = await sb.from(T.SUP_DOCS).update(docFields)
        .eq('id', existingDoc.id).eq('tenant_id', getTenantId());
      if (upErr) throw upErr;
      created = [{ id: existingDoc.id }];
    } else {
      docFields.internal_number = await generateDocInternalNumber();
      docFields.created_by = emp ? emp.id : null;
      created = await batchCreate(T.SUP_DOCS, [docFields]);
    }
    // Update ocr_extractions record + link to document (non-blocking — RLS may block)
    if (_ocrExtractionId) {
      try {
        var extUpdate = { id: _ocrExtractionId, status: status,
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

// --- 4. Inject OCR scan buttons into documents table rows ---
function _injectOCRScanIcons(docs) {
  var wrap = $('doc-table-wrap'); if (!wrap) return;
  var tbody = wrap.querySelector('tbody'); if (!tbody) return;
  docs.forEach(function(d, i) {
    if (!d.file_url) return;
    if (d.total_amount && Number(d.total_amount) > 0 && d.status !== 'draft') return;
    var row = tbody.rows[i]; if (!row) return;
    var cell = row.cells[row.cells.length - 1];
    if (!cell || cell.querySelector('.ocr-scan-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'btn-sm ocr-scan-btn'; btn.title = 'סרוק עם AI';
    btn.textContent = '\uD83E\uDD16';
    btn.onclick = function() { triggerOCR(d.file_url, d.supplier_id, null, d.id); };
    cell.insertBefore(btn, cell.firstChild);
  });
}

// --- 5. Add OCR toolbar button + patch documents rendering ---
function _injectOCRToolbarBtn() {
  var toolbar = document.querySelector('.doc-toolbar');
  if (!toolbar || toolbar.querySelector('.ocr-toolbar-btn')) return;
  var btn = document.createElement('button');
  btn.className = 'btn btn-sm ocr-toolbar-btn';
  btn.style.cssText = 'background:var(--success,#10b981);color:#fff';
  btn.innerHTML = '\uD83E\uDD16 סרוק מסמך';
  btn.title = 'העלה קובץ וסרוק עם AI';
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
