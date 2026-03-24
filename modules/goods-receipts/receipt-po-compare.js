// receipt-po-compare.js — Pre-confirmation PO comparison report (Phase 8 Step 4b)
// Load after: receipt-confirm.js
// Provides: _poCompBuildReport(), _poCompShowReport(), _poCompApplyDecisions()
// Uses: fetchAll, getTenantId, sb, T, Modal, escapeHtml, formatILS, brandCacheRev, batchCreate, writeLog

// --- 1. Build comparison report ---
async function _poCompBuildReport(receiptItems, poId) {
  var poItems = await fetchAll('purchase_order_items', [['po_id', 'eq', poId]]);
  // Fetch supplier_id from PO for reorder functionality
  var _poSupplierId = null;
  try { var { data: _poRec } = await sb.from(T.PO).select('supplier_id').eq('id', poId).single();
    if (_poRec) _poSupplierId = _poRec.supplier_id; } catch (e) {}
  // Build key map from PO items
  var poMap = {};
  poItems.forEach(function(pi) {
    var key = _poCompKey(pi.brand || '', pi.model || '', pi.size || '', pi.color || '');
    poMap[key] = pi;
  });
  var matched = [], shortage = [], priceGap = [], notInPo = [], usedPoKeys = {};

  for (var i = 0; i < receiptItems.length; i++) {
    var ri = receiptItems[i];
    var key = _poCompKey(ri.brand || '', ri.model || '', ri.size || '', ri.color || '');
    var pi = poMap[key];
    if (!pi) {
      notInPo.push({ idx: i, ri: ri, pi: null });
      continue;
    }
    usedPoKeys[key] = true;
    var riCost = parseFloat(ri.unit_cost) || 0;
    var piCost = parseFloat(pi.unit_cost) || 0;
    var priceDiff = piCost > 0 ? Math.abs(riCost - piCost) / piCost * 100 : 0;
    if (priceDiff > 5 && riCost > 0) {
      priceGap.push({ idx: i, ri: ri, pi: pi, poPrice: piCost, rcptPrice: riCost, diffPct: priceDiff.toFixed(1) });
    } else if (ri.quantity < (pi.qty_ordered || 0)) {
      shortage.push({ idx: i, ri: ri, pi: pi, ordered: pi.qty_ordered, received: ri.quantity });
    } else {
      matched.push({ idx: i, ri: ri, pi: pi });
    }
  }
  // Find PO items not in receipt (missing)
  var missing = [];
  poItems.forEach(function(pi) {
    var key = _poCompKey(pi.brand || '', pi.model || '', pi.size || '', pi.color || '');
    if (!usedPoKeys[key]) missing.push({ pi: pi });
  });
  return { matched: matched, shortage: shortage, priceGap: priceGap, notInPo: notInPo, missing: missing, poItems: poItems, supplierId: _poSupplierId };
}

function _poCompKey(brand, model, size, color) {
  return [brand, model, size, color].map(function(s) { return (s || '').toLowerCase().trim(); }).join('|');
}

