// Pending files for receipt document attachment (multi-file)
var _pendingReceiptFiles = [];
// Backward-compat getter: _pendingReceiptFile returns first file or null
Object.defineProperty(window, '_pendingReceiptFile', {
  get: function() { return _pendingReceiptFiles.length > 0 ? _pendingReceiptFiles[0] : null; },
  set: function(v) {
    if (v === null) { _pendingReceiptFiles = []; }
    else if (v) { _pendingReceiptFiles = [v]; }
  }
});
var _pendingReceiptFileUrl = null; // Storage path if uploaded (for cleanup on remove)

function _pickReceiptFile() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.jpeg,.png';
  input.multiple = true;
  input.onchange = function() {
    for (var i = 0; i < input.files.length; i++) {
      _stageReceiptFile(input.files[i]);
    }
  };
  input.click();
}

// =========================================================
// Drag & drop zone — inject into receipt form
// =========================================================
function _initReceiptDropzone() {
  var zone = $('rcpt-attach-dropzone');
  if (!zone || zone._dropzoneInit) return;
  zone._dropzoneInit = true;
  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--primary, #1a73e8)';
    zone.style.background = '#f0f7ff';
  });
  zone.addEventListener('dragleave', function() {
    zone.style.borderColor = 'var(--g300, #d1d5db)';
    zone.style.background = '';
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--g300, #d1d5db)';
    zone.style.background = '';
    for (var i = 0; i < e.dataTransfer.files.length; i++) {
      _stageReceiptFile(e.dataTransfer.files[i]);
    }
  });
  zone.addEventListener('click', function() { _pickReceiptFile(); });
}

function _stageReceiptFile(file) {
  var allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowed.includes(file.type)) {
    toast('\u05E1\u05D5\u05D2 \u05E7\u05D5\u05D1\u05E5 \u05DC\u05D0 \u05E0\u05EA\u05DE\u05DA \u2014 \u05E8\u05E7 PDF, JPG, PNG', 'e');
    return;
  }
  if (file.size > 10 * 1024 * 1024) { toast('\u05E7\u05D5\u05D1\u05E5 \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9 \u2014 \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 10MB', 'e'); return; }
  // Avoid duplicate filenames
  if (_pendingReceiptFiles.some(function(f) { return f.name === file.name && f.size === file.size; })) {
    toast('\u05E7\u05D5\u05D1\u05E5 \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E6\u05D5\u05E8\u05E3', 'w');
    return;
  }
  _pendingReceiptFiles.push(file);
  _pendingReceiptFileUrl = null;
  _renderReceiptFileList();

  // Also update legacy rcpt-attach-name for OCR button visibility
  var btn = $('rcpt-attach-btn');
  if (btn) btn.style.display = 'none';
  var nameEl = $('rcpt-attach-name');
  if (nameEl) nameEl.textContent = _pendingReceiptFiles.map(function(f) { return f.name; }).join(', ');
}

function _renderReceiptFileList() {
  var zone = $('rcpt-attach-dropzone');
  var preview = $('rcpt-attach-preview');
  if (_pendingReceiptFiles.length === 0) {
    if (zone) zone.style.display = '';
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    return;
  }
  if (zone) zone.style.display = 'none';
  if (preview) {
    preview.style.display = 'block';
    preview.innerHTML = _pendingReceiptFiles.map(function(file, idx) {
      var ext = (file.name || '').split('.').pop().toLowerCase();
      var icon = ext === 'pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
      return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' +
        '<span style="font-size:1.2rem">' + icon + '</span>' +
        '<span style="flex:1;font-size:.85rem">' + escapeHtml(file.name) +
          ' <span style="color:var(--g400, #9ca3af)">(' + (file.size / 1024).toFixed(0) + 'KB)</span></span>' +
        '<button class="btn btn-sm" style="background:#ef4444;color:#fff;font-size:.7rem;padding:2px 6px" ' +
          'onclick="_removeReceiptFileAt(' + idx + ')">\u2715</button></div>';
    }).join('') +
    '<div style="padding:4px 0;text-align:center"><button class="btn btn-sm" style="font-size:.8rem" onclick="_pickReceiptFile()">+ \u05E7\u05D5\u05D1\u05E5 \u05E0\u05D5\u05E1\u05E3</button></div>';
  }
}

function _removeReceiptFileAt(idx) {
  _pendingReceiptFiles.splice(idx, 1);
  _renderReceiptFileList();
  if (_pendingReceiptFiles.length === 0) {
    // Restore legacy attach button
    var btn = $('rcpt-attach-btn');
    if (btn) { btn.style.display = ''; btn.innerHTML = '&#128206; \u05E6\u05E8\u05E3 \u05DE\u05E1\u05DE\u05DA'; }
    var nameEl = $('rcpt-attach-name');
    if (nameEl) nameEl.innerHTML = '';
    // Hide OCR button
    var ocrBtn = $('rcpt-ocr-btn');
    if (ocrBtn) ocrBtn.style.display = 'none';
    var banner = $('rcpt-ocr-banner');
    if (banner) banner.remove();
  }
}

