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
