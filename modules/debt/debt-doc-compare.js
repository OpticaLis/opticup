// debt-doc-compare.js — PO vs Receipt vs Invoice comparison table
// Load after: debt-doc-edit.js, debt-doc-items.js
// Provides: buildComparisonSection(doc)
// Shows comparison of what was ordered (PO), received (receipt), and invoiced (OCR)

// =========================================================
// 1. Main entry — fetch data and build HTML
// =========================================================
async function buildComparisonSection(doc) {
  if (!doc || !doc.goods_receipt_id) return '';
  try {
    // Fetch receipt to get po_id
    var { data: receipt } = await sb.from(T.RECEIPTS).select('id, po_id')
      .eq('id', doc.goods_receipt_id).eq('tenant_id', getTenantId()).single();
    if (!receipt) return '';

    // Fetch receipt items
    var { data: rcptItems } = await sb.from(T.RCPT_ITEMS)
      .select('barcode, brand, model, color, size, quantity, unit_cost')
      .eq('receipt_id', receipt.id).eq('tenant_id', getTenantId());
    rcptItems = rcptItems || [];

    // Fetch PO items if PO linked
    var poItems = [];
    if (receipt.po_id) {
      var { data: pi } = await sb.from(T.PO_ITEMS)
        .select('barcode, brand, model, color, size, qty_ordered, unit_cost')
        .eq('po_id', receipt.po_id).eq('tenant_id', getTenantId());
      poItems = pi || [];
    }

    // Fetch OCR items
    var ocrItems = [];
    try {
      var { data: ocrRows } = await sb.from('ocr_extractions').select('extracted_data')
        .eq('supplier_document_id', doc.id).eq('tenant_id', getTenantId()).limit(1);
      if (ocrRows && ocrRows.length && ocrRows[0].extracted_data) {
        var ed = ocrRows[0].extracted_data;
        var raw = (ed.items && typeof ed.items === 'object' && 'value' in ed.items) ? ed.items.value : ed.items;
        if (Array.isArray(raw)) ocrItems = raw;
      }
    } catch (e) { /* OCR data optional */ }

    var vatRate = Number(doc.vat_rate) || 0;
    var matched = _cmpMatchItems(poItems, rcptItems, ocrItems);
    return _cmpRenderSection(matched, poItems.length > 0, ocrItems.length > 0, vatRate);
  } catch (e) {
    console.warn('buildComparisonSection error:', e);
    return '';
  }
}

// =========================================================
// 2. Match items across three sources
// =========================================================
function _cmpMatchItems(poItems, rcptItems, ocrItems) {
  var rows = [];
  var usedRcpt = {};
  var usedOcr = {};

  // Pass 1: start from PO items, find matches in receipt + OCR
  for (var p = 0; p < poItems.length; p++) {
    var po = poItems[p];
    var rIdx = _cmpFindMatch(po, rcptItems, usedRcpt);
    var ri = rIdx >= 0 ? rcptItems[rIdx] : null;
    if (rIdx >= 0) usedRcpt[rIdx] = true;

    var oIdx = _cmpFindOcrMatch(po, ocrItems, usedOcr);
    var oi = oIdx >= 0 ? ocrItems[oIdx] : null;
    if (oIdx >= 0) usedOcr[oIdx] = true;

    rows.push(_cmpBuildRow(po, ri, oi));
  }

  // Pass 2: receipt items not matched to any PO
  for (var r = 0; r < rcptItems.length; r++) {
    if (usedRcpt[r]) continue;
    var rc = rcptItems[r];
    var oIdx2 = _cmpFindOcrMatch(rc, ocrItems, usedOcr);
    var oi2 = oIdx2 >= 0 ? ocrItems[oIdx2] : null;
    if (oIdx2 >= 0) usedOcr[oIdx2] = true;
    rows.push(_cmpBuildRow(null, rc, oi2));
  }

  // Pass 3: OCR items not matched to anything
  for (var o = 0; o < ocrItems.length; o++) {
    if (usedOcr[o]) continue;
    rows.push(_cmpBuildRow(null, null, ocrItems[o]));
  }

  return rows;
}

// =========================================================
// 3. Match helpers — barcode then brand+model+size+color
// =========================================================
function _cmpNorm(s) { return (s || '').trim().toLowerCase(); }

function _cmpFindMatch(source, targets, used) {
  // Try barcode first
  if (source.barcode) {
    for (var i = 0; i < targets.length; i++) {
      if (used[i]) continue;
      if (_cmpNorm(targets[i].barcode) === _cmpNorm(source.barcode)) return i;
    }
  }
  // Fallback: brand+model+size+color
  var key = _cmpNorm(source.brand) + '|' + _cmpNorm(source.model) + '|' +
            _cmpNorm(source.size) + '|' + _cmpNorm(source.color);
  for (var j = 0; j < targets.length; j++) {
    if (used[j]) continue;
    var tk = _cmpNorm(targets[j].brand) + '|' + _cmpNorm(targets[j].model) + '|' +
             _cmpNorm(targets[j].size) + '|' + _cmpNorm(targets[j].color);
    if (tk === key) return j;
  }
  return -1;
}