// --- 2. Show comparison report modal ---
function _poCompShowReport(report, poNumber, onConfirm) {
  var counts = { m: report.matched.length, s: report.shortage.length, p: report.priceGap.length, n: report.notInPo.length, x: report.missing.length };
  var summary = '\u2705 ' + counts.m + ' \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD \u2502 \u26A0\uFE0F ' + counts.s + ' \u05D7\u05D5\u05E1\u05E8\u05D9\u05DD \u2502 \uD83D\uDCB0 ' + counts.p + ' \u05E4\u05E2\u05E8\u05D9 \u05DE\u05D7\u05D9\u05E8 \u2502 \uD83D\uDD34 ' + counts.n + ' \u05DC\u05D0 \u05D1\u05D4\u05D6\u05DE\u05E0\u05D4 \u2502 \uD83D\uDCE6 ' + counts.x + ' \u05D8\u05E8\u05DD \u05D4\u05D2\u05D9\u05E2\u05D5';

  var html = '<div style="margin-bottom:10px;font-size:.88rem">' + summary + '</div>';
  html += '<div style="max-height:55vh;overflow-y:auto">';

  // Matched section
  if (counts.m > 0) {
    html += _poCompSection('\u2705 \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD', '#e8f5e9', report.matched.map(function(m) {
      return _poCompRow(m.ri, '', '');
    }).join(''));
  }
  // Shortage section
  if (counts.s > 0) {
    html += _poCompSection('\u26A0\uFE0F \u05D7\u05D5\u05E1\u05E8\u05D9\u05DD', '#fff9c4', report.shortage.map(function(s) {
      return _poCompRow(s.ri, '\u05D4\u05D5\u05D6\u05DE\u05DF: ' + s.ordered + ' \u2502 \u05D4\u05D2\u05D9\u05E2: ' + s.received + ' \u2502 \u05D7\u05E1\u05E8\u05D5\u05EA: ' + (s.ordered - s.received), '');
    }).join(''));
  }
  // Price gap section
  if (counts.p > 0) {
    html += _poCompSection('\uD83D\uDCB0 \u05E4\u05E2\u05E8\u05D9 \u05DE\u05D7\u05D9\u05E8', '#fff3e0', report.priceGap.map(function(p) {
      return '<tr data-idx="' + p.idx + '" data-type="price"><td>' + escapeHtml((p.ri.brand || '') + ' ' + (p.ri.model || '')) + '</td>' +
        '<td>' + p.ri.quantity + '</td><td>' + p.diffPct + '%</td>' +
        '<td><button class="btn-sm pc-price-btn" data-choice="po_price" onclick="_poCompPickPrice(this)" style="margin:1px">\u05DE\u05D7\u05D9\u05E8 PO ' + formatILS(p.poPrice) + '</button> ' +
        '<button class="btn-sm pc-price-btn pc-active" data-choice="invoice_price" onclick="_poCompPickPrice(this)" style="margin:1px;background:#1a73e8;color:#fff">\u05DE\u05D7\u05D9\u05E8 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA ' + formatILS(p.rcptPrice) + '</button></td></tr>';
    }).join(''));
  }
  // Not in PO section
  if (counts.n > 0) {
    html += _poCompSection('\uD83D\uDD34 \u05DC\u05D0 \u05D1\u05D4\u05D6\u05DE\u05E0\u05D4', '#ffebee', report.notInPo.map(function(n) {
      return '<tr data-idx="' + n.idx + '" data-type="notinpo"><td>' + escapeHtml((n.ri.brand || '') + ' ' + (n.ri.model || '')) + '</td>' +
        '<td>' + n.ri.quantity + '</td><td>' + formatILS(n.ri.unit_cost) + '</td>' +
        '<td><button class="btn-sm pc-nipo-btn pc-active" data-choice="accept" onclick="_poCompPickNipo(this)" style="margin:1px;background:#27ae60;color:#fff">\u05E7\u05D1\u05DC</button> ' +
        '<button class="btn-sm pc-nipo-btn" data-choice="return" onclick="_poCompPickNipo(this)" style="margin:1px">\u05D4\u05D7\u05D6\u05E8</button></td></tr>';
    }).join(''));
  }
  // Missing section
  if (counts.x > 0) {
    html += _poCompSection('\uD83D\uDCE6 \u05D4\u05D5\u05D6\u05DE\u05DF \u05D5\u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2', '#f5f5f5', report.missing.map(function(m) {
      return '<tr style="color:#999"><td>' + escapeHtml((m.pi.brand || '') + ' ' + (m.pi.model || '')) + '</td>' +
        '<td>' + (m.pi.qty_ordered || 0) + '</td><td>' + formatILS(m.pi.unit_cost) + '</td><td>\u05DE\u05DE\u05EA\u05D9\u05DF</td></tr>';
    }).join(''));
  }
  // Reorder button for shortages + missing
  if (counts.s > 0 || counts.x > 0) {
    html += '<div style="text-align:center;padding:10px;border-top:1px solid var(--g200,#e5e7eb);margin-top:8px">' +
      '<button class="btn" style="background:#2196F3;color:#fff" id="pc-reorder">\uD83D\uDCE6 \u05D4\u05D6\u05DE\u05DF \u05E9\u05D5\u05D1 \u05D7\u05D5\u05E1\u05E8\u05D9\u05DD</button></div>';
  }
  html += '</div>';

  var footer = '<div style="display:flex;gap:8px;justify-content:flex-end;padding:8px 0">' +
    '<button class="btn" style="background:#e5e7eb;color:#1e293b" id="pc-back-edit">\u270F\uFE0F \u05D7\u05D6\u05D5\u05E8 \u05DC\u05E2\u05E8\u05D9\u05DB\u05D4</button>' +
    '<button class="btn" style="background:#059669;color:#fff" id="pc-confirm">\u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4 \u25B6</button></div>';

  var modal = Modal.show({
    title: '\uD83D\uDCCB \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05DE\u05D5\u05DC \u05D4\u05D6\u05DE\u05E0\u05D4 ' + escapeHtml(poNumber || ''),
    content: html, footer: footer, size: 'lg'
  });

  var backBtn = modal.el.querySelector('#pc-back-edit');
  var confirmBtn = modal.el.querySelector('#pc-confirm');
  if (backBtn) backBtn.onclick = function() { modal.close(); toast('\u05D7\u05D6\u05E8\u05EA \u05DC\u05E2\u05E8\u05D9\u05DB\u05D4 \u2014 \u05D4\u05E7\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8\u05D4', 'i'); };
  if (confirmBtn) confirmBtn.onclick = function() {
    var decisions = _poCompCollectDecisions(modal.el, report);
    modal.close();
    if (onConfirm) onConfirm(decisions);
  };
  var reorderBtn = modal.el.querySelector('#pc-reorder');
  if (reorderBtn) reorderBtn.onclick = function() { _poCompCreateReorderPO(report, poNumber); };
}

