// ── View PO (read-only) ─────────────────────────────────────
async function openViewPO(id) {
  try {
    showLoading();
    const { data: po, error: e1 } = await sb.from(T.PO)
      .select('*, suppliers(name)')
      .eq('id', id).eq('tenant_id', getTenantId()).single();
    if (e1) throw e1;
    const { data: items, error: e2 } = await sb.from(T.PO_ITEMS)
      .select('*').eq('po_id', id).eq('tenant_id', getTenantId());
    if (e2) throw e2;
    hideLoading();

    // Set currentPO/currentPOItems so export functions work
    currentPO = { po_number: po.po_number, supplier_id: po.supplier_id,
                  order_date: po.order_date, expected_date: po.expected_date,
                  notes: po.notes };
    currentPOItems = (items || []).map(it => ({ ...it }));

    const statusLabel = {
      draft:'טיוטה', sent:'נשלחה', partial:'קבלה חלקית',
      received:'התקבל', cancelled:'בוטל'
    };
    const statusColor = {
      draft:'#9e9e9e', sent:'#2196F3', partial:'#FF9800',
      received:'#4CAF50', cancelled:'#f44336'
    };

    const showStatusCol = po.status === 'partial' || po.status === 'received';

    // Fetch receipt items for this PO to determine item-level reasons
    var receiptItemMap = {};
    if (showStatusCol) {
      try {
        var { data: receipts } = await sb.from(T.RECEIPTS).select('id')
          .eq('po_id', id).eq('tenant_id', getTenantId());
        if (receipts && receipts.length) {
          var receiptIds = receipts.map(function(r) { return r.id; });
          var { data: rItems } = await sb.from(T.RECEIPT_ITEMS)
            .select('brand, model, color, size, receipt_status, po_match_status')
            .in('receipt_id', receiptIds).eq('tenant_id', getTenantId());
          (rItems || []).forEach(function(ri) {
            var key = [ri.brand, ri.model, ri.size, ri.color].map(function(s) { return (s||'').trim().toLowerCase(); }).join('|');
            if (!receiptItemMap[key]) receiptItemMap[key] = [];
            receiptItemMap[key].push(ri);
          });
        }
      } catch (e) { console.warn('Receipt items fetch skipped:', e); }
    }

    const itemRows = (items || []).map(item => {
      const total = (item.qty_ordered||0) * (item.unit_cost||0) * (1 - (item.discount_pct||0)/100);
      const received = item.qty_received || 0;
      const ordered  = item.qty_ordered  || 0;
      const fullyReceived = received >= ordered;
      const rowColor = fullyReceived ? '#e8f5e9' : received > 0 ? '#fff8e1' : '';
      var actionCell = '';
      if (showStatusCol) {
        if (fullyReceived) {
          actionCell = '<td style="padding:8px;text-align:center;color:#4CAF50">\u2705</td>';
        } else {
          // Determine reason from receipt items
          var key = [item.brand, item.model, item.size, item.color].map(function(s) { return (s||'').trim().toLowerCase(); }).join('|');
          var riList = receiptItemMap[key] || [];
          var hasReturn = riList.some(function(ri) { return ri.receipt_status === 'return' || ri.po_match_status === 'returned'; });
          var hasNotReceived = riList.some(function(ri) { return ri.receipt_status === 'not_received' || ri.po_match_status === 'not_received'; });
          var badge = '';
          if (hasReturn) {
            badge = '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:11px">\uD83D\uDD04 \u05E0\u05E9\u05DC\u05D7 \u05DC\u05D6\u05D9\u05DB\u05D5\u05D9</span>';
          } else if (hasNotReceived) {
            badge = '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:11px">\u274C \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2</span>';
          } else if (riList.length === 0) {
            badge = '<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:4px;font-size:11px">\u05DE\u05DE\u05EA\u05D9\u05DF</span>';
          } else {
            badge = '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px">\u05D7\u05E1\u05E8</span>';
          }
          // Cancel button only for partial POs
          var cancelBtn = '';
          if (po.status === 'partial') {
            cancelBtn = ' <button class="btn btn-sm btn-po-cancel-item" ' +
              'data-item-id="' + escapeHtml(item.id) + '" data-po-id="' + escapeHtml(po.id) + '" ' +
              'data-received="' + received + '" ' +
              'style="background:#ef4444;color:#fff;font-size:11px;padding:2px 8px" ' +
              'title="\u05D1\u05D8\u05DC \u05E9\u05D5\u05E8\u05D4 \u2014 \u05E7\u05D1\u05DC \u05E8\u05E7 \u05DE\u05D4 \u05E9\u05D4\u05D2\u05D9\u05E2">\u274C \u05D1\u05D8\u05DC</button>';
          }
          actionCell = '<td style="padding:8px;text-align:center">' + badge + cancelBtn + '</td>';
        }
      }
      return `<tr style="background:${rowColor}">
        <td style="padding:8px">${escapeHtml(item.brand||'—')}</td>
        <td style="padding:8px">${escapeHtml(item.model||'—')}</td>
        <td style="padding:8px">${escapeHtml(item.color||'—')}</td>
        <td style="padding:8px">${escapeHtml(item.size||'—')}</td>
        <td style="padding:8px; text-align:center">${ordered}</td>
        <td style="padding:8px; text-align:center; font-weight:600">${received}</td>
        <td style="padding:8px; text-align:center">${item.unit_cost ? '₪'+Number(item.unit_cost).toFixed(2) : '—'}</td>
        <td style="padding:8px; text-align:center">${item.discount_pct||0}%</td>
        <td style="padding:8px; text-align:center; font-weight:600">₪${total.toFixed(2)}</td>
        ${actionCell}
      </tr>`;
    }).join('');

    const grandTotal = (items||[]).reduce((sum, item) => {
      return sum + (item.qty_ordered||0) * (item.unit_cost||0) * (1-(item.discount_pct||0)/100);
    }, 0);

    const container = document.getElementById('po-list-container2');
    const importBtn = po.status === 'received'
      ? `<button class="btn btn-p btn-po-import" data-id="${escapeHtml(po.id)}" style="padding:8px 18px; margin-left:8px">📥 קלוט למלאי</button>`
      : '';

    container.innerHTML = `
      <div style="padding:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
          <h2 style="margin:0">📋 ${po.po_number || '—'}
            <span style="font-size:15px; color:${statusColor[po.status]||'#888'}; margin-right:10px">
              ${statusLabel[po.status]||po.status}
            </span>
          </h2>
          <div>
            ${importBtn}
            <button onclick="loadPurchaseOrdersTab()" class="btn btn-g" style="padding:6px 14px">← חזרה לרשימה</button>
          </div>
        </div>
        <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:20px;
                    background:white; padding:16px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.1)">
          <div><strong>ספק:</strong> ${escapeHtml(po.suppliers?.name||'—')}</div>
          <div><strong>תאריך הזמנה:</strong> ${po.order_date ? new Date(po.order_date).toLocaleDateString('he-IL') : '—'}</div>
          <div><strong>תאריך צפוי:</strong> ${po.expected_date ? new Date(po.expected_date).toLocaleDateString('he-IL') : '—'}</div>
          ${po.notes ? `<div><strong>הערות:</strong> ${escapeHtml(po.notes)}</div>` : ''}
        </div>
        <div style="background:white; padding:16px; border-radius:10px;
                    box-shadow:0 1px 4px rgba(0,0,0,0.1); overflow-x:auto">
          <table style="width:100%; border-collapse:collapse; font-size:13px">
            <thead>
              <tr style="background:#1a2744; color:white; text-align:right">
                <th style="padding:8px">מותג</th>
                <th style="padding:8px">דגם</th>
                <th style="padding:8px">צבע</th>
                <th style="padding:8px">גודל</th>
                <th style="padding:8px">הוזמן</th>
                <th style="padding:8px">התקבל</th>
                <th style="padding:8px">עלות</th>
                <th style="padding:8px">הנחה</th>
                <th style="padding:8px">סה"כ</th>
                ${showStatusCol ? '<th style="padding:8px">סטטוס</th>' : ''}
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="font-weight:700; border-top:2px solid #1a2744">
                <td colspan="8" style="padding:8px; text-align:left">סה"כ להזמנה:</td>
                <td style="padding:8px; font-size:15px">₪${grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap">
          <button onclick="exportPOExcel()" style="background:#217346; color:white; border:none; border-radius:6px; padding:9px 18px; cursor:pointer; font-size:14px">📊 ייצוא Excel</button>
          <button onclick="exportPOPdf()" style="background:#c0392b; color:white; border:none; border-radius:6px; padding:9px 18px; cursor:pointer; font-size:14px">📄 ייצוא PDF</button>
        </div>
      </div>`;
  } catch (err) {
    hideLoading();
    toast('שגיאה: ' + err.message, 'e');
  }
}

