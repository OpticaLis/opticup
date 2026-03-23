// ai-ocr-review.js — OCR review modal rendering + item helpers (split from ai-ocr.js)
// Load after: ai-ocr.js (uses globals: _ocrExtractionId, _ocrOriginalData, _ocrCurrentFileUrl, _ocrExistingDocId)
// Provides: showOCRReview(), _ocrCalcTotal(), _ocrAddItemRow(), _ocrCalcItemRow()

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
    itemRows += _ocrBuildItemRow(i, escapeHtml(it.description || ''), it.quantity || '', it.unit_price || '', disc, it.total || '');
  });

  // Document preview (signed URL)
  // Build preview — single file or multi-page with navigation
  var signedUrl = await getSupplierFileUrl(fileUrl);
  var preview = '';
  var _ocrPageFiles = []; // stored globally for page nav
  if (result._merge_meta && result._merge_meta.total > 1 && existingDocId) {
    // Multi-file: build page navigation
    try {
      var allFiles = typeof fetchDocFiles === 'function' ? await fetchDocFiles(existingDocId) : [];
      if (allFiles.length > 1) {
        allFiles.sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
        for (var pi = 0; pi < allFiles.length; pi++) {
          var pUrl = await getSupplierFileUrl(allFiles[pi].file_url);
          _ocrPageFiles.push({ url: pUrl, name: allFiles[pi].file_name || '\u05E2\u05DE\u05D5\u05D3 ' + (pi + 1), failed: result._merge_meta.failed.indexOf(allFiles[pi].file_name) !== -1 });
        }
      }
    } catch (e) { /* fallback to single preview */ }
  }
  window._ocrPageFiles = _ocrPageFiles;
  if (_ocrPageFiles.length > 1) {
    var pageNav = '<div style="display:flex;gap:4px;justify-content:center;padding:6px 0">';
    _ocrPageFiles.forEach(function(pf, idx) {
      var bg = pf.failed ? '#ef4444' : (idx === 0 ? '#7c3aed' : '#e5e7eb');
      var clr = idx === 0 || pf.failed ? '#fff' : '#374151';
      pageNav += '<button class="btn-sm ocr-page-btn" data-page="' + idx + '" style="min-width:28px;background:' + bg + ';color:' + clr + '"' +
        (pf.failed ? ' title="\u05E0\u05DB\u05E9\u05DC"' : ' title="' + escapeHtml(pf.name) + '"') +
        ' onclick="_ocrSwitchPage(' + idx + ')">' + (idx + 1) + '</button>';
    });
    pageNav += '</div>';
    var firstUrl = _ocrPageFiles[0].url;
    var fext = (fileUrl || '').split('.').pop().toLowerCase();
    preview = '<div id="ocr-preview-content">' + (firstUrl
      ? (fext === 'pdf' ? '<iframe src="' + escapeHtml(firstUrl) + '" style="width:100%;height:calc(100% - 36px);border:none" title="PDF"></iframe>'
        : '<img src="' + escapeHtml(firstUrl) + '" style="max-width:100%;max-height:calc(100% - 36px);object-fit:contain">')
      : '<div style="text-align:center;color:var(--g400);padding:24px">\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF</div>') + '</div>' + pageNav;
  } else {
    // Single file preview (original behavior)
    if (signedUrl) {
      var fext = (fileUrl || '').split('.').pop().toLowerCase();
      preview = fext === 'pdf'
        ? '<iframe src="' + escapeHtml(signedUrl) + '" style="width:100%;height:100%;border:none" title="PDF"></iframe>'
        : '<img src="' + escapeHtml(signedUrl) + '" style="max-width:100%;max-height:100%;object-fit:contain">';
    } else {
      preview = '<div style="text-align:center;color:var(--g400);padding:24px">\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4</div>';
    }
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
      (result._merge_meta ? '<div style="background:' +
        (result._merge_meta.failed.length ? '#fff3cd' : '#e8f5e9') +
        ';border-radius:6px;padding:6px 12px;margin-bottom:8px;font-size:.82rem;color:' +
        (result._merge_meta.failed.length ? '#856404' : '#2e7d32') + '">' +
        '\uD83D\uDCE4 \u05E0\u05E1\u05E8\u05E7\u05D5 ' + result._merge_meta.scanned.length +
        ' \u05DE\u05EA\u05D5\u05DA ' + result._merge_meta.total + ' \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD' +
        (result._merge_meta.failed.length ? ' \u2014 \u26A0\uFE0F ' + result._merge_meta.failed.length + ' \u05E0\u05DB\u05E9\u05DC\u05D5' : '') +
        '</div>' : '') +
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
            '<thead><tr><th style="width:52px"></th><th>תיאור</th><th>כמות</th><th>מחיר ליח\'</th><th>% הנחה</th><th>סה"כ</th></tr></thead>' +
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

// Build a single item row HTML (shared by initial render + add + duplicate)
function _ocrBuildItemRow(i, desc, qty, price, disc, total) {
  return '<tr>' +
    '<td style="white-space:nowrap;width:52px">' +
      '<button type="button" class="btn-sm" style="width:24px;height:24px;padding:0;font-size:.8rem;background:#fee2e2;border-color:#fca5a5" title="\u05DE\u05D7\u05E7 \u05E9\u05D5\u05E8\u05D4" onclick="_ocrDeleteItemRow(this)">\u274C</button>' +
      '<button type="button" class="btn-sm" style="width:24px;height:24px;padding:0;font-size:.8rem;margin-right:2px;background:#e0e7ff;border-color:#a5b4fc" title="\u05E9\u05DB\u05E4\u05DC \u05E9\u05D5\u05E8\u05D4" onclick="_ocrDuplicateItemRow(this)">\uD83D\uDCCB</button>' +
    '</td>' +
    '<td><input class="ocr-itm" data-i="' + i + '" data-f="description" value="' + desc + '"></td>' +
    '<td><input type="number" class="ocr-itm" data-i="' + i + '" data-f="quantity" value="' + qty + '" step="1" min="0" oninput="_ocrCalcItemRow(this)"></td>' +
    '<td><input type="number" class="ocr-itm" data-i="' + i + '" data-f="unit_price" value="' + price + '" step="0.01" oninput="_ocrCalcItemRow(this)"></td>' +
    '<td><input type="number" class="ocr-itm" data-i="' + i + '" data-f="discount" value="' + disc + '" step="0.01" min="0" max="100" oninput="_ocrCalcItemRow(this)"></td>' +
    '<td><input type="number" class="ocr-itm" data-i="' + i + '" data-f="total" value="' + total + '" step="0.01"></td></tr>';
}

// Add empty item row
function _ocrAddItemRow() {
  var tbody = $('ocr-items-body'); if (!tbody) return;
  var idx = tbody.rows.length;
  tbody.insertAdjacentHTML('beforeend', _ocrBuildItemRow(idx, '', '', '', 0, ''));
}

// Delete item row
function _ocrDeleteItemRow(btn) {
  var row = btn.closest('tr'); if (!row) return;
  row.remove();
}

// Duplicate item row (clone values into a new row below)
function _ocrDuplicateItemRow(btn) {
  var row = btn.closest('tr'); if (!row) return;
  var tbody = $('ocr-items-body'); if (!tbody) return;
  var idx = tbody.rows.length;
  var v = function(f) { var el = row.querySelector('[data-f="' + f + '"]'); return el ? el.value : ''; };
  var newHtml = _ocrBuildItemRow(idx, escapeHtml(v('description')), v('quantity'), v('unit_price'), v('discount'), v('total'));
  row.insertAdjacentHTML('afterend', newHtml);
}

// Auto-calc item row total: qty × price × (1 - discount/100)
function _ocrCalcItemRow(inp) {
  var row = inp.closest('tr'); if (!row) return;
  var v = function(f) { return Number(row.querySelector('[data-f="' + f + '"]').value) || 0; };
  var t = row.querySelector('[data-f="total"]');
  if (t) t.value = (v('quantity') * v('unit_price') * (1 - v('discount') / 100)).toFixed(2);
}

// Switch OCR preview page (multi-file documents)
function _ocrSwitchPage(pageIdx) {
  var files = window._ocrPageFiles;
  if (!files || !files[pageIdx]) return;
  var pf = files[pageIdx];
  var container = $('ocr-preview-content');
  if (!container) return;
  if (pf.url) {
    var ext = (pf.name || '').split('.').pop().toLowerCase();
    container.innerHTML = ext === 'pdf'
      ? '<iframe src="' + escapeHtml(pf.url) + '" style="width:100%;height:calc(100% - 36px);border:none" title="PDF"></iframe>'
      : '<img src="' + escapeHtml(pf.url) + '" style="max-width:100%;max-height:calc(100% - 36px);object-fit:contain">';
  } else {
    container.innerHTML = '<div style="text-align:center;color:var(--g400);padding:24px">\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF</div>';
  }
  // Update active button
  document.querySelectorAll('.ocr-page-btn').forEach(function(btn) {
    var idx = Number(btn.getAttribute('data-page'));
    var isFailed = files[idx] && files[idx].failed;
    btn.style.background = idx === pageIdx ? '#7c3aed' : (isFailed ? '#ef4444' : '#e5e7eb');
    btn.style.color = idx === pageIdx || isFailed ? '#fff' : '#374151';
  });
}
