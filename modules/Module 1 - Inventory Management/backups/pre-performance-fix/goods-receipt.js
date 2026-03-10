// System Log (Slog) logic moved to js/system-log.js

// =========================================================
// GOODS RECEIPT
// =========================================================
const RCPT_TYPE_LABELS = { delivery_note: 'תעודת משלוח', invoice: 'חשבונית', tax_invoice: 'חשבונית מס' };
const RCPT_STATUS_LABELS = { draft: 'טיוטה', confirmed: 'אושרה', cancelled: 'בוטלה' };

// --- PO linkage state ---
let rcptLinkedPoId = null; // currently linked PO id

async function loadPOsForSupplier(supplierName) {
  if (!supplierName) return;
  const sel = $('rcpt-po-select');
  sel.innerHTML = '<option value="">ללא — קבלה חופשית</option>';
  rcptLinkedPoId = null;
  if (!supplierName) { sel.disabled = true; return; }

  const supplierId = supplierCache[supplierName];
  if (!supplierId) { sel.disabled = true; return; }

  try {
    const { data, error } = await sb.from(T.PO)
      .select('id, po_number, status, created_at')
      .eq('supplier_id', supplierId)
      .in('status', ['sent', 'partial'])
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (!data || !data.length) { sel.disabled = true; return; }

    for (const po of data) {
      const label = `${po.po_number} (${po.status === 'sent' ? 'נשלחה' : 'חלקי'})`;
      sel.innerHTML += `<option value="${po.id}">${label}</option>`;
    }
    sel.disabled = false;
  } catch (e) {
    console.error('loadPOsForSupplier error:', e);
    sel.disabled = true;
  }
}