function _cmpFindOcrMatch(source, ocrItems, used) {
  // OCR items have description, quantity, unit_price — fuzzy match on description
  var srcModel = _cmpNorm(source.model);
  var srcBarcode = _cmpNorm(source.barcode);
  if (!srcModel && !srcBarcode) return -1;
  for (var i = 0; i < ocrItems.length; i++) {
    if (used[i]) continue;
    var desc = _cmpNorm(ocrItems[i].description || '');
    if (srcBarcode && desc.indexOf(srcBarcode) >= 0) return i;
    if (srcModel && srcModel.length >= 3 && desc.indexOf(srcModel) >= 0) return i;
  }
  return -1;
}

// =========================================================
// 4. Build a comparison row object
// =========================================================
function _cmpBuildRow(po, rcpt, ocr) {
  var label = '';
  if (rcpt) label = [rcpt.brand, rcpt.model, rcpt.color, rcpt.size].filter(Boolean).join(' ');
  else if (po) label = [po.brand, po.model, po.color, po.size].filter(Boolean).join(' ');
  else if (ocr) label = ocr.description || '';

  var poQty = po ? (po.qty_ordered || 0) : null;
  var rcptQty = rcpt ? (rcpt.quantity || 0) : null;
  var ocrQty = ocr ? (ocr.quantity || 0) : null;
  var poPrice = po ? (po.unit_cost || 0) : null;
  var rcptPrice = rcpt ? (rcpt.unit_cost || 0) : null;
  var ocrPrice = ocr ? (ocr.unit_price || 0) : null;

  var status = _cmpStatus(po, rcpt, ocr, poQty, rcptQty, ocrQty, poPrice, ocrPrice);

  return { label: label, poQty: poQty, rcptQty: rcptQty, ocrQty: ocrQty,
           poPrice: poPrice, rcptPrice: rcptPrice, ocrPrice: ocrPrice, status: status };
}

function _cmpStatus(po, rcpt, ocr, poQty, rcptQty, ocrQty, poPrice, ocrPrice) {
  if (!rcpt && !po && ocr) return { icon: '\u2753', text: '\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05D1\u05DC\u05D1\u05D3', cls: 'cmp-inv-only' };
  if (po && !rcpt) return { icon: '\uD83D\uDCE6', text: '\u05D7\u05E1\u05E8', cls: 'cmp-missing' };
  if (!po && rcpt) {
    // Not in PO but in receipt
    return { icon: '\uD83D\uDD34', text: '\u05DC\u05D0 \u05D1\u05D4\u05D6\u05DE\u05E0\u05D4', cls: 'cmp-not-po' };
  }
  // Both PO and receipt exist
  var qtyMatch = poQty === rcptQty;
  var priceMatch = poPrice == null || ocrPrice == null ||
    Math.abs(poPrice - ocrPrice) < 0.01;
  if (qtyMatch && priceMatch) return { icon: '\u2705', text: '\u05EA\u05D5\u05D0\u05DD', cls: 'cmp-ok' };
  if (!priceMatch) return { icon: '\u26A0\uFE0F', text: '\u05E4\u05E2\u05E8 \u05DE\u05D7\u05D9\u05E8', cls: 'cmp-price' };
  return { icon: '\u26A0\uFE0F', text: '\u05E4\u05E2\u05E8 \u05DB\u05DE\u05D5\u05EA', cls: 'cmp-qty' };
}

