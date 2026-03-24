async function confirmReceiptCore(receiptId, rcptNumber, poId) {
  const { data: savedItems, error: siErr } = await sb.from(T.RCPT_ITEMS).select('*').eq('receipt_id', receiptId);
  if (siErr) throw siErr;

  // Phase 2c: Track successful inventory changes for rollback on failure
  const successfulOps = [];

  try {
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
          if (updErr) throw new Error('עדכון מלאי נכשל עבור ' + item.barcode + ': ' + updErr.message);
          successfulOps.push({ id: invRow.id, delta: item.quantity, isNew: false, oldCost: parseFloat(invRow.cost_price) || 0 });

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
              field: 'cost_price', old_value: oldCost, new_value: rcptCost,
              source: 'goods_receipt', receipt_id: receiptId
            });
          }
        } else {
          console.warn('Barcode not found in inventory, treating as new:', item.barcode);
          const newItem = await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
          if (newItem) successfulOps.push({ id: newItem.id, delta: item.quantity, isNew: true });
        }
      } else {
        const newItem = await createNewInventoryFromReceiptItem(item, receiptId, rcptNumber);
        if (newItem) successfulOps.push({ id: newItem.id, delta: item.quantity, isNew: true });
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
    toast('שגיאה בעדכון מלאי — הפעולה בוטלה. נסה שוב.', 'e');
    return false;
  }

  const totalAmount = savedItems.filter(i => i.po_match_status !== 'returned').reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);
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

  // Hard-block: file must be attached before confirm
  if (!_pendingReceiptFile) {
    toast('חובה לצרף חשבונית או תעודת משלוח לפני אישור', 'e');
    return;
  }

  // Confirmation step: employee must confirm items match the document
  var matchResult = await _showMatchConfirmDialog(rcptNumber);
  if (!matchResult) return; // user closed dialog without choosing

  // PIN verification — required for all confirm paths
  const pinEmp = await _receiptPinVerify('אישור קבלת סחורה');
  if (!pinEmp) return;
  sessionStorage.setItem('prizma_user', pinEmp.name);

  // If mismatch acknowledged, log it
  if (matchResult === 'mismatch') {
    writeLog('receipt_mismatch_acknowledged', null, {
      receipt_number: rcptNumber,
      employee: pinEmp.name,
      note: 'העובד אישר אי-התאמה בין הסחורה למסמך'
    });
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
    var result = await confirmReceiptCore(receiptId, rcptNumber, rcptLinkedPoId);
    // confirmReceiptCore returns false if rollback happened — receipt stays as draft
    if (result === false) return;
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
    quantity: item.quantity,
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
  await sb.from(T.RCPT_ITEMS).update({ inventory_id: created.id, barcode: newBarcode }).eq('id', item.id);

  writeLog('entry_receipt', created.id, {
    barcode: newBarcode,
    brand: item.brand,
    model: item.model,
    qty_before: 0,
    qty_after: item.quantity,
    source_ref: rcptNumber
  });

  return created;
}

// checkPoPriceDiscrepancies — deleted in Phase 8, replaced by receipt-po-compare.js pre-confirm report

