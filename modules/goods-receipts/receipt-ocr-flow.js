// receipt-ocr-flow.js — OCR flow helpers: cached re-scan, PO choice modal, compare button
// Load after: receipt-ocr-po.js, receipt-ocr-review.js
// Load before: receipt-ocr.js reads these functions

// --- "Compare to invoice" button — show/hide the static wrapper in inventory.html ---
function _rcptOcrShowCompareBtn() {
  var wrap = document.getElementById('rcpt-ocr-compare-wrap');
  if (wrap) wrap.style.display = '';
}
function _rcptOcrHideCompareBtn() {
  var wrap = document.getElementById('rcpt-ocr-compare-wrap');
  if (wrap) wrap.style.display = 'none';
}
// Runs the actual comparison when button clicked
async function _rcptOcrRunComparison() {
  if (typeof _rcptOcrResult === 'undefined' || !_rcptOcrResult) {
    toast('\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9 \u05E1\u05E8\u05D9\u05E7\u05D4 \u2014 \u05E1\u05E8\u05D5\u05E7 \u05E7\u05D5\u05D3\u05DD \u05E2\u05DD AI', 'e'); return;
  }
  var poSel = $('rcpt-po-select');
  var ocrItems = (_rcptOcrResult.extracted_data || {}).items || [];
  if (poSel && poSel.value && ocrItems.length > 0 && typeof OcrPOMatch !== 'undefined') {
    var r = await sb.from(T.PO_ITEMS).select('*').eq('tenant_id', getTenantId()).eq('po_id', poSel.value);
    if (r.data) { window._ocrPOComparison = OcrPOMatch.compareItems(ocrItems, r.data); }
  }
  if (typeof _applyOcrHighlights === 'function') _applyOcrHighlights();
  var comp = window._ocrPOComparison || [];
  var issues = comp.filter(function(c) { return c.status !== 'match'; });
  if (issues.length === 0) {
    toast('\u2705 \u05DB\u05DC \u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD \u2014 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05D0\u05D9-\u05D4\u05EA\u05D0\u05DE\u05D5\u05EA', 's');
  } else {
    toast('\u05E0\u05DE\u05E6\u05D0\u05D5 ' + issues.length + ' \u05D0\u05D9-\u05D4\u05EA\u05D0\u05DE\u05D5\u05EA \u2014 \u05D1\u05D3\u05D5\u05E7 \u05E1\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD \u05E6\u05D4\u05D5\u05D1\u05D9\u05DD', 'w');
  }
}

// --- Cached re-scan: if PO selected after first scan, compare without re-uploading ---
async function _rcptOcrCachedRescan() {
  if (!_rcptOcrResult) return false;
  var poSel = $('rcpt-po-select');
  if (!poSel || !poSel.value) return false;
  var cachedItems = (_rcptOcrResult.extracted_data || {}).items;
  if (!Array.isArray(cachedItems) || cachedItems.length === 0) return false;
  var { data: poItems } = await sb.from(T.PO_ITEMS).select('*').eq('tenant_id', getTenantId()).eq('po_id', poSel.value);
  if (poItems && typeof OcrPOMatch !== 'undefined') {
    window._ocrPOComparison = OcrPOMatch.compareItems(cachedItems, poItems);
    toast('AI \u05D4\u05E9\u05D5\u05D5\u05D4 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05D4\u05D6\u05DE\u05E0\u05EA \u05E8\u05DB\u05E9', 's');
    if (typeof _applyOcrHighlights === 'function') _applyOcrHighlights();
    _rcptOcrShowCompareBtn();
  }
  return true;
}

// --- PO choice modal: shown when open POs exist but AI didn't auto-match ---
function _rcptOcrShowPOChoiceModal() {
  var supName = ($('rcpt-supplier') || {}).value || '\u05D4\u05E1\u05E4\u05E7';
  var html = '<div style="direction:rtl;text-align:center;padding:8px">' +
    '<p style="font-size:14px;margin-bottom:14px">' +
    '\u05E0\u05DE\u05E6\u05D0\u05D5 \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05E8\u05DB\u05E9 \u05E4\u05EA\u05D5\u05D7\u05D5\u05EA \u05DC<strong>' +
    escapeHtml(supName) + '</strong>.' +
    '<br>\u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05D4\u05D6\u05DE\u05E0\u05D4 \u05DB\u05D3\u05D9 \u05E9\u05D4-AI \u05D9\u05E9\u05D5\u05D5\u05D4 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD.</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px;max-width:300px;margin:0 auto">' +
    '<button onclick="_rcptOcrChoosePO()" class="btn" ' +
      'style="padding:10px;background:#059669;color:#fff;font-size:14px">' +
      '\uD83D\uDCCB \u05D0\u05D1\u05D7\u05E8 \u05D4\u05D6\u05DE\u05E0\u05EA \u05E8\u05DB\u05E9 \u05E7\u05D5\u05D3\u05DD</button>' +
    '<button onclick="_rcptOcrSkipPO()" class="btn" ' +
      'style="padding:10px;background:#2563eb;color:#fff;font-size:14px">' +
      '\u2705 \u05D4\u05DE\u05E9\u05DA \u05D1\u05DC\u05D9 \u05D4\u05D6\u05DE\u05E0\u05EA \u05E8\u05DB\u05E9</button>' +
    '<button onclick="Modal.close()" class="btn" ' +
      'style="padding:8px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;font-size:13px">' +
      '\u274C \u05D1\u05D8\u05DC</button>' +
    '</div></div>';
  Modal.show({
    title: '\uD83D\uDCCB \u05E0\u05DE\u05E6\u05D0\u05D5 \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05E4\u05EA\u05D5\u05D7\u05D5\u05EA',
    content: html, size: 'sm'
  });
}

