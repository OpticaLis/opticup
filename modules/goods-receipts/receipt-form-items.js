// receipt-form-items.js — Receipt item row management, status, barcodes
// Split from receipt-form.js. Load AFTER receipt-form.js.
// Provides: addReceiptItemRow, getReceiptItems, _onReceiptStatusChange,
//   updateReceiptItemsStats, addNewReceiptRow, generateReceiptBarcodes

function addReceiptItemRow(data) {
  // Check for duplicate barcode in current receipt
  const barcode = data?.barcode || '';
  if (barcode) {
    const existingBarcodes = Array.from($('rcpt-items-body').querySelectorAll('.rcpt-barcode')).map(el => el.value.trim());
    if (existingBarcodes.includes(barcode)) {
      toast('ברקוד זה כבר קיים בקבלה — הגדל את הכמות בשורה הקיימת', 'e');
      return;
    }
  }

  rcptRowNum++;
  const tb = $('rcpt-items-body');
  const tr = document.createElement('tr');
  tr.dataset.row = rcptRowNum;
  if (data?.inventory_id) tr.dataset.inventoryId = data.inventory_id;
  const fromPo = !!data?.from_po;
  if (fromPo) tr.dataset.fromPo = '1';

  const isNew = data?.is_new_item ?? true;
  const isExisting = !isNew;
  // Status dropdown for PO rows, delete button for non-PO rows
  const rcptStatus = data?.receipt_status || (fromPo ? 'ok' : null);
  var actionCol;
  if (fromPo) {
    actionCol = '<select class="rcpt-receipt-status" style="min-width:90px;font-size:.78rem" onchange="_onReceiptStatusChange(this)">' +
      '<option value="ok"' + (rcptStatus === 'ok' ? ' selected' : '') + '>\u2705 \u05EA\u05E7\u05D9\u05DF</option>' +
      '<option value="partial_received"' + (rcptStatus === 'partial_received' ? ' selected' : '') + '>\uD83D\uDCE6 \u05D4\u05D2\u05D9\u05E2 \u05D7\u05DC\u05E7\u05D9\u05EA</option>' +
      '<option value="not_received"' + (rcptStatus === 'not_received' ? ' selected' : '') + '>\u274C \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2</option>' +
      '<option value="return"' + (rcptStatus === 'return' ? ' selected' : '') + '>\uD83D\uDD04 \u05DC\u05D4\u05D7\u05D6\u05E8\u05D4</option>' +
    '</select>' +
      '<input type="number" class="rcpt-partial-qty" min="1" style="display:none;width:60px;margin-top:4px;font-size:.78rem" placeholder="\u05DB\u05DE\u05D4?">';
  } else {
    actionCol = '<button class="btn btn-sm" style="background:#ef4444;color:#fff" onclick="this.closest(\'tr\').remove();updateReceiptItemsStats()" title="\u05D4\u05E1\u05E8">\u2716</button>';
  }

  tr.innerHTML = `
    <td>${rcptRowNum}</td>
    <td><input type="text" class="rcpt-barcode" value="${escapeHtml(data?.barcode || '')}" readonly style="background:${data?.barcode ? '#f0f0f0' : '#fff8e1'}"></td>
    <td><input type="text" class="rcpt-brand" value="${escapeHtml(data?.brand || '')}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-model" value="${escapeHtml(data?.model || '')}" ${isExisting ? 'style="background:#f5f5f5"' : ''}></td>
    <td><input type="text" class="rcpt-color" value="${escapeHtml(data?.color || '')}" ${isExisting ? 'style="background:#f5f5f5"' : ''}></td>
    <td><input type="text" class="rcpt-size" value="${escapeHtml(data?.size || '')}" ${isExisting ? 'style="background:#f5f5f5"' : ''}></td>
    <td><select class="rcpt-ptype" style="min-width:55px;font-size:.78rem" ${isExisting ? 'disabled' : ''}>
      <option value="eyeglasses" ${(data?.product_type || '') !== 'sunglasses' ? 'selected' : ''}>\u05E8\u05D0\u05D9\u05D9\u05D4</option>
      <option value="sunglasses" ${(data?.product_type || '') === 'sunglasses' ? 'selected' : ''}>\u05E9\u05DE\u05E9</option>
    </select></td>
    <td><input type="number" class="rcpt-qty col-qty" min="1" value="${data?.quantity || 1}"></td>
    <td><input type="number" class="rcpt-ucost col-price" step="0.01" min="0" value="${data?.unit_cost || ''}"></td>
    <td><input type="number" class="rcpt-sprice col-price" step="0.01" min="0" value="${data?.sell_price || ''}"></td>
    <td><select class="rcpt-sync" style="min-width:65px" ${isExisting ? 'disabled' : ''}>
      <option value="">—</option>
      <option value="מלא">מלא</option>
      <option value="תדמית">תדמית</option>
      <option value="לא">לא</option>
    </select></td>
    <td>${isNew ? '<input type="file" class="rcpt-images" multiple accept="image/*" style="max-width:120px;font-size:.75rem">' : '<span style="color:#999">—</span>'}</td>
    <td>${isNew ? '<span class="rcpt-new-badge">חדש</span>' : '<span class="rcpt-existing-badge">קיים</span>'}
      <input type="hidden" class="rcpt-is-new" value="${isNew ? '1' : '0'}">
    </td>
    <td style="white-space:nowrap">
      <button class="btn-rcpt-note" data-row="${rcptRowNum}" style="background:none;border:none;cursor:pointer;font-size:14px;${data?.note ? 'color:#2196F3' : 'opacity:.4'}" title="הערה לפריט" onclick="_toggleRcptNote(${rcptRowNum})">${data?.note ? '\uD83D\uDCAC' : '\uD83D\uDCAD'}</button>
      ${actionCol}
    </td>
  `;
  // Note row (hidden by default)
  var noteRow = document.createElement('tr');
  noteRow.id = 'rcpt-note-row-' + rcptRowNum;
  noteRow.style.display = data?.note ? '' : 'none';
  noteRow.style.background = '#f8f9fa';
  noteRow.innerHTML = '<td colspan="15" style="padding:4px 16px 8px">' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:4px">' +
      '<div><label style="font-size:11px;display:block;color:#666">גשר</label><input type="text" class="rcpt-bridge" value="' + escapeHtml(data?.bridge || '') + '" style="width:55px;padding:4px 6px;border-radius:4px;border:1px solid #ccc;font-size:13px"></div>' +
      '<div><label style="font-size:11px;display:block;color:#666">אורך מוט</label><input type="text" class="rcpt-temple" value="' + escapeHtml(data?.temple_length || '') + '" style="width:55px;padding:4px 6px;border-radius:4px;border:1px solid #ccc;font-size:13px"></div>' +
    '</div>' +
    '<textarea class="rcpt-item-note" data-row="' + rcptRowNum + '" rows="2" maxlength="500" placeholder="\u05D4\u05E2\u05E8\u05D4 \u05DC\u05E4\u05E8\u05D9\u05D8..." style="width:100%;padding:6px 8px;border-radius:4px;border:1px solid #ccc;direction:rtl;resize:vertical;font-size:13px">' + escapeHtml(data?.note || '') + '</textarea></td>';
  // Apply dimmed state if loading with not_received status
  if (rcptStatus === 'not_received') {
    tr.classList.add('rcpt-row-dimmed');
    setTimeout(function() {
      var q = tr.querySelector('.rcpt-qty'); if (q) q.disabled = true;
      var c = tr.querySelector('.rcpt-ucost'); if (c) c.disabled = true;
    }, 0);
  }
  // Apply partial_received state: show partial qty input
  if (rcptStatus === 'partial_received') {
    setTimeout(function() {
      var q = tr.querySelector('.rcpt-qty'); if (q) q.disabled = true;
      var pInput = tr.querySelector('.rcpt-partial-qty');
      if (pInput) {
        var orderedQty = parseInt(q?.value) || 1;
        pInput.max = orderedQty;
        pInput.value = data?.partial_qty || (orderedQty > 1 ? orderedQty - 1 : 1);
        pInput.style.display = 'block';
        pInput.onchange = function() { updateReceiptItemsStats(); };
      }
    }, 0);
  }
  // Auto-set sync from brand default
  const brandName = data?.brand || '';
  if (brandName) {
    const defSync = getBrandSync(brandName);
    if (defSync) tr.querySelector('.rcpt-sync').value = defSync;
  }
  if (data?.sync) tr.querySelector('.rcpt-sync').value = data.sync;
  tb.appendChild(tr);
  tb.appendChild(noteRow);
  updateReceiptItemsStats();
}

