// receipt-ocr-review.js — Item matching + review UI for OCR results (Phase 8 Step 2a)
// Load after: receipt-ocr.js, search-select.js, modal-builder.js
// Provides: _rcptOcrParseDescription(), _rcptOcrMatchItem(), _rcptOcrClassifyItems(),
//   _rcptOcrShowReview(), _rcptOcrApplyToForm()
// Uses: brands, brandCache, brandCacheRev, supplierCache, fetchAll, getTenantId,
//   addReceiptItemRow, updateReceiptItemsStats, createSearchSelect, Modal, escapeHtml, toast

// Brand alias map — common abbreviations → full brand name
var _RCPT_BRAND_ALIASES = {
  'rb': 'ray-ban', 'rayban': 'ray-ban', 'ray ban': 'ray-ban',
  'ox': 'oakley', 'oo': 'oakley',
  'tf': 'tom ford', 'tomford': 'tom ford',
  'gg': 'gucci', 'cd': 'dior', 'bb': 'burberry',
  'pr': 'prada', 'ea': 'emporio armani', 'ar': 'armani',
  'ck': 'calvin klein', 'rl': 'ralph lauren', 'ph': 'polo',
  'vo': 'vogue', 'ps': 'police'
};

// --- 1. Parse OCR description into structured parts ---
function _rcptOcrParseDescription(description) {
  var raw = (description || '').trim();
  var result = { brand_name: null, brand_id: null, model: '', size: '', color: '', raw: raw };
  if (!raw) return result;
  var lower = raw.toLowerCase();

  // Try to match brand from brands global (loaded by data-loading.js)
  var bestBrand = null, bestLen = 0;
  for (var i = 0; i < brands.length; i++) {
    var bn = (brands[i].name || '').toLowerCase();
    if (bn && lower.includes(bn) && bn.length > bestLen) {
      bestBrand = brands[i]; bestLen = bn.length;
    }
  }
  // Try alias match if no direct match
  if (!bestBrand) {
    var words = lower.split(/[\s\-]+/);
    for (var w = 0; w < Math.min(words.length, 3); w++) {
      var alias = _RCPT_BRAND_ALIASES[words[w]];
      if (alias) {
        for (var j = 0; j < brands.length; j++) {
          if ((brands[j].name || '').toLowerCase() === alias) { bestBrand = brands[j]; break; }
        }
        if (bestBrand) break;
      }
    }
  }
  if (bestBrand) {
    result.brand_name = bestBrand.name;
    result.brand_id = bestBrand.id;
  }

  // Remove brand name from remaining text for model/size/color extraction
  var remaining = raw;
  if (bestBrand) {
    var re = new RegExp(bestBrand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    remaining = remaining.replace(re, '').trim();
  }

  // Extract size: pattern like "51mm", "51", or standalone 2-digit number
  var sizeMatch = remaining.match(/(\d{2})\s*mm/i) || remaining.match(/\b(\d{2})\b(?![\d])/);
  if (sizeMatch) {
    result.size = sizeMatch[1];
    remaining = remaining.replace(sizeMatch[0], '').trim();
  }

  // Extract model: first alphanumeric code (e.g., RB5154, OX8046)
  var modelMatch = remaining.match(/([A-Za-z]{1,4}\d{3,6}[A-Za-z]?)/);
  if (modelMatch) {
    result.model = modelMatch[1];
    remaining = remaining.replace(modelMatch[0], '').trim();
  } else {
    // Fallback: first word as model
    var parts = remaining.split(/\s+/);
    if (parts.length > 0) {
      result.model = parts.shift();
      remaining = parts.join(' ').trim();
    }
  }

  // Remaining text is color
  result.color = remaining.replace(/^[\s\-–,]+|[\s\-–,]+$/g, '');
  return result;
}

// --- 2. Match parsed item to inventory ---
async function _rcptOcrMatchItem(parsed, supplierId) {
  var base = {
    status: 'unknown', inventory_id: null, barcode: null,
    brand_id: parsed.brand_id, brand_name: parsed.brand_name,
    model: parsed.model, size: parsed.size, color: parsed.color
  };
  if (!parsed.brand_id) return base;

  // Brand recognized — search inventory for matching model
  base.status = 'new'; // at minimum it's a new item of known brand
  if (!parsed.model) return base;

  try {
    // Use direct query with ILIKE + limit instead of fetching all brand inventory
    var q = sb.from('inventory').select('id, barcode, brand_id, supplier_id, model, color, size, cost_price, sell_price')
      .eq('tenant_id', getTenantId()).eq('brand_id', parsed.brand_id).eq('is_deleted', false)
      .ilike('model', '%' + parsed.model.replace(/[%_]/g, '') + '%');
    if (supplierId) q = q.eq('supplier_id', supplierId);
    var { data: matches, error: mErr } = await q.limit(20);
    if (mErr || !matches || !matches.length) return base;

    // Narrow by size/color if available
    if (parsed.size && matches.length > 1) {
      var sized = matches.filter(function(r) { return (r.size || '') === parsed.size; });
      if (sized.length) matches = sized;
    }
    if (parsed.color && matches.length > 1) {
      var colorLower = parsed.color.toLowerCase();
      var colored = matches.filter(function(r) { return (r.color || '').toLowerCase().indexOf(colorLower) >= 0; });
      if (colored.length) matches = colored;
    }
    var inv = matches[0];
    return {
      status: 'matched', inventory_id: inv.id, barcode: inv.barcode,
      brand_id: inv.brand_id, brand_name: brandCacheRev[inv.brand_id] || parsed.brand_name,
      model: inv.model || parsed.model, size: inv.size || parsed.size,
      color: inv.color || parsed.color
    };
  } catch (e) {
    console.warn('_rcptOcrMatchItem error:', e);
    return base;
  }
}

// --- 3. Classify all OCR items ---
async function _rcptOcrClassifyItems(ocrItems, supplierId) {
  if (!ocrItems || !ocrItems.length) return [];
  var results = [];
  for (var i = 0; i < ocrItems.length; i++) {
    var item = ocrItems[i];
    var parsed = _rcptOcrParseDescription(item.description || item.model || '');
    var matched = await _rcptOcrMatchItem(parsed, supplierId);
    results.push({
      index: i, status: matched.status,
      inventory_id: matched.inventory_id, barcode: matched.barcode,
      brand_id: matched.brand_id, brand_name: matched.brand_name || '',
      model: matched.model || '', size: matched.size || '', color: matched.color || '',
      quantity: Math.max(1, parseInt(item.quantity) || 1),
      unit_price: parseFloat(item.unit_price) || null,
      raw_description: item.description || item.model || '',
      skip: false
    });
  }
  return results;
}

// --- 4. Show review modal ---
function _rcptOcrShowReview(classifiedItems, onConfirm) {
  var counts = { matched: 0, new: 0, unknown: 0 };
  classifiedItems.forEach(function(it) { counts[it.status] = (counts[it.status] || 0) + 1; });

  var brandNames = brands.filter(function(b) { return b.active !== false; }).map(function(b) { return b.name; });

  // Build table rows
  var rowsHtml = classifiedItems.map(function(it, idx) {
    var bg = it.status === 'matched' ? '#e8f5e9' : it.status === 'new' ? '#fff9c4' : '#fef9c3';
    var icon = it.status === 'matched' ? '\u2705' : it.status === 'new' ? '\u2795' : '\u2753';
    var readonly = it.status === 'matched' ? ' readonly style="background:#f0f0f0"' : '';
    var brandVal = escapeHtml(it.brand_name || '');

    return '<tr data-idx="' + idx + '" style="background:' + bg + '">' +
      '<td style="text-align:center;font-size:1.1rem">' + icon + '</td>' +
      '<td style="font-size:13px;color:#333;min-width:250px;word-wrap:break-word;white-space:normal" title="' + escapeHtml(it.raw_description) + '">' + escapeHtml(it.raw_description) + '</td>' +
      '<td>' + (it.status === 'matched'
        ? '<input class="rv-brand" value="' + brandVal + '"' + readonly + '>'
        : '<input class="rv-brand" value="' + brandVal + '" data-id="' + escapeHtml(it.brand_id || '') + '" placeholder="\u05DE\u05D5\u05EA\u05D2...">') + '</td>' +
      '<td><input class="rv-model" value="' + escapeHtml(it.model) + '"' + readonly + '></td>' +
      '<td><input class="rv-size" value="' + escapeHtml(it.size) + '"' + readonly + ' style="width:50px' + (it.status === 'matched' ? ';background:#f0f0f0' : '') + '"></td>' +
      '<td><input class="rv-color" value="' + escapeHtml(it.color) + '"' + readonly + '></td>' +
      '<td><input type="number" class="rv-qty" value="' + it.quantity + '" min="1" style="width:50px"></td>' +
      '<td><input type="number" class="rv-price" value="' + (it.unit_price || '') + '" step="0.01" style="width:70px"></td>' +
      '<td style="text-align:center">' + (it.status === 'unknown'
        ? '<label style="font-size:.8rem;cursor:pointer"><input type="checkbox" class="rv-skip"> \u05D3\u05DC\u05D2</label>'
        : (it.status === 'matched' && it.barcode ? '<span style="font-size:.75rem;color:#666">' + escapeHtml(it.barcode) + '</span>' : '')) + '</td>' +
    '</tr>';
  }).join('');

  var summary = '\u2705 ' + counts.matched + ' \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD \u2502 \u2795 ' +
    counts['new'] + ' \u05D7\u05D3\u05E9\u05D9\u05DD \u2502 \u2753 ' + counts.unknown + ' \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4\u05D9\u05DD';

  var helpBox = '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;margin-bottom:12px;direction:rtl;font-size:13px">' +
    '\uD83D\uDCA1 <strong>\u05E1\u05E7\u05D9\u05E8\u05EA \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD:</strong> ' +
    '\u05D4-AI \u05E1\u05E8\u05E7 \u05D0\u05EA \u05D4\u05DE\u05E1\u05DE\u05DA \u05D5\u05D7\u05D9\u05DC\u05E5 \u05D0\u05EA \u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD. \u05D4\u05EA\u05D0\u05DD \u05DB\u05DC \u05E4\u05E8\u05D9\u05D8 \u05DC\u05DE\u05D5\u05EA\u05D2 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA.' +
    '<br>\u2705 = \u05EA\u05D5\u05D0\u05DD &nbsp; \u2795 = \u05D7\u05D3\u05E9 &nbsp; \u2753 = \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4\u05D4 \u2014 \u05E6\u05E8\u05D9\u05DA \u05D4\u05EA\u05D0\u05DE\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA' +
    '<br>\u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC\u05DA \u05E2\u05D5\u05D6\u05E8\u05D9\u05DD \u05DC-AI \u05DC\u05DC\u05DE\u05D5\u05D3 \u05D5\u05DC\u05D4\u05E9\u05EA\u05E4\u05E8.</div>';
  var content = helpBox + '<div style="margin-bottom:10px;font-size:.9rem;color:#333">' + summary + '</div>' +
    '<div style="overflow-x:auto;max-height:55vh;overflow-y:auto">' +
    '<table class="data-table" style="width:100%;font-size:.85rem;border-collapse:collapse">' +
    '<thead style="position:sticky;top:0;background:#fff;z-index:1"><tr>' +
    '<th>\u05E1\u05D8\u05D8\u05D5\u05E1</th><th>\u05EA\u05D9\u05D0\u05D5\u05E8</th><th>\u05DE\u05D5\u05EA\u05D2</th>' +
    '<th>\u05D3\u05D2\u05DD</th><th>\u05DE\u05D9\u05D3\u05D4</th><th>\u05E6\u05D1\u05E2</th>' +
    '<th>\u05DB\u05DE\u05D5\u05EA</th><th>\u05DE\u05D7\u05D9\u05E8</th><th>\u05E4\u05E2\u05D5\u05DC\u05D4</th>' +
    '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';

  var footer = '<div style="display:flex;gap:8px;justify-content:flex-end;padding:8px 0">' +
    '<button class="btn" style="background:#e5e7eb;color:#1e293b" id="rcpt-rv-cancel">\u05D1\u05D8\u05DC</button>' +
    '<button class="btn" style="background:#059669;color:#fff" id="rcpt-rv-confirm">\u05D0\u05E9\u05E8 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD</button></div>';

  var modal = Modal.show({
    title: '\u05E1\u05E7\u05D9\u05E8\u05EA \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE-OCR (' + classifiedItems.length + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD)',
    content: content, footer: footer, size: 'lg'
  });
  var mc = modal.el.querySelector('.modal-container');
  if (mc) mc.style.cssText = 'width:90vw;max-width:1000px';

  // Wire brand search-select for non-matched rows
  var tbody = modal.el.querySelector('tbody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach(function(tr) {
      var idx = parseInt(tr.dataset.idx);
      var it = classifiedItems[idx];
      if (it.status === 'matched') return;
      var brandInput = tr.querySelector('.rv-brand');
      if (!brandInput) return;
      var ss = createSearchSelect(brandNames, it.brand_name || '', function(val) {
        brandInput.value = val;
        brandInput.dataset.id = brandCache[val] || '';
      });
      ss.style.cssText = 'min-width:120px';
      brandInput.parentNode.replaceChild(ss, brandInput);
      // Copy class to hidden input for reading
      var hiddenInput = ss.querySelector('input[type="hidden"]');
      if (hiddenInput) hiddenInput.className = 'rv-brand';
      var visInput = ss.querySelector('input[type="text"]');
      if (visInput) visInput.dataset.id = it.brand_id || '';
    });
  }

  // Button handlers
  var confirmBtn = modal.el.querySelector('#rcpt-rv-confirm');
  var cancelBtn = modal.el.querySelector('#rcpt-rv-cancel');
  if (cancelBtn) cancelBtn.onclick = function() { modal.close(); };
  if (confirmBtn) confirmBtn.onclick = function() {
    var finalItems = _rcptOcrCollectReviewData(modal.el, classifiedItems);
    modal.close();
    if (onConfirm) onConfirm(finalItems);
  };
}

