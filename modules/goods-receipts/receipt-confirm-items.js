async function confirmReceiptCore(receiptId, rcptNumber, poId) {
  const { data: savedItems, error: siErr } = await sb.from(T.RCPT_ITEMS).select('*').eq('receipt_id', receiptId).eq('tenant_id', getTenantId());
  if (siErr) throw siErr;

  // Phase 2c: Track successful inventory changes for rollback on failure
  const successfulOps = [];

  try {
    for (const item of savedItems) {
      // Skip items marked as returned to supplier or not received
      if (item.po_match_status === 'returned' || item.po_match_status === 'not_received') continue;
      if (item.receipt_status === 'not_received') continue;

      // One barcode per product line (brand+model+color+size)
      var itemBarcode = item.barcode || '';
      var effectiveQty = item.quantity || 1;

      if (!item.is_new_item && itemBarcode) {
        // Existing item: increment quantity by effectiveQty
        const { data: invRow, error: findErr } = await sb.from('inventory')
          .select('id, quantity, barcode, brand_id, model, cost_price')
          .eq('tenant_id', getTenantId())
          .eq('barcode', itemBarcode)
          .eq('is_deleted', false)
          .maybeSingle();
        if (findErr) throw findErr;

        if (invRow) {
          const oldQty = invRow.quantity || 0;
          const { error: updErr } = await sb.rpc('increment_inventory', { inv_id: invRow.id, delta: effectiveQty });
          if (updErr) throw new Error('\u05E2\u05D3\u05DB\u05D5\u05DF \u05DE\u05DC\u05D0\u05D9 \u05E0\u05DB\u05E9\u05DC \u05E2\u05D1\u05D5\u05E8 ' + itemBarcode + ': ' + updErr.message);
          successfulOps.push({ id: invRow.id, delta: effectiveQty, isNew: false, oldCost: parseFloat(invRow.cost_price) || 0 });

          await sb.from(T.RCPT_ITEMS).update({ inventory_id: invRow.id }).eq('id', item.id).eq('tenant_id', getTenantId());
          writeLog('entry_receipt', invRow.id, {
            barcode: itemBarcode, brand: item.brand, model: item.model,
            qty_before: oldQty, qty_after: oldQty + effectiveQty, source_ref: rcptNumber
          });

          // Auto-update cost_price from receipt
          const rcptCost = parseFloat(item.unit_cost) || 0;
          const oldCost = parseFloat(invRow.cost_price) || 0;
          if (rcptCost > 0 && rcptCost !== oldCost) {
            await batchUpdate('inventory', [{ id: invRow.id, cost_price: rcptCost }]);
            writeLog('cost_update', invRow.id, {
              field: 'cost_price', old_value: oldCost, new_value: rcptCost,
              source: 'goods_receipt', receipt_id: receiptId
            });
          }
        } else {
          console.warn('Barcode not found in inventory, creating as new:', itemBarcode);
          var created = await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
          if (created) successfulOps.push({ id: created.id, delta: effectiveQty, isNew: true });
        }
      } else if (item.is_new_item) {
        // New item: create ONE inventory record with full quantity
        var created2 = await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
        if (created2) successfulOps.push({ id: created2.id, delta: effectiveQty, isNew: true });
      }
    }
  } catch (loopErr) {
    // ROLLBACK — reverse all successful inventory changes
    console.error('Receipt confirm failed at inventory update, rolling back:', loopErr.message);
    for (const op of successfulOps) {
      try {
        if (op.isNew) {
          await sb.from(T.INV).delete().eq('id', op.id);
        } else {
          await sb.rpc('decrement_inventory', { inv_id: op.id, delta: op.delta });
        }
      } catch (rbErr) {
        console.error('Rollback failed for', op.id, rbErr);
        writeLog('rollback_failure', op.id, { error: rbErr.message, original_error: loopErr.message });
      }
    }
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05DE\u05DC\u05D0\u05D9 \u2014 \u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D1\u05D5\u05D8\u05DC\u05D4. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.', 'e');
    return false;
  }

  const totalAmount = savedItems.filter(i => i.po_match_status !== 'returned' && i.po_match_status !== 'not_received' && i.receipt_status !== 'not_received').reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);
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
  const { data: rcptData } = await sb.from(T.RECEIPTS).select('supplier_id').eq('id', receiptId).eq('tenant_id', getTenantId()).single();
  if (rcptData?.supplier_id) {
    try {
      const doc = await createDocumentFromReceipt(receiptId, rcptData.supplier_id, savedItems, rcptNumber);
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

  // Notify other modules (OCR template learning, etc.)
  document.dispatchEvent(new CustomEvent('receipt-confirmed', {
    detail: { receiptId: receiptId, rcptNumber: rcptNumber, supplierId: rcptData?.supplier_id || null }
  }));
  refreshLowStockBanner();
  await loadReceiptTab();
  // Photography prompt — show banner to navigate to inventory for photos
  var confirmedCount = successfulOps.length;
  if (confirmedCount > 0 && typeof filterByReceipt === 'function') {
    _showPhotoPromptBanner(receiptId, rcptNumber, confirmedCount);
  }
}

function _showPhotoPromptBanner(receiptId, rcptNumber, count) {
  var old = $('rcpt-photo-prompt'); if (old) old.remove();
  var banner = document.createElement('div');
  banner.id = 'rcpt-photo-prompt';
  banner.style.cssText = 'background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:12px 16px;margin:10px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px';
  banner.innerHTML = '<span style="font-size:.92rem;color:#1e40af">\uD83D\uDCF7 \u05D4\u05D5\u05DB\u05E0\u05E1\u05D5 ' + count +
    ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05E7\u05D1\u05DC\u05D4 #' + escapeHtml(rcptNumber) + ' \u2014 \u05E8\u05D5\u05E6\u05D4 \u05DC\u05E6\u05DC\u05DD?</span>' +
    '<div style="display:flex;gap:6px">' +
      '<button class="btn btn-sm" style="background:#2196F3;color:#fff" onclick="filterByReceipt(\'' + receiptId + '\',\'' + escapeHtml(rcptNumber) + '\')">\uD83D\uDCF7 \u05E6\u05DC\u05DD \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA</button>' +
      '<button class="btn btn-sm" style="background:#e5e7eb;color:#1e293b" onclick="this.closest(\'#rcpt-photo-prompt\').remove()">\u05DC\u05D0 \u05E2\u05DB\u05E9\u05D9\u05D5</button>' +
    '</div>';
  var container = $('rcpt-step1');
  if (container) container.insertBefore(banner, container.firstChild);
}

async function createNewInventoryFromReceiptItem(item, receiptId, rcptNumber) {
  // Use pre-assigned barcode from receipt item, or generate new one as fallback
  const newBarcode = item.barcode || await generateNextBarcode();
  const itemQty = item.quantity || 1;

  const brandId = brandCache[item.brand] || null;
  const supplierId = supplierCache[$('rcpt-supplier').value] || null;

  // Derive product_type — brand_type is tier (luxury/brand/regular), not product category
  // Valid product_type values: eyeglasses, sunglasses (per inventory_product_type_check)
  var productType = 'eyeglasses';

  const newRow = {
    barcode: newBarcode,
    brand_id: brandId,
    supplier_id: supplierId,
    model: item.model || '',
    color: item.color || '',
    size: item.size || '',
    sell_price: item.sell_price || 0,
    cost_price: item.unit_cost || 0,
    quantity: itemQty, // One record per product line with full quantity
    status: 'in_stock',
    origin: 'goods_receipt',
    product_type: productType,
    website_sync: heToEn('website_sync', getBrandSync(item.brand)) || 'none',
    is_deleted: false,
    tenant_id: getTenantId()
  };

  const { data: created, error: cErr } = await sb.from('inventory').insert(newRow).select().single();
  if (cErr) throw cErr;

  // Update receipt item with inventory_id and barcode
  await sb.from(T.RCPT_ITEMS).update({ inventory_id: created.id, barcode: newBarcode }).eq('id', item.id).eq('tenant_id', getTenantId());

  writeLog('entry_receipt', created.id, {
    barcode: newBarcode,
    brand: item.brand,
    model: item.model,
    qty_before: 0,
    qty_after: itemQty,
    source_ref: rcptNumber
  });

  return created;
}