async function _removeReceiptFile() {
  // Delete from Storage if already uploaded (e.g. after OCR scan)
  if (_pendingReceiptFileUrl) {
    try {
      await sb.storage.from('supplier-docs').remove([_pendingReceiptFileUrl]);
    } catch (e) {
      console.warn('Failed to delete uploaded file:', e);
    }
    _pendingReceiptFileUrl = null;
  }
  _pendingReceiptFiles = [];
  _renderReceiptFileList();
  // Restore legacy attach button
  var btn = $('rcpt-attach-btn');
  if (btn) { btn.style.display = ''; btn.innerHTML = '&#128206; \u05E6\u05E8\u05E3 \u05DE\u05E1\u05DE\u05DA'; }
  var nameEl = $('rcpt-attach-name');
  if (nameEl) nameEl.innerHTML = '';
  // Hide OCR button
  var ocrBtn = $('rcpt-ocr-btn');
  if (ocrBtn) ocrBtn.style.display = 'none';
  // Remove OCR banner if exists
  var banner = $('rcpt-ocr-banner');
  if (banner) banner.remove();
}

async function openExistingReceipt(receiptId, viewOnly) {
  showLoading('טוען קבלה...');
  try {
    const { data: rcpt, error: rErr } = await sb.from(T.RECEIPTS).select('*').eq('tenant_id', getTenantId()).eq('id', receiptId).single();
    if (rErr) throw rErr;

    const { data: items, error: iErr } = await sb.from(T.RCPT_ITEMS).select('*').eq('tenant_id', getTenantId()).eq('receipt_id', receiptId);
    if (iErr) throw iErr;

    currentReceiptId = receiptId;
    rcptEditMode = true;
    rcptViewOnly = viewOnly;
    rcptRowNum = 0;

    $('rcpt-form-title').textContent = viewOnly ? `📦 קבלה ${rcpt.receipt_number} (צפייה)` : `📦 עריכת קבלה ${rcpt.receipt_number}`;
    $('rcpt-type').value = rcpt.receipt_type || 'delivery_note';
    $('rcpt-number').value = rcpt.receipt_number || '';
    _initRcptSupplierSelect(rcpt.supplier_id ? (supplierCacheRev[rcpt.supplier_id] || '') : '');
    // Restore PO linkage
    rcptLinkedPoId = rcpt.po_id || null;
    if ($('rcpt-supplier').value) {
      await loadPOsForSupplier($('rcpt-supplier').value);
      if (rcptLinkedPoId) $('rcpt-po-select').value = rcptLinkedPoId;
    } else {
      $('rcpt-po-select').innerHTML = '<option value="">ללא — קבלה חופשית</option>';
      $('rcpt-po-select').disabled = true;
    }
    $('rcpt-po-select').onchange = () => onReceiptPoSelected();
    $('rcpt-date').value = rcpt.receipt_date || '';
    $('rcpt-notes').value = rcpt.notes || '';
    clearAlert('rcpt-form-alerts');

    // Populate items
    $('rcpt-items-body').innerHTML = '';
    for (const item of (items || [])) {
      addReceiptItemRow({
        barcode: item.barcode || '',
        brand: item.brand || '',
        model: item.model || '',
        color: item.color || '',
        size: item.size || '',
        quantity: item.quantity || 1,
        unit_cost: item.unit_cost || '',
        sell_price: item.sell_price || '',
        is_new_item: item.is_new_item || false,
        from_po: item.from_po || !!rcpt.po_id,
        receipt_status: item.receipt_status || 'ok'
      });
    }
    updateReceiptItemsStats();

    // Reset file attachment + init dropzone
    _pendingReceiptFiles = [];
    _pendingReceiptFileUrl = null;
    var _zone = $('rcpt-attach-dropzone');
    var _prev = $('rcpt-attach-preview');
    if (_zone) _zone.style.display = '';
    if (_prev) { _prev.style.display = 'none'; _prev.innerHTML = ''; }
    _initReceiptDropzone();

    // Toggle readonly for confirmed/cancelled
    toggleReceiptFormInputs(viewOnly);

    $('rcpt-step1').style.display = 'none';
    $('rcpt-step2').style.display = '';
  } catch (e) {
    console.error('openExistingReceipt error:', e);
    toast('שגיאה בטעינת קבלה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function toggleReceiptFormInputs(disabled) {
  const form = $('rcpt-step2');
  if (!form) return;
  form.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.id === 'rcpt-barcode-search') return; // keep search always enabled? No, disable in view
    el.disabled = disabled;
  });
  const actionBar = $('rcpt-action-bar');
  if (actionBar) actionBar.style.display = disabled ? 'none' : '';
  // Hide search bar + add buttons in view mode
  const searchBar = form.querySelector('.rcpt-search-bar');
  if (searchBar) searchBar.style.display = disabled ? 'none' : '';
}

