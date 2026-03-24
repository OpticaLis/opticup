// Pending file for receipt document attachment
var _pendingReceiptFile = null;
var _pendingReceiptFileUrl = null; // Storage path if uploaded (for cleanup on remove)

function _pickReceiptFile() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.jpeg,.png';
  input.onchange = function() {
    if (input.files[0]) _stageReceiptFile(input.files[0]);
  };
  input.click();
}

// =========================================================
// Drag & drop zone — inject into receipt form
// =========================================================
function _initReceiptDropzone() {
  var zone = $('rcpt-attach-dropzone');
  if (!zone) return;
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
    var file = e.dataTransfer.files[0];
    if (file) _stageReceiptFile(file);
  });
  zone.addEventListener('click', function() { _pickReceiptFile(); });
}

function _stageReceiptFile(file) {
  var allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowed.includes(file.type)) {
    toast('סוג קובץ לא נתמך — רק PDF, JPG, PNG', 'e');
    return;
  }
  if (file.size > 10 * 1024 * 1024) { toast('קובץ גדול מדי — מקסימום 10MB', 'e'); return; }
  _pendingReceiptFile = file;
  _pendingReceiptFileUrl = null;

  // Show preview, hide dropzone
  var zone = $('rcpt-attach-dropzone');
  var preview = $('rcpt-attach-preview');
  if (zone) zone.style.display = 'none';
  if (preview) {
    var ext = (file.name || '').split('.').pop().toLowerCase();
    var icon = ext === 'pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
    preview.style.display = 'flex';
    preview.innerHTML =
      '<span style="font-size:1.4rem">' + icon + '</span>' +
      '<span style="flex:1;font-size:.88rem">' + escapeHtml(file.name) +
        ' <span style="color:var(--g400, #9ca3af)">(' + (file.size / 1024).toFixed(0) + 'KB)</span></span>' +
      '<button class="btn btn-sm" style="background:#ef4444;color:#fff;font-size:.75rem" onclick="_removeReceiptFile()">\u2715 \u05D4\u05E1\u05E8</button>';
  }
  // Also update legacy rcpt-attach-name for OCR button visibility
  var btn = $('rcpt-attach-btn');
  if (btn) btn.style.display = 'none';
  var nameEl = $('rcpt-attach-name');
  if (nameEl) nameEl.textContent = file.name;
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
  _pendingReceiptFile = null;
  // Restore dropzone, hide preview
  var zone = $('rcpt-attach-dropzone');
  var preview = $('rcpt-attach-preview');
  if (zone) zone.style.display = '';
  if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
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
        is_new_item: item.is_new_item || false
      });
    }
    updateReceiptItemsStats();

    // Reset file attachment + init dropzone
    _pendingReceiptFile = null;
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

  const isNew = data?.is_new_item ?? true;
  const isExisting = !isNew;

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
    <td><button class="btn btn-sm" style="background:#ef4444;color:#fff" onclick="this.closest('tr').remove();updateReceiptItemsStats()" title="הסר">✖</button></td>
  `;
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
    const qtyVal = parseInt(tr.querySelector('.rcpt-qty')?.value);
    if (!qtyVal || qtyVal < 1) {
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
      quantity: qtyVal,
      unit_cost: parseFloat(tr.querySelector('.rcpt-ucost')?.value) || null,
      sell_price: parseFloat(tr.querySelector('.rcpt-sprice')?.value) || null,
      sync: tr.querySelector('.rcpt-sync')?.value || '',
      images: tr.querySelector('.rcpt-images')?.files || [],
      is_new_item: tr.querySelector('.rcpt-is-new')?.value === '1',
      inventory_id: tr.dataset.inventoryId || null
    };
  });
}

function updateReceiptItemsStats() {
  let items;
  try { items = getReceiptItems(); } catch (e) { return; }
  const total = items.reduce((s, i) => s + i.quantity, 0);
  const newCount = items.filter(i => i.is_new_item).length;
  const existCount = items.filter(i => !i.is_new_item).length;
  $('rcpt-items-stats').textContent = items.length
    ? `סה"כ ${items.length} שורות | ${total} יחידות | ${existCount} קיימים | ${newCount} חדשים`
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

// =========================================================
// INFO GUIDE — Employee quick reference
// =========================================================
const RECEIPT_GUIDE_TEXT = `
\uD83D\uDCE6 קבלת סחורה — מדריך מהיר

1. סחורה הגיעה? בדוק מה מצורף:
   • חשבונית מס → בחר "חשבונית מס"
   • תעודת משלוח → בחר "תעודת משלוח"

2. סרוק או צלם את המסמך (שמירה לתיקייה משותפת)

3. פתח "קבלה חדשה":
   • בחר ספק (המערכת תזהה את סוג המסמך הרגיל שלו)
   • הכנס מספר מסמך
   • אם יש הזמנת רכש פתוחה — היא תופיע אוטומטית

4. הוסף פריטים:
   • פריט קיים → סרוק ברקוד או חפש
   • פריט חדש → הכנס פרטים → ברקוד ייווצר אוטומטית
   • ודא כמויות ומחירים

5. בדוק את הסיכום ואשר עם PIN

\u2705 המלאי יתעדכן, החוב לספק ייווצר אוטומטית

\uD83E\uDD16 סריקה חכמה עם AI
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
1. צרף מסמך (PDF או תמונה) בלחיצה על "צרף מסמך"
2. לחץ על "סרוק עם AI" — המערכת תזהה אוטומטית:
   • שם הספק
   • מספר מסמך ותאריך
   • פריטים, כמויות ומחירים
3. בדוק את הנתונים שזוהו ותקן במידת הצורך
4. אשר עם PIN — המלאי מתעדכן אוטומטית

\uD83D\uDCA1 ככל שתשתמש יותר, המערכת לומדת את הפורמט של כל ספק ומשתפרת!
`.trim();

function showReceiptGuide() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;padding:24px 28px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto;direction:rtl;text-align:right;line-height:1.8;white-space:pre-line;font-size:.95rem;box-shadow:0 8px 32px rgba(0,0,0,.25)';
  box.textContent = RECEIPT_GUIDE_TEXT;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'סגור';
  closeBtn.className = 'btn'; closeBtn.style.cssText = 'background:#1a73e8;color:#fff';
  closeBtn.style.cssText = 'margin-top:16px;display:block;margin-right:auto';
  closeBtn.onclick = () => overlay.remove();
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
