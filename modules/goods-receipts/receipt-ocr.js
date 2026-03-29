// receipt-ocr.js — OCR integration in goods receipt flow
// Load after: receipt-form.js, receipt-ocr-supplier.js, receipt-ocr-po.js
// Learning functions (stage, template update) → receipt-ocr-learn.js
var _rcptOcrResult = null; // stored when OCR applied, used for learning
var _rcptOcrStage = null;  // { learning_stage, times_used, accuracy_rate } for current supplier

// --- Per-field confidence helpers ---
function _rcptOcrFC(ext, f) {
  var v = ext[f];
  if (v && typeof v === 'object' && 'confidence' in v) return v.confidence;
  return (ext.confidence && typeof ext.confidence[f] === 'number') ? ext.confidence[f] : null;
}
function _rcptOcrAddConfDot(elId, conf) {
  var el = $(elId); if (!el || conf == null) return;
  var clr = conf >= 0.9 ? '#27ae60' : conf >= 0.7 ? '#f39c12' : '#e74c3c';
  var dot = document.createElement('span');
  dot.className = 'ocr-conf-dot';
  dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:' + clr + ';margin:0 4px;vertical-align:middle';
  dot.title = Math.round(conf * 100) + '%';
  el.parentNode.insertBefore(dot, el.nextSibling);
  el.addEventListener('change', function _rm() { if (dot.parentNode) dot.remove(); el.removeEventListener('change', _rm); });
}

// --- 1. Inject OCR button next to file attach button ---
function initReceiptOCR() {
  var attachName = $('rcpt-attach-name');
  if (!attachName || $('rcpt-ocr-btn')) return;
  var btn = document.createElement('button');
  btn.id = 'rcpt-ocr-btn';
  btn.className = 'btn btn-sm'; btn.style.cssText = 'background:#059669;color:#fff';
  btn.style.cssText = 'width:100%;margin-top:4px;display:none';
  btn.innerHTML = '\uD83E\uDD16 \u05E1\u05E8\u05D5\u05E7 \u05E2\u05DD AI';
  btn.onclick = _rcptOcrScan;
  attachName.parentNode.appendChild(btn);
  // MutationObserver on attach elements to detect file selection
  var obs = new MutationObserver(function() { _rcptOcrUpdateBtn(); });
  obs.observe(attachName, { childList: true, characterData: true, subtree: true });
  var attachBtn = $('rcpt-attach-btn');
  if (attachBtn) {
    new MutationObserver(function() { _rcptOcrUpdateBtn(); })
      .observe(attachBtn, { childList: true, characterData: true, subtree: true });
  }
}

function _rcptOcrUpdateBtn() {
  var btn = $('rcpt-ocr-btn');
  // Show OCR button whenever a file is attached — regardless of PO linkage.
  // Scenario A (PO + invoice) needs scan to compare items.
  if (btn) btn.style.display = _pendingReceiptFile ? '' : 'none';
}