// ── Import PO items to inventory ─────────────────────────────
async function importPOToInventory(poId) {
  const confirmed = await confirmDialog('קליטה למלאי', 'לקלוט את כל פריטי ההזמנה למלאי הראשי?');
  if (!confirmed) return;

  try {
    showLoading('קולט למלאי...');

    // Fetch PO + items
    const { data: po, error: e1 } = await sb.from(T.PO)
      .select('*, suppliers(id, name)')
      .eq('id', poId).single();
    if (e1) throw e1;

    const { data: items, error: e2 } = await sb.from(T.PO_ITEMS)
      .select('*').eq('po_id', poId);
    if (e2) throw e2;

    if (!items || items.length === 0) {
      hideLoading();
      toast('אין פריטים בהזמנה', 'e');
      return;
    }

    let created = 0, updated = 0, errors = 0;

    for (const item of items) {
      const qty = item.qty_received || item.qty_ordered || 1;
      if (qty <= 0) continue;

      try {
        // Try to find existing inventory item by barcode or brand+model+color+size
        let existing = null;
        if (item.barcode) {
          const { data } = await sb.from(T.INV)
            .select('id')
            .eq('tenant_id', getTenantId())
            .eq('barcode', item.barcode)
            .eq('is_deleted', false)
            .limit(1).single();
          existing = data;
        }
        if (!existing && item.brand && item.model) {
          const brandId = brandCache[item.brand];
          if (brandId) {
            const { data } = await sb.from(T.INV)
              .select('id')
              .eq('tenant_id', getTenantId())
              .eq('brand_id', brandId)
              .eq('model', item.model)
              .eq('color', item.color || '')
              .eq('size', item.size || '')
              .eq('is_deleted', false)
              .limit(1).single();
            existing = data;
          }
        }

        if (existing) {
          // Update quantity (atomic RPC — Phase 3 fix)
          const { error } = await sb.rpc('increment_inventory', { inv_id: existing.id, delta: qty });
          if (error) throw error;
          await writeLog('qty_add', existing.id, { delta: qty, reason: `קליטה מ-PO ${po.po_number}` });
          updated++;
        } else {
          // Create new inventory item
          const brandId = item.brand ? brandCache[item.brand] : null;
          const newItem = {
            supplier_id:   po.supplier_id || null,
            brand_id:      brandId || null,
            model:         item.model || '',
            color:         item.color || '',
            size:          item.size || '',
            quantity:       qty,
            cost_price:    item.unit_cost || null,
            cost_discount: item.discount_pct ? item.discount_pct / 100 : 0,
            sell_price:    item.sell_price || null,
            sell_discount: item.sell_discount || 0,
            product_type:  item.product_type || null,
            website_sync:  item.website_sync || null,
            bridge:        item.bridge || null,
            temple_length: item.temple_length || null,
            status:        'in_stock',
            origin:        'purchase_order',
            is_deleted:    false,
            tenant_id:     getTenantId()
          };
          // Generate barcode if needed (atomic RPC — Iron Rule 13)
          if (item.barcode) {
            newItem.barcode = item.barcode;
          } else {
            newItem.barcode = await generateNextBarcode();
          }
          const { data: created_item, error } = await sb.from(T.INV).insert(newItem).select('id').single();
          if (error) throw error;
          await writeLog('item_created', created_item.id, { reason: `קליטה מ-PO ${po.po_number}` });
          created++;
        }
      } catch (itemErr) {
        console.error('Import item error:', itemErr);
        errors++;
      }
    }

    hideLoading();
    const msg = `קליטה הושלמה: ${created} חדשים, ${updated} עודכנו` + (errors > 0 ? `, ${errors} שגיאות` : '');
    toast(msg, errors > 0 ? 'w' : 's');
    await writeLog('po_imported', null, { source_ref: poId, reason: `קלוט למלאי: ${po.po_number}` });
    refreshLowStockBanner();
    openViewPO(poId);
  } catch (err) {
    hideLoading();
    toast('שגיאה בקליטה: ' + err.message, 'e');
  }
}

