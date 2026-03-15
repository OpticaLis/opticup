// inventory-returns-actions.js — Return actions: mark status, bulk, export, sendToBox
// Load after: inventory-returns-tab.js, debt-returns.js

// =========================================================
// Mark as agent_picked — PIN + update
// =========================================================
async function markAgentPicked(returnId, itemId) {
  var pin = prompt('הזן סיסמת עובד:');
  if (!pin) return;
  var emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); return; }

  try {
    await updateReturnStatus(returnId, 'agent_picked');
    var item = window._returnsData.find(function(it) { return it.id === itemId; });
    writeLog('return_agent_picked', item ? item.inventory_id : null, {
      return_id: returnId, barcode: item ? item.barcode : ''
    });
    toast('פריט סומן — סוכן לקח', 's');
    window._returnsCountCache = null;
    await loadReturnsData(_getCurrentReturnFilters());
  } catch (e) {
    console.error('markAgentPicked error:', e);
    toast('שגיאה בעדכון: ' + (e.message || ''), 'e');
  }
}

// =========================================================
// Get current filter state (reusable)
// =========================================================
function _getCurrentReturnFilters() {
  var filters = {};
  filters.status = ($('ret-filter-status') || {}).value || 'ready_to_ship';
  if (window._returnsShowHistory) filters.status = 'all';
  filters.supplier_id = ($('ret-filter-supplier') || {}).value || '';
  filters.dateRange = ($('ret-filter-date') || {}).value || 'all';
  filters.search = ($('ret-filter-search') || {}).value.trim() || '';
  return filters;
}

// =========================================================
// Bulk action — process all checked items
// =========================================================
async function bulkAction(action) {
  var checkboxes = document.querySelectorAll('.ret-cb:checked');
  if (!checkboxes.length) { toast('יש לבחור פריטים', 'w'); return; }

  // Validate action is applicable to selected items
  var validStatuses = (action === 'agent_picked') ? ['ready_to_ship'] : [];
  var validItems = [];
  checkboxes.forEach(function(cb) {
    if (validStatuses.indexOf(cb.dataset.status) !== -1) {
      validItems.push({ returnId: cb.dataset.returnId, itemId: cb.dataset.itemId });
    }
  });

  if (!validItems.length) {
    toast('הפריטים שנבחרו אינם בסטטוס מתאים', 'w');
    return;
  }

  var pin = prompt('הזן סיסמת עובד (' + validItems.length + ' פריטים):');
  if (!pin) return;
  var emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); return; }

  // Group by return_id to avoid duplicate updates
  var returnIds = {};
  validItems.forEach(function(vi) { returnIds[vi.returnId] = vi.itemId; });

  var count = 0;
  for (var rid in returnIds) {
    try {
      await updateReturnStatus(rid, action);
      var logAction = 'return_agent_picked';
      writeLog(logAction, null, { return_id: rid, bulk: true });
      count++;
    } catch (e) {
      console.error('bulkAction error for return ' + rid, e);
    }
  }

  toast(count + ' פריטים עודכנו', 's');
  window._returnsCountCache = null;
  await loadReturnsData(_getCurrentReturnFilters());
}

// =========================================================
// Send to shipment box — navigate to shipments wizard
// =========================================================
function sendToBox(returnId, supplierId) {
  window.location.href = 'shipments.html?type=return&supplier=' + encodeURIComponent(supplierId) + '&returns=' + encodeURIComponent(returnId);
}

// =========================================================
// Bulk send to box — validate same supplier, navigate
// =========================================================
function bulkSendToBox() {
  var checkboxes = document.querySelectorAll('.ret-cb:checked');
  if (!checkboxes.length) { toast('לא נבחרו פריטים', 'w'); return; }

  // Filter for ready_to_ship only
  var selected = [];
  checkboxes.forEach(function(cb) {
    if (cb.dataset.status === 'ready_to_ship') {
      selected.push({ idx: Number(cb.dataset.idx), returnId: cb.dataset.returnId });
    }
  });
  if (!selected.length) { toast('הפריטים שנבחרו אינם בסטטוס "מוכן למשלוח"', 'w'); return; }

  // Get supplier IDs from _returnsData
  var supplierIds = {};
  var supplierId = null;
  for (var i = 0; i < selected.length; i++) {
    var item = window._returnsData[selected[i].idx];
    var sid = item && item.return ? item.return.supplier_id : null;
    if (sid) supplierIds[sid] = true;
    if (!supplierId) supplierId = sid;
  }

  if (Object.keys(supplierIds).length > 1) {
    toast('לא ניתן לשלוח פריטים מספקים שונים באותו ארגז — בחר פריטים מספק אחד', 'e');
    return;
  }

  // Collect unique return IDs
  var returnIdMap = {};
  selected.forEach(function(s) { returnIdMap[s.returnId] = true; });
  var returnIds = Object.keys(returnIdMap).join(',');

  window.location.href = 'shipments.html?type=return&supplier=' + encodeURIComponent(supplierId) + '&returns=' + encodeURIComponent(returnIds);
}

// =========================================================
// Export filtered returns to Excel
// =========================================================
function exportReturnsExcel() {
  var items = window._returnsData;
  if (!items || !items.length) { toast('אין נתונים לייצוא', 'w'); return; }

  var rows = items.map(function(it) {
    var ret = it.return || {};
    var st = RETURN_STATUS_MAP[ret.status] || {};
    return {
      'ברקוד': it.barcode || '',
      'מותג': it.brand_name || '',
      'דגם': it.model || '',
      'צבע': it.color || '',
      'גודל': it.size || '',
      'ספק': ret.supplier ? ret.supplier.name : '',
      'מספר זיכוי': ret.return_number || '',
      'סטטוס': st.he || ret.status || '',
      'תאריך': ret.created_at ? ret.created_at.slice(0, 10) : '',
      'עלות': it.cost_price || 0
    };
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'זיכויים');
  var today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'returns_' + today + '.xlsx');
  toast('קובץ Excel יוצא', 's');
}