function _toggleRcptNote(rowNum) {
  var noteRow = document.getElementById('rcpt-note-row-' + rowNum);
  if (!noteRow) return;
  var showing = noteRow.style.display !== 'none';
  noteRow.style.display = showing ? 'none' : '';
  if (!showing) { var ta = noteRow.querySelector('.rcpt-item-note'); if (ta) setTimeout(function() { ta.focus(); }, 50); }
}

function getReceiptItems() {
  return Array.from($('rcpt-items-body').querySelectorAll('tr[data-row]')).map(tr => {
    var rcptStatus = tr.querySelector('.rcpt-receipt-status')?.value || null;
    const qtyVal = parseInt(tr.querySelector('.rcpt-qty')?.value);
    // Allow qty 0 for not_received items (they won't enter inventory)
    if (rcptStatus !== 'not_received' && (!qtyVal || qtyVal < 1)) {
      toast('\u05DB\u05DE\u05D5\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05DC\u05E4\u05D7\u05D5\u05EA 1', 'e');
      throw new Error('invalid qty');
    }
    // Effective quantity: for partial_received, use partial qty input value
    var effectiveQty = qtyVal || 0;
    if (rcptStatus === 'partial_received') {
      var partialInput = tr.querySelector('.rcpt-partial-qty');
      effectiveQty = parseInt(partialInput?.value) || 1;
      if (effectiveQty > qtyVal) effectiveQty = qtyVal;
      if (effectiveQty < 1) effectiveQty = 1;
    }
    // Single barcode per product line (from dataset or input field)
    var barcodesStr = tr.dataset.barcodes || '';
    var singleBarcode = tr.querySelector('.rcpt-barcode')?.value?.trim() || '';
    var barcode = barcodesStr || singleBarcode;

    return {
      tr,
      barcode: barcode,
      brand: tr.querySelector('.rcpt-brand')?.value?.trim() || '',
      model: tr.querySelector('.rcpt-model')?.value?.trim() || '',
      color: tr.querySelector('.rcpt-color')?.value?.trim() || '',
      size: tr.querySelector('.rcpt-size')?.value?.trim() || '',
      product_type: tr.querySelector('.rcpt-ptype')?.value || 'eyeglasses',
      quantity: effectiveQty,
      ordered_qty: qtyVal || 0,
      unit_cost: parseFloat(tr.querySelector('.rcpt-ucost')?.value) || null,
      sell_price: parseFloat(tr.querySelector('.rcpt-sprice')?.value) || null,
      sync: tr.querySelector('.rcpt-sync')?.value || '',
      images: tr.querySelector('.rcpt-images')?.files || [],
      is_new_item: tr.querySelector('.rcpt-is-new')?.value === '1',
      inventory_id: tr.dataset.inventoryId || null,
      from_po: tr.dataset.fromPo === '1',
      receipt_status: rcptStatus,
      note: (function() { var nr = document.getElementById('rcpt-note-row-' + tr.dataset.row); var ta = nr ? nr.querySelector('.rcpt-item-note') : null; return ta ? ta.value.trim() : ''; })(),
      bridge: (function() { var nr = document.getElementById('rcpt-note-row-' + tr.dataset.row); var inp = nr ? nr.querySelector('.rcpt-bridge') : null; return inp ? inp.value.trim() : ''; })(),
      temple_length: (function() { var nr = document.getElementById('rcpt-note-row-' + tr.dataset.row); var inp = nr ? nr.querySelector('.rcpt-temple') : null; return inp ? inp.value.trim() : ''; })()
    };
  });
}

