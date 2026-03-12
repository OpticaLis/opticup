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

  // Auto-create supplier document for debt tracking
  const { data: rcptData } = await sb.from(T.RECEIPTS).select('supplier_id').eq('id', receiptId).single();
  if (rcptData?.supplier_id) {
    try {
      const doc = await createDocumentFromReceipt(receiptId, rcptData.supplier_id, savedItems);
      if (doc) {
        toast(`קבלה אושרה · מסמך ספק ${doc.internal_number} נוצר`, 's');
      } else {
        toast(`קבלה ${rcptNumber} אושרה — מלאי עודכן!`, 's');
      }
    } catch (docErr) {
      console.error('createDocumentFromReceipt error:', docErr);
      toast(`קבלה ${rcptNumber} אושרה — מלאי עודכן (שגיאה ביצירת מסמך ספק)`, 's');
    }
  } else {
    toast(`קבלה ${rcptNumber} אושרה — מלאי עודכן!`, 's');
  }

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