async function confirmReceiptById(receiptId) {
  const ok = await confirmDialog('אישור קבלה', 'האם לאשר קבלה זו ולעדכן מלאי?');
  if (!ok) return;

  const pinEmp = await _receiptPinVerify('אישור קבלה');
  if (!pinEmp) return;
  sessionStorage.setItem('prizma_user', pinEmp.name);

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

// PIN verification helper — shows modal, returns employee or null
async function _receiptPinVerify(title) {
  return new Promise(function(resolve) {
    var modalId = 'rcpt-pin-modal';
    var existing = $(modalId);
    if (existing) existing.remove();
    var html =
      '<div class="modal-overlay" id="' + modalId + '" style="display:flex" ' +
        'onclick="if(event.target===this){this.remove()}">' +
        '<div class="modal" style="max-width:340px">' +
          '<h3 style="margin:0 0 12px">' + escapeHtml(title) + '</h3>' +
          '<div id="rcpt-pin-alert"></div>' +
          '<div class="form-group" style="margin-bottom:12px">' +
            '<label>\u05E1\u05D9\u05E1\u05DE\u05EA \u05E2\u05D5\u05D1\u05D3</label>' +
            '<input type="password" id="rcpt-pin-input" maxlength="10" ' +
              'placeholder="\u05D4\u05D6\u05DF PIN" inputmode="numeric" class="nd-field">' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn btn-p" id="rcpt-pin-ok">\u05D0\u05E9\u05E8</button>' +
            '<button class="btn btn-g" id="rcpt-pin-cancel">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var inp = $('rcpt-pin-input');
    if (inp) inp.focus();

    async function doVerify() {
      var pin = ($('rcpt-pin-input') || {}).value || '';
      if (!pin) {
        var al = $('rcpt-pin-alert');
        if (al) al.innerHTML = '<div class="alert alert-e">\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05D9\u05E1\u05DE\u05D4</div>';
        return;
      }
      var emp = await verifyPinOnly(pin);
      if (!emp) {
        var al2 = $('rcpt-pin-alert');
        if (al2) al2.innerHTML = '<div class="alert alert-e">\u05E1\u05D9\u05E1\u05DE\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D4</div>';
        if (inp) { inp.value = ''; inp.focus(); }
        return;
      }
      var m = $(modalId); if (m) m.remove();
      resolve(emp);
    }

    $('rcpt-pin-ok').onclick = doVerify;
    $('rcpt-pin-cancel').onclick = function() {
      var m = $(modalId); if (m) m.remove();
      resolve(null);
    };
    if (inp) inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doVerify();
    });
  });
}

// =========================================================
// Match confirmation dialog — employee confirms items match document
// Returns: 'match' | 'mismatch' | null (cancelled)
// =========================================================
function _showMatchConfirmDialog(rcptNumber) {
  return new Promise(function(resolve) {
    var modalId = 'rcpt-match-modal';
    var existing = $(modalId);
    if (existing) existing.remove();
    var html =
      '<div class="modal-overlay" id="' + modalId + '" style="display:flex" ' +
        'onclick="if(event.target===this){this.remove()}">' +
        '<div class="modal" style="max-width:420px;text-align:right">' +
          '<h3 style="margin:0 0 14px">\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05DC\u05EA \u05E1\u05D7\u05D5\u05E8\u05D4</h3>' +
          '<p style="font-size:.92rem;color:var(--g600,#4b5563);margin:0 0 16px;line-height:1.6">' +
            '\u05D0\u05E0\u05D9 \u05DE\u05D0\u05E9\u05E8/\u05EA \u05E9\u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05E0\u05E8\u05E9\u05DE\u05D5 \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD \u05D0\u05EA \u05D4\u05DE\u05E1\u05DE\u05DA \u05D4\u05DE\u05E6\u05D5\u05E8\u05E3' +
          '</p>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            '<button class="btn btn-p" id="rcpt-match-ok" style="width:100%">' +
              '\u2705 \u05D4\u05DB\u05DC \u05EA\u05D5\u05D0\u05DD \u2014 \u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4</button>' +
            '<button class="btn" id="rcpt-match-mismatch" style="width:100%;background:#f59e0b;color:#fff">' +
              '\u26A0\uFE0F \u05D9\u05E9 \u05D0\u05D9-\u05D4\u05EA\u05D0\u05DE\u05D4 \u2014 \u05D0\u05E9\u05E8 \u05D1\u05DB\u05DC \u05D6\u05D0\u05EA</button>' +
            '<button class="btn btn-g" id="rcpt-match-cancel" style="width:100%">' +
              '\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    $('rcpt-match-ok').onclick = function() {
      var m = $(modalId); if (m) m.remove(); resolve('match');
    };
    $('rcpt-match-mismatch').onclick = function() {
      var m = $(modalId); if (m) m.remove(); resolve('mismatch');
    };
    $('rcpt-match-cancel').onclick = function() {
      var m = $(modalId); if (m) m.remove(); resolve(null);
    };
  });
}