function _onReceiptStatusChange(sel) {
  var row = sel.closest('tr');
  if (!row) return;
  var partialInput = row.querySelector('.rcpt-partial-qty');
  var qtyInput = row.querySelector('.rcpt-qty');
  var costInput = row.querySelector('.rcpt-ucost');

  if (sel.value === 'not_received') {
    row.classList.add('rcpt-row-dimmed');
    row.style.opacity = '0.5';
    if (qtyInput) qtyInput.disabled = true;
    if (costInput) costInput.disabled = true;
    if (partialInput) partialInput.style.display = 'none';
    // Move to bottom of table
    var tbody = row.parentElement;
    if (tbody) tbody.appendChild(row);
  } else if (sel.value === 'partial_received') {
    row.classList.remove('rcpt-row-dimmed');
    if (qtyInput) qtyInput.disabled = true; // qty stays at ordered amount for reference
    if (costInput) costInput.disabled = false;
    // Show partial qty input, default = ordered qty - 1
    if (partialInput) {
      var orderedQty = parseInt(qtyInput?.value) || 1;
      partialInput.max = orderedQty;
      partialInput.value = orderedQty > 1 ? orderedQty - 1 : 1;
      partialInput.style.display = 'block';
      partialInput.onchange = function() { updateReceiptItemsStats(); };
    }
  } else {
    row.classList.remove('rcpt-row-dimmed');
    row.style.opacity = '';
    if (qtyInput) qtyInput.disabled = false;
    if (costInput) costInput.disabled = false;
    if (partialInput) partialInput.style.display = 'none';
    // Move back above not-received rows
    var tbody = row.parentElement;
    if (tbody) {
      var firstDimmed = tbody.querySelector('tr.rcpt-row-dimmed');
      if (firstDimmed) tbody.insertBefore(row, firstDimmed);
    }
  }
  updateReceiptItemsStats();
}