// =========================================================
// 5. Render HTML
// =========================================================
function _cmpRenderSection(rows, hasPO, hasOCR, vatRate) {
  if (!rows.length) return '';
  vatRate = vatRate || 0;
  var hasVAT = vatRate > 0;

  // Totals
  var totPO = 0, totRcpt = 0, totOCR = 0;
  rows.forEach(function(r) {
    if (r.poQty != null && r.poPrice != null) totPO += r.poQty * r.poPrice;
    if (r.rcptQty != null && r.rcptPrice != null) totRcpt += r.rcptQty * r.rcptPrice;
    else if (r.rcptQty != null) totRcpt += r.rcptQty * (r.poPrice || 0);
    if (r.ocrQty != null && r.ocrPrice != null) totOCR += r.ocrQty * r.ocrPrice;
  });

  var h = '<div id="doc-compare-section" style="border-top:1px solid var(--g200);padding-top:10px;margin-top:10px">' +
    '<strong style="font-size:.88rem">\uD83D\uDCCA \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4: ';
  if (hasPO) h += '\u05D4\u05D6\u05DE\u05E0\u05D4 \u2194 ';
  h += '\u05E7\u05D1\u05DC\u05D4';
  if (hasOCR) h += ' \u2194 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA';
  h += '</strong>';

  if (!hasOCR) {
    h += '<div style="font-size:.78rem;color:var(--g500);margin:2px 0 6px">' +
      '\u05DC\u05D0 \u05E0\u05E1\u05E8\u05E7\u05D4 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u2014 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E1\u05E8\u05D5\u05E7 \u05D1\u05DE\u05E1\u05DA \u05E6\u05E4\u05D9\u05D9\u05D4</div>';
  }

  h += '<div style="overflow-x:auto;margin-top:6px"><table class="data-table" style="width:100%;font-size:.82rem"><thead><tr>' +
    '<th>\u05E4\u05E8\u05D9\u05D8</th>';
  if (hasPO) h += '<th style="text-align:center">\u05D1\u05D4\u05D6\u05DE\u05E0\u05D4</th>';
  h += '<th style="text-align:center">\u05E0\u05DB\u05E0\u05E1 \u05DC\u05DE\u05DC\u05D0\u05D9</th>';
  if (hasOCR) h += '<th style="text-align:center">\u05D1\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA</th>';
  if (hasPO) h += '<th style="text-align:center">\u05DE\u05D7\u05D9\u05E8 PO</th>';
  if (hasOCR) h += '<th style="text-align:center">\u05DE\u05D7\u05D9\u05E8 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA</th>';
  if (hasVAT) h += '<th style="text-align:center">\u05DE\u05E2"\u05DE</th>';
  if (hasVAT) h += '<th style="text-align:center">\u05DE\u05D7\u05D9\u05E8 \u05DB\u05D5\u05DC\u05DC \u05DE\u05E2"\u05DE</th>';
  h += '<th style="text-align:center">\u05E1\u05D8\u05D8\u05D5\u05E1</th></tr></thead><tbody>';

  var totVAT = 0, totInclVAT = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var st = r.status || {};
    // Use receipt price if available, else PO price, for VAT calc
    var linePrice = r.rcptPrice != null ? r.rcptPrice : (r.poPrice || 0);
    var lineQty = r.rcptQty != null ? r.rcptQty : (r.poQty || 0);
    var lineSubtotal = lineQty * linePrice;
    var lineVAT = hasVAT ? Math.round(lineSubtotal * vatRate) / 100 : 0;
    var lineInclVAT = lineSubtotal + lineVAT;
    totVAT += lineVAT;
    totInclVAT += lineInclVAT;

    h += '<tr><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(r.label) + '">' + escapeHtml(r.label) + '</td>';
    if (hasPO) h += '<td style="text-align:center">' + _cmpCell(r.poQty) + '</td>';
    h += '<td style="text-align:center">' + _cmpCell(r.rcptQty) + '</td>';
    if (hasOCR) h += '<td style="text-align:center">' + _cmpCell(r.ocrQty) + '</td>';
    if (hasPO) h += '<td style="text-align:center">' + _cmpPrice(r.poPrice) + '</td>';
    if (hasOCR) h += '<td style="text-align:center">' + _cmpPrice(r.ocrPrice) + '</td>';
    if (hasVAT) h += '<td style="text-align:center">' + _cmpPrice(lineVAT) + '</td>';
    if (hasVAT) h += '<td style="text-align:center">' + _cmpPrice(lineInclVAT) + '</td>';
    h += '<td style="text-align:center;white-space:nowrap"><span title="' + escapeHtml(st.text || '') + '">' +
      (st.icon || '') + ' ' + escapeHtml(st.text || '') + '</span></td>';
    h += '</tr>';
  }

  // Summary row
  h += '<tr style="font-weight:600;background:var(--g100);border-top:2px solid var(--g300)">' +
    '<td>\u05E1\u05D4"\u05DB</td>';
  if (hasPO) h += '<td style="text-align:center">\u20AA' + totPO.toFixed(2) + '</td>';
  var rcptTotalDiff = hasPO && Math.abs(totPO - totRcpt) > totPO * 0.01;
  h += '<td style="text-align:center;' + (rcptTotalDiff ? 'color:#e74c3c' : '') + '">\u20AA' + totRcpt.toFixed(2) + '</td>';
  if (hasOCR) {
    var ocrDiffBase = hasPO ? totPO : totRcpt;
    var ocrTotalDiff = ocrDiffBase > 0 && Math.abs(ocrDiffBase - totOCR) > ocrDiffBase * 0.01;
    h += '<td style="text-align:center;' + (ocrTotalDiff ? 'color:#e74c3c' : '') + '">\u20AA' + totOCR.toFixed(2) + '</td>';
  }
  if (hasPO) h += '<td></td>';
  if (hasOCR) h += '<td></td>';
  if (hasVAT) h += '<td style="text-align:center">\u20AA' + totVAT.toFixed(2) + '</td>';
  if (hasVAT) h += '<td style="text-align:center">\u20AA' + totInclVAT.toFixed(2) + '</td>';
  h += '<td></td></tr>';

  h += '</tbody></table></div></div>';
  return h;
}

function _cmpCell(val) {
  return val != null ? String(val) : '<span style="color:var(--g400)">\u2014</span>';
}

function _cmpPrice(val) {
  if (val == null) return '<span style="color:var(--g400)">\u2014</span>';
  return '\u20AA' + Number(val).toFixed(2);
}