// --- 2. Trigger OCR scan — upload ALL staged files, call Edge Function ---
async function _rcptOcrScan() {
  // Cached re-scan: PO selected after first scan → compare without re-uploading
  if (typeof _rcptOcrCachedRescan === 'function' && await _rcptOcrCachedRescan()) return;
  if (!_pendingReceiptFile) { toast('\u05D0\u05D9\u05DF \u05E7\u05D5\u05D1\u05E5 \u05DC\u05E1\u05E8\u05D9\u05E7\u05D4', 'e'); return; }
  var jwt = sessionStorage.getItem('prizma_auth_token') || sessionStorage.getItem('jwt_token');
  if (!jwt) { toast('\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9', 'e'); return; }
  var supplierName = ($('rcpt-supplier') || {}).value || '';
  var supplierId = supplierName ? (supplierCache[supplierName] || null) : null;
  // Collect ALL staged files (not just first)
  var filesToScan = (typeof _pendingReceiptFiles !== 'undefined' && _pendingReceiptFiles.length) ? _pendingReceiptFiles : [_pendingReceiptFile];
  var fileCount = filesToScan.length;
  showLoading('\u05DE\u05E2\u05DC\u05D4 ' + fileCount + ' \u05E7\u05D1\u05E6\u05D9\u05DD \u05D5\u05E1\u05D5\u05E8\u05E7...');
  try {
    // Upload all files
    var uploadedUrls = [];
    for (var fi = 0; fi < filesToScan.length; fi++) {
      var ur = await uploadSupplierFile(filesToScan[fi], supplierId || 'ocr-pending');
      if (ur && ur.url) uploadedUrls.push(ur.url);
    }
    if (!uploadedUrls.length) {
      hideLoading(); toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05EA \u05E7\u05D1\u05E6\u05D9\u05DD', 'e'); return;
    }
    if (uploadedUrls.length < filesToScan.length) {
      toast('\u05D4\u05D5\u05E2\u05DC\u05D5 ' + uploadedUrls.length + ' \u05DE\u05EA\u05D5\u05DA ' + filesToScan.length + ' \u05E7\u05D1\u05E6\u05D9\u05DD', 'w');
    }
    _pendingReceiptFileUrl = uploadedUrls[0];
    var rcptType = ($('rcpt-type') || {}).value || null;

    // Send all file URLs in one request (Edge Function handles multi-file)
    var body = {
      supplier_id: supplierId,
      document_type_hint: rcptType,
      tenant_id: getTenantId()
    };
    if (uploadedUrls.length === 1) { body.file_url = uploadedUrls[0]; }
    else { body.file_urls = uploadedUrls; }

    var res = await fetch(SUPABASE_URL + '/functions/v1/ocr-extract', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05E8\u05D9\u05E7\u05D4');
    }
    var result = await res.json();
    hideLoading();
    if (result.success && result.extracted_data) {
      await _applyOCRToReceipt(result, uploadedUrls[0]);
    } else {
      toast(result.error || '\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05E7\u05E8\u05D5\u05D0 \u05D0\u05EA \u05D4\u05DE\u05E1\u05DE\u05DA', 'e');
    }
  } catch (e) {
    hideLoading(); console.error('_rcptOcrScan error:', e);
    toast(e.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05E8\u05D9\u05E7\u05D4', 'e');
  }
}

// --- 3. Apply OCR results to receipt form ---
async function _applyOCRToReceipt(result, fileUrl) {
  var ext = result.extracted_data || {};
  var conf = result.confidence_score || 0;
  var supMatch = result.supplier_match;
  _rcptOcrResult = { extracted_data: ext, supplier_match: supMatch, extraction_id: result.extraction_id };
  if (typeof _rcptOcrToggleLearnBtn === 'function') _rcptOcrToggleLearnBtn();
  var fv = function(f) { var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
  // Capture PO state BEFORE supplier auto-fill (which may reset the PO dropdown)
  var _preOcrPoId = ($('rcpt-po-select') || {}).value || null;
  var supFilled = false;
  var ocrSupName = fv('supplier_name') || '';
  if (supMatch && supMatch.id) {
    var supName = supplierCacheRev[supMatch.id];
    if (supName) {
      var sel = $('rcpt-supplier');
      if (sel) { sel.value = supName; sel.dispatchEvent(new Event('change')); supFilled = true; }
      await new Promise(function(r) { setTimeout(r, 300); });
    }
  } else if (ocrSupName && typeof OcrSupplierMatch !== 'undefined') {
    var aiMatch = { supplierId: null, confidence: 'low', matchType: 'none' };
    try {
      aiMatch = await OcrSupplierMatch.matchSupplier(ocrSupName, getTenantId());
    } catch (aiErr) { console.error('AI supplier match failed:', aiErr); }
    if (aiMatch.supplierId && aiMatch.supplierName) {
      var sel = $('rcpt-supplier');
      if (sel) { sel.value = aiMatch.supplierName; sel.dispatchEvent(new Event('change')); supFilled = true; }
      await new Promise(function(r) { setTimeout(r, 300); });
      _rcptOcrShowSupplierHint(aiMatch.confidence, aiMatch.supplierName, aiMatch.matchType);
    }
  }
  if (supFilled) _rcptOcrAddConfDot('rcpt-supplier', _rcptOcrFC(ext, 'supplier_name'));
  if (!supFilled && ocrSupName) _rcptOcrShowSupplierHint('low', ocrSupName, 'none');

  // Auto-fill document number, date, type
  var docNum = fv('document_number');
  if (docNum) { var numEl = $('rcpt-number'); if (numEl && !numEl.value) { numEl.value = docNum; _rcptOcrAddConfDot('rcpt-number', _rcptOcrFC(ext, 'document_number')); } }
  var docDate = fv('document_date');
  if (docDate) { var dateEl = $('rcpt-date'); if (dateEl && !dateEl.value) { dateEl.value = docDate; _rcptOcrAddConfDot('rcpt-date', _rcptOcrFC(ext, 'document_date')); } }
  var docType = fv('document_type');
  if (docType) {
    var typeEl = $('rcpt-type');
    var typeMap = { invoice: 'tax_invoice', tax_invoice: 'tax_invoice', delivery_note: 'delivery_note' };
    if (typeEl && typeMap[docType]) { typeEl.value = typeMap[docType]; _rcptOcrAddConfDot('rcpt-type', _rcptOcrFC(ext, 'document_type')); }
  }

  // PO auto-match via AI + fallback to suggestion
  var items = fv('items') || [];
  var supplierId = supplierCache[($('rcpt-supplier') || {}).value] || null;
  var poMatched = false;
  if (supFilled && supplierId && typeof OcrPOMatch !== 'undefined' && items.length > 0) {
    var poMatch = { poId: null, score: 0, confidence: 'low' };
    try {
      poMatch = await OcrPOMatch.findBestPO(supplierId, items, getTenantId());
    } catch (poErr) { console.error('AI PO match failed:', poErr); }
    if (poMatch.poId && poMatch.score > 50) {
      var poSel = $('rcpt-po-select');
      if (poSel && !poSel.disabled) {
        poSel.value = poMatch.poId;
        poSel.dispatchEvent(new Event('change'));
        await new Promise(function(r) { setTimeout(r, 400); });
        poMatched = true;
        _rcptOcrShowPOHint(poMatch.confidence, poMatch.poNumber, poMatch.score);
        var { data: poItems } = await sb.from(T.PO_ITEMS).select('*').eq('tenant_id', getTenantId()).eq('po_id', poMatch.poId);
        if (poItems) window._ocrPOComparison = OcrPOMatch.compareItems(items, poItems);
      }
    } else {
      await _rcptOcrSuggestPO(ext);
    }
  } else if (supFilled) {
    await _rcptOcrSuggestPO(ext);
  }
  // Also check if user had PO selected before OCR
  if (!poMatched) {
    var existingPO = ($('rcpt-po-select') || {}).value;
    if (existingPO) poMatched = true;
  }

  // Validate OCR data and show banner
  var _ocrValidation = [];
  if (typeof validateOCRData === 'function') {
    _ocrValidation = validateOCRData(Object.assign({}, ext, { supplier_match: supMatch }));
  }
  _rcptOcrShowBanner(conf, 0, 0, fileUrl, _ocrValidation);

  // --- Fetch supplier's learning stage ---
  _rcptOcrStage = supplierId ? await _getSupplierLearningStage(supplierId) : null;
  var stage = _rcptOcrStage ? _rcptOcrStage.learning_stage : 'learning';

  // Path A: PO matched — highlights in main table (stage doesn't affect PO compare)
  if (Array.isArray(items) && items.length > 0 && poMatched && window._ocrPOComparison) {
    toast('AI \u05D4\u05E9\u05D5\u05D5\u05D4 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05D4\u05D6\u05DE\u05E0\u05EA \u05E8\u05DB\u05E9 \u2014 \u05D1\u05D3\u05D5\u05E7 \u05E1\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD \u05E6\u05D4\u05D5\u05D1\u05D9\u05DD \u05D1\u05D8\u05D1\u05DC\u05D4', 'i');
    setTimeout(function() { if (typeof _applyOcrHighlights === 'function') _applyOcrHighlights(); }, 300);
    _rcptOcrShowCompareBtn();
    _rcptOcrShowStageIndicator(stage);
    return;
  }

  // Path B/C: No PO — behavior depends on learning stage
  if (!Array.isArray(items) || items.length === 0) {
    toast('\u05D4\u05DE\u05E1\u05DE\u05DA \u05E0\u05E1\u05E8\u05E7 \u2014 \u05DC\u05D0 \u05D6\u05D5\u05D4\u05D5 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD', 'w');
    _rcptOcrShowStageIndicator(stage);
    return;
  }

  if (!supFilled) {
    // Supplier NOT identified — store items, wait for manual selection
    window._pendingOcrRawItems = items;
    window._ocrReviewShown = false;
    _rcptOcrShowStageIndicator(stage);
    return;
  }

  // --- Stage-aware item processing ---
  if (stage === 'learning') {
    // LEARNING: header filled, no items — user enters manually
    _rcptOcrShowStageIndicator(stage);
    toast('\uD83D\uDD34 AI \u05DC\u05D5\u05DE\u05D3 \u05E2\u05DC \u05D4\u05E1\u05E4\u05E7 \u05D4\u05D6\u05D4 \u2014 \u05D4\u05DB\u05E0\u05E1 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D9\u05D3\u05E0\u05D9\u05EA', 'i');
    // Store items for learning on confirm (even though we don't display them)
    window._pendingOcrRawItems = items;
  } else if (stage === 'auto') {
    // AUTO: add items directly to table, skip review modal
    _rcptOcrShowStageIndicator(stage);
    var classified = await _rcptOcrClassifyItems(items, supplierId);
    _rcptOcrApplyToForm(classified, items);
    toast('\uD83D\uDFE2 AI \u05DE\u05D9\u05DC\u05D0 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u2014 \u05D1\u05D3\u05D5\u05E7 \u05D5\u05D0\u05E9\u05E8', 's');
  } else {
    // SUGGESTING (default): show review modal
    _rcptOcrShowStageIndicator(stage);
    window._ocrReviewShown = true;
    var poSel2 = $('rcpt-po-select');
    var hasOpenPOs = poSel2 && poSel2.options && poSel2.options.length > 1 && !poSel2.disabled;
    if (hasOpenPOs) {
      window._pendingOcrClassified = await _rcptOcrClassifyItems(items, supplierId);
      window._pendingOcrRawItems = items;
      _rcptOcrShowPOChoiceModal();
    } else {
      var classified2 = await _rcptOcrClassifyItems(items, supplierId);
      _rcptOcrShowReview(classified2, function(confirmed) {
        _rcptOcrApplyToForm(confirmed, items);
        if (window._ocrPOComparison) setTimeout(_applyOcrHighlights, 200);
      });
    }
  }

  // --- PO comparison: runs in ALL stages when a PO is linked ---
  // Uses _preOcrPoId captured before supplier auto-fill reset the dropdown.
  var poIdForCompare = ($('rcpt-po-select') || {}).value || _preOcrPoId || null;
  if (poIdForCompare && Array.isArray(items) && items.length > 0 && typeof OcrPOMatch !== 'undefined') {
    (async function() {
      try {
        var { data: poItems } = await sb.from(T.PO_ITEMS).select('*').eq('tenant_id', getTenantId()).eq('po_id', poIdForCompare);
        if (poItems && poItems.length) {
          window._ocrPOComparison = OcrPOMatch.compareItems(items, poItems);
          if (typeof _applyOcrHighlights === 'function') _applyOcrHighlights();
          if (typeof _rcptOcrShowCompareBtn === 'function') _rcptOcrShowCompareBtn();
        }
      } catch (e) { console.warn('PO comparison in stage flow:', e); }
    })();
  }
}

// --- AI supplier confidence hint ---
function _rcptOcrShowSupplierHint(confidence, name, matchType) {
  var old = $('rcpt-ocr-sup-hint'); if (old) old.remove();
  var hint = document.createElement('div'); hint.id = 'rcpt-ocr-sup-hint';
  hint.style.cssText = 'font-size:.8rem;margin-top:3px';
  if (confidence === 'high') {
    hint.style.color = '#059669';
    hint.textContent = '\u2705 AI \u05D6\u05D9\u05D4\u05D4: ' + name + (matchType === 'alias_exact' ? ' (\u05DC\u05DE\u05D3)' : '');
  } else if (confidence === 'medium') {
    hint.style.color = '#f59e0b';
    hint.textContent = '\u26A0\uFE0F AI \u05DE\u05E6\u05D9\u05E2: ' + name + ' \u2014 \u05D0\u05DE\u05EA';
  } else {
    hint.style.color = '#ef4444';
    hint.textContent = '\u2753 \u05E1\u05E4\u05E7 \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4\u05D4 \u2014 \u05D1\u05D7\u05E8 \u05D9\u05D3\u05E0\u05D9\u05EA';
  }
  var se = $('rcpt-supplier'); if (se && se.parentNode) se.parentNode.appendChild(hint);
}


// _rcptOcrShowStageIndicator → receipt-ocr-learn.js

// --- Phase 8: PO auto-suggestion after supplier fill ---
async function _rcptOcrSuggestPO(ext) {
  var old = $('rcpt-ocr-po-hint'); if (old) old.remove();
  var supName = ($('rcpt-supplier') || {}).value;
  var supId = supName ? (supplierCache[supName] || null) : null;
  if (!supId) return;
  try {
    var { data, error } = await sb.from(T.PO).select('id, po_number, status')
      .eq('tenant_id', getTenantId()).eq('supplier_id', supId)
      .in('status', ['sent', 'partial']).order('created_at', { ascending: false }).limit(10);
    if (error || !data || !data.length) return;
    var poSel = $('rcpt-po-select'), fv = function(f) { var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
    var ocrPoRef = fv('po_number') || fv('order_number') || '', autoId = null;
    if (ocrPoRef) { var m = data.find(function(p) { return p.po_number === ocrPoRef; }); if (m) autoId = m.id; }
    if (autoId && poSel && !poSel.disabled) { poSel.value = autoId; poSel.dispatchEvent(new Event('change')); }
    var hint = document.createElement('div'); hint.id = 'rcpt-ocr-po-hint';
    hint.style.cssText = 'font-size:.82rem;color:#1565c0;margin-top:4px;cursor:pointer';
    hint.textContent = '\uD83D\uDCCB \u05D9\u05E9 ' + data.length + ' \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05E4\u05EA\u05D5\u05D7\u05D5\u05EA \u05DC\u05E1\u05E4\u05E7 \u05D6\u05D4' + (autoId ? ' \u2014 \u05D4\u05D5\u05EA\u05D0\u05DE\u05D4 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA' : '');
    if (!autoId && poSel && !poSel.disabled) hint.onclick = function() { poSel.value = data[0].id; poSel.dispatchEvent(new Event('change')); };
    var se = $('rcpt-supplier'); if (se && se.parentNode) se.parentNode.appendChild(hint);
  } catch (e) { console.warn('_rcptOcrSuggestPO error:', e); }
}

// --- 4. Show OCR confidence banner at top of receipt form ---
function _rcptOcrShowBanner(confidence, matched, total, fileUrl, validationResults) {
  var ex = $('rcpt-ocr-banner'); if (ex) ex.remove();
  var hasErr = validationResults && validationResults.some(function(v) { return v.level === 'error'; });
  var pct = Math.round((confidence || 0) * 100);
  var cc = hasErr ? '#e74c3c' : (pct >= 85 ? '#27ae60' : pct >= 70 ? '#f39c12' : '#e74c3c');
  var b = document.createElement('div'); b.id = 'rcpt-ocr-banner';
  b.style.cssText = 'background:' + (hasErr ? '#fce4ec' : '#e3f2fd') + ';border:1px solid ' + (hasErr ? '#ef9a9a' : '#90caf9') + ';border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:.88rem';
  var t = '\uD83E\uDD16 \u05E1\u05E8\u05D9\u05E7\u05D4 \u2014 \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF: <span style="color:' + cc + ';font-weight:700">' + pct + '%</span>';
  if (total > 0) t += ' \u2014 ' + matched + '/' + total + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD';
  if (validationResults && validationResults.length > 0) {
    t += '<br>'; validationResults.forEach(function(v) {
      t += '<span style="color:' + (v.level === 'error' ? '#e74c3c' : '#f39c12') + '">' + (v.level === 'error' ? '\uD83D\uDD34' : '\u26A0\uFE0F') + ' ' + escapeHtml(v.msg) + '</span> ';
    });
  }
  b.innerHTML = t;
  if (fileUrl) { var vb = document.createElement('button'); vb.className = 'btn btn-sm'; vb.style.cssText = 'margin-right:auto;font-size:.8rem'; vb.textContent = '\uD83D\uDCC4 \u05E6\u05E4\u05D4 \u05D1\u05DE\u05E7\u05D5\u05E8'; vb.onclick = function() { _rcptOcrPreviewDoc(fileUrl); }; b.appendChild(vb); }
  var cb = document.createElement('button'); cb.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1rem;color:var(--g600)'; cb.textContent = '\u2715'; cb.onclick = function() { b.remove(); }; b.appendChild(cb);
  var s2 = $('rcpt-step2'); if (s2) s2.insertBefore(b, s2.firstChild);
}

// --- 7. Preview source document in modal ---
async function _rcptOcrPreviewDoc(fileUrl) {
  var signedUrl = await getSupplierFileUrl(fileUrl);
  if (!signedUrl) { toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05EA\u05E6\u05D5\u05D2\u05D4', 'e'); return; }
  var isPdf = (fileUrl || '').toLowerCase().endsWith('.pdf');
  var tag = isPdf ? '<iframe src="' + escapeHtml(signedUrl) + '" style="width:100%;height:80vh;border:none"></iframe>'
    : '<img src="' + escapeHtml(signedUrl) + '" style="max-width:100%;max-height:80vh;object-fit:contain">';
  var o = document.createElement('div'); o.id = 'rcpt-ocr-preview-modal'; o.className = 'modal-overlay';
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center';
  o.onclick = function(e) { if (e.target === o) o.remove(); };
  o.innerHTML = '<div style="background:#fff;border-radius:12px;padding:16px;max-width:90vw;max-height:90vh;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>\uD83D\uDCC4 \u05DE\u05E1\u05DE\u05DA \u05DE\u05E7\u05D5\u05E8</strong><button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" onclick="this.closest(\'.modal-overlay\').remove()">\u05E1\u05D2\u05D5\u05E8</button></div>' + tag + '</div>';
  document.body.appendChild(o);
}

// _rcptOcrUpdateTemplate + receipt-confirmed listener → receipt-ocr-learn.js

// --- 9. Initialize on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { initReceiptOCR(); }, 200);
});
