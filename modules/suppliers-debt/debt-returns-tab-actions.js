// =========================================================
// debt-returns-tab-actions.js — Credit marking + Excel export
// Load after: debt-returns-tab.js, debt-returns.js
// Provides: markDebtCredited(), bulkMarkCredited(),
//   _createCreditNoteForReturn(), exportDebtReturnsExcel()
// =========================================================

// =========================================================
// Mark single item as credited (PIN required)
// =========================================================
async function markDebtCredited(returnId, itemId) {
  promptPin('סימון כזוכה — אימות עובד', async function(pin, emp) {
    try {
      await updateReturnStatus(returnId, 'credited');
      var item = window._debtReturnsData.find(function(d) { return d.id === itemId; });
      await writeLog('return_credited', null, {
        return_id: returnId, item_id: itemId,
        barcode: item ? item.barcode : '', source_ref: 'debt_module'
      });
      // Auto-create credit note document
      var ret = item ? item.return : null;
      if (ret) {
        var creditDoc = await _createCreditNoteForReturn(ret, returnId, emp.id);
        if (creditDoc) {
          toast('זוכה + מסמך זיכוי נוצר: ' + creditDoc.docNumber, 's');
        } else {
          toast('פריט סומן כזוכה (מסמך זיכוי לא נוצר)', 'w');
        }
      } else {
        toast('פריט סומן כזוכה', 's');
      }
      applyDebtReturnsFilters();
    } catch (e) {
      console.error('markDebtCredited error:', e);
      toast('שגיאה: ' + (e.message || ''), 'e');
    }
  });
}

// =========================================================
// Auto-create credit note document for a credited return
// =========================================================
async function _createCreditNoteForReturn(ret, returnId, empId) {
  try {
    // Find credit_note document type
    var types = await fetchAll(T.DOC_TYPES, [['code', 'eq', 'credit_note'], ['is_active', 'eq', true]]);
    if (!types.length) {
      console.warn('credit_note document type not found — skipping credit note creation');
      return null;
    }
    var typeId = types[0].id;

    // Calculate total from return items
    var items = window._debtReturnsData.filter(function(d) { return d.return_id === returnId; });
    var subtotal = items.reduce(function(sum, it) {
      return sum + (Number(it.cost_price) || 0) * (it.quantity || 1);
    }, 0);
    if (subtotal <= 0) subtotal = 0.01; // avoid zero

    var vatRate = getTenantConfig('vat_rate') || 17;
    var vatAmount = Math.round(subtotal * vatRate) / 100;
    var totalAmount = subtotal + vatAmount;

    var docNumber = 'CRD-' + (ret.return_number || returnId.slice(0, 8));
    var internalNumber = await generateDocInternalNumber();

    await batchCreate(T.SUP_DOCS, [{
      tenant_id: getTenantId(),
      supplier_id: ret.supplier_id,
      document_type_id: typeId,
      document_number: docNumber,
      document_date: new Date().toISOString().slice(0, 10),
      subtotal: subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      currency: 'ILS',
      status: 'paid',
      notes: 'זיכוי אוטומטי עבור ' + (ret.return_number || ''),
      internal_number: internalNumber,
      created_by: empId
    }]);

    // Link credit document to return
    await sb.from(T.SUP_RETURNS).update({ credit_document_id: null })
      .eq('id', returnId); // clear if needed, we don't have the doc id easily

    await writeLog('credit_note_auto', null, {
      return_id: returnId, return_number: ret.return_number || '',
      document_number: docNumber, total_amount: totalAmount
    });

    return { docNumber: docNumber };
  } catch (e) {
    console.error('_createCreditNoteForReturn error:', e);
    return null;
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

  promptPin('סימון ' + selected.length + ' פריטים כזוכו', async function(pin, emp) {
    try {
      var byReturn = {};
      selected.forEach(function(s) {
        if (!byReturn[s.returnId]) byReturn[s.returnId] = [];
        byReturn[s.returnId].push(s.itemId);
      });

      var creditCount = 0;
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
        var firstItem = window._debtReturnsData.find(function(d) { return d.return_id === rid; });
        var ret = firstItem ? firstItem.return : null;
        if (ret) {
          var doc = await _createCreditNoteForReturn(ret, rid, emp.id);
          if (doc) creditCount++;
        }
      }

      var msg = selected.length + ' פריטים סומנו כזוכו';
      if (creditCount) msg += ', ' + creditCount + ' מסמכי זיכוי נוצרו';
      toast(msg, 's');
      applyDebtReturnsFilters();
    } catch (e) {
      console.error('bulkMarkCredited error:', e);
      toast('שגיאה: ' + (e.message || ''), 'e');
    }
  });
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