async function createPOForBrand(brandId, brandName) {
  try {
    showLoading('מכין הזמנה...');
    const { data: invItems } = await sb.from('inventory')
      .select('supplier_id, brand_id, model, color, size, cost_price')
      .eq('tenant_id', getTenantId())
      .eq('brand_id', brandId)
      .eq('is_deleted', false)
      .not('supplier_id', 'is', null)
      .limit(50);
    if (!invItems || invItems.length === 0) {
      hideLoading();
      toast(`לא נמצא ספק למותג ${brandName}`, 'e');
      return;
    }
    // Use most common supplier
    const supplierCount = {};
    invItems.forEach(i => {
      if (i.supplier_id) supplierCount[i.supplier_id] = (supplierCount[i.supplier_id] || 0) + 1;
    });
    const topSupplierId = Object.entries(supplierCount)
      .sort((a, b) => b[1] - a[1])[0][0];

    const poNumber = await generatePoNumber();
    currentPO = {
      po_number: poNumber,
      supplier_id: topSupplierId,
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      notes: `הזמנה אוטומטית — מלאי נמוך: ${brandName}`
    };
    // Add unique models of this brand
    const seen = new Set();
    currentPOItems = [];
    invItems.forEach(item => {
      const key = `${item.model}|${item.color}|${item.size}`;
      if (!seen.has(key)) {
        seen.add(key);
        currentPOItems.push({
          inventory_id: null,
          barcode: '',
          brand: brandName,
          model: item.model || '',
          color: item.color || '',
          size: item.size || '',
          qty_ordered: 1,
          unit_cost: item.cost_price || 0,
          discount_pct: 0,
          notes: ''
        });
      }
    });
    hideLoading();
    showTab('purchase-orders');
    // Wait for loadPurchaseOrdersTab to finish, then render form on top
    setTimeout(() => {
      renderPOForm(false);
      toast(`טופס PO נפתח עבור ${brandName} (${currentPOItems.length} פריטים)`, 's');
    }, 500);
  } catch (err) {
    hideLoading();
    toast('שגיאה: ' + err.message, 'e');
  }
}

