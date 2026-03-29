// receipt-ocr-po.js — AI PO auto-matching from OCR items (Phase A-AI-2)
// Load after: receipt-ocr-supplier.js, before: receipt-ocr.js
// Provides: OcrPOMatch.findBestPO(), OcrPOMatch.compareItems()

var OcrPOMatch = (function() {
  // _norm() is now global — defined in receipt-ocr-supplier.js

  /**
   * Find the best matching PO for OCR items.
   */
  async function findBestPO(supplierId, ocrItems, tenantId) {
    var none = { poId: null, poNumber: null, score: 0, confidence: 'low' };
    if (!supplierId || !ocrItems || !ocrItems.length) return none;

    // Load open POs + their items
    var { data: pos, error: poErr } = await sb.from(T.PO)
      .select('id, po_number, status')
      .eq('tenant_id', tenantId).eq('supplier_id', supplierId)
      .in('status', ['sent', 'partial']).order('created_at', { ascending: false }).limit(10);
    if (poErr || !pos || !pos.length) return none;

    var bestPO = null, bestScore = 0;
    for (var p = 0; p < pos.length; p++) {
      var po = pos[p];
      var { data: poItems } = await sb.from(T.PO_ITEMS).select('*')
        .eq('tenant_id', tenantId).eq('po_id', po.id);
      if (!poItems || !poItems.length) continue;

      // Score: item count (30) + total amount (30) + item match (40)
      var countScore = Math.max(0, 30 - Math.abs(ocrItems.length - poItems.length) * 10);

      var ocrTotal = ocrItems.reduce(function(s, it) { return s + (Number(it.total) || Number(it.unit_price) * Number(it.quantity) || 0); }, 0);
      var poTotal = poItems.reduce(function(s, it) { return s + (Number(it.unit_cost) || Number(it.cost_price) || 0) * (Number(it.qty_ordered) || Number(it.quantity) || 0); }, 0);
      var amtDiff = poTotal > 0 ? Math.abs(ocrTotal - poTotal) / poTotal : 1;
      var amtScore = Math.max(0, 30 - Math.round(amtDiff * 100));

      var matched = 0;
      var usedPO = {};
      for (var i = 0; i < ocrItems.length; i++) {
        var desc = _norm(ocrItems[i].description || ocrItems[i].brand || '');
        for (var j = 0; j < poItems.length; j++) {
          if (usedPO[j]) continue;
          var poDesc = _norm((poItems[j].brand || '') + ' ' + (poItems[j].model || ''));
          if (desc && poDesc && (desc.includes(poDesc) || poDesc.includes(desc) ||
              (poItems[j].model && desc.includes(_norm(poItems[j].model))))) {
            matched++;
            usedPO[j] = true;
            break;
          }
        }
      }
      var matchScore = ocrItems.length > 0 ? Math.round((matched / ocrItems.length) * 40) : 0;
      var total = countScore + amtScore + matchScore;
      if (total > bestScore) {
        bestScore = total;
        bestPO = { poId: po.id, poNumber: po.po_number, score: total,
          confidence: total > 80 ? 'high' : total > 50 ? 'medium' : 'low' };
      }
    }
    return bestPO && bestScore > 50 ? bestPO : none;
  }

  /**
   * Compare OCR items against PO items for discrepancy highlighting.
   * Parses OCR descriptions using _rcptOcrParseDescription, then matches
   * by model (primary) and brand+size (secondary). Returns array of
   * {ocrIdx, poItem, status, details, parsed}.
   */
  function _uv(v) { return (v && typeof v === 'object' && 'value' in v) ? v.value : v; }

  function compareItems(ocrItems, poItems) {
    if (!ocrItems || !poItems) return [];
    var results = [];
    var available = poItems.map(function(p, idx) { return { po: p, idx: idx }; });

    for (var i = 0; i < ocrItems.length; i++) {
      var ocr = ocrItems[i];
      // Parse the OCR description into structured fields
      var desc = _uv(ocr.description) || _uv(ocr.model) || '';
      var parsed = (typeof _rcptOcrParseDescription === 'function') ? _rcptOcrParseDescription(desc) : { model: desc };
      var ocrModel = _norm(parsed.model || _uv(ocr.model) || '');
      var ocrBrand = _norm(parsed.brand_name || _uv(ocr.brand) || '');
      var ocrSize = (parsed.size || '').trim();
      var ocrQty = Number(_uv(ocr.quantity)) || 1;
      var ocrPrice = Number(_uv(ocr.unit_price)) || Number(_uv(ocr.price)) || 0;

      // Score each available PO item — pick best match
      var descNorm = _norm(desc);
      var bestIdx = -1, bestScore = 0;
      for (var j = 0; j < available.length; j++) {
        var po = available[j].po;
        var poModel = _norm(po.model || '');
        var poBrand = _norm(po.brand || '');
        var poSize = (po.size || '').trim();
        var score = 0;

        // Model match from parsed fields (strongest signal)
        if (ocrModel && poModel) {
          if (ocrModel === poModel) score += 10;
          else if (ocrModel.includes(poModel) || poModel.includes(ocrModel)) score += 7;
        }
        // Fallback: PO model found as substring in raw description text
        // Handles pure-numeric models like "4343" that parsing can't extract
        if (score < 7 && poModel && poModel.length >= 3 && descNorm.includes(poModel)) {
          score = Math.max(score, 8);
        }
        // Brand match (moderate signal)
        if (ocrBrand && poBrand && (poBrand.includes(ocrBrand) || ocrBrand.includes(poBrand))) score += 3;
        // Size match (weak but confirmatory)
        if (ocrSize && poSize && ocrSize === poSize) score += 2;

        if (score > bestScore) { bestScore = score; bestIdx = j; }
      }

      if (bestIdx >= 0 && bestScore >= 7) {
        // Matched — compare qty and price
        var matchedPO = available.splice(bestIdx, 1)[0].po;
        var poQty = Number(matchedPO.qty_ordered) || Number(matchedPO.quantity) || 0;
        var poPrice = Number(matchedPO.unit_cost) || Number(matchedPO.cost_price) || 0;
        var qtyOk = ocrQty === poQty;
        var priceOk = poPrice === 0 || ocrPrice === 0 || Math.abs(ocrPrice - poPrice) <= Math.max(poPrice * 0.05, 1);
        var status = (!qtyOk && !priceOk) ? 'qty_price_mismatch' : !qtyOk ? 'qty_mismatch' : !priceOk ? 'price_mismatch' : 'match';
        results.push({ ocrIdx: i, poItem: matchedPO, status: status, parsed: parsed,
          details: { ocrQty: ocrQty, poQty: poQty, ocrPrice: ocrPrice, poPrice: poPrice } });
      } else {
        results.push({ ocrIdx: i, poItem: null, status: 'not_in_po', details: null, parsed: parsed });
      }
    }
    // Remaining PO items = missing from invoice
    for (var k = 0; k < available.length; k++) {
      results.push({ ocrIdx: -1, poItem: available[k].po, status: 'missing_from_ocr', details: null });
    }
    return results;
  }

  return { findBestPO: findBestPO, compareItems: compareItems };
})();