function _rcptOcrChoosePO() {
  Modal.close();
  toast('\u05D1\u05D7\u05E8 \u05D4\u05D6\u05DE\u05E0\u05EA \u05E8\u05DB\u05E9 \u05DE\u05D4\u05E8\u05E9\u05D9\u05DE\u05D4 \u05D5\u05DC\u05D7\u05E5 \u05E9\u05D5\u05D1 \u05E1\u05E8\u05D5\u05E7 \u05E2\u05DD AI', 'i');
}

function _rcptOcrSkipPO() {
  Modal.close();
  if (window._pendingOcrClassified) {
    var rawItems = window._pendingOcrRawItems;
    _rcptOcrShowReview(window._pendingOcrClassified, function(confirmed) {
      _rcptOcrApplyToForm(confirmed, rawItems);
      if (window._ocrPOComparison) setTimeout(_applyOcrHighlights, 200);
    });
  }
  window._pendingOcrClassified = null;
  window._pendingOcrRawItems = null;
}

// --- Document number pattern learning ---
function _rcptOcrLearnDocNum(fv, supplierId) {
  var ocrNum = fv('document_number') || '', actualNum = ($('rcpt-number') || {}).value || '';
  if (!ocrNum || !actualNum || ocrNum === actualNum || !supplierId) return;
  var prefix = ''; for (var i = 0; i < ocrNum.length && i < actualNum.length && ocrNum[i] === actualNum[i]; i++) prefix += actualNum[i];
  sb.from(T.OCR_TEMPLATES).select('id, extraction_hints').eq('supplier_id', supplierId).eq('tenant_id', getTenantId()).maybeSingle()
    .then(function(r) {
      if (!r.data) return;
      var hints = r.data.extraction_hints || {};
      hints.document_number_pattern = { example: actualNum, wrong_example: ocrNum, prefix: prefix, length: actualNum.length };
      sb.from(T.OCR_TEMPLATES).update({ extraction_hints: hints }).eq('id', r.data.id).then(function() {});
    }).catch(function(e) { console.warn('Doc number learning:', e); });
}

// --- PO dropdown change after OCR: show/hide compare button ---
// --- Supplier change after OCR: trigger PO choice or review ---
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var poSel = document.getElementById('rcpt-po-select');
    if (poSel) poSel.addEventListener('change', function() {
      if (typeof _rcptOcrResult !== 'undefined' && _rcptOcrResult && poSel.value) {
        _rcptOcrShowCompareBtn();
      } else {
        _rcptOcrHideCompareBtn();
      }
    });
    // Watch for supplier manual selection after OCR scan
    var supWrap = document.getElementById('rcpt-supplier-wrap');
    if (supWrap) supWrap.addEventListener('change', function() {
      if (typeof _rcptOcrResult === 'undefined' || !_rcptOcrResult) return;
      if (window._ocrReviewShown) return; // already handled
      var rawItems = window._pendingOcrRawItems;
      if (!rawItems || !rawItems.length) return;
      // Wait for PO dropdown to load (loadPOsForSupplier is async)
      setTimeout(function() {
        window._ocrReviewShown = true;
        var ps = document.getElementById('rcpt-po-select');
        var hasOpen = ps && ps.options && ps.options.length > 1 && !ps.disabled;
        if (hasOpen) {
          var sid = typeof supplierCache !== 'undefined' ? supplierCache[($('rcpt-supplier') || {}).value] : null;
          if (typeof _rcptOcrClassifyItems === 'function' && sid) {
            _rcptOcrClassifyItems(rawItems, sid).then(function(cl) {
              window._pendingOcrClassified = cl;
              _rcptOcrShowPOChoiceModal();
            });
          } else { _rcptOcrShowPOChoiceModal(); }
        } else {
          var sid2 = typeof supplierCache !== 'undefined' ? supplierCache[($('rcpt-supplier') || {}).value] : null;
          if (typeof _rcptOcrClassifyItems === 'function') {
            _rcptOcrClassifyItems(rawItems, sid2).then(function(cl) {
              _rcptOcrShowReview(cl, function(confirmed) {
                _rcptOcrApplyToForm(confirmed, rawItems);
              });
            });
          }
        }
      }, 1200);
    });
  }, 500);
});
