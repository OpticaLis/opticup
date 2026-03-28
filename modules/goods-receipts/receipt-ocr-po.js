// receipt-ocr-po.js — AI PO auto-matching from OCR items (Phase A-AI-2)
// Load after: receipt-ocr-supplier.js, before: receipt-ocr.js
// Provides: OcrPOMatch.findBestPO(), OcrPOMatch.compareItems()

var OcrPOMatch = (function() {
  function _norm(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

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
      var poTotal = poItems.reduce(function(s, it) { return s + (Number(it.cost_price) || 0) * (Number(it.quantity) || 0); }, 0);
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
   * Returns array of {ocrIdx, poItem, status, details}
   */
  function compareItems(ocrItems, poItems) {
    if (!ocrItems || !poItems) return [];
    var results = [];
    var usedPO = {};

    for (var i = 0; i < ocrItems.length; i++) {
      var ocr = ocrItems[i];
      var desc = _norm(ocr.description || ocr.brand || '');
      var ocrQty = Number(ocr.quantity) || 1;
      var ocrPrice = Number(ocr.unit_price) || 0;
      var matched = false;

      for (var j = 0; j < poItems.length; j++) {
        if (usedPO[j]) continue;
        var po = poItems[j];
        var poDesc = _norm((po.brand || '') + ' ' + (po.model || ''));
        if (!desc || !poDesc) continue;
        if (!(desc.includes(poDesc) || poDesc.includes(desc) ||
            (po.model && desc.includes(_norm(po.model))))) continue;

        usedPO[j] = true;
        matched = true;
        var poQty = Number(po.quantity) || 0;
        var poPrice = Number(po.cost_price) || 0;
        var qtyOk = ocrQty === poQty;
        var priceOk = poPrice === 0 || Math.abs(ocrPrice - poPrice) / Math.max(poPrice, 1) <= 0.05;
        var status = (!qtyOk && !priceOk) ? 'qty_price_mismatch' : !qtyOk ? 'qty_mismatch' : !priceOk ? 'price_mismatch' : 'match';
        results.push({ ocrIdx: i, poItem: po, status: status,
          details: { ocrQty: ocrQty, poQty: poQty, ocrPrice: ocrPrice, poPrice: poPrice } });
        break;
      }
      if (!matched) {
        results.push({ ocrIdx: i, poItem: null, status: 'not_in_po', details: null });
      }
    }
    // PO items not matched by any OCR item
    for (var k = 0; k < poItems.length; k++) {
      if (!usedPO[k]) {
        results.push({ ocrIdx: -1, poItem: poItems[k], status: 'missing_from_ocr', details: null });
      }
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

// --- Apply OCR vs PO discrepancy highlights to item rows ---
function _applyOcrHighlights() {
  var comp = window._ocrPOComparison;
  if (!comp || !comp.length) return;
  var rows = document.querySelectorAll('#rcpt-items-body tr');
  comp.forEach(function(c) {
    if (c.ocrIdx < 0 || c.ocrIdx >= rows.length) return;
    var row = rows[c.ocrIdx];
    if (!row) return;
    if (c.status === 'not_in_po') {
      row.classList.add('ocr-not-in-po');
      row.title = '\u05E4\u05E8\u05D9\u05D8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05D4\u05D6\u05DE\u05E0\u05EA \u05D4\u05E8\u05DB\u05E9';
    } else if (c.status === 'qty_mismatch' || c.status === 'qty_price_mismatch') {
      var qtyCell = row.querySelector('.rcpt-qty');
      if (qtyCell) { qtyCell.classList.add('ocr-qty-warn'); qtyCell.title = '\u05D4\u05D5\u05D6\u05DE\u05E0\u05D5 ' + c.details.poQty + ', \u05D1\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA ' + c.details.ocrQty; }
    }
    if (c.status === 'price_mismatch' || c.status === 'qty_price_mismatch') {
      var priceCell = row.querySelector('.rcpt-ucost');
      if (priceCell) { priceCell.classList.add('ocr-price-warn'); priceCell.title = '\u05DE\u05D7\u05D9\u05E8 PO: ' + c.details.poPrice + '\u20AA, \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA: ' + c.details.ocrPrice + '\u20AA'; }
    }
  });
  var missing = comp.filter(function(c) { return c.status === 'missing_from_ocr'; });
  if (missing.length) {
    var tbody = $('rcpt-items-body');
    missing.forEach(function(m) {
      var tr = document.createElement('tr');
      tr.className = 'ocr-missing';
      var colCount = tbody.querySelector('tr') ? tbody.querySelector('tr').children.length : 12;
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