// ── Cancel single PO item (set qty_ordered = qty_received) ──────
async function cancelPOItem(itemId, poId, qtyReceived) {
  var msg = qtyReceived > 0
    ? 'הפריט התקבל חלקית (' + qtyReceived + '). ביטול יעדכן את הכמות המוזמנת למה שהתקבל בפועל.'
    : 'הפריט לא הגיע כלל. ביטול יסיר אותו מההזמנה.';
  var ok = await confirmDialog('ביטול שורה', msg + ' להמשיך?');
  if (!ok) return;
  try {
    showLoading('מעדכן...');
    var { error } = await sb.from(T.PO_ITEMS).update({ qty_ordered: qtyReceived })
      .eq('id', itemId).eq('tenant_id', getTenantId());
    if (error) throw error;
    await writeLog('po_item_cancelled', null, {
      po_item_id: itemId, po_id: poId,
      qty_received: qtyReceived, reason: 'ביטול שורה בהזמנה חלקית'
    });
    // Recalculate PO status: if all items now fully received → 'received'
    var { data: allItems } = await sb.from(T.PO_ITEMS).select('qty_ordered, qty_received')
      .eq('po_id', poId).eq('tenant_id', getTenantId());
    var allDone = (allItems || []).every(function(it) { return (it.qty_received || 0) >= (it.qty_ordered || 0); });
    if (allDone) {
      await sb.from(T.PO).update({ status: 'received' }).eq('id', poId);
      toast('כל הפריטים התקבלו — ההזמנה סומנה כהתקבלה', 's');
    } else {
      toast('השורה בוטלה', 's');
    }
    hideLoading();
    openViewPO(poId); // refresh view
  } catch (e) {
    hideLoading();
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
}

// ─── EVENT DELEGATION — purchase-orders.js ──────────────────────
document.addEventListener('click', function(e) {
  // Cancel individual PO item
  const cancelItemBtn = e.target.closest('.btn-po-cancel-item');
  if (cancelItemBtn) {
    cancelPOItem(cancelItemBtn.dataset.itemId, cancelItemBtn.dataset.poId, parseInt(cancelItemBtn.dataset.received) || 0);
    return;
  }
  // #12 openEditPO
  const editBtn = e.target.closest('.btn-po-edit');
  if (editBtn) { openEditPO(editBtn.dataset.id); return; }
  // #13 sendPurchaseOrder
  const sendBtn = e.target.closest('.btn-po-send');
  if (sendBtn) { sendPurchaseOrder(sendBtn.dataset.id); return; }
  // #14-16 cancelPO
  const cancelBtn = e.target.closest('.btn-po-cancel');
  if (cancelBtn) { cancelPO(cancelBtn.dataset.id); return; }
  // #15-17 openViewPO
  const viewBtn = e.target.closest('.btn-po-view');
  if (viewBtn) { openViewPO(viewBtn.dataset.id); return; }
  // Clone PO
  const cloneBtn = e.target.closest('.btn-po-clone');
  if (cloneBtn) { clonePO(cloneBtn.dataset.id); return; }
  // #18 togglePOItemDetails (array index)
  const toggleBtn = e.target.closest('.btn-po-toggle');
  if (toggleBtn) { togglePOItemDetails(parseInt(toggleBtn.dataset.index)); return; }
  // #19 duplicatePOItem (array index)
  const dupBtn = e.target.closest('.btn-po-dup');
  if (dupBtn) { duplicatePOItem(parseInt(dupBtn.dataset.index)); return; }
  // #20 removePOItem (array index)
  const removeBtn = e.target.closest('.btn-po-remove');
  if (removeBtn) { removePOItem(parseInt(removeBtn.dataset.index)); return; }
  // #21 importPOToInventory
  const importBtn = e.target.closest('.btn-po-import');
  if (importBtn) { importPOToInventory(importBtn.dataset.id); return; }
});
