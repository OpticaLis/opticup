// receipt-ocr-confirm-learn.js — "Confirm & Teach AI" button logic
// Load after: receipt-confirm.js, receipt-ocr.js, receipt-ocr-learn.js
// Provides: _rcptOcrConfirmAndLearn(), _rcptOcrToggleLearnBtn()

// =========================================================
// 1. Toggle learn button visibility — show only when OCR scan exists
// =========================================================
function _rcptOcrToggleLearnBtn() {
  var btn = document.getElementById('rcpt-confirm-learn-btn');
  if (!btn) return;
  btn.style.display = (window._rcptOcrResult) ? '' : 'none';
}

// Hook: show/hide on receipt open/close
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    // MutationObserver on step2 visibility to toggle button
    var step2 = document.getElementById('rcpt-step2');
    if (step2) {
      new MutationObserver(_rcptOcrToggleLearnBtn)
        .observe(step2, { attributes: true, attributeFilter: ['style'] });
    }
  }, 300);
});

// =========================================================
// 2. Main: confirm receipt AND learn item mappings
// =========================================================
async function _rcptOcrConfirmAndLearn() {
  // --- Capture table items + OCR data BEFORE confirm (confirm clears form) ---
  var tableItems;
  try { tableItems = getReceiptItems(); } catch (e) { return; }
  var ocrResult = window._rcptOcrResult;
  var supplierName = ($('rcpt-supplier') || {}).value || '';
  var supplierId = supplierName ? (supplierCache[supplierName] || null) : null;

  // --- Run normal confirm flow ---
  await confirmReceipt();

  // --- After confirm succeeds, run learning ---
  // Check if confirm actually happened by seeing if the form was reset
  // (loadReceiptTab is called after successful confirm, which shows step1)
  var step2 = document.getElementById('rcpt-step2');
  var confirmHappened = step2 && step2.style.display === 'none';
  if (!confirmHappened) return; // confirm failed or user cancelled

  // Get OCR items
  if (!ocrResult || !ocrResult.extracted_data) {
    toast('\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D5\u05E9\u05DC\u05DD \u2014 \u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9 \u05E1\u05E8\u05D9\u05E7\u05D4 \u05DC\u05DC\u05DE\u05D9\u05D3\u05D4', 'i');
    return;
  }
  var ocrItems = ocrResult.extracted_data.items;
  if (ocrItems && typeof ocrItems === 'object' && 'value' in ocrItems) ocrItems = ocrItems.value;
  if (!Array.isArray(ocrItems) || ocrItems.length === 0) {
    toast('\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D5\u05E9\u05DC\u05DD \u2014 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D1\u05E1\u05E8\u05D9\u05E7\u05D4', 'i');
    return;
  }

  // Run matching
  var mappings = _matchOcrToTableItems(ocrItems, tableItems);
  if (mappings.matched === 0) {
    toast('\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D5\u05E9\u05DC\u05DD \u2014 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05D4\u05EA\u05D0\u05DE\u05D5\u05EA \u05DC\u05DC\u05DE\u05D9\u05D3\u05D4', 'i');
    return;
  }

  // Save aliases
  await _saveItemAliases(supplierId, mappings);
  toast('\uD83E\uDD16 \u05E0\u05DC\u05DE\u05D3\u05D5 ' + mappings.matched + ' \u05DE\u05EA\u05D5\u05DA ' + ocrItems.length + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA', 's');
}

// =========================================================
// 3. Match OCR items → table items by content
// =========================================================
function _matchOcrToTableItems(ocrItems, tableItems) {
  var pairs = [];
  var available = tableItems.map(function(t, i) { return { item: t, idx: i }; });

  for (var i = 0; i < ocrItems.length; i++) {
    var ocr = ocrItems[i];
    var desc = (typeof _uv === 'function' ? _uv(ocr.description) : ocr.description) || '';
    var ocrPrice = Number(ocr.unit_price || ocr.price || 0);
    var ocrQty = Number(ocr.quantity || 1);

    // Parse OCR description for structured fields
    var parsed = (typeof _rcptOcrParseDescription === 'function') ? _rcptOcrParseDescription(desc) : {};
    var ocrModel = _norm(parsed.model || '');
    var descNorm = _norm(desc);

    var bestIdx = -1, bestScore = 0;
    for (var j = 0; j < available.length; j++) {
      var t = available[j].item;
      var tModel = _norm(t.model || '');
      var score = 0;

      // Model match (strongest)
      if (ocrModel && tModel && ocrModel === tModel) score += 10;
      else if (ocrModel && tModel && (ocrModel.includes(tModel) || tModel.includes(ocrModel))) score += 7;
      // Description contains table model (fallback for numeric models)
      if (score < 7 && tModel && tModel.length >= 3 && descNorm.includes(tModel)) score = Math.max(score, 8);
      // Price+qty match (confirmatory)
      if (ocrPrice > 0 && t.unit_cost && Math.abs(ocrPrice - t.unit_cost) <= 1) score += 4;
      if (ocrQty === t.quantity) score += 1;

      if (score > bestScore) { bestScore = score; bestIdx = j; }
    }

    if (bestIdx >= 0 && bestScore >= 7) {
      var matched = available.splice(bestIdx, 1)[0].item;
      pairs.push({
        ocr_description: desc.trim(),
        mapped_to: {
          brand: matched.brand || '',
          model: matched.model || '',
          size: matched.size || '',
          color: matched.color || '',
          cost: matched.unit_cost || 0
        }
      });
    }
  }
  return { pairs: pairs, matched: pairs.length };
}

// =========================================================
// 4. Save aliases to supplier_ocr_templates.extraction_hints
// =========================================================
async function _saveItemAliases(supplierId, mappings) {
  if (!supplierId || !mappings.pairs.length) return;
  try {
    var tid = getTenantId();
    var { data: tpl } = await sb.from(T.OCR_TEMPLATES)
      .select('id, extraction_hints')
      .eq('tenant_id', tid).eq('supplier_id', supplierId).eq('is_active', true)
      .maybeSingle();
    if (!tpl) return;

    var hints = tpl.extraction_hints || {};
    var aliases = Array.isArray(hints.item_aliases) ? hints.item_aliases : [];

    mappings.pairs.forEach(function(m) {
      var normDesc = _norm(m.ocr_description);
      var exists = aliases.some(function(a) { return _norm(a.ocr_description || a.ocr_text || '') === normDesc; });
      if (!exists) aliases.push(m);
    });

    // Cap at 200 aliases per supplier
    if (aliases.length > 200) aliases = aliases.slice(aliases.length - 200);
    hints.item_aliases = aliases;

    await sb.from(T.OCR_TEMPLATES).update({
      extraction_hints: hints, updated_at: new Date().toISOString()
    }).eq('id', tpl.id).eq('tenant_id', tid);

    await writeLog('ai_item_learning', null, {
      supplier_id: supplierId, learned_count: mappings.matched,
      total_ocr: mappings.pairs.length
    });
  } catch (e) { console.warn('_saveItemAliases error:', e); }
}
