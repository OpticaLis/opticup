async function confirmReceiptCore(receiptId, rcptNumber, poId) {
  const { data: savedItems, error: siErr } = await sb.from(T.RCPT_ITEMS).select('*').eq('receipt_id', receiptId);
  if (siErr) throw siErr;

  for (const item of savedItems) {
    // Phase 8: skip items marked as returned to supplier
    if (item.po_match_status === 'returned') continue;
    if (!item.is_new_item) {
      const { data: invRow, error: findErr } = await sb.from('inventory')
        .select('id, quantity, barcode, brand_id, model, cost_price')
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

        // Auto-update cost_price from receipt
        const rcptCost = parseFloat(item.unit_cost) || 0;
        const oldCost = parseFloat(invRow.cost_price) || 0;
        if (rcptCost > 0 && rcptCost !== oldCost) {
          await batchUpdate('inventory', [{ id: invRow.id, cost_price: rcptCost }]);
          writeLog('cost_update', invRow.id, {
            field: 'cost_price',
            old_value: oldCost,
            new_value: rcptCost,
            source: 'goods_receipt',
            receipt_id: receiptId
          });
        }
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
      toast(`הקבלה אושרה אך יצירת מסמך ספק נכשלה — צור מסמך ידנית`, 'w');
      writeLog('debt_creation_failed', null, {
        receipt_id: receiptId, receipt_number: rcptNumber,
        supplier_id: rcptData.supplier_id, error: docErr.message || String(docErr)
      });
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

  // Only require sell_price for new items — existing items already have sell_price in inventory
  const newNoPrice = items.filter(i => i.is_new_item && (!i.sell_price || i.sell_price <= 0));
  if (newNoPrice.length) {
    toast(`${newNoPrice.length} פריטים חדשים חסרים מחיר מכירה`, 'e');
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

  // Warn if no file attached
  if (!_pendingReceiptFile) {
    const attachOk = await confirmDialog('לא צורף מסמך',
      'לא צורף מסמך לקבלה זו. להמשיך בלי מסמך?');
    if (!attachOk) return;
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  // Phase 8: If linked to PO, show comparison report before confirming
  if (rcptLinkedPoId && typeof _poCompBuildReport === 'function') {
    showLoading('\u05D1\u05D5\u05E0\u05D4 \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05DE\u05D5\u05DC PO...');
    try {
      await saveReceiptDraftInternal();
      var report = await _poCompBuildReport(items, rcptLinkedPoId);
      hideLoading();
      // If everything matches perfectly, skip report
      if (report.priceGap.length === 0 && report.notInPo.length === 0 && report.shortage.length === 0) {
        const ok = await confirmDialog('\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05DC\u05EA \u05E1\u05D7\u05D5\u05E8\u05D4',
          '\u05DB\u05DC \u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD \u05DC\u05D4\u05D6\u05DE\u05E0\u05D4. \u05DC\u05D0\u05E9\u05E8?');
        if (!ok) return;
        await _confirmReceiptWithDecisions(rcptNumber, null, items);
      } else {
        // Fetch PO number for display
        var { data: poData } = await sb.from(T.PO).select('po_number').eq('id', rcptLinkedPoId).single();
        _poCompShowReport(report, poData ? poData.po_number : '', async function(decisions) {
          await _confirmReceiptWithDecisions(rcptNumber, decisions, items);
        });
      }
    } catch (e) {
      hideLoading(); console.error('PO compare error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4: ' + (e.message || ''), 'e');
    }
    return;
  }

  const ok = await confirmDialog('\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05DC\u05EA \u05E1\u05D7\u05D5\u05E8\u05D4',
    `\u05D4\u05D0\u05DD \u05DC\u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4 ${rcptNumber} \u05E2\u05DD ${items.length} \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD (${totalQty} \u05D9\u05D7\u05F3) \u05D5\u05DC\u05E2\u05D3\u05DB\u05DF \u05DE\u05DC\u05D0\u05D9?`);
  if (!ok) return;
  await _confirmReceiptWithDecisions(rcptNumber, null, items);
}

async function _confirmReceiptWithDecisions(rcptNumber, decisions, items) {
  showLoading('\u05DE\u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4 \u05D5\u05DE\u05E2\u05D3\u05DB\u05DF \u05DE\u05DC\u05D0\u05D9...');
  try {
    var receiptId = currentReceiptId;
    if (!receiptId) { await saveReceiptDraftInternal(); receiptId = currentReceiptId; }
    if (!receiptId) throw new Error('Receipt ID is missing');
    if (decisions) await _poCompApplyDecisions(receiptId, decisions, items);
    await confirmReceiptCore(receiptId, rcptNumber, rcptLinkedPoId);
  } catch (e) {
    console.error('confirmReceipt error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D0\u05D9\u05E9\u05D5\u05E8: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

async function createNewInventoryFromReceiptItem(item, receiptId, rcptNumber) {
  // Use pre-assigned barcode from receipt item, or generate new one as fallback
  const newBarcode = item.barcode || await generateNextBarcode();

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

// checkPoPriceDiscrepancies — deleted in Phase 8, replaced by receipt-po-compare.js pre-confirm report

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