function _poCompSection(title, bg, rowsHtml) {
  return '<div style="margin-bottom:8px"><div style="font-weight:600;font-size:.88rem;padding:4px 8px;background:' + bg + ';border-radius:4px">' + title + '</div>' +
    '<table class="data-table" style="width:100%;font-size:.84rem"><tbody>' + rowsHtml + '</tbody></table></div>';
}

function _poCompRow(ri, info, extra) {
  return '<tr><td>' + escapeHtml((ri.brand || '') + ' ' + (ri.model || '')) + '</td><td>' + ri.quantity + '</td>' +
    '<td>' + formatILS(ri.unit_cost) + '</td><td style="font-size:.8rem;color:#666">' + info + extra + '</td></tr>';
}

// Button toggle helpers
function _poCompPickPrice(btn) {
  var tr = btn.closest('tr'); if (!tr) return;
  tr.querySelectorAll('.pc-price-btn').forEach(function(b) { b.classList.remove('pc-active'); b.style.background = ''; b.style.color = ''; });
  btn.classList.add('pc-active'); btn.style.background = '#1a73e8'; btn.style.color = '#fff';
}
function _poCompPickNipo(btn) {
  var tr = btn.closest('tr'); if (!tr) return;
  tr.querySelectorAll('.pc-nipo-btn').forEach(function(b) { b.classList.remove('pc-active'); b.style.background = ''; b.style.color = ''; });
  btn.classList.add('pc-active');
  btn.style.background = btn.dataset.choice === 'accept' ? '#27ae60' : '#e74c3c'; btn.style.color = '#fff';
}

// --- 3. Collect decisions from modal ---
function _poCompCollectDecisions(modalEl, report) {
  var decisions = {};
  // All matched items: auto-matched
  report.matched.forEach(function(m) { decisions[m.idx] = { price_decision: null, po_match_status: 'matched', use_price: null }; });
  // Shortages: same as matched, PO stays partial
  report.shortage.forEach(function(s) { decisions[s.idx] = { price_decision: null, po_match_status: 'matched', use_price: null }; });
  // Price gaps: read user choice
  modalEl.querySelectorAll('tr[data-type="price"]').forEach(function(tr) {
    var idx = parseInt(tr.dataset.idx);
    var active = tr.querySelector('.pc-price-btn.pc-active');
    var choice = active ? active.dataset.choice : 'invoice_price';
    var pg = report.priceGap.find(function(p) { return p.idx === idx; });
    decisions[idx] = {
      price_decision: choice,
      po_match_status: 'matched',
      use_price: choice === 'po_price' ? pg.poPrice : pg.rcptPrice
    };
  });
  // Not in PO: read accept/return
  modalEl.querySelectorAll('tr[data-type="notinpo"]').forEach(function(tr) {
    var idx = parseInt(tr.dataset.idx);
    var active = tr.querySelector('.pc-nipo-btn.pc-active');
    var choice = active ? active.dataset.choice : 'accept';
    decisions[idx] = {
      price_decision: null,
      po_match_status: choice === 'return' ? 'returned' : 'not_in_po',
      use_price: null
    };
  });
  return decisions;
}

