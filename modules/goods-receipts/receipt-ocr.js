// receipt-ocr.js — OCR integration in goods receipt flow (Phase 5d + Phase 8)
// Load after: receipt-form.js, receipt-ocr-review.js; before receipt-actions.js
// Provides: initReceiptOCR(), _rcptOcrScan(), _applyOCRToReceipt(), _rcptOcrShowBanner()
// Phase 8: _rcptOcrFC(), _rcptOcrAddConfDot(), _rcptOcrSuggestPO()
// Phase 8 Step 2b: items go through review UI (_rcptOcrClassifyItems → _rcptOcrShowReview)
// Uses: _pendingReceiptFile, supplierCache/Rev, uploadSupplierFile, getSupplierFileUrl

var _rcptOcrResult = null; // Phase 5e: stored when OCR applied, used for learning

// --- Phase 8: Per-field confidence helpers ---
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
  // Patch _pickReceiptFile to preserve original behavior
  var origPick = window._pickReceiptFile;
  window._pickReceiptFile = function() { origPick(); };
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
  if (btn) btn.style.display = _pendingReceiptFile ? '' : 'none';
}

// --- 2. Trigger OCR scan — upload file, call Edge Function ---
async function _rcptOcrScan() {
  if (!_pendingReceiptFile) { toast('\u05D0\u05D9\u05DF \u05E7\u05D5\u05D1\u05E5 \u05DC\u05E1\u05E8\u05D9\u05E7\u05D4', 'e'); return; }
  var jwt = sessionStorage.getItem('prizma_auth_token') || sessionStorage.getItem('jwt_token');
  if (!jwt) { toast('\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9', 'e'); return; }

  var supplierName = ($('rcpt-supplier') || {}).value || '';
  var supplierId = supplierName ? (supplierCache[supplierName] || null) : null;

  showLoading('\u05DE\u05E2\u05DC\u05D4 \u05E7\u05D5\u05D1\u05E5 \u05D5\u05E1\u05D5\u05E8\u05E7...');
  try {
    var uploadResult = await uploadSupplierFile(_pendingReceiptFile, supplierId || 'ocr-pending');
    if (!uploadResult || !uploadResult.url) {
      hideLoading(); toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05EA \u05E7\u05D5\u05D1\u05E5', 'e'); return;
    }
    var fileUrl = uploadResult.url;
    _pendingReceiptFileUrl = fileUrl; // track for cleanup if user removes file
    var rcptType = ($('rcpt-type') || {}).value || null;

    var res = await fetch(SUPABASE_URL + '/functions/v1/ocr-extract', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_url: fileUrl, supplier_id: supplierId,
        document_type_hint: rcptType, tenant_id: getTenantId() })
    });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05E8\u05D9\u05E7\u05D4');
    }
    var result = await res.json();
    hideLoading();
    if (result.success && result.extracted_data) {
      await _applyOCRToReceipt(result, fileUrl);
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
  // Phase 5e: store for learning on confirm
  _rcptOcrResult = { extracted_data: ext, supplier_match: supMatch, extraction_id: result.extraction_id };
  var fv = function(f) {
    var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v;
  };
  // Auto-fill supplier
  var supFilled = false;
  if (supMatch && supMatch.id) {
    var supName = supplierCacheRev[supMatch.id];
    if (supName) {
      var sel = $('rcpt-supplier');
      if (sel) { sel.value = supName; sel.dispatchEvent(new Event('change')); supFilled = true; }
      await new Promise(function(r) { setTimeout(r, 300); });
    }
  } else if (fv('supplier_name')) {
    var aiName = (fv('supplier_name') || '').trim().toLowerCase();
    var bestMatch = null;
    for (var sn in supplierCache) {
      if (sn.toLowerCase() === aiName || sn.toLowerCase().includes(aiName) || aiName.includes(sn.toLowerCase())) {
        bestMatch = sn; break;
      }
    }
    if (bestMatch) {
      var sel = $('rcpt-supplier');
      if (sel) { sel.value = bestMatch; sel.dispatchEvent(new Event('change')); supFilled = true; }
      await new Promise(function(r) { setTimeout(r, 300); });
    }
  }
  if (supFilled) _rcptOcrAddConfDot('rcpt-supplier', _rcptOcrFC(ext, 'supplier_name'));

  // Auto-fill document number, date, type
  var docNum = fv('document_number');
  if (docNum) { var numEl = $('rcpt-number'); if (numEl && !numEl.value) { numEl.value = docNum; _rcptOcrAddConfDot('rcpt-number', _rcptOcrFC(ext, 'document_number')); } }
  var docDate = fv('document_date');
  if (docDate) { var dateEl = $('rcpt-date'); if (dateEl && !dateEl.value) { dateEl.value = docDate; _rcptOcrAddConfDot('rcpt-date', _rcptOcrFC(ext, 'document_date')); } }
  var docType = fv('document_type');
  if (docType) {
    var typeEl = $('rcpt-type');
    var typeMap = { invoice: 'invoice', tax_invoice: 'tax_invoice', delivery_note: 'delivery_note' };
    if (typeEl && typeMap[docType]) { typeEl.value = typeMap[docType]; _rcptOcrAddConfDot('rcpt-type', _rcptOcrFC(ext, 'document_type')); }
  }

  // Phase 8: PO auto-suggestion
  if (supFilled) await _rcptOcrSuggestPO(ext);

  // Validate OCR data and show banner
  var _ocrValidation = [];
  if (typeof validateOCRData === 'function') {
    _ocrValidation = validateOCRData(Object.assign({}, ext, { supplier_match: supMatch }));
  }
  _rcptOcrShowBanner(conf, 0, 0, fileUrl, _ocrValidation);

  // Phase 8: Process items through review UI instead of direct insert
  var items = fv('items') || [];
  if (Array.isArray(items) && items.length > 0) {
    var supplierId = supplierCache[($('rcpt-supplier') || {}).value] || null;
    var classified = await _rcptOcrClassifyItems(items, supplierId);
    _rcptOcrShowReview(classified, function(confirmed) { _rcptOcrApplyToForm(confirmed, items); });
  } else {
    toast('\u05D4\u05DE\u05E1\u05DE\u05DA \u05E0\u05E1\u05E8\u05E7 \u2014 \u05DC\u05D0 \u05D6\u05D5\u05D4\u05D5 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD', 'w');
  }
}

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
  var t = '\uD83E\uDD16 \u05DE\u05D5\u05DC\u05D0 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DE\u05E1\u05E8\u05D9\u05E7\u05D4 \u2014 \u05E8\u05DE\u05EA \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF: <span style="color:' + cc + ';font-weight:700">' + pct + '%</span>';
  if (total > 0) t += ' \u2014 \u05D6\u05D5\u05D4\u05D5 ' + matched + '/' + total + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD';
  if (validationResults && validationResults.length > 0) {
    t += '<br>';
    validationResults.forEach(function(v) {
      var icon = v.level === 'error' ? '\uD83D\uDD34' : '\u26A0\uFE0F';
      t += '<span style="color:' + (v.level === 'error' ? '#e74c3c' : '#f39c12') + '">' + icon + ' ' + escapeHtml(v.msg) + '</span> ';
    });
  }
  b.innerHTML = t;
  if (fileUrl) {
    var vb = document.createElement('button'); vb.className = 'btn btn-sm'; vb.style.cssText = 'background:#e5e7eb;color:#1e293b';
    vb.style.cssText = 'margin-right:auto;font-size:.8rem';
    vb.textContent = '\uD83D\uDCC4 \u05E6\u05E4\u05D4 \u05D1\u05DE\u05E7\u05D5\u05E8';
    vb.onclick = function() { _rcptOcrPreviewDoc(fileUrl); }; b.appendChild(vb);
  }
  var cb = document.createElement('button');
  cb.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1rem;color:var(--g600)';
  cb.textContent = '\u2715'; cb.onclick = function() { b.remove(); }; b.appendChild(cb);
  var s2 = $('rcpt-step2'); if (s2) s2.insertBefore(b, s2.firstChild);
}