function updateReceiptItemsStats() {
  let items;
  try { items = getReceiptItems(); } catch (e) { return; }
  var activeItems = items.filter(i => i.receipt_status !== 'not_received');
  const total = activeItems.reduce((s, i) => s + i.quantity, 0);
  const newCount = activeItems.filter(i => i.is_new_item).length;
  const existCount = activeItems.filter(i => !i.is_new_item).length;
  var notRecvd = items.filter(i => i.receipt_status === 'not_received').length;
  var returnCnt = items.filter(i => i.receipt_status === 'return').length;
  var partialCnt = items.filter(i => i.receipt_status === 'partial_received').length;
  // Total cost of active items
  var totalCost = activeItems.reduce((s, i) => s + i.quantity * (i.unit_cost || 0), 0);
  var extra = '';
  if (partialCnt) extra += ' | ' + partialCnt + ' \u05D7\u05DC\u05E7\u05D9\u05EA';
  if (notRecvd) extra += ' | ' + notRecvd + ' \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2\u05D5';
  if (returnCnt) extra += ' | ' + returnCnt + ' \u05DC\u05D4\u05D7\u05D6\u05E8\u05D4';
  if (totalCost > 0) extra += ' | \u05E1\u05D4"\u05DB \u05E2\u05DC\u05D5\u05EA: \u20AA' + totalCost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $('rcpt-items-stats').textContent = items.length
    ? `\u05E1\u05D4"\u05DB ${items.length} \u05E9\u05D5\u05E8\u05D5\u05EA | ${total} \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA | ${existCount} \u05E7\u05D9\u05D9\u05DE\u05D9\u05DD | ${newCount} \u05D7\u05D3\u05E9\u05D9\u05DD` + extra
    : '';
}