// --- 4. Apply decisions: override prices + create returns for rejected items ---
async function _poCompApplyDecisions(receiptId, decisions, receiptItems) {
  var tid = getTenantId();
  var supplierId = supplierCache[($('rcpt-supplier') || {}).value] || null;
  for (var idx in decisions) {
    var dec = decisions[idx];
    if (!dec) continue;
    var update = { price_decision: dec.price_decision, po_match_status: dec.po_match_status };
    // Override price if user chose PO price
    if (dec.use_price != null) update.unit_cost = dec.use_price;
    // Find the saved receipt item — by barcode if available, else by row order
    var ri = receiptItems[parseInt(idx)];
    if (ri) {
      var savedQuery = sb.from(T.RCPT_ITEMS).select('id').eq('receipt_id', receiptId).eq('tenant_id', tid);
      if (ri.barcode) savedQuery = savedQuery.eq('barcode', ri.barcode);
      else savedQuery = savedQuery.eq('model', ri.model || '').eq('brand', ri.brand || '');
      var { data: savedItems } = await savedQuery.limit(1);
      if (savedItems && savedItems[0]) {
        await sb.from(T.RCPT_ITEMS).update(update).eq('id', savedItems[0].id);
      }
    }
    // Create supplier return for rejected items
    if (dec.po_match_status === 'returned' && ri && supplierId) {
      try {
        var retNum = await generateReturnNumber(supplierId);
        var ret = await batchCreate(T.SUP_RETURNS, [{
          tenant_id: tid, supplier_id: supplierId, return_number: retNum,
          return_type: 'pending_in_store', status: 'ready_to_ship',
          notes: '\u05E4\u05E8\u05D9\u05D8 \u05DC\u05D0 \u05D1\u05D4\u05D6\u05DE\u05E0\u05D4 \u2014 \u05D4\u05D5\u05D7\u05D6\u05E8 \u05DC\u05E1\u05E4\u05E7'
        }]);
        if (ret && ret[0]) {
          await batchCreate(T.SUP_RETURN_ITEMS, [{
            tenant_id: tid, return_id: ret[0].id, inventory_id: null,
            barcode: ri.barcode || '', quantity: ri.quantity || 1,
            cost_price: parseFloat(ri.unit_cost) || 0,
            brand_name: ri.brand || '', model: ri.model || '', color: ri.color || '', size: ri.size || ''
          }]);
          writeLog('supplier_return', null, { barcode: ri.barcode, return_number: retNum, reason: '\u05E4\u05E8\u05D9\u05D8 \u05DC\u05D0 \u05D1\u05D4\u05D6\u05DE\u05E0\u05D4', status: 'ready_to_ship' });
        }
      } catch (e) { console.warn('Auto-return creation failed:', e); }
    }
  }
  // Phase 8 Step 5: learn price patterns
  try { await _poCompLearnPricePattern(decisions, receiptItems, supplierId); } catch (e) { /* non-blocking */ }
}

