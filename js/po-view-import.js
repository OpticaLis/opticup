// ── View PO (read-only) ─────────────────────────────────────
async function openViewPO(id) {
  try {
    showLoading();
    const { data: po, error: e1 } = await sb.from(T.PO)
      .select('*, suppliers(name)')
      .eq('id', id).single();
    if (e1) throw e1;
    const { data: items, error: e2 } = await sb.from(T.PO_ITEMS)
      .select('*').eq('po_id', id);
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

    const itemRows = (items || []).map(item => {
      const total = (item.qty_ordered||0) * (item.unit_cost||0) * (1 - (item.discount_pct||0)/100);
      const received = item.qty_received || 0;
      const ordered  = item.qty_ordered  || 0;
      const rowColor = received >= ordered ? '#e8f5e9' : received > 0 ? '#fff8e1' : '';
      return `<tr style="background:${rowColor}">
        <td style="padding:8px">${item.brand||'—'}</td>
        <td style="padding:8px">${item.model||'—'}</td>
        <td style="padding:8px">${item.color||'—'}</td>
        <td style="padding:8px">${item.size||'—'}</td>
        <td style="padding:8px; text-align:center">${ordered}</td>
        <td style="padding:8px; text-align:center; font-weight:600">${received}</td>
        <td style="padding:8px; text-align:center">${item.unit_cost ? '₪'+Number(item.unit_cost).toFixed(2) : '—'}</td>
        <td style="padding:8px; text-align:center">${item.discount_pct||0}%</td>
        <td style="padding:8px; text-align:center; font-weight:600">₪${total.toFixed(2)}</td>
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
          <div><strong>ספק:</strong> ${po.suppliers?.name||'—'}</div>
          <div><strong>תאריך הזמנה:</strong> ${po.order_date ? new Date(po.order_date).toLocaleDateString('he-IL') : '—'}</div>
          <div><strong>תאריך צפוי:</strong> ${po.expected_date ? new Date(po.expected_date).toLocaleDateString('he-IL') : '—'}</div>
          ${po.notes ? `<div><strong>הערות:</strong> ${po.notes}</div>` : ''}
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
            .select('id, quantity')
            .eq('barcode', item.barcode)
            .eq('is_deleted', false)
            .limit(1).single();
          existing = data;
        }
        if (!existing && item.brand && item.model) {
          const brandId = brandCache[item.brand];
          if (brandId) {
            const { data } = await sb.from(T.INV)
              .select('id, quantity')
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
          // Update quantity
          const { error } = await sb.from(T.INV)
            .update({ quantity: (existing.quantity || 0) + qty })
            .eq('id', existing.id);
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
            status:        'במלאי',
            source:        'הזמנת רכש',
            is_deleted:    false
          };
          // Generate barcode if needed
          if (item.barcode) {
            newItem.barcode = item.barcode;
          } else if (typeof maxBarcode !== 'undefined') {
            maxBarcode++;
            newItem.barcode = String(maxBarcode);
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

// ─── EVENT DELEGATION — purchase-orders.js ──────────────────────
document.addEventListener('click', function(e) {
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