// --- 7. Preview source document in modal ---
async function _rcptOcrPreviewDoc(fileUrl) {
  var signedUrl = await getSupplierFileUrl(fileUrl);
  if (!signedUrl) { toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4', 'e'); return; }
  var fext = (fileUrl || '').split('.').pop().toLowerCase();
  var tag = fext === 'pdf'
    ? '<iframe src="' + escapeHtml(signedUrl) + '" style="width:100%;height:80vh;border:none" title="PDF"></iframe>'
    : '<img src="' + escapeHtml(signedUrl) + '" style="max-width:100%;max-height:80vh;object-fit:contain">';
  var o = document.createElement('div'); o.id = 'rcpt-ocr-preview-modal'; o.className = 'modal-overlay';
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center';
  o.onclick = function(e) { if (e.target === o) o.remove(); };
  o.innerHTML = '<div style="background:#fff;border-radius:12px;padding:16px;max-width:90vw;max-height:90vh;overflow:auto">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
    '<strong>\uD83D\uDCC4 \u05DE\u05E1\u05DE\u05DA \u05DE\u05E7\u05D5\u05E8</strong>' +
    '<button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" onclick="this.closest(\'.modal-overlay\').remove()">\u05E1\u05D2\u05D5\u05E8</button></div>' + tag + '</div>';
  document.body.appendChild(o);
}

// --- 8. Compare OCR data to final form and update template (Phase 5e) ---
async function _rcptOcrUpdateTemplate() {
  if (!_rcptOcrResult) return;
  try {
    var ext = _rcptOcrResult.extracted_data || {};
    var fv = function(f) { var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
    var supplierId = (_rcptOcrResult.supplier_match && _rcptOcrResult.supplier_match.id) || null;
    if (!supplierId) {
      var supName = ($('rcpt-supplier') || {}).value;
      if (supName && typeof supplierCache !== 'undefined') supplierId = supplierCache[supName] || null;
    }
    if (!supplierId) { _rcptOcrResult = null; return; }
    // Build corrections by comparing OCR original to final form values
    var corrections = {};
    var finalDocNum = (($('rcpt-number') || {}).value || '').trim();
    var ocrDocNum = fv('document_number');
    if (ocrDocNum && String(ocrDocNum) !== finalDocNum) {
      corrections.document_number = { ai: ocrDocNum, user: finalDocNum };
    }
    var finalDate = ($('rcpt-date') || {}).value || '';
    var ocrDate = fv('document_date');
    if (ocrDate && String(ocrDate) !== finalDate) {
      corrections.document_date = { ai: ocrDate, user: finalDate };
    }
    var docType = fv('document_type') || 'delivery_note';
    await updateOCRTemplate(supplierId, docType,
      Object.keys(corrections).length > 0 ? corrections : null, ext);
    // Phase 8 Step 5: save item-level corrections
    if (window._lastOcrItemCorrections) {
      var lc = window._lastOcrItemCorrections;
      if (typeof _rcptOcrBuildItemCorrections === 'function') {
        var itemCorr = _rcptOcrBuildItemCorrections(lc.original, lc.confirmed);
        if (itemCorr.length > 0) await _rcptOcrSaveItemLearning(itemCorr, lc.supplierId || supplierId);
      }
      delete window._lastOcrItemCorrections;
    }
  } catch (e) {
    console.warn('_rcptOcrUpdateTemplate error:', e);
  }
  _rcptOcrResult = null;
}

// Patch confirmReceiptCore to call template update after successful confirm
function _patchReceiptConfirmForOCR() {
  var orig = typeof confirmReceiptCore === 'function' ? confirmReceiptCore : null;
  if (!orig) return;
  window.confirmReceiptCore = async function(receiptId, rcptNumber, poId) {
    await orig(receiptId, rcptNumber, poId);
    await _rcptOcrUpdateTemplate();
  };
}

// --- 9. Initialize on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    initReceiptOCR();
    _patchReceiptConfirmForOCR();
  }, 200);
});
