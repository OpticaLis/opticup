// ============================================================
// stock-count-export.js — Stock Count Excel export (diffs-only or all)
// Extracted from stock-count-report.js for file-size compliance
// ============================================================

// ── Export Excel — choose diffs-only or all ─────────────────
function exportCountExcel(countId) {
  Modal.show({
    size: 'sm',
    title: 'ייצוא Excel — ספירה ' + escapeHtml(scCountNumber),
    content: `
      <div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">
        <button id="sc-exp-diffs" class="btn btn-p" style="width:100%;min-height:48px;font-size:15px">
          &#128308; ייצוא פערים בלבד</button>
        <button id="sc-exp-all" class="btn btn-g" style="width:100%;min-height:48px;font-size:15px">
          &#128313; ייצוא כל הנספרים</button>
        <div style="margin-top:8px">
          <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:4px">מיון לפי:</label>
          <select id="sc-exp-sort" style="width:100%;padding:8px;border:1px solid var(--g300);border-radius:6px;font-family:inherit;font-size:.88rem">
            <option value="brand-asc">מותג (א-ת / A-Z)</option>
            <option value="brand-desc">מותג (ת-א / Z-A)</option>
            <option value="model-asc">דגם (א-ת / A-Z)</option>
            <option value="model-desc">דגם (ת-א / Z-A)</option>
            <option value="barcode-asc">ברקוד (עולה)</option>
            <option value="barcode-desc">ברקוד (יורד)</option>
          </select>
        </div>
      </div>`,
    closeOnEscape: true,
    closeOnBackdrop: true
  });
  document.getElementById('sc-exp-diffs').addEventListener('click', function() {
    Modal.closeAll();
    _doExportCountExcel(countId, true);
  });
  document.getElementById('sc-exp-all').addEventListener('click', function() {
    Modal.closeAll();
    _doExportCountExcel(countId, false);
  });
}

async function _doExportCountExcel(countId, diffsOnly) {
  const tab = document.getElementById('tab-stock-count');
  let allItems = tab._scReportAllItems;
  if (!allItems || !allItems.length) {
    try {
      allItems = await fetchAll(T.STOCK_COUNT_ITEMS, [['count_id', 'eq', countId]]);
    } catch (err) { toast('שגיאה בטעינת נתונים: ' + err.message, 'e'); return; }
  }

  var items;
  if (diffsOnly) {
    items = allItems.filter(i => i.status === 'counted' && i.actual_qty !== i.expected_qty);
    if (!items.length) { toast('אין פערים לייצוא', 'w'); return; }
  } else {
    items = allItems.filter(i => i.status === 'counted' || i.status === 'skipped');
    if (!items.length) { toast('אין פריטים שנספרו לייצוא', 'w'); return; }
  }

  // Sort
  var sortSel = document.getElementById('sc-exp-sort');
  var sortVal = sortSel ? sortSel.value : 'brand-asc';
  var parts = sortVal.split('-');
  var sortKey = parts[0]; // brand | model | barcode
  var sortDir = parts[1] === 'desc' ? -1 : 1;
  items.sort(function(a, b) {
    var va = ((a[sortKey]) || '').toLowerCase();
    var vb = ((b[sortKey]) || '').toLowerCase();
    return va < vb ? -sortDir : va > vb ? sortDir : 0;
  });

  var rows = items.map(function(it) {
    return {
      'ברקוד': it.barcode || '',
      'מותג': it.brand || '',
      'דגם': it.model || '',
      'צבע': it.color || '',
      'גודל': it.size || '',
      'צפוי (התחלה)': it.expected_qty,
      'נוכחי (DB)': it._current_qty !== undefined ? it._current_qty : it.expected_qty,
      'נספר': it.actual_qty,
      'פער': it.actual_qty - it.expected_qty,
      'סיבה': it.reason || '',
      'הערה': it.notes || '',
      'נסרק ע"י': it.scanned_by || ''
    };
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  var sheetName = diffsOnly ? 'פערים' : 'ספירת מלאי';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
                 { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 20 }, { wch: 14 }];
  var suffix = diffsOnly ? '_פערים' : '';
  var filename = 'ספירת_מלאי_' + (scCountNumber || 'export') + suffix + '.xlsx';
  XLSX.writeFile(wb, filename);
  toast('קובץ Excel יוצא: ' + filename, 's');
}