// --- PO match confidence hint ---
function _rcptOcrShowPOHint(confidence, poNumber, score) {
  var old = $('rcpt-ocr-po-hint'); if (old) old.remove();
  var hint = document.createElement('div'); hint.id = 'rcpt-ocr-po-hint';
  hint.style.cssText = 'font-size:.8rem;margin-top:3px';
  if (confidence === 'high') {
    hint.style.color = '#059669';
    hint.textContent = '\u2705 AI \u05DE\u05E6\u05D0 \u05D4\u05EA\u05D0\u05DE\u05D4: ' + poNumber + ' (' + score + '%)';
  } else {
    hint.style.color = '#f59e0b';
    hint.textContent = '\u26A0\uFE0F AI \u05DE\u05E6\u05D9\u05E2: ' + poNumber + ' (' + score + '%) \u2014 \u05D1\u05D3\u05D5\u05E7';
  }
  var se = $('rcpt-po-select'); if (se && se.parentNode) se.parentNode.appendChild(hint);
}

// --- Apply OCR vs PO discrepancy highlights to receipt item rows ---
// Matches comparison results to table rows by PO item ID (primary)
// with brand+model text fallback for rows without po_item_id.
function _applyOcrHighlights() {
  var comp = window._ocrPOComparison;
  if (!comp || !comp.length) return;
  var tbody = $('rcpt-items-body');
  if (!tbody) return;

  // --- Step 1: Clear all previous highlights ---
  tbody.querySelectorAll('.ocr-missing').forEach(function(el) { el.remove(); });
  tbody.querySelectorAll('.ocr-status-badge').forEach(function(el) { el.remove(); });
  var allRows = tbody.querySelectorAll('tr[data-row]');
  allRows.forEach(function(tr) {
    tr.classList.remove('ocr-not-in-po');
    tr.title = '';
    var qc = tr.querySelector('.rcpt-qty');
    if (qc) { qc.classList.remove('ocr-qty-warn'); qc.title = ''; }
    var pc = tr.querySelector('.rcpt-ucost');
    if (pc) { pc.classList.remove('ocr-price-warn'); pc.title = ''; }
  });

  // --- Step 2: Build row lookup ---
  var rows = Array.from(allRows);
  // Primary: lookup by PO item ID (guaranteed unique)
  var idMap = {};
  // Fallback: lookup by normalized brand+model
  var bmMap = {};
  rows.forEach(function(row) {
    var poId = row.dataset.poItemId;
    if (poId) idMap[poId] = row;
    var b = row.querySelector('.rcpt-brand'), m = row.querySelector('.rcpt-model');
    var key = _norm(b ? b.value : '') + '|' + _norm(m ? m.value : '');
    if (!bmMap[key]) bmMap[key] = row;
  });

  // --- Step 3: Apply highlights ---
  comp.forEach(function(c) {
    if (c.status === 'missing_from_ocr') return; // handled in step 4
    if (c.status === 'not_in_po') return; // no table row for these

    if (!c.poItem) return;
    // Find row: by PO item ID first, then brand+model fallback
    var targetRow = c.poItem.id ? idMap[c.poItem.id] : null;
    if (!targetRow) {
      var key = _norm(c.poItem.brand || '') + '|' + _norm(c.poItem.model || '');
      targetRow = bmMap[key] || null;
    }
    if (!targetRow) return;

    // Add status badge to first cell
    var badge = document.createElement('span');
    badge.className = 'ocr-status-badge';
    badge.style.cssText = 'font-size:.75rem;margin-left:4px;white-space:nowrap';

    if (c.status === 'match') {
      badge.textContent = '\u2705';
      badge.title = '\u05EA\u05D5\u05D0\u05DD \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA';
    }
    if (c.status === 'qty_mismatch' || c.status === 'qty_price_mismatch') {
      var qc = targetRow.querySelector('.rcpt-qty');
      if (qc) {
        qc.classList.add('ocr-qty-warn');
        qc.title = '\u05D4\u05D5\u05D6\u05DE\u05E0\u05D5 ' + c.details.poQty + ', \u05D1\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA ' + c.details.ocrQty;
      }
      badge.textContent = '\u26A0\uFE0F \u05DB\u05DE\u05D5\u05EA';
    }
    if (c.status === 'price_mismatch' || c.status === 'qty_price_mismatch') {
      var pc = targetRow.querySelector('.rcpt-ucost');
      if (pc) {
        pc.classList.add('ocr-price-warn');
        pc.title = 'PO: ' + c.details.poPrice + '\u20AA, \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA: ' + c.details.ocrPrice + '\u20AA';
      }
      if (c.status === 'price_mismatch') badge.textContent = '\u26A0\uFE0F \u05DE\u05D7\u05D9\u05E8';
      if (c.status === 'qty_price_mismatch') badge.textContent = '\u26A0\uFE0F \u05DB\u05DE\u05D5\u05EA+\u05DE\u05D7\u05D9\u05E8';
    }
    var firstTd = targetRow.querySelector('td');
    if (firstTd && badge.textContent) firstTd.prepend(badge);
  });

  // --- Step 4: Append missing-from-OCR indicator rows ---
  var missing = comp.filter(function(c) { return c.status === 'missing_from_ocr'; });
  if (missing.length) {
    var colCount = rows[0] ? rows[0].children.length : 15;
    missing.forEach(function(m) {
      var tr = document.createElement('tr');
      tr.className = 'ocr-missing';
      tr.innerHTML = '<td colspan="' + colCount + '" style="text-align:center;padding:6px">' +
        '\u26A0\uFE0F \u05D7\u05E1\u05E8 \u05D1\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA: ' +
        escapeHtml((m.poItem.brand || '') + ' ' + (m.poItem.model || '')) +
        ' x' + (m.poItem.quantity || 0) + '</td>';
      tbody.appendChild(tr);
    });
  }
}

// Global store for comparison results (cleared on new receipt)
window._ocrPOComparison = null;
