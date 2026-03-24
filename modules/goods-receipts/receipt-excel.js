function handleReceiptExcel(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  ev.target.value = ''; // Reset for re-upload

  showLoading('קורא Excel...');
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!json.length) { hideLoading(); toast('הקובץ ריק', 'e'); return; }

      const colMap = {
        'ברקוד': ['ברקוד', 'barcode'],
        'מותג': ['מותג', 'חברה', 'חברה/מותג', 'חברה / מותג', 'brand'],
        'דגם': ['דגם', 'model'],
        'צבע': ['צבע', 'color'],
        'גודל': ['גודל', 'size'],
        'כמות': ['כמות', 'quantity', 'qty'],
        'מחיר עלות': ['מחיר עלות', 'עלות', 'cost', 'unit_cost'],
        'מחיר מכירה': ['מחיר מכירה', 'מחיר', 'price', 'sell_price']
      };

      const fileKeys = Object.keys(json[0]);
      const keyLookup = {};
      for (const [canonical, aliases] of Object.entries(colMap)) {
        for (const alias of aliases) {
          const found = fileKeys.find(k => k.trim() === alias);
          if (found) { keyLookup[canonical] = found; break; }
        }
      }

      let added = 0;
      for (const row of json) {
        const get = (col) => { const k = keyLookup[col]; return k ? String(row[k] || '').trim() : ''; };
        const barcode = get('ברקוד');
        const brand = get('מותג');
        const model = get('דגם');

        if (!brand && !model && !barcode) continue; // Skip empty rows

        let isNew = true;
        let inventoryId = null;

        // If barcode provided, check if exists in inventory
        if (barcode) {
          const { data: inv } = await sb.from('inventory')
            .select('id, brand_id, model, color, size, quantity')
            .eq('barcode', barcode)
            .eq('is_deleted', false)
            .maybeSingle();
          if (inv) {
            isNew = false;
            inventoryId = inv.id;
          }
        }

        addReceiptItemRow({
          barcode,
          brand: brand || '',
          model: model || '',
          color: get('צבע'),
          size: get('גודל'),
          quantity: parseInt(get('כמות')) || 1,
          unit_cost: parseFloat(get('מחיר עלות')) || '',
          sell_price: parseFloat(get('מחיר מכירה')) || '',
          is_new_item: isNew,
          inventory_id: inventoryId
        });
        added++;
      }

      updateReceiptItemsStats();
      toast(`${added} שורות נטענו מ-Excel`, 's');
    } catch (err) {
      console.error('handleReceiptExcel error:', err);
      toast('שגיאה בקריאת Excel: ' + (err.message || ''), 'e');
    }
    hideLoading();
  };
  reader.readAsArrayBuffer(file);
}