// --- Collect data from review modal DOM ---
function _rcptOcrCollectReviewData(modalEl, classifiedItems) {
  var rows = modalEl.querySelectorAll('tbody tr');
  var results = [];
  rows.forEach(function(tr) {
    var idx = parseInt(tr.dataset.idx);
    var orig = classifiedItems[idx];
    var brandEl = tr.querySelector('.rv-brand');
    var brandName = brandEl ? (brandEl.value || '') : orig.brand_name;
    var brandId = brandEl && brandEl.dataset && brandEl.dataset.id ? brandEl.dataset.id : (brandCache[brandName] || orig.brand_id);
    results.push({
      status: orig.status,
      inventory_id: orig.inventory_id,
      barcode: orig.barcode,
      brand_id: brandId || null,
      brand_name: brandName,
      model: (tr.querySelector('.rv-model') || {}).value || orig.model,
      size: (tr.querySelector('.rv-size') || {}).value || orig.size,
      color: (tr.querySelector('.rv-color') || {}).value || orig.color,
      quantity: parseInt((tr.querySelector('.rv-qty') || {}).value) || 1,
      unit_price: parseFloat((tr.querySelector('.rv-price') || {}).value) || null,
      skip: !!(tr.querySelector('.rv-skip') || {}).checked
    });
  });
  return results;
}

