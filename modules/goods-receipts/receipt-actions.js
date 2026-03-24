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

  // Only require sell_price for new items — existing items already have sell_price in inventory
  const newNoPrice = items.filter(i => i.is_new_item && (!i.sell_price || i.sell_price <= 0));
  if (newNoPrice.length) {
    toast(`${newNoPrice.length} פריטים חדשים חסרים מחיר מכירה`, 'e');
    return;
  }

  // Validate items
  const invalidItems = items.filter(i => i.is_new_item && (!i.brand || !i.model));
  if (invalidItems.length) {
    toast('פריטים חדשים חייבים מותג ודגם', 'e');
    return;
  }

  // Block negative prices
  const negPrice = items.filter(i => (i.unit_cost && i.unit_cost < 0) || (i.sell_price && i.sell_price < 0));
  if (negPrice.length) {
    toast('מחיר לא יכול להיות שלילי', 'e');
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
      await sb.from(T.RCPT_ITEMS).delete().eq('receipt_id', receiptId).eq('tenant_id', getTenantId());
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
      receipt_status: i.receipt_status || null,
      from_po: i.from_po || false,
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
    await sb.from(T.RCPT_ITEMS).delete().eq('receipt_id', receiptId).eq('tenant_id', getTenantId());
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
    receipt_status: i.receipt_status || null,
    from_po: i.from_po || false,
    tenant_id: getTenantId()
  }));

  const { error: iErr } = await sb.from(T.RCPT_ITEMS).insert(itemRows);
  if (iErr) throw iErr;
}

async function cancelReceipt(receiptId) {
  const ok = await confirmDialog('ביטול קבלה', 'האם לבטל קבלה זו? לא ניתן לשחזר.');
  if (!ok) return;

  showLoading('מבטל...');
  try {
    const { error } = await sb.from(T.RECEIPTS).update({ status: 'cancelled' }).eq('id', receiptId).eq('tenant_id', getTenantId());
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