async function onReceiptPoSelected() {
  const poId = $('rcpt-po-select').value;
  if (!poId) { rcptLinkedPoId = null; return; }

  showLoading('טוען פריטי הזמנה...');
  try {
    const { data: poItems, error } = await sb.from(T.PO_ITEMS)
      .select('*')
      .eq('po_id', poId);
    if (error) throw error;

    // Clear existing items
    $('rcpt-items-body').innerHTML = '';
    rcptRowNum = 0;

    for (const item of (poItems || [])) {
      const ordered = item.qty_ordered || 0;
      const received = item.qty_received || 0;
      const remaining = ordered - received;
      if (remaining <= 0) continue; // skip fully received items

      // Try to find inventory item by barcode for inventory_id
      let inventoryId = null;
      if (item.barcode) {
        const { data: inv } = await sb.from('inventory')
          .select('id')
          .eq('barcode', item.barcode)
          .eq('is_deleted', false)
          .maybeSingle();
        if (inv) inventoryId = inv.id;
      }

      addReceiptItemRow({
        barcode: item.barcode || '',
        brand: item.brand || '',
        model: item.model || '',
        color: item.color || '',
        size: item.size || '',
        quantity: remaining,
        unit_cost: item.unit_cost || '',
        sell_price: item.sell_price || '',
        is_new_item: !inventoryId,
        inventory_id: inventoryId
      });
    }

    rcptLinkedPoId = poId;
    updateReceiptItemsStats();
    toast('פריטי הזמנה נטענו', 's');
  } catch (e) {
    console.error('onReceiptPoSelected error:', e);
    toast('שגיאה בטעינת פריטי הזמנה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function updatePOStatusAfterReceipt(poId) {
  if (!poId) return;
  try {
    // Fetch all PO items
    const { data: poItems, error: piErr } = await sb.from(T.PO_ITEMS)
      .select('id, barcode, brand, model, color, size, qty_ordered, qty_received')
      .eq('po_id', poId);
    if (piErr) throw piErr;

    // Fetch all confirmed receipts linked to this PO
    const { data: receipts } = await sb.from(T.RECEIPTS)
      .select('id')
      .eq('po_id', poId)
      .eq('status', 'confirmed');

    let totalReceived = 0;
    if (receipts && receipts.length) {
      const receiptIds = receipts.map(r => r.id);
      const { data: rcptItems } = await sb.from(T.RCPT_ITEMS)
        .select('barcode, brand, model, color, size, quantity')
        .in('receipt_id', receiptIds);

      // Build lookup: by barcode first, then by model+color+size as fallback
      const receivedByBarcode = {};
      const receivedByKey = {};
      for (const ri of (rcptItems || [])) {
        if (ri.barcode) receivedByBarcode[ri.barcode] = (receivedByBarcode[ri.barcode] || 0) + ri.quantity;
        const key = `${ri.brand}|${ri.model}|${ri.color}|${ri.size}`;
        receivedByKey[key] = (receivedByKey[key] || 0) + ri.quantity;
      }

      // Update qty_received on PO items
      for (const pi of (poItems || [])) {
        let rcvd = 0;
        if (pi.barcode && receivedByBarcode[pi.barcode]) {
          rcvd = receivedByBarcode[pi.barcode];
        } else {
          const key = `${pi.brand}|${pi.model}|${pi.color}|${pi.size}`;
          rcvd = receivedByKey[key] || 0;
        }
        if (rcvd !== (pi.qty_received || 0)) {
          await sb.from(T.PO_ITEMS).update({ qty_received: rcvd }).eq('id', pi.id);
        }
        totalReceived += rcvd;
      }
    }

    // Determine PO status
    const totalOrdered = (poItems || []).reduce((s, i) => s + (i.qty_ordered || 0), 0);
    let newStatus;
    if (totalReceived >= totalOrdered) {
      newStatus = 'received';
    } else if (totalReceived > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'sent'; // no items received yet
    }

    await sb.from(T.PO).update({ status: newStatus }).eq('id', poId);
    writeLog('po_receipt_update', null, { total_ordered: totalOrdered, total_received: totalReceived, new_status: newStatus });
  } catch (e) {
    console.error('updatePOStatusAfterReceipt error:', e);
  }
}

async function loadReceiptTab() {
  showLoading('טוען קבלות סחורה...');
  try {
    // Show step1, hide step2
    $('rcpt-step1').style.display = '';
    $('rcpt-step2').style.display = 'none';

    // Summary cards
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString();

    const [draftsRes, confirmedRes, itemsRes, listRes] = await Promise.all([
      sb.from(T.RECEIPTS).select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      sb.from(T.RECEIPTS).select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('created_at', weekStr),
      sb.from(T.RCPT_ITEMS).select('quantity', { count: 'exact', head: false })
        .in('receipt_id',
          (await sb.from(T.RECEIPTS).select('id').eq('status', 'confirmed').gte('created_at', weekStr)).data?.map(r => r.id) || []
        ),
      sb.from(T.RECEIPTS).select('*').order('created_at', { ascending: false }).limit(100)
    ]);

    $('rcpt-drafts').textContent = draftsRes.count || 0;
    $('rcpt-confirmed-week').textContent = confirmedRes.count || 0;
    const totalItems = (itemsRes.data || []).reduce((s, r) => s + (r.quantity || 0), 0);
    $('rcpt-items-week').textContent = totalItems;

    // Receipt list
    const receipts = listRes.data || [];
    const tb = $('rcpt-list-body');
    if (!receipts.length) {
      tb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#999">אין קבלות</td></tr>';
    } else {
      // Get item counts per receipt
      const receiptIds = receipts.map(r => r.id);
      const { data: itemCounts } = await sb.from(T.RCPT_ITEMS).select('receipt_id, quantity');
      const countMap = {};
      (itemCounts || []).forEach(i => {
        if (!countMap[i.receipt_id]) countMap[i.receipt_id] = { count: 0, total: 0 };
        countMap[i.receipt_id].count++;
        countMap[i.receipt_id].total += (i.quantity || 0);
      });

      tb.innerHTML = receipts.map((r, idx) => {
        const c = countMap[r.id] || { count: 0, total: 0 };
        const supName = r.supplier_id ? (supplierCacheRev[r.supplier_id] || '—') : '—';
        const statusCls = `rcpt-status rcpt-status-${r.status}`;
        const statusLabel = RCPT_STATUS_LABELS[r.status] || r.status;
        const typeLabel = RCPT_TYPE_LABELS[r.receipt_type] || r.receipt_type;
        const dateStr = r.receipt_date || '';

        let actions = '';
        if (r.status === 'draft') {
          actions = `<button class="btn btn-g btn-sm btn-rcpt-edit" data-id="${escapeHtml(r.id)}" title="ערוך">✏️</button>
            <button class="btn btn-s btn-sm btn-rcpt-confirm" data-id="${escapeHtml(r.id)}" title="אשר">✓</button>
            <button class="btn btn-d btn-sm btn-rcpt-cancel" data-id="${escapeHtml(r.id)}" title="בטל">✖</button>`;
        } else {
          actions = `<button class="btn btn-g btn-sm btn-rcpt-view" data-id="${escapeHtml(r.id)}" title="צפה">👁</button>`;
          if (r.status === 'confirmed') {
            actions += ` <button class="btn btn-p btn-sm btn-rcpt-export" data-id="${escapeHtml(r.id)}" title="ייצוא לAccess">📤</button>`;
          }
        }

        return `<tr>
          <td>${idx + 1}</td>
          <td><strong>${r.receipt_number}</strong></td>
          <td>${typeLabel}</td>
          <td>${supName}</td>
          <td>${dateStr}</td>
          <td>${c.count} (${c.total} יח׳)</td>
          <td>${r.total_amount ? '₪' + Number(r.total_amount).toLocaleString() : '—'}</td>
          <td><span class="${statusCls}">${statusLabel}</span></td>
          <td style="white-space:nowrap">${actions}</td>
        </tr>`;
      }).join('');
    }
  } catch (e) {
    console.error('loadReceiptTab error:', e);
    setAlert('rcpt-list-alerts', 'שגיאה בטעינת קבלות: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function openNewReceipt() {
  currentReceiptId = null;
  rcptEditMode = false;
  rcptViewOnly = false;
  rcptRowNum = 0;

  $('rcpt-form-title').textContent = '📦 קבלה חדשה';
  $('rcpt-type').value = 'delivery_note';
  $('rcpt-number').value = '';
  $('rcpt-supplier').innerHTML = '<option value="">בחר ספק...</option>' + suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
  $('rcpt-supplier').value = '';
  $('rcpt-supplier').onchange = () => loadPOsForSupplier($('rcpt-supplier').value);
  $('rcpt-po-select').innerHTML = '<option value="">ללא — קבלה חופשית</option>';
  $('rcpt-po-select').disabled = true;
  $('rcpt-po-select').onchange = () => onReceiptPoSelected();
  rcptLinkedPoId = null;
  $('rcpt-date').valueAsDate = new Date();
  $('rcpt-notes').value = '';
  $('rcpt-items-body').innerHTML = '';
  $('rcpt-items-stats').textContent = '';
  $('rcpt-barcode-search').value = '';
  clearAlert('rcpt-form-alerts');

  // Enable inputs
  toggleReceiptFormInputs(false);

  $('rcpt-step1').style.display = 'none';
  $('rcpt-step2').style.display = '';
}

async function openExistingReceipt(receiptId, viewOnly) {
  showLoading('טוען קבלה...');
  try {
    const { data: rcpt, error: rErr } = await sb.from(T.RECEIPTS).select('*').eq('id', receiptId).single();
    if (rErr) throw rErr;

    const { data: items, error: iErr } = await sb.from(T.RCPT_ITEMS).select('*').eq('receipt_id', receiptId);
    if (iErr) throw iErr;

    currentReceiptId = receiptId;
    rcptEditMode = true;
    rcptViewOnly = viewOnly;
    rcptRowNum = 0;

    $('rcpt-form-title').textContent = viewOnly ? `📦 קבלה ${rcpt.receipt_number} (צפייה)` : `📦 עריכת קבלה ${rcpt.receipt_number}`;
    $('rcpt-type').value = rcpt.receipt_type || 'delivery_note';
    $('rcpt-number').value = rcpt.receipt_number || '';
    $('rcpt-supplier').innerHTML = '<option value="">בחר ספק...</option>' + suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
    $('rcpt-supplier').value = rcpt.supplier_id ? (supplierCacheRev[rcpt.supplier_id] || '') : '';
    $('rcpt-supplier').onchange = () => loadPOsForSupplier($('rcpt-supplier').value);
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
      .eq('barcode', barcode)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const rec = rowToRecord(data, 'inventory');
      const f = rec.fields;
      addReceiptItemRow({
        barcode: f['ברקוד'] || barcode,
        brand: f['חברה / מותג'] || '',
        model: f['דגם'] || '',
        color: f['צבע'] || '',
        size: f['גודל'] || '',
        quantity: 1,
        unit_cost: f['מחיר עלות'] || '',
        sell_price: f['מחיר מכירה'] || '',
        sync: f['סנכרון אתר'] || '',
        is_new_item: false,
        inventory_id: data.id
      });
      toast(`נמצא: ${f['חברה / מותג']} ${f['דגם']}`, 's');
    } else {
      toast('ברקוד לא נמצא במלאי — הוסף כפריט חדש', 'w');
      addReceiptItemRow({ barcode, is_new_item: true, quantity: 1 });
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
    <td><input type="text" class="rcpt-barcode" value="${data?.barcode || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-brand" value="${data?.brand || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-model" value="${data?.model || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-color" value="${data?.color || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="text" class="rcpt-size" value="${data?.size || ''}" ${isExisting ? 'readonly style="background:#f0f0f0"' : ''}></td>
    <td><input type="number" class="rcpt-qty col-qty" min="1" value="${data?.quantity || 1}"></td>
    <td><input type="number" class="rcpt-ucost col-price" step="0.01" value="${data?.unit_cost || ''}"></td>
    <td><input type="number" class="rcpt-sprice col-price" step="0.01" value="${data?.sell_price || ''}"></td>
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
    <td><button class="btn btn-d btn-sm" onclick="this.closest('tr').remove();updateReceiptItemsStats()" title="הסר">✖</button></td>
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

async function saveReceiptDraft() {
  const rcptNumber = ($('rcpt-number').value || '').trim();
  const rcptType = $('rcpt-type').value;
  const supplierName = $('rcpt-supplier').value;
  const rcptDate = $('rcpt-date').value;
  const notes = ($('rcpt-notes').value || '').trim();

  if (!rcptNumber) { toast('חובה למלא מספר מסמך', 'e'); return; }
  if (!supplierName) { toast('חובה לבחור ספק', 'e'); return; }

  let items;
  try { items = getReceiptItems(); } catch (e) { return; }
  if (!items.length) { toast('חובה להוסיף לפחות פריט אחד', 'e'); return; }

  const noPrice = items.filter(i => !i.sell_price || i.sell_price <= 0);
  if (noPrice.length) {
    toast(`${noPrice.length} שורות חסרות מחיר מכירה`, 'e');
    return;
  }

  // Validate items
  const invalidItems = items.filter(i => i.is_new_item && (!i.brand || !i.model));
  if (invalidItems.length) {
    toast('פריטים חדשים חייבים מותג ודגם', 'e');
    return;
  }

  showLoading('שומר טיוטה...');
  try {
    const supplierId = supplierCache[supplierName] || null;
    const totalAmount = items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);

    const receiptRow = {
      receipt_number: rcptNumber,
      receipt_type: rcptType,
      supplier_id: supplierId,
      branch_id: branchCode,
      receipt_date: rcptDate || new Date().toISOString().slice(0, 10),
      notes: notes || null,
      total_amount: totalAmount || null,
      status: 'draft',
      po_id: rcptLinkedPoId || null,
      created_by: sessionStorage.getItem('prizma_user') || 'system'
    };

    let receiptId;

    if (currentReceiptId && rcptEditMode) {
      // Update existing draft
      const { error } = await sb.from(T.RECEIPTS).update(receiptRow).eq('id', currentReceiptId);
      if (error) throw error;
      receiptId = currentReceiptId;

      // Delete old items and re-insert
      await sb.from(T.RCPT_ITEMS).delete().eq('receipt_id', receiptId);
    } else {
      // Insert new receipt
      const { data, error } = await sb.from(T.RECEIPTS).insert(receiptRow).select().single();
      if (error) throw error;
      receiptId = data.id;
      currentReceiptId = receiptId;
      rcptEditMode = true;
    }

    // Insert items
    const itemRows = items.map(i => ({
      receipt_id: receiptId,
      inventory_id: i.inventory_id || null,
      barcode: i.barcode || null,
      brand: i.brand || null,
      model: i.model || null,
      color: i.color || null,
      size: i.size || null,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      sell_price: i.sell_price,
      is_new_item: i.is_new_item
    }));

    const { error: iErr } = await sb.from(T.RCPT_ITEMS).insert(itemRows);
    if (iErr) throw iErr;

    toast('טיוטה נשמרה בהצלחה', 's');
  } catch (e) {
    console.error('saveReceiptDraft error:', e);
    toast('שגיאה בשמירה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function confirmReceiptCore(receiptId, rcptNumber, poId) {
  const { data: savedItems, error: siErr } = await sb.from(T.RCPT_ITEMS).select('*').eq('receipt_id', receiptId);
  if (siErr) throw siErr;

  for (const item of savedItems) {
    if (!item.is_new_item) {
      const { data: invRow, error: findErr } = await sb.from('inventory')
        .select('id, quantity, barcode, brand_id, model')
        .eq('barcode', item.barcode)
        .eq('is_deleted', false)
        .maybeSingle();
      if (findErr) throw findErr;

      if (invRow) {
        const oldQty = invRow.quantity || 0;
        const newQty = oldQty + item.quantity;
        const { error: updErr } = await sb.from('inventory').update({ quantity: newQty }).eq('id', invRow.id);
        if (updErr) throw updErr;
        await sb.from(T.RCPT_ITEMS).update({ inventory_id: invRow.id }).eq('id', item.id);
        writeLog('entry_receipt', invRow.id, {
          barcode: item.barcode, brand: item.brand, model: item.model,
          qty_before: oldQty, qty_after: newQty, source_ref: rcptNumber
        });
      } else {
        console.warn('Barcode not found in inventory, treating as new:', item.barcode);
        await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
      }
    } else {
      await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
    }
  }

  const totalAmount = savedItems.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);
  const { error: confErr } = await sb.from(T.RECEIPTS).update({
    status: 'confirmed',
    total_amount: totalAmount || null,
    created_by: sessionStorage.getItem('prizma_user') || 'system'
  }).eq('id', receiptId);
  if (confErr) throw confErr;

  if (poId) {
    await updatePOStatusAfterReceipt(poId);
  }

  toast(`קבלה ${rcptNumber} אושרה — מלאי עודכן!`, 's');
  refreshLowStockBanner();
  await loadReceiptTab();
}

async function confirmReceipt() {
  let items;
  try { items = getReceiptItems(); } catch (e) { return; }
  const rcptNumber = ($('rcpt-number').value || '').trim();
  const supplierName = $('rcpt-supplier').value;

  if (!rcptNumber) { toast('חובה למלא מספר מסמך', 'e'); return; }
  if (!supplierName) { toast('חובה לבחור ספק', 'e'); return; }
  if (!items.length) { toast('חובה להוסיף לפחות פריט אחד', 'e'); return; }

  const noPrice = items.filter(i => !i.sell_price || i.sell_price <= 0);
  if (noPrice.length) {
    toast(`${noPrice.length} שורות חסרות מחיר מכירה`, 'e');
    return;
  }

  const invalidItems = items.filter(i => i.is_new_item && (!i.brand || !i.model));
  if (invalidItems.length) {
    toast('פריטים חדשים חייבים מותג ודגם', 'e');
    return;
  }

  const noImg = items.filter(i => i.is_new_item && (i.sync === 'מלא' || i.sync === 'תדמית') && (!i.images || i.images.length === 0));
  if (noImg.length) {
    toast(`${noImg.length} פריטים חדשים עם סנכרון חייבים תמונה`, 'e');
    return;
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const ok = await confirmDialog('אישור קבלת סחורה',
    `האם לאשר קבלה ${rcptNumber} עם ${items.length} פריטים (${totalQty} יח׳) ולעדכן מלאי?`);
  if (!ok) return;

  showLoading('מאשר קבלה ומעדכן מלאי...');
  try {
    await saveReceiptDraftInternal();
    const receiptId = currentReceiptId;
    if (!receiptId) throw new Error('Receipt ID is missing');
    await confirmReceiptCore(receiptId, rcptNumber, rcptLinkedPoId);
  } catch (e) {
    console.error('confirmReceipt error:', e);
    toast('שגיאה באישור: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function createNewInventoryFromReceiptItem(item, receiptId, rcptNumber) {
  // Generate barcode for new item
  await loadMaxBarcode();
  const prefix = branchCode.padStart(2, '0');
  maxBarcode++;
  if (maxBarcode > 99999) throw new Error('חריגה — מקסימום ברקודים');
  const newBarcode = prefix + String(maxBarcode).padStart(5, '0');

  const brandId = brandCache[item.brand] || null;
  const supplierId = supplierCache[$('rcpt-supplier').value] || null;

  const newRow = {
    barcode: newBarcode,
    brand_id: brandId,
    supplier_id: supplierId,
    model: item.model || '',
    color: item.color || '',
    size: item.size || '',
    sell_price: item.sell_price || 0,
    cost_price: item.unit_cost || 0,
    quantity: item.quantity,
    status: 'in_stock',
    origin: 'goods_receipt',
    product_type: 'eyeglasses',
    website_sync: heToEn('website_sync', getBrandSync(item.brand)) || 'none',
    is_deleted: false
  };

  const { data: created, error: cErr } = await sb.from('inventory').insert(newRow).select().single();
  if (cErr) throw cErr;

  // Update receipt item with inventory_id and barcode
  await sb.from(T.RCPT_ITEMS).update({ inventory_id: created.id, barcode: newBarcode }).eq('id', item.id);

  writeLog('entry_receipt', created.id, {
    barcode: newBarcode,
    brand: item.brand,
    model: item.model,
    qty_before: 0,
    qty_after: item.quantity,
    source_ref: rcptNumber
  });
}

async function saveReceiptDraftInternal() {
  // Internal save (no toast, no loading) for use before confirm
  const rcptNumber = ($('rcpt-number').value || '').trim();
  const rcptType = $('rcpt-type').value;
  const supplierName = $('rcpt-supplier').value;
  const rcptDate = $('rcpt-date').value;
  const notes = ($('rcpt-notes').value || '').trim();

  const items = getReceiptItems();
  const supplierId = supplierCache[supplierName] || null;
  const totalAmount = items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);

  const receiptRow = {
    receipt_number: rcptNumber,
    receipt_type: rcptType,
    supplier_id: supplierId,
    branch_id: branchCode,
    receipt_date: rcptDate || new Date().toISOString().slice(0, 10),
    notes: notes || null,
    total_amount: totalAmount || null,
    status: 'draft',
    po_id: rcptLinkedPoId || null,
    created_by: sessionStorage.getItem('prizma_user') || 'system'
  };

  let receiptId;

  if (currentReceiptId && rcptEditMode) {
    const { error } = await sb.from(T.RECEIPTS).update(receiptRow).eq('id', currentReceiptId);
    if (error) throw error;
    receiptId = currentReceiptId;
    await sb.from(T.RCPT_ITEMS).delete().eq('receipt_id', receiptId);
  } else {
    const { data, error } = await sb.from(T.RECEIPTS).insert(receiptRow).select().single();
    if (error) throw error;
    receiptId = data.id;
    currentReceiptId = receiptId;
    rcptEditMode = true;
  }

  const itemRows = items.map(i => ({
    receipt_id: receiptId,
    inventory_id: i.inventory_id || null,
    barcode: i.barcode || null,
    brand: i.brand || null,
    model: i.model || null,
    color: i.color || null,
    size: i.size || null,
    quantity: i.quantity,
    unit_cost: i.unit_cost,
    sell_price: i.sell_price,
    is_new_item: i.is_new_item
  }));

  const { error: iErr } = await sb.from(T.RCPT_ITEMS).insert(itemRows);
  if (iErr) throw iErr;
}

async function confirmReceiptById(receiptId) {
  const ok = await confirmDialog('אישור קבלה', 'האם לאשר קבלה זו ולעדכן מלאי?');
  if (!ok) return;

  showLoading('מאשר קבלה...');
  try {
    const { data: rcpt } = await sb.from(T.RECEIPTS).select('receipt_number, po_id').eq('id', receiptId).single();
    await confirmReceiptCore(receiptId, rcpt?.receipt_number || '', rcpt?.po_id || null);
  } catch (e) {
    console.error('confirmReceiptById error:', e);
    toast('שגיאה באישור: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function cancelReceipt(receiptId) {
  const ok = await confirmDialog('ביטול קבלה', 'האם לבטל קבלה זו? לא ניתן לשחזר.');
  if (!ok) return;

  showLoading('מבטל...');
  try {
    const { error } = await sb.from(T.RECEIPTS).update({ status: 'cancelled' }).eq('id', receiptId);
    if (error) throw error;
    toast('הקבלה בוטלה', 's');
    await loadReceiptTab();
  } catch (e) {
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function handleReceiptExcel(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  ev.target.value = ''; // Reset for re-upload

  showLoading('קורא Excel...');
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!json.length) { hideLoading(); toast('הקובץ ריק', 'e'); return; }

      const colMap = {
        'ברקוד': ['ברקוד', 'barcode'],
        'מותג': ['מותג', 'חברה', 'חברה/מותג', 'חברה / מותג', 'brand'],
        'דגם': ['דגם', 'model'],
        'צבע': ['צבע', 'color'],
        'גודל': ['גודל', 'size'],
        'כמות': ['כמות', 'quantity', 'qty'],
        'מחיר עלות': ['מחיר עלות', 'עלות', 'cost', 'unit_cost'],
        'מחיר מכירה': ['מחיר מכירה', 'מחיר', 'price', 'sell_price']
      };

      const fileKeys = Object.keys(json[0]);
      const keyLookup = {};
      for (const [canonical, aliases] of Object.entries(colMap)) {
        for (const alias of aliases) {
          const found = fileKeys.find(k => k.trim() === alias);
          if (found) { keyLookup[canonical] = found; break; }
        }
      }

      let added = 0;
      for (const row of json) {
        const get = (col) => { const k = keyLookup[col]; return k ? String(row[k] || '').trim() : ''; };
        const barcode = get('ברקוד');
        const brand = get('מותג');
        const model = get('דגם');

        if (!brand && !model && !barcode) continue; // Skip empty rows

        let isNew = true;
        let inventoryId = null;

        // If barcode provided, check if exists in inventory
        if (barcode) {
          const { data: inv } = await sb.from('inventory')
            .select('id, brand_id, model, color, size, quantity')
            .eq('barcode', barcode)
            .eq('is_deleted', false)
            .maybeSingle();
          if (inv) {
            isNew = false;
            inventoryId = inv.id;
          }
        }

        addReceiptItemRow({
          barcode,
          brand: brand || '',
          model: model || '',
          color: get('צבע'),
          size: get('גודל'),
          quantity: parseInt(get('כמות')) || 1,
          unit_cost: parseFloat(get('מחיר עלות')) || '',
          sell_price: parseFloat(get('מחיר מכירה')) || '',
          is_new_item: isNew,
          inventory_id: inventoryId
        });
        added++;
      }

      updateReceiptItemsStats();
      toast(`${added} שורות נטענו מ-Excel`, 's');
    } catch (err) {
      console.error('handleReceiptExcel error:', err);
      toast('שגיאה בקריאת Excel: ' + (err.message || ''), 'e');
    }
    hideLoading();
  };
  reader.readAsArrayBuffer(file);
}

async function exportReceiptExcel() {
  let items;
  try { items = getReceiptItems(); } catch (e) { return; }
  if (!items.length) { toast('אין פריטים לייצוא', 'w'); return; }

  const rcptNumber = ($('rcpt-number').value || '').trim() || 'receipt';
  const rows = items.map((i, idx) => ({
    '#': idx + 1,
    'ברקוד': i.barcode,
    'מותג': i.brand,
    'דגם': i.model,
    'צבע': i.color,
    'גודל': i.size,
    'כמות': i.quantity,
    'מחיר עלות': i.unit_cost || '',
    'מחיר מכירה': i.sell_price || '',
    'סוג': i.is_new_item ? 'חדש' : 'קיים'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'פריטים');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `קבלה-${rcptNumber}-${dateStr}.xlsx`);
  toast('קובץ Excel יוצא', 's');
}

function backToReceiptList() {
  currentReceiptId = null;
  rcptEditMode = false;
  rcptViewOnly = false;
  rcptRowNum = 0;
  loadReceiptTab();
}

// =========================================================
// Export confirmed receipt to Access Excel
// =========================================================
async function exportReceiptToAccess(receiptId) {
  showLoading('מכין ייצוא...');
  try {
    // A) Load receipt
    const { data: receipt, error: rErr } = await sb.from(T.RECEIPTS)
      .select('*, suppliers(name)')
      .eq('id', receiptId)
      .single();
    if (rErr) throw rErr;

    const supplierName = receipt.suppliers?.name || (receipt.supplier_id ? (supplierCacheRev[receipt.supplier_id] || '—') : '—');

    // B) Load receipt items with inventory + brand
    const { data: items, error: iErr } = await sb.from(T.RCPT_ITEMS)
      .select('*, inventory(barcode, model, color, size, sell_price, brand_id, brands(name))')
      .eq('receipt_id', receiptId);
    if (iErr) throw iErr;

    if (!items || !items.length) {
      hideLoading();
      toast('אין פריטים בקבלה זו', 'w');
      return;
    }

    // C) Build Excel rows
    const rows = items.map(item => {
      const inv = item.inventory || {};
      const brandName = inv.brands?.name || '';
      return {
        barcode: inv.barcode || '',
        brand: brandName,
        model: inv.model || '',
        color: inv.color || '',
        size: inv.size || '',
        sell_price: inv.sell_price || '',
        quantity: item.quantity || 0,
        receipt_number: receipt.receipt_number || '',
        supplier: supplierName,
        received_date: receipt.receipt_date || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'new_inventory');

    // D) Filename
    const rcptNum = (receipt.receipt_number || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `opticup_new_inventory_${rcptNum}_${dateStr}.xlsx`);

    hideLoading();
    toast('הקובץ מוכן להורדה', 's');
  } catch (e) {
    hideLoading();
    toast('שגיאה בייצוא: ' + (e.message || ''), 'e');
  }
}

// ─── EVENT DELEGATION — goods-receipt.js ────────────────────────
document.addEventListener('click', function(e) {
  // #7 openExistingReceipt (edit)
  const editBtn = e.target.closest('.btn-rcpt-edit');
  if (editBtn) { openExistingReceipt(editBtn.dataset.id, false); return; }
  // #8 confirmReceiptById
  const confirmBtn = e.target.closest('.btn-rcpt-confirm');
  if (confirmBtn) { confirmReceiptById(confirmBtn.dataset.id); return; }
  // #9 cancelReceipt
  const cancelBtn = e.target.closest('.btn-rcpt-cancel');
  if (cancelBtn) { cancelReceipt(cancelBtn.dataset.id); return; }
  // #10 openExistingReceipt (view)
  const viewBtn = e.target.closest('.btn-rcpt-view');
  if (viewBtn) { openExistingReceipt(viewBtn.dataset.id, true); return; }
  // #11 exportReceiptToAccess
  const exportBtn = e.target.closest('.btn-rcpt-export');
  if (exportBtn) { exportReceiptToAccess(exportBtn.dataset.id); return; }
});
