// =========================================================
// EXCEL BULK IMPORT
// =========================================================
let excelImportRows = []; // validated rows ready for insert
let excelImportFileName = ''; // filename for logging

function resetExcelImport() {
  excelImportRows = [];
  const fileInput = $('excel-import-file');
  if (fileInput) fileInput.value = '';
  $('excel-import-preview').style.display = 'none';
  clearAlert('excel-import-alerts');
}

function handleExcelImport(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  excelImportFileName = file.name;
  clearAlert('excel-import-alerts');
  showLoading('קורא קובץ Excel...');

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!json.length) {
        hideLoading();
        setAlert('excel-import-alerts', 'הקובץ ריק — אין שורות נתונים', 'e');
        return;
      }

      // Column name normalization map
      const colMap = {
        'חברה/מותג': ['חברה/מותג','חברה / מותג','חברה','מותג','brand'],
        'דגם': ['דגם','model'],
        'גודל': ['גודל','size'],
        'מחיר מכירה': ['מחיר מכירה','מחיר','price','sell_price'],
        'גשר': ['גשר','bridge'],
        'צבע': ['צבע','color'],
        'סוג מוצר': ['סוג מוצר','סוג','type','product_type'],
        'הנחה%': ['הנחה%','הנחה','discount'],
        'סנכרון': ['סנכרון','סנכרון אתר','sync'],
        'הערות': ['הערות','notes','הערה']
      };

      // Detect actual column names from file
      const fileKeys = Object.keys(json[0]);
      const keyLookup = {};
      for (const [canonical, aliases] of Object.entries(colMap)) {
        for (const alias of aliases) {
          const found = fileKeys.find(k => k.trim() === alias);
          if (found) { keyLookup[canonical] = found; break; }
        }
      }

      const required = ['חברה/מותג','דגם','גודל','מחיר מכירה'];
      const validRows = [];
      const errors = [];

      json.forEach((row, idx) => {
        const rowNum = idx + 2; // Excel row (1-based + header)
        const missing = [];
        for (const req of required) {
          const key = keyLookup[req];
          const val = key ? String(row[key] || '').trim() : '';
          if (!val) missing.push(req);
        }
        if (missing.length) {
          errors.push(`שורה ${rowNum}: חסר ${missing.join(', ')}`);
          return;
        }

        const get = (col) => { const k = keyLookup[col]; return k ? String(row[k] || '').trim() : ''; };
        validRows.push({
          brand: get('חברה/מותג'),
          model: get('דגם'),
          size: get('גודל'),
          price: parseFloat(get('מחיר מכירה')) || 0,
          bridge: get('גשר'),
          color: get('צבע'),
          ptype: get('סוג מוצר') || 'משקפי ראייה',
          discount: get('הנחה%'),
          sync: get('סנכרון'),
          notes: get('הערות')
        });
      });

      excelImportRows = validRows;

      // Show stats
      const statsEl = $('excel-import-stats');
      const parts = [];
      parts.push(`<span style="color:var(--success)">&#10004; ${validRows.length} שורות תקינות</span>`);
      if (errors.length) parts.push(`<span style="color:var(--error)">&#10008; ${errors.length} שורות עם שגיאות</span>`);
      statsEl.innerHTML = parts.join(' &nbsp;|&nbsp; ');

      // Show errors
      const errEl = $('excel-import-errors');
      if (errors.length) {
        errEl.style.display = 'block';
        errEl.innerHTML = `<div class="alert alert-e" style="max-height:160px;overflow-y:auto;font-size:.82rem">${errors.map(e => escapeHtml(e)).join('<br>')}</div>`;
      } else {
        errEl.style.display = 'none';
      }

      // Show preview table
      const tbody = $('excel-import-body');
      tbody.innerHTML = validRows.map((r, i) =>
        `<tr>
          <td>${i + 1}</td><td>${escapeHtml(r.brand)}</td><td>${escapeHtml(r.model)}</td><td>${escapeHtml(r.size)}</td><td>${r.price}</td>
          <td>${escapeHtml(r.bridge)}</td><td>${escapeHtml(r.color)}</td><td>${escapeHtml(r.ptype)}</td><td>${escapeHtml(r.discount)}</td><td>${escapeHtml(r.sync)}</td><td>${escapeHtml(r.notes)}</td>
        </tr>`
      ).join('');

      // Update confirm button
      const btn = $('excel-import-confirm');
      btn.disabled = !validRows.length;
      btn.textContent = `\u2714 אשר והכנס ${validRows.length} פריטים`;

      $('excel-import-preview').style.display = 'block';
    } catch(err) {
      setAlert('excel-import-alerts', 'שגיאה בקריאת הקובץ: ' + (err.message || ''), 'e');
    }
    hideLoading();
  };
  reader.readAsArrayBuffer(file);
}

let excelPendingRows = []; // rows waiting for barcode generation

