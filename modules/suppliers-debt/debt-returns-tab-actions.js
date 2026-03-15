// =========================================================
// debt-returns-tab-actions.js — Credit marking + Excel export
// Load after: debt-returns-tab.js, debt-returns.js
// Provides: markDebtCredited(), _execMarkCredited(),
//   bulkMarkCredited(), exportDebtReturnsExcel()
// =========================================================

// =========================================================
// Mark single item as credited (PIN required)
// =========================================================
async function markDebtCredited(returnId, itemId) {
  var html =
    '<div class="modal-overlay" id="dret-credit-modal" style="display:flex" onclick="if(event.target===this)closeModal(\'dret-credit-modal\')">' +
      '<div class="modal" style="max-width:400px">' +
        '<h3 style="margin:0 0 12px">סימון כזוכה</h3>' +
        '<p style="font-size:.9rem">סמן פריט זה כ"זוכה"?</p>' +
        '<div class="form-group"><label>סיסמת עובד</label>' +
          '<input type="password" id="dret-credit-pin" class="nd-field" maxlength="10" placeholder="הזן PIN">' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<button class="btn btn-p" onclick="_execMarkCredited(\'' + returnId + '\',\'' + itemId + '\')">&#9989; אשר</button>' +
          '<button class="btn btn-g" onclick="closeModal(\'dret-credit-modal\')">ביטול</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  var existing = $('dret-credit-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  setTimeout(function() { var p = $('dret-credit-pin'); if (p) p.focus(); }, 100);
}

async function _execMarkCredited(returnId, itemId) {
  var pin = ($('dret-credit-pin') || {}).value || '';
  if (!pin) { toast('יש להזין סיסמת עובד', 'w'); return; }
  var emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); var p = $('dret-credit-pin'); if (p) p.value = ''; return; }

  try {
    await updateReturnStatus(returnId, 'credited');
    var item = window._debtReturnsData.find(function(d) { return d.id === itemId; });
    await writeLog('return_credited', null, {
      return_id: returnId, item_id: itemId,
      barcode: item ? item.barcode : '', source_ref: 'debt_module'
    });
    closeModal('dret-credit-modal');
    toast('פריט סומן כזוכה', 's');
    applyDebtReturnsFilters();
  } catch (e) {
    console.error('markDebtCredited error:', e);
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
}

// =========================================================
// Bulk mark as credited
// =========================================================
async function bulkMarkCredited() {
  var cbs = document.querySelectorAll('.dret-cb:checked');
  if (!cbs.length) { toast('לא נבחרו פריטים', 'w'); return; }

  var selected = [];
  cbs.forEach(function(cb) {
    var st = cb.getAttribute('data-status');
    if (st === 'shipped' || st === 'agent_picked') {
      selected.push({ returnId: cb.getAttribute('data-return-id'), itemId: cb.getAttribute('data-item-id') });
    }
  });
  if (!selected.length) { toast('לא נבחרו פריטים ממתינים', 'w'); return; }

  var html =
    '<div class="modal-overlay" id="dret-credit-modal" style="display:flex" onclick="if(event.target===this)closeModal(\'dret-credit-modal\')">' +
      '<div class="modal" style="max-width:400px">' +
        '<h3 style="margin:0 0 12px">סימון ' + selected.length + ' פריטים כזוכו</h3>' +
        '<div class="form-group"><label>סיסמת עובד</label>' +
          '<input type="password" id="dret-credit-pin" class="nd-field" maxlength="10" placeholder="הזן PIN">' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<button class="btn btn-p" id="dret-bulk-confirm">&#9989; אשר</button>' +
          '<button class="btn btn-g" onclick="closeModal(\'dret-credit-modal\')">ביטול</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  var existing = $('dret-credit-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  setTimeout(function() { var p = $('dret-credit-pin'); if (p) p.focus(); }, 100);

  $('dret-bulk-confirm').onclick = async function() {
    var pin = ($('dret-credit-pin') || {}).value || '';
    if (!pin) { toast('יש להזין סיסמת עובד', 'w'); return; }
    var emp = await verifyPinOnly(pin);
    if (!emp) { toast('סיסמת עובד שגויה', 'e'); $('dret-credit-pin').value = ''; return; }

    try {
      // Group by return_id to avoid duplicate status updates
      var byReturn = {};
      selected.forEach(function(s) {
        if (!byReturn[s.returnId]) byReturn[s.returnId] = [];
        byReturn[s.returnId].push(s.itemId);
      });

      for (var rid in byReturn) {
        await updateReturnStatus(rid, 'credited');
        for (var j = 0; j < byReturn[rid].length; j++) {
          var iid = byReturn[rid][j];
          var item = window._debtReturnsData.find(function(d) { return d.id === iid; });
          await writeLog('return_credited', null, {
            return_id: rid, item_id: iid,
            barcode: item ? item.barcode : '', source_ref: 'debt_module_bulk'
          });
        }
      }

      closeModal('dret-credit-modal');
      toast(selected.length + ' פריטים סומנו כזוכו', 's');
      applyDebtReturnsFilters();
    } catch (e) {
      console.error('bulkMarkCredited error:', e);
      toast('שגיאה: ' + (e.message || ''), 'e');
    }
  };
}

// =========================================================
// Export to Excel
// =========================================================
function exportDebtReturnsExcel() {
  var data = window._debtReturnsData;
  if (!data.length) { toast('אין נתונים לייצוא', 'w'); return; }

  var rows = data.map(function(it) {
    var ret = it.return || {};
    var st = RETURN_STATUS_MAP[ret.status] || { he: ret.status || '' };
    var supName = ret.supplier ? ret.supplier.name : '';
    return {
      'ברקוד': it.barcode || '',
      'מותג': it.brand_name || '',
      'דגם': it.model || '',
      'ספק': supName,
      'מספר זיכוי': ret.return_number || '',
      'סטטוס': st.he,
      'תאריך שליחה': (ret.shipped_at || ret.agent_picked_at || ret.created_at || '').slice(0, 10),
      'תאריך זיכוי': ret.credited_at ? ret.credited_at.slice(0, 10) : '',
      'עלות': Number(it.cost_price) || 0
    };
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'זיכויים');
  var dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'returns_credit_' + dateStr + '.xlsx');
  toast('קובץ Excel הורד', 's');
}
