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
    <td><input type="text" class="rcpt-model" value="${escapeHtml(data?.model || '')}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-color" value="${escapeHtml(data?.color || '')}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-size" value="${escapeHtml(data?.size || '')}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
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
    <td>${actionCol}</td>
  `;
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
  updateReceiptItemsStats();
}

function getReceiptItems() {
  return Array.from($('rcpt-items-body').querySelectorAll('tr')).map(tr => {
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
    // Barcodes array: from dataset (comma-separated) or single barcode
    var barcodesStr = tr.dataset.barcodes || '';
    var singleBarcode = tr.querySelector('.rcpt-barcode')?.value?.trim() || '';
    var barcodes = barcodesStr ? barcodesStr.split(',').filter(Boolean) : (singleBarcode ? [singleBarcode] : []);

    return {
      tr,
      barcode: singleBarcode,
      barcodes: barcodes,
      brand: tr.querySelector('.rcpt-brand')?.value?.trim() || '',
      model: tr.querySelector('.rcpt-model')?.value?.trim() || '',
      color: tr.querySelector('.rcpt-color')?.value?.trim() || '',
      size: tr.querySelector('.rcpt-size')?.value?.trim() || '',
      quantity: effectiveQty,
      ordered_qty: qtyVal || 0,
      unit_cost: parseFloat(tr.querySelector('.rcpt-ucost')?.value) || null,
      sell_price: parseFloat(tr.querySelector('.rcpt-sprice')?.value) || null,
      sync: tr.querySelector('.rcpt-sync')?.value || '',
      images: tr.querySelector('.rcpt-images')?.files || [],
      is_new_item: tr.querySelector('.rcpt-is-new')?.value === '1',
      inventory_id: tr.dataset.inventoryId || null,
      from_po: tr.dataset.fromPo === '1',
      receipt_status: rcptStatus
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
    if (qtyInput) qtyInput.disabled = true;
    if (costInput) costInput.disabled = true;
    if (partialInput) partialInput.style.display = 'none';
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
    if (qtyInput) qtyInput.disabled = false;
    if (costInput) costInput.disabled = false;
    if (partialInput) partialInput.style.display = 'none';
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
  var extra = '';
  if (partialCnt) extra += ' | ' + partialCnt + ' \u05D7\u05DC\u05E7\u05D9\u05EA';
  if (notRecvd) extra += ' | ' + notRecvd + ' \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2\u05D5';
  if (returnCnt) extra += ' | ' + returnCnt + ' \u05DC\u05D4\u05D7\u05D6\u05E8\u05D4';
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
// Same pattern as inventory-entry.js generateBarcodes()
// Skips: not_received, return items. Keeps existing barcodes.
// =========================================================
async function generateReceiptBarcodes() {
  var items;
  try { items = getReceiptItems(); } catch (e) { return; }
  if (!items.length) { toast('\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05D9\u05E6\u05D9\u05E8\u05EA \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD', 'w'); return; }

  // Filter items that need barcodes: new items with ok/partial_received status
  // For existing items (is_new_item=false) with qty>1, we need additional barcodes for units beyond the first
  var needBarcode = items.filter(function(i) {
    if (i.receipt_status === 'not_received' || i.receipt_status === 'return') return false;
    // New items without any barcodes
    if (i.is_new_item && i.barcodes.length === 0) return true;
    // New items with fewer barcodes than qty
    if (i.is_new_item && i.barcodes.length < i.quantity) return true;
    // Existing items with qty > 1: first unit uses existing barcode, rest need new ones
    if (!i.is_new_item && i.quantity > 1 && i.barcodes.length < i.quantity) return true;
    return false;
  });

  if (!needBarcode.length) {
    toast('\u05DB\u05DC \u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D1\u05DC\u05D5 \u05D1\u05E8\u05E7\u05D5\u05D3', 'i');
    return;
  }

  // Validate required fields on new items that need barcodes
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
      var qty = item.quantity;
      var existingBarcodes = item.barcodes.slice(); // copy current barcodes
      var barcodesNeeded = qty - existingBarcodes.length;

      for (var b = 0; b < barcodesNeeded; b++) {
        nextSeq++;
        if (nextSeq > 99999) throw new Error('\u05D7\u05E8\u05D9\u05D2\u05D4 \u2014 \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 99,999 \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD \u05DC\u05E1\u05E0\u05D9\u05E3 ' + prefix);
        existingBarcodes.push(prefix + String(nextSeq).padStart(5, '0'));
        generated++;
      }

      // Store all barcodes in dataset
      item.tr.dataset.barcodes = existingBarcodes.join(',');

      // Update barcode cell display
      var bcInput = item.tr.querySelector('.rcpt-barcode');
      if (bcInput) {
        bcInput.value = existingBarcodes[0];
        bcInput.style.background = '#e8f5e9';
      }
      // Show count indicator for multi-barcode rows
      var bcCell = bcInput?.parentElement;
      if (bcCell && existingBarcodes.length > 1) {
        var indicator = bcCell.querySelector('.rcpt-bc-count');
        if (!indicator) {
          indicator = document.createElement('span');
          indicator.className = 'rcpt-bc-count';
          indicator.style.cssText = 'font-size:.72rem;color:#1a73e8;display:block;margin-top:2px';
          bcCell.appendChild(indicator);
        }
        indicator.textContent = '(+' + (existingBarcodes.length - 1) + ' \u05E0\u05D5\u05E1\u05E4\u05D9\u05DD)';
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
