// =========================================================
// inventory-return.js — Supplier Return Initiation (Phase 4h)
// Load after: shared.js, supabase-ops.js, inventory-table.js,
//   debt-returns.js (for generateReturnNumber)
// Provides: openSupplierReturnModal(), confirmSupplierReturn()
// =========================================================

// =========================================================
// Open return modal — validates selection, shows form
// =========================================================
async function openSupplierReturnModal() {
  var ids = Array.from(invSelected);
  if (!ids.length) { toast('יש לבחור פריטים להחזרה', 'w'); return; }

  showLoading('טוען פרטי פריטים...');
  try {
    // Fetch full item data for selected IDs
    var items = await fetchAll(T.INV, [['id', 'in', ids]]);
    if (!items.length) { toast('לא נמצאו פריטים', 'e'); hideLoading(); return; }

    // Check all items belong to the same supplier
    var supplierIds = {};
    items.forEach(function(item) {
      if (item.supplier_id) supplierIds[item.supplier_id] = true;
    });
    var uniqueSuppliers = Object.keys(supplierIds);

    if (uniqueSuppliers.length === 0) {
      toast('לפריטים הנבחרים אין ספק מוגדר', 'e');
      hideLoading();
      return;
    }
    if (uniqueSuppliers.length > 1) {
      toast('יש לבחור פריטים מספק אחד בלבד', 'e');
      hideLoading();
      return;
    }

    var supplierId = uniqueSuppliers[0];
    var supplierName = supplierCacheRev[supplierId] || '';

    // Filter items with quantity > 0
    var validItems = items.filter(function(item) { return (item.quantity || 0) > 0; });
    if (!validItems.length) {
      toast('כל הפריטים הנבחרים ללא כמות במלאי', 'e');
      hideLoading();
      return;
    }

    // Build items preview
    var itemRows = validItems.map(function(item) {
      return '<tr>' +
        '<td style="font-family:monospace">' + escapeHtml(item.barcode || '') + '</td>' +
        '<td>' + escapeHtml(brandCacheRev[item.brand_id] || '') + '</td>' +
        '<td>' + escapeHtml(item.model || '') + '</td>' +
        '<td>' + escapeHtml(item.color || '') + '</td>' +
        '<td>' + escapeHtml(item.size || '') + '</td>' +
        '<td>' + (item.quantity || 0) + '</td>' +
        '<td>' + formatILS(item.cost_price) + '</td>' +
      '</tr>';
    }).join('');

    var skipped = items.length - validItems.length;
    var skippedNote = skipped > 0
      ? '<div class="alert alert-w" style="margin-bottom:8px">' + skipped + ' פריטים בכמות 0 הוסרו מהרשימה</div>'
      : '';

    var html =
      '<div class="modal-overlay" id="supplier-return-modal" style="display:flex" ' +
        'onclick="if(event.target===this)closeModal(\'supplier-return-modal\')">' +
        '<div class="modal" style="max-width:750px;width:95%">' +
          '<h3 style="margin:0 0 12px">זיכוי לספק: ' + escapeHtml(supplierName) + '</h3>' +
          skippedNote +
          '<div style="overflow-x:auto;max-height:250px;margin-bottom:12px">' +
            '<table class="data-table" style="width:100%;font-size:.85rem">' +
              '<thead><tr><th>ברקוד</th><th>מותג</th><th>דגם</th><th>צבע</th><th>גודל</th><th>כמות</th><th>עלות</th></tr></thead>' +
              '<tbody>' + itemRows + '</tbody>' +
            '</table>' +
          '</div>' +
          '<div class="form-row" style="margin-bottom:12px">' +
            '<div class="form-group" style="flex:1">' +
              '<label>סוג החזרה</label>' +
              '<select id="ret-type">' +
                '<option value="agent_pickup">איסוף ע"י נציג</option>' +
                '<option value="ship_to_supplier">משלוח לספק</option>' +
                '<option value="pending_in_store">ממתין בחנות</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group" style="flex:2">' +
              '<label>סיבה</label>' +
              '<input type="text" id="ret-reason" placeholder="סיבת ההחזרה...">' +
            '</div>' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:12px">' +
            '<label>סיסמת עובד</label>' +
            '<input type="password" id="ret-pin" maxlength="10" placeholder="הזן PIN">' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn btn-p" id="ret-confirm-btn" ' +
              'onclick="_doConfirmSupplierReturn(\'' + supplierId + '\')">אשר החזרה</button>' +
            '<button class="btn btn-g" onclick="closeModal(\'supplier-return-modal\')">ביטול</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Store valid items for confirmation
    window._pendingReturnItems = validItems;

    var existing = $('supplier-return-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(function() { var pin = $('ret-pin'); if (pin) pin.focus(); }, 100);
  } catch (e) {
    console.error('openSupplierReturnModal error:', e);
    toast('שגיאה בטעינת פריטים: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

// =========================================================
// Confirm return — create records, decrement inventory
// =========================================================
async function _doConfirmSupplierReturn(supplierId) {
  var returnType = ($('ret-type') || {}).value || 'pending_in_store';
  var reason = ($('ret-reason') || {}).value || '';
  var pin = ($('ret-pin') || {}).value || '';
  var items = window._pendingReturnItems || [];

  if (!pin) { toast('יש להזין סיסמת עובד', 'w'); return; }
  if (!items.length) { toast('אין פריטים להחזרה', 'e'); return; }

  // Verify PIN
  var emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); $('ret-pin').value = ''; return; }
  sessionStorage.setItem('prizma_user', emp.name);

  // Disable button to prevent double-click
  var btn = $('ret-confirm-btn');
  if (btn) btn.disabled = true;

  showLoading('יוצר זיכוי...');
  try {
    // Generate return number
    var returnNumber = await generateReturnNumber(supplierId);
    if (!returnNumber) { hideLoading(); if (btn) btn.disabled = false; return; }

    // Create supplier_returns record
    var returnRecord = [{
      tenant_id: getTenantId(),
      supplier_id: supplierId,
      return_number: returnNumber,
      return_type: returnType,
      reason: reason,
      status: 'pending',
      created_by: emp.id,
      notes: reason
    }];
    var created = await batchCreate(T.SUP_RETURNS, returnRecord);
    if (!created || !created.length) throw new Error('Failed to create return record');
    var returnId = created[0].id;

    // Create return items + decrement inventory
    var returnItems = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var brandName = brandCacheRev[item.brand_id] || '';

      // Snapshot item details
      returnItems.push({
        tenant_id: getTenantId(),
        return_id: returnId,
        inventory_id: item.id,
        barcode: item.barcode || '',
        quantity: 1,
        brand_name: brandName,
        model: item.model || '',
        color: item.color || '',
        size: item.size || '',
        cost_price: item.cost_price || 0
      });

      // Decrement inventory quantity atomically
      var decResult = await sb.rpc('decrement_inventory', { inv_id: item.id, delta: 1 });
      if (decResult.error) throw decResult.error;

      // writeLog for each item
      writeLog('supplier_return', item.id, {
        barcode: item.barcode,
        brand: brandName,
        model: item.model,
        qty_before: item.quantity,
        qty_after: (item.quantity || 1) - 1,
        return_number: returnNumber,
        return_type: returnType,
        reason: reason,
        source_ref: 'זיכוי לספק'
      });
    }

    // Batch create return items
    await batchCreate(T.SUP_RETURN_ITEMS, returnItems);

    closeModal('supplier-return-modal');
    window._pendingReturnItems = null;
    toast('זיכוי #' + returnNumber + ' נוצר \u00B7 ' + items.length + ' פריטים הוצאו מהמלאי', 's');

    // Clear selection and refresh inventory
    invSelected.clear();
    updateSelectionUI();
    loadInventoryPage();
  } catch (e) {
    console.error('confirmSupplierReturn error:', e);
    toast('שגיאה ביצירת זיכוי: ' + (e.message || ''), 'e');
    if (btn) btn.disabled = false;
  }
  hideLoading();
}