function addNewReceiptRow() {
  addReceiptItemRow({ barcode: '', is_new_item: true, quantity: 1 });
  toast('פריט חדש נוסף — מלא פרטים ולחץ "יצירת ברקודים"', 'i');
}
// =========================================================
// Manual barcode generation for receipt items
// ONE barcode per product line (brand+model+color+size).
// qty=10 → 1 barcode, 1 inventory row with quantity=10.
// Skips: not_received, return items. Keeps existing barcodes.
// =========================================================
async function generateReceiptBarcodes() {
  var items;
  try { items = getReceiptItems(); } catch (e) { return; }
  if (!items.length) { toast('\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05D9\u05E6\u05D9\u05E8\u05EA \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD', 'w'); return; }

  // Filter: new items that need ONE barcode, skipping not_received/return
  var needBarcode = items.filter(function(i) {
    if (i.receipt_status === 'not_received' || i.receipt_status === 'return') return false;
    if (i.is_new_item && !i.barcode) return true;
    return false;
  });

  if (!needBarcode.length) {
    toast('\u05DB\u05DC \u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D1\u05DC\u05D5 \u05D1\u05E8\u05E7\u05D5\u05D3', 'i');
    return;
  }

  // Validate required fields
  var incomplete = needBarcode.filter(function(i) { return i.is_new_item && (!i.brand || !i.model); });
  if (incomplete.length) {
    toast(incomplete.length + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D7\u05E1\u05E8\u05D9\u05DD \u05DE\u05D5\u05EA\u05D2 \u05D0\u05D5 \u05D3\u05D2\u05DD \u2014 \u05E0\u05D3\u05E8\u05E9 \u05DC\u05E4\u05E0\u05D9 \u05D9\u05E6\u05D9\u05E8\u05EA \u05D1\u05E8\u05E7\u05D5\u05D3', 'e');
    return;
  }

  showLoading('\u05DE\u05D9\u05D9\u05E6\u05E8 \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD...');
  try {
    await loadMaxBarcode();
    var prefix = branchCode.padStart(2, '0');
    var nextSeq = maxBarcode;
    var generated = 0;

    for (var i = 0; i < needBarcode.length; i++) {
      var item = needBarcode[i];
      // ONE barcode per product line, regardless of quantity
      nextSeq++;
      if (nextSeq > 99999) throw new Error('\u05D7\u05E8\u05D9\u05D2\u05D4 \u2014 \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 99,999 \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD \u05DC\u05E1\u05E0\u05D9\u05E3 ' + prefix);
      var newBarcode = prefix + String(nextSeq).padStart(5, '0');
      generated++;

      // Store single barcode on the row
      item.tr.dataset.barcodes = newBarcode;

      // Update barcode cell display
      var bcInput = item.tr.querySelector('.rcpt-barcode');
      if (bcInput) {
        bcInput.value = newBarcode;
        bcInput.style.background = '#e8f5e9';
      }
      // Remove any old multi-barcode indicator
      var bcCell = bcInput?.parentElement;
      if (bcCell) {
        var indicator = bcCell.querySelector('.rcpt-bc-count');
        if (indicator) indicator.remove();
      }
    }
    maxBarcode = nextSeq;
    toast(generated + ' \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD \u05E0\u05D5\u05E6\u05E8\u05D5 \u2014 \u05D4\u05D3\u05E4\u05E1 \u05EA\u05D5\u05D5\u05D9\u05D5\u05EA!', 's');
    updateReceiptItemsStats();
  } catch (e) {
    console.error('generateReceiptBarcodes error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

// ── Receipt items column sort (DOM reorder) ─────────────────
var _rcptSortKeyMap = { barcode: '.rcpt-barcode', brand: '.rcpt-brand', model: '.rcpt-model', color: '.rcpt-color', size: '.rcpt-size', qty: '.rcpt-qty', cost: '.rcpt-ucost' };
document.addEventListener('click', function(e) {
  var th = e.target.closest('#rcpt-items-thead th[data-sort-key]');
  if (!th || typeof SortUtils === 'undefined') return;
  var s = SortUtils.toggle('rcpt-items', th.dataset.sortKey);
  SortUtils.updateHeaders(document.getElementById('rcpt-items-thead'), s.key, s.dir);
  var tbody = document.getElementById('rcpt-items-body');
  if (!tbody) return;
  var sel = _rcptSortKeyMap[s.key]; if (!sel) return;
  var rows = Array.from(tbody.querySelectorAll('tr[data-row]'));
  rows.sort(function(a, b) {
    var va = (a.querySelector(sel) || {}).value || '';
    var vb = (b.querySelector(sel) || {}).value || '';
    var na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) return s.dir === 'asc' ? na - nb : nb - na;
    var cmp = va.localeCompare(vb, 'he');
    return s.dir === 'asc' ? cmp : -cmp;
  });
  rows.forEach(function(tr) {
    var noteRow = document.getElementById('rcpt-note-row-' + tr.dataset.row);
    tbody.appendChild(tr);
    if (noteRow) tbody.appendChild(noteRow);
  });
});