async function exportReceiptExcel() {
  let items;
  try { items = getReceiptItems(); } catch (e) { return; }
  if (!items.length) { toast('אין פריטים לייצוא', 'w'); return; }

  const rcptNumber = ($('rcpt-number').value || '').trim() || 'receipt';
  const rows = items.map((i, idx) => ({
    '#': idx + 1,
    'ברקוד': i.barcode,
    'מותג': i.brand,
    'דגם': i.model,
    'צבע': i.color,
    'גודל': i.size,
    'כמות': i.quantity,
    'מחיר עלות': i.unit_cost || '',
    'מחיר מכירה': i.sell_price || '',
    'סוג': i.is_new_item ? 'חדש' : 'קיים'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'פריטים');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `קבלה-${rcptNumber}-${dateStr}.xlsx`);
  toast('קובץ Excel יוצא', 's');
}

// =========================================================
// Export confirmed receipt to Access Excel
// =========================================================
async function exportReceiptToAccess(receiptId) {
  showLoading('מכין ייצוא...');
  try {
    // A) Load receipt
    const { data: receipt, error: rErr } = await sb.from(T.RECEIPTS)
      .select('*, suppliers(name)')
      .eq('id', receiptId)
      .single();
    if (rErr) throw rErr;

    const supplierName = receipt.suppliers?.name || (receipt.supplier_id ? (supplierCacheRev[receipt.supplier_id] || '—') : '—');

    // B) Load receipt items with inventory + brand
    const { data: items, error: iErr } = await sb.from(T.RCPT_ITEMS)
      .select('*, inventory(barcode, model, color, size, sell_price, brand_id, brands(name))')
      .eq('receipt_id', receiptId);
    if (iErr) throw iErr;

    if (!items || !items.length) {
      hideLoading();
      toast('אין פריטים בקבלה זו', 'w');
      return;
    }

    // C) Build Excel rows
    const rows = items.map(item => {
      const inv = item.inventory || {};
      const brandName = inv.brands?.name || '';
      return {
        barcode: inv.barcode || '',
        brand: brandName,
        model: inv.model || '',
        color: inv.color || '',
        size: inv.size || '',
        sell_price: inv.sell_price || '',
        quantity: item.quantity || 0,
        receipt_number: receipt.receipt_number || '',
        supplier: supplierName,
        received_date: receipt.receipt_date || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'new_inventory');

    // D) Filename
    const rcptNum = (receipt.receipt_number || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `opticup_new_inventory_${rcptNum}_${dateStr}.xlsx`);

    hideLoading();
    toast('הקובץ מוכן להורדה', 's');
  } catch (e) {
    hideLoading();
    toast('שגיאה בייצוא: ' + (e.message || ''), 'e');
  }
}

// ── Export barcodes for confirmed receipt to Excel ───────────────
async function exportReceiptBarcodes(receiptId) {
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9 \u05E7\u05D1\u05DC\u05D4...');
  try {
    var { data: items, error } = await sb.from(T.RCPT_ITEMS)
      .select('barcode, barcodes_csv, brand, model, size, color, quantity, unit_cost, receipt_status, po_match_status')
      .eq('receipt_id', receiptId)
      .eq('tenant_id', getTenantId());
    if (error) throw error;

    // Filter: only items that actually entered inventory
    var printItems = (items || []).filter(function(i) {
      return i.receipt_status !== 'not_received' && i.po_match_status !== 'returned' && i.po_match_status !== 'not_received';
    });
    if (!printItems.length) { hideLoading(); toast('\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05D9\u05D9\u05E6\u05D5\u05D0', 'w'); return; }

    // Expand barcodes into individual rows (one per physical frame)
    var rows = [];
    printItems.forEach(function(item) {
      var barcodes = item.barcodes_csv ? item.barcodes_csv.split(',').filter(Boolean) : (item.barcode ? [item.barcode] : []);
      // If no barcodes_csv, fall back to expanding by qty (legacy rows)
      if (barcodes.length === 0) {
        var qty = item.quantity || 1;
        for (var q = 0; q < qty; q++) {
          barcodes.push(item.barcode || '');
        }
      }
      for (var b = 0; b < barcodes.length; b++) {
        rows.push({
          '\u05D1\u05E8\u05E7\u05D5\u05D3': barcodes[b],
          '\u05DE\u05D5\u05EA\u05D2': item.brand || '',
          '\u05D3\u05D2\u05DD': item.model || '',
          '\u05E6\u05D1\u05E2': item.color || '',
          '\u05D2\u05D5\u05D3\u05DC': item.size || '',
          '\u05DE\u05D7\u05D9\u05E8 \u05E2\u05DC\u05D5\u05EA': item.unit_cost || ''
        });
      }
    });

    // Get receipt number for filename
    var { data: rcpt } = await sb.from(T.RECEIPTS).select('receipt_number').eq('id', receiptId).eq('tenant_id', getTenantId()).single();
    var rcptNum = rcpt ? rcpt.receipt_number : 'receipt';

    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '\u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD');
    var dateStr = new Date().toISOString().slice(0, 10);
    var safeNum = (rcptNum || '').replace(/[^a-zA-Z0-9_\u0590-\u05FF-]/g, '_');
    XLSX.writeFile(wb, 'barcodes_' + safeNum + '_' + dateStr + '.xlsx');

    hideLoading();
    toast(rows.length + ' \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD \u05D9\u05D5\u05E6\u05D0\u05D5 \u05DC-Excel', 's');
  } catch (e) {
    hideLoading();
    console.error('exportReceiptBarcodes error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05D9\u05E6\u05D5\u05D0 \u05D1\u05E8\u05E7\u05D5\u05D3\u05D9\u05DD: ' + (e.message || ''), 'e');
  }
}

// Legacy alias for backward compatibility
var printReceiptBarcodes = exportReceiptBarcodes;

// ─── EVENT DELEGATION — goods-receipt.js ────────────────────────
document.addEventListener('click', function(e) {
  // #7 openExistingReceipt (edit)
  const editBtn = e.target.closest('.btn-rcpt-edit');
  if (editBtn) { openExistingReceipt(editBtn.dataset.id, false); return; }
  // #8 confirmReceiptById
  const confirmBtn = e.target.closest('.btn-rcpt-confirm');
  if (confirmBtn) { confirmReceiptById(confirmBtn.dataset.id); return; }
  // #9 cancelReceipt
  const cancelBtn = e.target.closest('.btn-rcpt-cancel');
  if (cancelBtn) { cancelReceipt(cancelBtn.dataset.id); return; }
  // #10 openExistingReceipt (view)
  const viewBtn = e.target.closest('.btn-rcpt-view');
  if (viewBtn) { openExistingReceipt(viewBtn.dataset.id, true); return; }
  // #11 exportReceiptToAccess
  const exportBtn = e.target.closest('.btn-rcpt-export');
  if (exportBtn) { exportReceiptToAccess(exportBtn.dataset.id); return; }
  // #12 printReceiptBarcodes
  const printBarBtn = e.target.closest('.btn-rcpt-print-barcodes');
  if (printBarBtn) { printReceiptBarcodes(printBarBtn.dataset.id); return; }
});