// --- Reorder: create draft PO for shortage + missing items ---
async function _poCompCreateReorderPO(report, originalPoNumber) {
  if (!report.supplierId) { toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D6\u05D4\u05D5\u05EA \u05E1\u05E4\u05E7 \u2014 \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D7\u05D5\u05D6\u05E8\u05EA \u05DC\u05D0 \u05D0\u05E4\u05E9\u05E8\u05D9\u05EA', 'e'); return; }
  var items = [];
  // Shortage items: gap quantity
  report.shortage.forEach(function(s) {
    var gap = (s.ordered || 0) - (s.received || 0);
    if (gap > 0) items.push({
      brand: s.pi.brand || '', model: s.pi.model || '', color: s.pi.color || '', size: s.pi.size || '',
      qty_ordered: gap, unit_cost: Number(s.pi.unit_cost) || 0, discount_pct: Number(s.pi.discount_pct) || 0
    });
  });
  // Missing items: full quantity
  report.missing.forEach(function(m) {
    if (m.pi.qty_ordered > 0) items.push({
      brand: m.pi.brand || '', model: m.pi.model || '', color: m.pi.color || '', size: m.pi.size || '',
      qty_ordered: m.pi.qty_ordered, unit_cost: Number(m.pi.unit_cost) || 0, discount_pct: Number(m.pi.discount_pct) || 0
    });
  });
  if (!items.length) { toast('\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05D4\u05D6\u05DE\u05E0\u05D4 \u05D7\u05D5\u05D6\u05E8\u05EA', 'w'); return; }
  showLoading('\u05D9\u05D5\u05E6\u05E8 \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D7\u05D5\u05D6\u05E8\u05EA...');
  try {
    var newPoNum = await generatePoNumber(report.supplierId);
    if (!newPoNum) throw new Error('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D9\u05E6\u05D5\u05E8 \u05DE\u05E1\u05E4\u05E8 \u05D4\u05D6\u05DE\u05E0\u05D4');
    var { data: newPo, error: poErr } = await sb.from(T.PO).insert({
      po_number: newPoNum, supplier_id: report.supplierId,
      order_date: new Date().toISOString().split('T')[0],
      status: 'draft', tenant_id: getTenantId(),
      notes: '\u05D4\u05D6\u05DE\u05E0\u05D4 \u05D7\u05D5\u05D6\u05E8\u05EA \u05E2\u05D1\u05D5\u05E8 ' + (originalPoNumber || '')
    }).select().single();
    if (poErr) throw poErr;
    var poItems = items.map(function(it) {
      return {
        po_id: newPo.id, tenant_id: getTenantId(),
        brand: it.brand, model: it.model, color: it.color, size: it.size,
        qty_ordered: it.qty_ordered, qty_received: 0,
        unit_cost: it.unit_cost, discount_pct: it.discount_pct
      };
    });
    var { error: itemErr } = await sb.from(T.PO_ITEMS).insert(poItems);
    if (itemErr) throw itemErr;
    await writeLog('po_reorder_created', null, {
      original_po: originalPoNumber, new_po: newPoNum,
      items_count: items.length, supplier_id: report.supplierId
    });
    hideLoading();
    toast('\u05E0\u05D5\u05E6\u05E8\u05D4 \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D7\u05D3\u05E9\u05D4 ' + newPoNum, 's');
  } catch (e) {
    hideLoading();
    console.error('_poCompCreateReorderPO error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  }
}

// --- Phase 8 Step 5: Detect VAT-inclusive price pattern ---
async function _poCompLearnPricePattern(decisions, receiptItems, supplierId) {
  if (!supplierId) return;
  var priceItems = [];
  for (var idx in decisions) {
    var dec = decisions[idx];
    if (dec && dec.price_decision) priceItems.push(dec);
  }
  if (priceItems.length < 2) return; // need at least 2 items to detect pattern
  // Check if invoice prices are consistently ~17% higher than PO prices (VAT pattern)
  var invoiceCount = priceItems.filter(function(d) { return d.price_decision === 'invoice_price'; }).length;
  if (invoiceCount < priceItems.length * 0.7) return; // not a consistent pattern
  try {
    var { data: tenant } = await sb.from(T.TENANTS).select('vat_rate').eq('id', getTenantId()).single();
    var vatRate = (tenant && tenant.vat_rate) ? Number(tenant.vat_rate) / 100 : 0.17;
    var templates = await fetchAll(T.OCR_TEMPLATES, [['supplier_id', 'eq', supplierId]]);
    if (!templates.length) return;
    var hints = templates[0].extraction_hints || {};
    hints.price_pattern = { includes_vat: true, vat_rate: vatRate, detected_at: new Date().toISOString() };
    await batchUpdate(T.OCR_TEMPLATES, [{ id: templates[0].id, extraction_hints: hints }]);
  } catch (e) { console.warn('_poCompLearnPricePattern error:', e); }
}