async function searchReceiptBarcode() {
  const barcode = ($('rcpt-barcode-search').value || '').trim();
  if (!barcode) { toast('הזן ברקוד', 'w'); return; }

  // Check for duplicate barcode in current receipt
  const existingBarcodes = Array.from($('rcpt-items-body').querySelectorAll('.rcpt-barcode')).map(el => el.value.trim());
  if (existingBarcodes.includes(barcode)) {
    toast('ברקוד זה כבר קיים בקבלה — הגדל את הכמות בשורה הקיימת', 'e');
    return;
  }

  showLoading('מחפש ברקוד...');
  try {
    const { data, error } = await sb.from('inventory')
      .select('*, inventory_images(*)')
      .eq('tenant_id', getTenantId())
      .eq('barcode', barcode)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const brandName = brandCacheRev[data.brand_id] || '';
      addReceiptItemRow({
        barcode: data.barcode || barcode,
        brand: brandName,
        model: data.model || '',
        color: data.color || '',
        size: data.size || '',
        quantity: 1,
        unit_cost: data.cost_price || '',
        sell_price: data.sell_price || '',
        sync: enToHe('website_sync', data.website_sync) || '',
        is_new_item: false,
        inventory_id: data.id
      });
      toast(`נמצא: ${brandName} ${data.model || ''}`, 's');
    } else {
      const newBarcode = await generateNextBarcode();
      addReceiptItemRow({ barcode: newBarcode, is_new_item: true, quantity: 1 });
      toast(`ברקוד ${newBarcode} הוקצה לפריט חדש — הדפס תווית`, 's');
    }

    $('rcpt-barcode-search').value = '';
    updateReceiptItemsStats();
  } catch (e) {
    console.error('searchReceiptBarcode error:', e);
    toast('שגיאה בחיפוש: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

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
      '<option value="not_received"' + (rcptStatus === 'not_received' ? ' selected' : '') + '>\u274C \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2</option>' +
      '<option value="return"' + (rcptStatus === 'return' ? ' selected' : '') + '>\uD83D\uDD04 \u05DC\u05D4\u05D7\u05D6\u05E8\u05D4</option>' +
    '</select>';
  } else {
    actionCol = '<button class="btn btn-sm" style="background:#ef4444;color:#fff" onclick="this.closest(\'tr\').remove();updateReceiptItemsStats()" title="\u05D4\u05E1\u05E8">\u2716</button>';
  }

  tr.innerHTML = `
    <td>${rcptRowNum}</td>
    <td><input type="text" class="rcpt-barcode" value="${escapeHtml(data?.barcode || '')}" readonly style="background:#f0f0f0"></td>
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
      toast('כמות חייבת להיות לפחות 1', 'e');
      throw new Error('invalid qty');
    }
    return {
      tr,
      barcode: tr.querySelector('.rcpt-barcode')?.value?.trim() || '',
      brand: tr.querySelector('.rcpt-brand')?.value?.trim() || '',
      model: tr.querySelector('.rcpt-model')?.value?.trim() || '',
      color: tr.querySelector('.rcpt-color')?.value?.trim() || '',
      size: tr.querySelector('.rcpt-size')?.value?.trim() || '',
      quantity: qtyVal || 0,
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
  if (sel.value === 'not_received') {
    row.classList.add('rcpt-row-dimmed');
    var q = row.querySelector('.rcpt-qty'); if (q) q.disabled = true;
    var c = row.querySelector('.rcpt-ucost'); if (c) c.disabled = true;
  } else {
    row.classList.remove('rcpt-row-dimmed');
    var q2 = row.querySelector('.rcpt-qty'); if (q2) q2.disabled = false;
    var c2 = row.querySelector('.rcpt-ucost'); if (c2) c2.disabled = false;
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
  var extra = '';
  if (notRecvd) extra += ' | ' + notRecvd + ' \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2\u05D5';
  if (returnCnt) extra += ' | ' + returnCnt + ' \u05DC\u05D4\u05D7\u05D6\u05E8\u05D4';
  $('rcpt-items-stats').textContent = items.length
    ? `\u05E1\u05D4"\u05DB ${items.length} \u05E9\u05D5\u05E8\u05D5\u05EA | ${total} \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA | ${existCount} \u05E7\u05D9\u05D9\u05DE\u05D9\u05DD | ${newCount} \u05D7\u05D3\u05E9\u05D9\u05DD` + extra
    : '';
}

async function addNewReceiptRow() {
  try {
    const barcode = await generateNextBarcode();
    addReceiptItemRow({ barcode, is_new_item: true, quantity: 1 });
    toast(`ברקוד ${barcode} הוקצה לפריט חדש — הדפס תווית`, 's');
  } catch (e) {
    console.error('addNewReceiptRow error:', e);
    toast('שגיאה ביצירת ברקוד: ' + (e.message || ''), 'e');
  }
}
// Guide text + showReceiptGuide() moved to receipt-guide.js
