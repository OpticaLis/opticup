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
      created_by: sessionStorage.getItem('prizma_user') || 'system',
      tenant_id: getTenantId()
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
      is_new_item: i.is_new_item,
      tenant_id: getTenantId()
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
        const { error: updErr } = await sb.rpc('increment_inventory', { inv_id: invRow.id, delta: item.quantity });
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
    is_deleted: false,
    tenant_id: getTenantId()
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
    created_by: sessionStorage.getItem('prizma_user') || 'system',
    tenant_id: getTenantId()
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
    is_new_item: i.is_new_item,
    tenant_id: getTenantId()
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
function backToReceiptList() {
  currentReceiptId = null;
  rcptEditMode = false;
  rcptViewOnly = false;
  rcptRowNum = 0;
  loadReceiptTab();
}
