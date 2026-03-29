// receipt-ocr-learn.js — OCR learning: stage detection, template updates, event listener
// Split from receipt-ocr.js. Load AFTER receipt-ocr.js.
// Uses globals: _rcptOcrResult, _rcptOcrStage (defined in receipt-ocr.js)
// Provides: _getSupplierLearningStage(), _rcptOcrShowStageIndicator(), _rcptOcrUpdateTemplate()

// --- Fetch supplier's learning stage from ocr_templates ---
async function _getSupplierLearningStage(supplierId) {
  try {
    var { data } = await sb.from(T.OCR_TEMPLATES)
      .select('learning_stage, times_used, accuracy_rate')
      .eq('tenant_id', getTenantId())
      .eq('supplier_id', supplierId)
      .eq('is_active', true)
      .maybeSingle();
    return data || { learning_stage: 'learning', times_used: 0, accuracy_rate: 0 };
  } catch (e) { return { learning_stage: 'learning', times_used: 0, accuracy_rate: 0 }; }
}

// --- Stage indicator: show learning/suggesting/auto near OCR banner ---
function _rcptOcrShowStageIndicator(stage) {
  var old = $('rcpt-ocr-stage'); if (old) old.remove();
  if (!_rcptOcrStage) return;
  var s = _rcptOcrStage;
  var el = document.createElement('div'); el.id = 'rcpt-ocr-stage';
  el.style.cssText = 'font-size:.82rem;padding:6px 12px;border-radius:6px;margin-bottom:8px;direction:rtl';
  if (stage === 'learning') {
    el.style.background = '#fef2f2'; el.style.color = '#991b1b'; el.style.border = '1px solid #fecaca';
    el.textContent = '\uD83D\uDD34 AI \u05DC\u05D5\u05DE\u05D3 \u05E2\u05DC \u05D4\u05E1\u05E4\u05E7 \u05D4\u05D6\u05D4 (' + (s.times_used || 0) + ' \u05E1\u05E8\u05D9\u05E7\u05D5\u05EA) \u2014 \u05D4\u05DB\u05E0\u05E1 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D9\u05D3\u05E0\u05D9\u05EA';
  } else if (stage === 'auto') {
    var acc = s.accuracy_rate != null ? Math.round(s.accuracy_rate) : '\u2014';
    el.style.background = '#f0fdf4'; el.style.color = '#166534'; el.style.border = '1px solid #bbf7d0';
    el.textContent = '\uD83D\uDFE2 AI \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9 (\u05D3\u05D9\u05D5\u05E7 ' + acc + '%) \u2014 \u05D1\u05D3\u05D5\u05E7 \u05D5\u05D0\u05E9\u05E8';
  } else {
    var acc2 = s.accuracy_rate != null ? Math.round(s.accuracy_rate) : '\u2014';
    el.style.background = '#fffbeb'; el.style.color = '#92400e'; el.style.border = '1px solid #fde68a';
    el.textContent = '\uD83D\uDFE1 AI \u05DE\u05E6\u05D9\u05E2 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD (' + (s.times_used || 0) + ' \u05E1\u05E8\u05D9\u05E7\u05D5\u05EA, \u05D3\u05D9\u05D5\u05E7 ' + acc2 + '%) \u2014 \u05D1\u05D3\u05D5\u05E7 \u05D5\u05EA\u05E7\u05DF';
  }
  var banner = $('rcpt-ocr-banner');
  if (banner && banner.parentNode) banner.parentNode.insertBefore(el, banner.nextSibling);
  else { var s2 = $('rcpt-step2'); if (s2) s2.insertBefore(el, s2.firstChild); }
}

// --- Compare OCR data to final form and update template ---
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
    var corrections = {}, finalDocNum = (($('rcpt-number') || {}).value || '').trim(), ocrDocNum = fv('document_number');
    if (ocrDocNum && String(ocrDocNum) !== finalDocNum) corrections.document_number = { ai: ocrDocNum, user: finalDocNum };
    var finalDate = ($('rcpt-date') || {}).value || '', ocrDate = fv('document_date');
    if (ocrDate && String(ocrDate) !== finalDate) corrections.document_date = { ai: ocrDate, user: finalDate };
    var docType = fv('document_type') || 'delivery_note';

    // Count fields suggested vs accepted for per-field accuracy tracking
    var fieldsSuggested = 0, fieldsAccepted = 0;
    var fieldChecks = [
      { ocr: fv('supplier_name'), final: ($('rcpt-supplier') || {}).value },
      { ocr: ocrDocNum, final: finalDocNum },
      { ocr: fv('document_type'), final: ($('rcpt-type') || {}).value },
      { ocr: ocrDate, final: finalDate },
      { ocr: fv('subtotal'), final: null },
      { ocr: fv('total_amount'), final: null }
    ];
    fieldChecks.forEach(function(fc) {
      if (fc.ocr != null && String(fc.ocr).trim()) {
        fieldsSuggested++;
        if (fc.final == null || String(fc.ocr) === String(fc.final)) fieldsAccepted++;
      }
    });

    await updateOCRTemplate(supplierId, docType,
      Object.keys(corrections).length > 0 ? corrections : null, ext,
      null, fieldsSuggested, fieldsAccepted);
    // Save item-level corrections
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

// Listen for receipt confirmation → learn from OCR BEFORE clearing result
document.addEventListener('receipt-confirmed', function(e) {
  var ocrSnapshot = _rcptOcrResult ? { ext: _rcptOcrResult.extracted_data || {}, supMatch: _rcptOcrResult.supplier_match } : null;
  _rcptOcrUpdateTemplate();
  if (!ocrSnapshot || typeof supplierCache === 'undefined') return;
  var fv = function(f) { var v = ocrSnapshot.ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
  var finalSup = ($('rcpt-supplier') || {}).value, finalSupId = finalSup ? supplierCache[finalSup] : null;

  // Learn supplier alias
  if (typeof OcrSupplierMatch !== 'undefined') {
    var ocrName = fv('supplier_name');
    if (ocrName && finalSupId) OcrSupplierMatch.learnSupplierAlias(ocrName, finalSupId, getTenantId());
  }
  // Learn doc type correction + ai_has_po_pattern
  if (finalSupId) {
    var ocrType = fv('document_type'), finalType = ($('rcpt-type') || {}).value || '';
    if (ocrType && finalType && ocrType !== finalType) {
      sb.from(T.OCR_TEMPLATES).update({ document_type_code: finalType }).eq('supplier_id', finalSupId).eq('tenant_id', getTenantId()).then(function() {});
    }
    var hadPO = !!rcptLinkedPoId;
    if (hadPO) sb.from(T.SUPPLIERS).update({ ai_has_po_pattern: true }).eq('id', finalSupId).eq('tenant_id', getTenantId()).then(function() {});
    else sb.from(T.SUPPLIERS).update({ ai_has_po_pattern: false }).eq('id', finalSupId).eq('tenant_id', getTenantId()).is('ai_has_po_pattern', null).then(function() {});
    _rcptOcrLearnDocNum(fv, finalSupId);
  }
});