// --- 5. Apply confirmed items to receipt form ---
function _rcptOcrApplyToForm(confirmedItems, originalOcrItems) {
  var added = 0;
  confirmedItems.forEach(function(item) {
    if (item.skip) return;
    if (item.status === 'matched') {
      addReceiptItemRow({
        barcode: item.barcode || '', brand: item.brand_name || '',
        model: item.model || '', color: item.color || '', size: item.size || '',
        quantity: item.quantity, unit_cost: item.unit_price || '',
        sell_price: '', is_new_item: false, inventory_id: item.inventory_id
      });
    } else {
      addReceiptItemRow({
        barcode: '', brand: item.brand_name || '',
        model: item.model || '', color: item.color || '', size: item.size || '',
        quantity: item.quantity, unit_cost: item.unit_price || '',
        sell_price: '', is_new_item: true
      });
    }
    added++;
  });
  updateReceiptItemsStats();
  if (added > 0) toast('\u05E0\u05D5\u05E1\u05E4\u05D5 ' + added + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05E1\u05E8\u05D9\u05E7\u05EA AI', 's');
  // Phase 8 Step 5: store corrections for learning on confirm
  var supName = ($('rcpt-supplier') || {}).value || '';
  var supId = supName ? (supplierCache[supName] || null) : null;
  if (supId && originalOcrItems) {
    window._lastOcrItemCorrections = { original: originalOcrItems, confirmed: confirmedItems, supplierId: supId };
  }
}

// --- Phase 8 Step 5: Item correction learning ---
function _rcptOcrBuildItemCorrections(originalOcrItems, confirmedItems) {
  var corrections = [];
  for (var i = 0; i < confirmedItems.length; i++) {
    var conf = confirmedItems[i];
    if (conf.skip) continue;
    var orig = originalOcrItems[i];
    if (!orig) continue;
    var ocrDesc = orig.description || orig.model || '';
    if (!ocrDesc) continue;
    // Check if user changed brand from what OCR/auto-match suggested
    var parsed = _rcptOcrParseDescription(ocrDesc);
    if (conf.brand_name && parsed.brand_name && conf.brand_name.toLowerCase() !== parsed.brand_name.toLowerCase()) {
      corrections.push({ ocr_text: ocrDesc, type: 'brand', from: parsed.brand_name, to: conf.brand_name });
    }
    // Check if user matched to a specific inventory item that auto-match didn't find
    if (conf.inventory_id && conf.status === 'matched') {
      corrections.push({ ocr_text: ocrDesc, type: 'item_alias', maps_to: { brand: conf.brand_name, model: conf.model, barcode: conf.barcode || '' } });
    }
  }
  return corrections;
}

async function _rcptOcrSaveItemLearning(corrections, supplierId) {
  if (!corrections.length || !supplierId) return;
  try {
    var templates = await fetchAll(T.OCR_TEMPLATES, [['supplier_id', 'eq', supplierId]]);
    if (!templates.length) return;
    var tmpl = templates[0];
    var hints = tmpl.extraction_hints || {};
    if (!Array.isArray(hints.item_aliases)) hints.item_aliases = [];
    corrections.forEach(function(c) {
      // Avoid duplicates
      var exists = hints.item_aliases.some(function(a) { return a.ocr_text === c.ocr_text && a.type === c.type; });
      if (!exists) hints.item_aliases.push(c);
    });
    // Keep last 50 aliases to avoid bloat
    if (hints.item_aliases.length > 50) hints.item_aliases = hints.item_aliases.slice(-50);
    await batchUpdate(T.OCR_TEMPLATES, [{ id: tmpl.id, extraction_hints: hints }]);
  } catch (e) { console.warn('_rcptOcrSaveItemLearning error:', e); }
}