function buildExcelRecordFields(r, barcode) {
  const rec = {
    barcode: barcode,
    brand_id: brandCache[r.brand] || null,
    model: r.model,
    size: r.size,
    sell_price: r.price,
    product_type: heToEn('product_type', r.ptype),
    status: heToEn('status', 'במלאי'),
    origin: 'ייבוא אקסל',
    quantity: 1,
  };
  if (r.bridge) rec.bridge = r.bridge;
  if (r.color) rec.color = r.color;
  if (r.discount) rec.sell_discount = (parseFloat(r.discount) || 0) / 100;
  if (r.notes) rec.notes = r.notes;
  rec.website_sync = heToEn('website_sync', r.sync || getBrandSync(r.brand) || 'לא');
  const bt = getBrandType(r.brand);
  if (bt) rec.brand_type = heToEn('brand_type', bt);
  return rec;
}

async function confirmExcelImport() {
  if (!excelImportRows.length) return;
  const ok = await confirmDialog('אישור ייבוא', `להכניס ${excelImportRows.length} פריטים למלאי?`);
  if (!ok) return;

  showLoading(`בודק ברקודים ל-${excelImportRows.length} פריטים...`);
  clearAlert('excel-import-alerts');

  try {
    const withBarcode = [];   // Case A — existing barcode found
    const noPending = [];     // Case B — need new barcode

    // STEP 1 — Check each row for existing barcode
    for (const r of excelImportRows) {
      const brandId = brandCache[r.brand] || null;
      let matchRec = null;

      if (brandId) {
        const existing = await fetchAll(T.INV, [
          ['brand_id','eq',brandId],['model','eq',r.model],
          ['size','eq',r.size],['color','eq',r.color],
          ['is_deleted','eq',false]
        ]);
        matchRec = existing.find(e => (e.quantity || 0) > 0 && e.barcode);
      }

      if (matchRec) {
        withBarcode.push({ ...r, barcode: matchRec.barcode, existingId: matchRec.id, existingQty: matchRec.quantity || 0 });
      } else {
        const reason = !brandId ? 'מותג לא מוכר' : 'פריט חדש / אזל';
        noPending.push({ ...r, reason });
      }
    }

    // STEP 1b — Update qty for Case A items (aggregate duplicates first)
    let insertedCount = 0;
    const grouped = {};
    for (const r of withBarcode) {
      if (!grouped[r.existingId]) {
        grouped[r.existingId] = { ...r, addQty: 0 };
      }
      grouped[r.existingId].addQty++;
    }
    for (const r of Object.values(grouped)) {
      const newQty = r.existingQty + r.addQty;
      await batchUpdate(T.INV, [{ id: r.existingId, quantity: newQty }]);
      writeLog('entry_excel', r.existingId, {
        barcode: r.barcode, brand: r.brand, model: r.model,
        qty_before: r.existingQty, qty_after: newQty,
        source_ref: excelImportFileName || 'ייבוא אקסל'
      });
    }
    insertedCount = withBarcode.length;

    // Store pending for later barcode generation
    excelPendingRows = noPending;

    // STEP 2 — Show results modal
    showExcelResultsModal(withBarcode, noPending, insertedCount);

    // Reset import form
    excelImportRows = [];
    $('excel-import-preview').style.display = 'none';
    $('excel-import-file').value = '';
  } catch(e) {
    setAlert('excel-import-alerts', 'שגיאה: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function showExcelResultsModal(inserted, pending, insertedCount) {
  const modal = $('excel-results-modal');

  // Success section
  const successDiv = $('excel-results-success');
  if (inserted.length) {
    let html = `<h4 style="color:var(--success);margin-bottom:8px">&#10004;&#65039; ${insertedCount} פריטים נכנסו למלאי</h4>`;
    html += '<div class="table-wrap" style="max-height:200px;overflow-y:auto"><table style="font-size:.82rem"><thead><tr><th>מותג</th><th>דגם</th><th>גודל</th><th>צבע</th><th>ברקוד</th></tr></thead><tbody>';
    for (const r of inserted) {
      html += `<tr><td>${escapeHtml(r.brand)}</td><td>${escapeHtml(r.model)}</td><td>${escapeHtml(r.size)}</td><td>${escapeHtml(r.color)}</td><td style="font-family:monospace;font-weight:600">${escapeHtml(r.barcode)}</td></tr>`;
    }
    html += '</tbody></table></div>';
    successDiv.innerHTML = html;
    successDiv.style.display = 'block';
  } else {
    successDiv.style.display = 'none';
  }

  // Pending section
  const pendingDiv = $('excel-results-pending');
  if (pending.length) {
    let html = `<h4 style="color:var(--warning, #f59e0b);margin-bottom:8px">&#9888;&#65039; ${pending.length} פריטים ממתינים לברקוד — לא הוכנסו למלאי</h4>`;
    html += '<div class="table-wrap" style="max-height:200px;overflow-y:auto"><table style="font-size:.82rem"><thead><tr><th>מותג</th><th>דגם</th><th>גודל</th><th>צבע</th><th>סיבה</th></tr></thead><tbody>';
    for (const r of pending) {
      html += `<tr><td>${escapeHtml(r.brand)}</td><td>${escapeHtml(r.model)}</td><td>${escapeHtml(r.size)}</td><td>${escapeHtml(r.color)}</td><td>${escapeHtml(r.reason)}</td></tr>`;
    }
    html += '</tbody></table></div>';
    html += '<div style="margin-top:12px"><button class="btn btn-p" onclick="generatePendingBarcodes()">&#128203; צור ברקודים לפריטים הממתינים</button></div>';
    pendingDiv.innerHTML = html;
    pendingDiv.style.display = 'block';
  } else {
    pendingDiv.style.display = 'none';
  }

  // Instructions reminder
  const reminderDiv = $('excel-results-reminder');
  reminderDiv.innerHTML = '<p style="color:var(--g500);font-size:.85rem;margin-top:12px">&#128172; זכור: יש להדפיס את הברקודים לפני אחסון המסגרות במלאי</p>';

  modal.style.display = 'flex';
}

async function generatePendingBarcodes() {
  if (!excelPendingRows.length) { toast('אין פריטים ממתינים', 'w'); return; }

  showLoading(`מייצר ברקודים ל-${excelPendingRows.length} פריטים...`);
  try {
    await loadMaxBarcode();
    const prefix = branchCode.padStart(2, '0');
    let nextSeq = maxBarcode;

    // Generate sequential barcodes for all pending items
    for (const r of excelPendingRows) {
      nextSeq++;
      if (nextSeq > 99999) throw new Error('חריגה — מקסימום 99,999 ברקודים לסניף ' + prefix);
      r.barcode = prefix + String(nextSeq).padStart(5, '0');
    }
    maxBarcode = nextSeq;

    // Validate brand_id before insert — skip rows with unknown brands
    const invalidBrands = excelPendingRows.filter(r => r.brand && !brandCache[r.brand]);
    if (invalidBrands.length) {
      const names = [...new Set(invalidBrands.map(r => r.brand))].slice(0, 3).map(n => escapeHtml(n)).join(', ');
      Toast.error('מותגים לא נמצאו: ' + names + (invalidBrands.length > 3 ? ' ועוד...' : ''));
      excelPendingRows = excelPendingRows.filter(r => brandCache[r.brand]);
      if (!excelPendingRows.length) { hideLoading(); return; }
    }
    // Insert all pending items with their new barcodes
    const records = excelPendingRows.map(r => buildExcelRecordFields(r, r.barcode));
    const created = await batchCreate(T.INV, records);
    for (const item of created) {
      writeLog('entry_excel', item.id, {
        barcode: item.barcode, brand: item.brand_name,
        model: item.model, qty_before: 0, qty_after: 1,
        source_ref: excelImportFileName || 'ייבוא אקסל'
      });
    }

    // Update modal — show success for these items too
    const pendingDiv = $('excel-results-pending');
    let html = `<h4 style="color:var(--success);margin-bottom:8px">&#10004;&#65039; ${created.length} פריטים נוספים נכנסו למלאי</h4>`;
    html += '<div class="table-wrap" style="max-height:200px;overflow-y:auto"><table style="font-size:.82rem"><thead><tr><th>מותג</th><th>דגם</th><th>גודל</th><th>צבע</th><th>ברקוד</th></tr></thead><tbody>';
    for (const r of excelPendingRows) {
      html += `<tr><td>${escapeHtml(r.brand)}</td><td>${escapeHtml(r.model)}</td><td>${escapeHtml(r.size)}</td><td>${escapeHtml(r.color)}</td><td style="font-family:monospace;font-weight:600">${escapeHtml(r.barcode)}</td></tr>`;
    }
    html += '</tbody></table></div>';
    html += '<div style="margin-top:12px"><button class="btn btn-w" onclick="exportPendingBarcodes()">&#128424;&#65039; הורד Excel לברקודים</button></div>';
    pendingDiv.innerHTML = html;

    toast(`${created.length} פריטים נכנסו למלאי!`, 's');
    // Keep barcode data for Excel export
    lastGeneratedBarcodes = excelPendingRows.map(r => ({
      barcode: r.barcode, brand: r.brand, model: r.model,
      size: r.size, bridge: r.bridge || '', color: r.color,
      ptype: r.ptype, price: r.price, discount: r.discount || ''
    }));
    excelPendingRows = [];
  } catch(e) {
    toast('שגיאה ביצירת ברקודים: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

let lastGeneratedBarcodes = [];

function exportPendingBarcodes() {
  const data = lastGeneratedBarcodes;
  if (!data.length) { toast('אין ברקודים לייצוא', 'w'); return; }
  const wsData = data.map(r => ({
    'ברקוד': r.barcode, 'חברה': r.brand, 'דגם': r.model,
    'גודל': r.size, 'גשר': r.bridge, 'צבע': r.color,
    'סוג מוצר': r.ptype, 'מחיר מכירה': r.price, 'הנחה %': r.discount
  }));
  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ברקודים');
  XLSX.writeFile(wb, `barcodes_${Date.now()}.xlsx`);
  toast('קובץ Excel יורד...', 's');
}