// =========================================================
// TAB 2: REDUCTION — Excel
// =========================================================
let redExcelData = [];
let redExcelFileName = '';
let redSearchResults = [];
const REDUCE_REASONS = ['נמכר', 'נשבר', 'לא נמצא', 'נשלח לזיכוי', 'הועבר לסניף אחר'];
let reduceModalState = {};

function showSampleReport() { $('sample-modal').style.display = 'flex'; }

function handleRedExcel(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  redExcelFileName = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      // Access sales format detection
      if (wb.SheetNames.includes('sales_template')) {
        processAccessSalesFile(wb, file.name);
        return;
      }
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      redExcelData = json;
      const preview = $('red-preview');
      preview.style.display = 'block';
      preview.innerHTML = `<div class="alert alert-i">&#9432; נמצאו ${json.length} שורות בקובץ</div>
        <button class="btn btn-p" onclick="processRedExcel()">&#9654; עבד מכירות</button>`;
      $('red-results').style.display = 'none';
    } catch(err) {
      toast('שגיאה בקריאת הקובץ: ' + err.message, 'e');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function processRedExcel() {
  if (!redExcelData.length) return;
  showLoading('מעבד קובץ מכירות...');
  clearAlert('red-excel-alerts');

  const results = { updated: [], skipped: [], mismatch: [] };

  for (const row of redExcelData) {
    const barcode = String(row['ברקוד'] || row['barcode'] || Object.values(row)[0] || '').trim();
    if (!barcode) continue;

    try {
      const recs = await fetchAll(T.INV, [['barcode','eq',barcode]]);
      if (!recs.length) {
        results.mismatch.push({ barcode, reason: 'ברקוד לא קיים במלאי', row });
        continue;
      }
      const rec = recs[0];
      const f = rec.fields;
      const sync = f['סנכרון אתר'] || '';

      const mismatches = [];
      if (row['חברה'] && row['חברה'] !== f['חברה / מותג']) mismatches.push(`חברה: "${row['חברה']}" ≠ "${f['חברה / מותג']}"`);
      if (row['דגם'] && row['דגם'] !== f['דגם']) mismatches.push(`דגם: "${row['דגם']}" ≠ "${f['דגם']}"`);

      if (mismatches.length) {
        results.mismatch.push({ barcode, reason: mismatches.join(', '), row });
        continue;
      }

      if (sync === 'מלא') {
        const qtyBefore = f['כמות'] || 1;
        const qty = Math.max(0, qtyBefore - (parseInt(row['כמות'] || row['כמות שנמכרה']) || 1));
        const updateFields = { 'כמות': qty };
        if (qty === 0) updateFields['סטטוס'] = 'נמכר';
        await batchUpdate(T.INV, [{ id: rec.id, fields: updateFields }]);
        writeLog('sale', rec.id, { barcode, brand: f['חברה / מותג'], model: f['דגם'], qty_before: qtyBefore, qty_after: qty, source_ref: redExcelFileName || 'ייבוא אדום' });
        results.updated.push({ barcode, model: f['דגם'] || barcode });
      } else if (sync === 'תדמית') {
        results.skipped.push({ barcode, reason: 'פריט תדמית — לא עודכן' });
      } else {
        results.skipped.push({ barcode, reason: 'סנכרון=לא — לא עודכן' });
      }
    } catch(e) {
      results.mismatch.push({ barcode, reason: 'שגיאת API', row });
    }
  }

  if (results.mismatch.length) {
    const content = results.mismatch.map(m =>
      `<div style="padding:8px;border-bottom:1px solid var(--g200)"><strong>${m.barcode}</strong>: ${m.reason}</div>`
    ).join('');
    $('mismatch-content').innerHTML = content;
    $('mismatch-modal').style.display = 'flex';
    $('mismatch-force').onclick = async () => {
      closeModal('mismatch-modal');
      toast(`${results.mismatch.length} אי-התאמות דולגו`, 'w');
    };
  }

  const rd = $('red-results');
  rd.style.display = 'block';
  rd.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card"><div class="num" style="color:var(--success)">${results.updated.length}</div><div class="lbl">עודכנו</div></div>
      <div class="summary-card"><div class="num" style="color:var(--warn)">${results.skipped.length}</div><div class="lbl">דולגו</div></div>
      <div class="summary-card"><div class="num" style="color:var(--error)">${results.mismatch.length}</div><div class="lbl">אי-התאמות</div></div>
    </div>
    ${results.updated.length ? `<div class="alert alert-s">&#10004; עודכנו: ${results.updated.map(r=>r.model).join(', ')}</div>` : ''}
    ${results.skipped.length ? `<div class="alert alert-w">${results.skipped.map(r=>`${r.barcode}: ${r.reason}`).join('<br>')}</div>` : ''}
  `;
  toast('עיבוד הושלם', 's');
  hideLoading();
}

// =========================================================
// TAB 2: REDUCTION — Access Sales Import
// =========================================================

async function processAccessSalesFile(workbook, filename) {
  const ws = workbook.Sheets['sales_template'];
  // Parse: row 1 = headers (consumed by sheet_to_json), rows 2-3 = metadata, row 4+ = data
  const allRows = XLSX.utils.sheet_to_json(ws, { defval: '', range: 0 });
  // Skip 2 metadata rows (rows 2-3 in Excel = indices 0-1 in array)
  const rows = allRows.slice(2).filter(r => {
    // Skip empty rows — check if barcode or order_number has any value
    return String(r.barcode || '').trim() || String(r.order_number || '').trim();
  });

  if (!rows.length) {
    toast('הקובץ לא מכיל שורות נתונים', 'e');
    return;
  }

  // B) Duplicate file check
  try {
    const { data: existing } = await sb.from(T.SYNC_LOG).select('id').ilike('filename', filename);
    if (existing && existing.length > 0) {
      const ok = await confirmDialog('הקובץ הזה כבר עובד בעבר. לייבא בכל זאת?');
      if (!ok) return;
    }
  } catch (e) {
    console.warn('Duplicate check failed:', e.message || e);
    toast('בדיקת כפילויות נכשלה — ממשיך', 'w');
  }

  showLoading('מעבד קובץ מכירות Access...');

  // C) Validate rows
  const validRows = [];
  const errorDetails = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 4; // row 4 onward in Excel
    const errs = [];

    const barcode = String(r.barcode || '').trim();
    if (!barcode) errs.push('ברקוד חסר');

    const qty = parseInt(r.quantity);
    if (isNaN(qty) || qty <= 0) errs.push('כמות לא תקינה');

    const txDateRaw = r.transaction_date;
    let txDate = null;
    if (txDateRaw) {
      // Handle Excel serial numbers and string dates
      if (typeof txDateRaw === 'number') {
        const d = new Date((txDateRaw - 25569) * 86400000);
        txDate = d.toISOString().split('T')[0];
      } else {
        const d = new Date(txDateRaw);
        if (isNaN(d.getTime())) errs.push('תאריך לא תקין');
        else txDate = d.toISOString().split('T')[0];
      }
    } else {
      errs.push('תאריך לא תקין');
    }

    const orderNum = String(r.order_number || '').trim();
    if (!orderNum) errs.push('מספר הזמנה חסר');

    let actionType = String(r.action_type || 'sale').trim().toLowerCase();
    if (actionType !== 'sale' && actionType !== 'return') actionType = 'sale';

    let lensIncluded = false;
    const lensRaw = String(r.lens_included || '').trim().toLowerCase();
    if (lensRaw === 'yes' || lensRaw === 'true' || lensRaw === '1') lensIncluded = true;

    if (errs.length) {
      errorDetails.push({ rowNum, barcode, errors: errs });
    } else {
      validRows.push({
        barcode,
        quantity: qty,
        action_type: actionType,
        transaction_date: txDate,
        order_number: orderNum,
        employee_id: String(r.employee_id || '').trim() || null,
        sale_amount: parseFloat(r.sale_amount) || null,
        discount: parseFloat(r.discount) || 0,
        discount_1: parseFloat(r.discount_1) || 0,
        discount_2: parseFloat(r.discount_2) || 0,
        final_amount: parseFloat(r.final_amount) || null,
        coupon_code: String(r.coupon_code || '').trim() || null,
        campaign: String(r.campaign || '').trim() || null,
        lens_included: lensIncluded,
        lens_category: String(r.lens_category || '').trim() || null
      });
    }
  }

  // D) Create sync_log entry
  let syncLogId = null;
  try {
    const { data: logRow, error: logErr } = await sb.from(T.SYNC_LOG).insert({
      filename,
      source_ref: 'manual',
      status: 'partial',
      rows_total: rows.length,
      rows_success: 0,
      rows_pending: 0,
      rows_error: errorDetails.length
    }).select('id').single();
    if (logErr) throw logErr;
    syncLogId = logRow.id;
  } catch (e) {
    hideLoading();
    toast('שגיאה ביצירת רשומת סנכרון: ' + e.message, 'e');
    return;
  }

  // E) Process valid rows
  let rowsSuccess = 0;
  let rowsPending = 0;
  let rowsError = errorDetails.length;

  for (const row of validRows) {
    try {
      // Look up inventory by barcode
      const { data: invRows, error: invErr } = await sb.from(T.INV)
        .select('id, quantity')
        .eq('barcode', row.barcode)
        .eq('is_deleted', false)
        .limit(1);

      if (invErr) throw invErr;

      if (invRows && invRows.length > 0) {
        // Case 1 — barcode found
        const inv = invRows[0];
        let newQty;
        if (row.action_type === 'sale') {
          newQty = Math.max(0, inv.quantity - row.quantity);
        } else {
          newQty = inv.quantity + row.quantity;
        }

        const { error: updErr } = await sb.from(T.INV)
          .update({ quantity: newQty })
          .eq('id', inv.id);
        if (updErr) throw updErr;

        writeLog(
          row.action_type === 'sale' ? 'reduce_qty' : 'return_qty',
          inv.id,
          {
            reason: 'sale_from_access',
            quantity: row.quantity,
            qty_before: inv.quantity,
            qty_after: newQty,
            order_number: row.order_number,
            source_ref: 'manual',
            filename: filename,
            sale_amount: row.sale_amount,
            discount: row.discount,
            discount_1: row.discount_1,
            discount_2: row.discount_2,
            final_amount: row.final_amount,
            coupon_code: row.coupon_code,
            campaign: row.campaign,
            employee_id: row.employee_id,
            lens_included: row.lens_included,
            lens_category: row.lens_category
          }
        );
        rowsSuccess++;
      } else {
        // Case 2 — barcode not found → pending_sales
        const { error: pendErr } = await sb.from(T.PENDING_SALES).insert({
          sync_log_id: syncLogId,
          source_ref: 'manual',
          filename,
          barcode_received: row.barcode,
          quantity: row.quantity,
          action_type: row.action_type,
          transaction_date: row.transaction_date,
          order_number: row.order_number,
          employee_id: row.employee_id,
          sale_amount: row.sale_amount,
          discount: row.discount,
          discount_1: row.discount_1,
          discount_2: row.discount_2,
          final_amount: row.final_amount,
          coupon_code: row.coupon_code,
          campaign: row.campaign,
          lens_included: row.lens_included,
          lens_category: row.lens_category,
          reason: 'ברקוד לא נמצא במלאי',
          status: 'pending'
        });
        if (pendErr) throw pendErr;
        rowsPending++;
      }
    } catch (e) {
      console.warn(`Row error (${row.barcode}):`, e.message || e);
      rowsError++;
    }
  }

  // F) Update sync_log with final counts
  const finalStatus = (rowsError === 0 && rowsPending === 0) ? 'success'
    : (rowsSuccess === 0 && rowsPending === 0) ? 'error'
    : 'partial';
  try {
    await sb.from(T.SYNC_LOG).update({
      status: finalStatus,
      rows_success: rowsSuccess,
      rows_pending: rowsPending,
      rows_error: rowsError,
      processed_at: new Date().toISOString()
    }).eq('id', syncLogId);
  } catch (e) { /* silent */ }

  hideLoading();

  // G) Show results
  const rd = $('red-results');
  rd.style.display = 'block';
  rd.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card"><div class="num" style="color:var(--success)">${rowsSuccess}</div><div class="lbl">הצליחו</div></div>
      <div class="summary-card"><div class="num" style="color:var(--warn)">${rowsPending}</div><div class="lbl">ממתינים</div></div>
      <div class="summary-card"><div class="num" style="color:var(--error)">${rowsError}</div><div class="lbl">שגיאות</div></div>
    </div>
    ${errorDetails.length ? `<div class="alert alert-w" style="max-height:200px;overflow-y:auto">${errorDetails.map(e =>
      `שורה ${e.rowNum} (${e.barcode || '?'}): ${e.errors.join(', ')}`
    ).join('<br>')}</div>` : ''}
  `;
  $('red-preview').style.display = 'none';

  toast(
    `יובאו ${rowsSuccess} שורות בהצלחה. ${rowsPending} ממתינות לטיפול. ${rowsError} שגיאות.`,
    rowsError > 0 ? 'w' : 's'
  );

  // H) Refresh Access sync badges
  if (typeof loadPendingBadge === 'function') loadPendingBadge();
  if (typeof loadSyncLog === 'function') loadSyncLog();
}

// =========================================================
// TAB 2: REDUCTION — Manual
// =========================================================

async function loadModelsForBrand(brandName) {
  const list = $('red-model-list');
  if (list) list.innerHTML = '';
  $('red-model').value = '';
  // Reset downstream cascades
  clearSizeColorLists();

  const brandId = brandCache[brandName];
  if (!brandId) return;

  const { data } = await sb.from('inventory')
    .select('model')
    .eq('brand_id', brandId)
    .eq('is_deleted', false)
    .gt('quantity', 0)
    .order('model');

  const models = [...new Set((data || []).map(r => r.model).filter(Boolean))];
  if (list) {
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      list.appendChild(opt);
    });
  }
}

function clearSizeColorLists() {
  const sl = $('red-size-list');
  const cl = $('red-color-list');
  if (sl) sl.innerHTML = '';
  if (cl) cl.innerHTML = '';
  $('red-size').value = '';
  $('red-color').value = '';
}

async function loadSizesAndColors() {
  const brandName = $('red-brand').value;
  const model = $('red-model').value.trim();
  clearSizeColorLists();

  const brandId = brandCache[brandName];
  if (!brandId || !model) return;

  const { data } = await sb.from('inventory')
    .select('size, color')
    .eq('brand_id', brandId)
    .eq('model', model)
    .eq('is_deleted', false)
    .gt('quantity', 0);

  const sizes  = [...new Set((data || []).map(r => r.size).filter(Boolean))].sort();
  const colors = [...new Set((data || []).map(r => r.color).filter(Boolean))].sort();

  const sl = $('red-size-list');
  const cl = $('red-color-list');
  if (sl) sl.innerHTML = sizes.map(s => `<option value="${s}">`).join('');
  if (cl) cl.innerHTML = colors.map(c => `<option value="${c}">`).join('');
}

async function searchManual() {
  const barcode = $('red-barcode').value.trim();
  const brand = $('red-brand').value;
  const model = $('red-model').value.trim();
  const size = $('red-size').value.trim();
  const color = $('red-color').value.trim();

  if (!barcode && !brand && !model) { toast('יש להזין ברקוד או פרטים לחיפוש', 'w'); return; }

  showLoading('מחפש...');
  clearAlert('red-manual-alerts');
  const resultDiv = $('red-result');

  try {
    const filters = [['is_deleted','eq',false]];
    if (barcode) {
      filters.push(['barcode','eq',barcode]);
    } else {
      if (brand) filters.push(['brand_id','eq',brandCache[brand]||'']);
      if (model) filters.push(['model','eq',model]);
      if (size) filters.push(['size','eq',size]);
      if (color) filters.push(['color','eq',color]);
    }
    const recs = await fetchAll(T.INV, filters);
    redSearchResults = recs;
    if (!recs.length) {
      resultDiv.innerHTML = '<div class="alert alert-e">&#10006; לא נמצאו תוצאות</div>';
      hideLoading();
      return;
    }
    resultDiv.innerHTML = recs.map(r => {
      const f = r.fields;
      const qty = f['כמות'] ?? 0;
      const qtyColor = qty > 0 ? 'var(--success)' : 'var(--error)';
      return `<div class="card" style="border-right:4px solid var(--accent);margin-top:12px">
        <div class="form-row">
          <div class="form-group"><label>ברקוד</label><strong style="font-family:monospace">${f['ברקוד']||'—'}</strong></div>
          <div class="form-group"><label>חברה/מותג</label><strong>${f['חברה / מותג']||'—'}</strong></div>
          <div class="form-group"><label>דגם</label><strong>${f['דגם']||'—'}</strong></div>
          <div class="form-group"><label>גודל</label><strong>${f['גודל']||'—'}</strong></div>
          <div class="form-group"><label>צבע</label><strong>${f['צבע']||'—'}</strong></div>
          <div class="form-group"><label>כמות</label><strong style="color:${qtyColor}">${qty}</strong></div>
          <div class="form-group"><label>סנכרון אתר</label><strong>${f['סנכרון אתר']||'—'}</strong></div>
          <div class="form-group"><label>סטטוס</label><strong>${f['סטטוס']||'—'}</strong></div>
        </div>
        ${qty > 0 ? `<button class="btn btn-d" onclick="openReductionModal('${r.id}')">&#128230; הורדה מהמלאי</button>` : '<span style="color:var(--error);font-weight:600">פריט לא במלאי</span>'}
      </div>`;
    }).join('');
  } catch(e) {
    resultDiv.innerHTML = `<div class="alert alert-e">שגיאה: ${e.message||''}</div>`;
  }
  hideLoading();
}

function openReductionModal(recId) {
  const rec = redSearchResults.find(r => r.id === recId);
  if (!rec) { toast('פריט לא נמצא', 'e'); return; }
  const f = rec.fields;
  const currentQty = parseInt(f['כמות']) || 0;

  reduceModalState = {
    id: recId, currentQty,
    barcode: f['ברקוד'] || '',
    brand: f['חברה / מותג'] || '',
    model: f['דגם'] || ''
  };

  $('reduce-modal-item').textContent = [f['ברקוד'], f['חברה / מותג'], f['דגם']].filter(Boolean).join(' | ');
  $('reduce-modal-current').textContent = currentQty;
  $('reduce-modal-amount').value = 1;
  $('reduce-modal-amount').max = currentQty;
  $('reduce-modal-reason').value = '';
  $('reduce-modal-pin').value = '';

  $('reduce-modal').style.display = 'flex';
  $('reduce-modal-reason').focus();
}

async function confirmReduction() {
  const { id, currentQty, barcode, brand, model } = reduceModalState;
  const amount = parseInt($('reduce-modal-amount').value) || 0;
  const reason = $('reduce-modal-reason').value;
  const pin = $('reduce-modal-pin').value.trim();

  if (amount < 1) { toast('כמות חייבת להיות 1 לפחות', 'w'); return; }
  if (!reason) { toast('יש לבחור סיבה', 'w'); return; }
  if (!pin) { toast('יש להזין סיסמת עובד', 'w'); return; }
  if (amount > currentQty) { toast(`לא ניתן להוריד יותר מ-${currentQty} יחידות`, 'e'); return; }

  // Verify PIN
  const { data: emp } = await sb.from('employees').select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle();
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); $('reduce-modal-pin').value = ''; $('reduce-modal-pin').focus(); return; }
  sessionStorage.setItem('prizma_user', emp.name);

  const newQty = currentQty - amount;
  const updateFields = { 'כמות': newQty };
  // Status logic: only set 'sold' when qty=0 AND reason is 'נמכר'
  if (newQty === 0 && reason === 'נמכר') {
    updateFields['סטטוס'] = 'נמכר';
  }

  // Action mapping
  let action = 'manual_remove';
  if (reason === 'נמכר') action = 'sale';
  else if (reason === 'נשלח לזיכוי') action = 'credit_return';

  try {
    await batchUpdate(T.INV, [{ id, fields: updateFields }]);
    await writeLog(action, id, {
      barcode, brand, model,
      qty_before: currentQty,
      qty_after: newQty,
      reason,
      source_ref: 'הורדת מלאי ידנית'
    });
    closeModal('reduce-modal');
    toast(`כמות עודכנה: ${currentQty} → ${newQty} (${reason})`, 's');
    $('red-result').innerHTML = `<div class="alert alert-s">&#10004; ${brand} ${model} — כמות ${currentQty} → ${newQty} (${reason})</div>`;
  } catch(e) {
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
}


// =========================================================
// TAB: FULL INVENTORY
// =========================================================
let invData = [];
let invFiltered = [];
let invChanges = {};
let invSelected = new Set();
let invSortField = '';
let invSortDir = 0; // 0=none, 1=asc, -1=desc

async function loadInventoryTab() {
  showLoading('טוען מלאי ראשי...');
  clearAlert('inv-alerts');
  invChanges = {};
  invSelected.clear();
  $('inv-edit-notice').style.display = 'none';
  updateSelectionUI();
  try {
    invData = await fetchAll(T.INV, [['is_deleted','eq',false]]);
    const supplierSel = $('inv-filter-supplier');
    const curVal = supplierSel.value;
    supplierSel.innerHTML = '<option value="">הכל</option>' + suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
    supplierSel.value = curVal;
    $('inv-count').textContent = invData.length;
    filterInventoryTable();
    const isAdm = document.body.classList.contains('admin-mode');
    $('inv-admin-bar').style.display = isAdm ? 'flex' : 'none';
  } catch(e) {
    setAlert('inv-alerts', 'שגיאה בטעינת מלאי: '+(e.message||''), 'e');
  }
  hideLoading();
}

function filterInventoryTable() {
  const search = ($('inv-search')?.value || '').trim().toLowerCase();
  const supplier = $('inv-filter-supplier')?.value || '';
  const ptype = $('inv-filter-ptype')?.value || '';
  const qtyFilter = $('inv-filter-qty')?.value || '';

  invFiltered = invData.filter(r => {
    const f = r.fields;
    if (supplier && f['ספק'] !== supplier) return false;
    if (ptype && f['סוג מוצר'] !== ptype) return false;
    if (qtyFilter === '1' && (f['כמות'] || 0) <= 0) return false;
    if (qtyFilter === '0' && (f['כמות'] || 0) > 0) return false;
    if (search) {
      const hay = [f['ברקוד'],f['ספק'],f['חברה / מותג'],f['דגם'],f['גודל'],f['צבע'],f['סוג מוצר'],f['הערות']].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  $('inv-shown').textContent = invFiltered.length;
  renderInventoryRows(invFiltered);
}

function renderInventoryRows(recs) {
  const isAdm = document.body.classList.contains('admin-mode');
  const tb = $('inv-body');
  const display = recs.slice(0, 500);
  tb.innerHTML = display.map((r, i) => {
    const f = r.fields;
    const bc = f['ברקוד'] || '';
    const qty = f['כמות'] ?? 0;
    const qC = qty > 0 ? 'var(--success)' : 'var(--error)';
    const sp = f['מחיר מכירה'] || 0;
    const sd = f['הנחה מכירה %'] ? Math.round(f['הנחה מכירה %'] * 100) : 0;
    const cp = f['מחיר עלות'] || 0;
    const cd = f['הנחה עלות %'] ? Math.round(f['הנחה עלות %'] * 100) : 0;
    const sel = invSelected.has(r.id) ? ' selected-row' : '';
    const chk = invSelected.has(r.id) ? ' checked' : '';
    const imgs = f['תמונות'] || [];
    const imgCell = imgs.length > 0
      ? `<img class="img-thumb" src="${imgs[0].thumbnails?.small?.url || imgs[0].url}" onclick="showImagePreview('${r.id}')" title="${imgs.length} תמונות">`
      : '<span class="no-img">—</span>';
    const syncVal = f['סנכרון אתר'] || '';
    return `<tr data-id="${r.id}" class="${sel}">
      <td><button style="background:none;border:none;cursor:pointer;font-size:1rem" onclick="openItemHistory('${r.id}','${bc}','${(f['חברה / מותג']||'').replace(/'/g,"\\'")}','${(f['דגם']||'').replace(/'/g,"\\'")}')" title="היסטוריה">📋</button></td>
      <td><input type="checkbox"${chk} onchange="toggleRowSelect('${r.id}',this.checked)"></td>
      <td>${i+1}</td>
      <td class="barcode-cell">${bc}</td>
      <td>${f['ספק']||''}</td>
      <td>${f['חברה / מותג']||''}${(window.lowStockData||[]).some(b=>b.name===f['חברה / מותג'])?' <span style="background:#f44336;color:white;border-radius:4px;padding:1px 5px;font-size:11px;margin-right:4px">&#9888;</span>':''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'דגם\')"':''}>${f['דגם']||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'גודל\')"':''}>${f['גודל']||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'גשר\')"':''}>${f['גשר']||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'צבע\')"':''}>${f['צבע']||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'אורך מוט\')"':''}>${f['אורך מוט']||''}</td>
      <td>${f['סוג מוצר']||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'מחיר מכירה\',\'number\')"':''}>${sp}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'הנחה מכירה %\',\'pct\')"':''}>${sd}%</td>
      <td class="cost-col">${cp}</td>
      <td class="cost-col">${cd}%</td>
      <td style="font-weight:700;color:${qC}" data-qty-id="${r.id}">${qty}${isAdm?` <span class="qty-btns"><button class="qty-btn qty-plus" onclick="openQtyModal('${r.id}','add')" title="הוסף כמות">➕</button><button class="qty-btn qty-minus" onclick="openQtyModal('${r.id}','remove')" title="הוצא כמות">➖</button></span>`:''}</td>
      <td class="img-cell">${imgCell}</td>
      <td${isAdm?' class="editable" onclick="invEditSync(this)"':''}>${syncVal}</td>
      ${isAdm?`<td><button class="btn btn-d btn-sm" onclick="deleteInvRow('${r.id}')" title="מחק">🗑️</button></td>`:'<td class="admin-col"></td>'}
    </tr>`;
  }).join('');
  if (recs.length > 500) {
    tb.innerHTML += `<tr><td colspan="19" style="text-align:center;color:var(--warn);padding:12px">מוצגות 500 מתוך ${recs.length}. צמצם עם פילטרים.</td></tr>`;
  }
}

// ---- Selection & Bulk ----
function toggleRowSelect(id, checked) {
  if (checked) invSelected.add(id); else invSelected.delete(id);
  const tr = $('inv-body').querySelector(`tr[data-id="${id}"]`);
  if (tr) tr.classList.toggle('selected-row', checked);
  updateSelectionUI();
}

function toggleSelectAll(checked) {
  const displayed = invFiltered.slice(0, 500);
  displayed.forEach(r => { if (checked) invSelected.add(r.id); else invSelected.delete(r.id); });
  $('inv-body').querySelectorAll('tr[data-id]').forEach(tr => {
    const cb = tr.querySelector('input[type=checkbox]');
    if (cb) cb.checked = checked;
    tr.classList.toggle('selected-row', checked);
  });
  updateSelectionUI();
}

function clearSelection() {
  invSelected.clear();
  $('inv-select-all').checked = false;
  $('inv-body').querySelectorAll('tr[data-id]').forEach(tr => {
    const cb = tr.querySelector('input[type=checkbox]');
    if (cb) cb.checked = false;
    tr.classList.remove('selected-row');
  });
  updateSelectionUI();
}

function updateSelectionUI() {
  const n = invSelected.size;
  const isAdm = document.body.classList.contains('admin-mode');
  $('inv-sel-count').style.display = n > 0 ? 'inline' : 'none';
  $('inv-sel-num').textContent = n;
  $('inv-bulk-bar').style.display = (n > 0 && isAdm) ? 'flex' : 'none';
}

async function applyBulkUpdate() {
  if (!isAdmin) { toast('נדרשת הרשאת מנהל', 'e'); return; }
  const ids = Array.from(invSelected);
  if (!ids.length) { toast('לא נבחרו פריטים', 'w'); return; }

  const fields = {};
  const sp = $('bulk-sprice').value;
  const sd = $('bulk-sdisc').value;
  const cp = $('bulk-cprice').value;
  const cd = $('bulk-cdisc').value;
  const sync = $('bulk-sync').value;
  if (sp !== '') fields['מחיר מכירה'] = parseFloat(sp) || 0;
  if (sd !== '') fields['הנחה מכירה %'] = (parseFloat(sd) || 0) / 100;
  if (cp !== '') fields['מחיר עלות'] = parseFloat(cp) || 0;
  if (cd !== '') fields['הנחה עלות %'] = (parseFloat(cd) || 0) / 100;
  if (sync) fields['סנכרון אתר'] = sync;

  if (!Object.keys(fields).length) { toast('לא הוזנו ערכים לעדכון', 'w'); return; }

  // Validate sync change: require images, bridge, temple for מלא/תדמית
  if (sync === 'מלא' || sync === 'תדמית') {
    const problemItems = [];
    ids.forEach(id => {
      const rec = invData.find(r => r.id === id);
      if (!rec) return;
      const f = rec.fields;
      const missing = [];
      if (!(f['תמונות']||[]).length) missing.push('תמונה');
      if (!(f['גשר']||'').toString().trim()) missing.push('גשר');
      if (!(f['אורך מוט']||'').toString().trim()) missing.push('אורך מוט');
      if (missing.length) problemItems.push(`${f['ברקוד']||'?'}: חסר ${missing.join(', ')}`);
    });
    if (problemItems.length) {
      const show = problemItems.slice(0, 10).join('\n');
      const more = problemItems.length > 10 ? `\n...ועוד ${problemItems.length - 10}` : '';
      toast(`לא ניתן לסנכרן "${sync}" — ${problemItems.length} פריטים חסרי נתונים`, 'e');
      setAlert('inv-alerts', `<strong>פריטים שלא ניתן לסנכרן:</strong><br>${show.replace(/\n/g,'<br>')}${more}`, 'e');
      return;
    }
  }

  const desc = Object.entries(fields).map(([k,v]) => `${k}: ${typeof v==='number' && k.includes('%') ? Math.round(v*100)+'%' : v}`).join(', ');
  const ok = await confirmDialog('עדכון גורף', `לעדכן ${ids.length} פריטים?\n${desc}`);
  if (!ok) return;

  showLoading(`מעדכן ${ids.length} פריטים...`);
  try {
    const updates = ids.map(id => ({ id, fields: { ...fields } }));
    await batchUpdate(T.INV, updates);
    // Update local data
    ids.forEach(id => {
      const rec = invData.find(r => r.id === id);
      if (rec) Object.assign(rec.fields, fields);
    });
    // Clear bulk inputs
    $('bulk-sprice').value = '';
    $('bulk-sdisc').value = '';
    $('bulk-cprice').value = '';
    $('bulk-cdisc').value = '';
    $('bulk-sync').value = '';
    clearSelection();
    filterInventoryTable();
    toast(`${ids.length} פריטים עודכנו בהצלחה`, 's');
  } catch(e) {
    setAlert('inv-alerts', 'שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}

async function bulkDelete() {
  if (!isAdmin) { toast('נדרשת הרשאת מנהל', 'e'); return; }
  const ids = Array.from(invSelected);
  if (!ids.length) { toast('לא נבחרו פריטים', 'w'); return; }
  const ok = await confirmDialog('מחיקה גורפת', `למחוק ${ids.length} פריטים לצמיתות? פעולה זו בלתי הפיכה!`);
  if (!ok) return;

  showLoading(`מוחק ${ids.length} פריטים...`);
  try {
    const { error: delErr } = await sb.from('inventory').delete().in('id', ids);
    if (delErr) throw new Error(delErr.message);
    invData = invData.filter(r => !ids.includes(r.id));
    clearSelection();
    $('inv-count').textContent = invData.length;
    filterInventoryTable();
    toast(`${ids.length} פריטים נמחקו`, 's');
  } catch(e) {
    setAlert('inv-alerts', 'שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}

// ---- Single cell edit ----
function invEdit(td, field, type) {
  if (td.classList.contains('editing')) return;
  const tr = td.closest('tr');
  const recId = tr.dataset.id;
  const rec = invData.find(r => r.id === recId);
  if (!rec) return;

  let curVal = rec.fields[field] || '';
  if (type === 'pct') curVal = rec.fields[field] ? Math.round(rec.fields[field] * 100) : 0;
  if (type === 'number') curVal = rec.fields[field] || 0;

  td.classList.add('editing');
  const input = document.createElement('input');
  input.type = (type === 'number' || type === 'pct') ? 'number' : 'text';
  input.value = curVal;
  td.textContent = '';
  td.appendChild(input);
  input.focus();
  input.select();

  const save = () => {
    td.classList.remove('editing');
    let newVal = input.value.trim();
    if (type === 'number') newVal = parseFloat(newVal) || 0;
    else if (type === 'pct') newVal = (parseFloat(newVal) || 0) / 100;

    const origVal = rec.fields[field] || (type === 'number' || type === 'pct' ? 0 : '');
    if (newVal !== origVal) {
      if (!invChanges[recId]) invChanges[recId] = {};
      invChanges[recId][field] = newVal;
      rec.fields[field] = newVal;
      td.classList.add('changed');
      $('inv-edit-notice').style.display = 'inline';
    }

    if (type === 'pct') td.textContent = Math.round((rec.fields[field]||0)*100) + '%';
    else td.textContent = rec.fields[field] || '';
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { td.classList.remove('editing'); td.textContent = type==='pct' ? Math.round((rec.fields[field]||0)*100)+'%' : (rec.fields[field]||''); }
  });
}

// ---- Sync cell edit (select dropdown with validation) ----
function invEditSync(td) {
  if (!isAdmin) return;
  if (td.classList.contains('editing')) return;
  const tr = td.closest('tr');
  const recId = tr.dataset.id;
  const rec = invData.find(r => r.id === recId);
  if (!rec) return;

  const curVal = rec.fields['סנכרון אתר'] || '';
  td.classList.add('editing');
  const sel = document.createElement('select');
  ['', 'מלא', 'תדמית', 'לא'].forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v || '—';
    if (v === curVal) o.selected = true;
    sel.appendChild(o);
  });
  td.textContent = '';
  td.appendChild(sel);
  sel.focus();

  const save = () => {
    td.classList.remove('editing');
    const newVal = sel.value;
    // Validation: sync=מלא or תדמית requires images, bridge, temple length
    if (newVal === 'מלא' || newVal === 'תדמית') {
      const imgs = rec.fields['תמונות'] || [];
      const bridge = (rec.fields['גשר'] || '').toString().trim();
      const temple = (rec.fields['אורך מוט'] || '').toString().trim();
      const missing = [];
      if (!imgs.length) missing.push('תמונה');
      if (!bridge) missing.push('גשר');
      if (!temple) missing.push('אורך מוט');
      if (missing.length) {
        toast(`לא ניתן לסנכרן "${newVal}" — חסרים: ${missing.join(', ')}`, 'e');
        td.textContent = curVal;
        return;
      }
    }
    if (newVal !== curVal) {
      if (!invChanges[recId]) invChanges[recId] = {};
      invChanges[recId]['סנכרון אתר'] = newVal;
      rec.fields['סנכרון אתר'] = newVal;
      td.classList.add('changed');
      $('inv-edit-notice').style.display = 'inline';
    }
    td.textContent = rec.fields['סנכרון אתר'] || '';
  };

  sel.addEventListener('blur', save);
  sel.addEventListener('change', () => sel.blur());
  sel.addEventListener('keydown', e => {
    if (e.key === 'Escape') { td.classList.remove('editing'); td.textContent = curVal; }
  });
}

// ---- Image preview ----
function showImagePreview(recId) {
  const rec = invData.find(r => r.id === recId);
  if (!rec) return;
  const imgs = rec.fields['תמונות'] || [];
  if (!imgs.length) { toast('אין תמונות לפריט זה', 'w'); return; }
  const f = rec.fields;
  $('img-preview-title').textContent = `${f['חברה / מותג']||''} ${f['דגם']||''} (${f['ברקוד']||''})`;
  $('img-gallery').innerHTML = imgs.map(img =>
    `<img src="${img.thumbnails?.large?.url || img.url}" alt="תמונת פריט">`
  ).join('');
  $('image-preview-modal').style.display = 'flex';
}

// ---- Column sorting ----
function sortInventory(th) {
  const field = th.dataset.field;
  // Toggle sort direction
  if (invSortField === field) {
    invSortDir = invSortDir === 1 ? -1 : invSortDir === -1 ? 0 : 1;
  } else {
    invSortField = field;
    invSortDir = 1;
  }
  // Update header UI
  document.querySelectorAll('#inv-table th.sortable').forEach(h => {
    h.classList.remove('sort-asc', 'sort-desc');
    h.querySelector('.sort-icon').innerHTML = '&#9650;';
  });
  if (invSortDir !== 0) {
    th.classList.add(invSortDir === 1 ? 'sort-asc' : 'sort-desc');
    th.querySelector('.sort-icon').innerHTML = invSortDir === 1 ? '&#9650;' : '&#9660;';
  }
  // Sort the filtered data
  if (invSortDir === 0) {
    filterInventoryTable();
    return;
  }
  const numericFields = ['מחיר מכירה', 'כמות', 'גודל', 'גשר', 'אורך מוט'];
  const isNum = numericFields.includes(field);
  invFiltered.sort((a, b) => {
    let va = a.fields[field] ?? '';
    let vb = b.fields[field] ?? '';
    if (isNum) {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
      return (va - vb) * invSortDir;
    }
    va = String(va).toLowerCase();
    vb = String(vb).toLowerCase();
    return va.localeCompare(vb, 'he') * invSortDir;
  });
  renderInventoryRows(invFiltered);
}

async function saveInventoryChanges() {
  const ids = Object.keys(invChanges);
  if (!ids.length) { toast('אין שינויים לשמור', 'w'); return; }
  const ok = await confirmDialog('שמירת שינויים', `לעדכן ${ids.length} רשומות במלאי?`);
  if (!ok) return;

  showLoading('שומר שינויים...');
  try {
    // Capture before-values for logging
    const beforeMap = {};
    for (const id of ids) {
      const rec = invData.find(r => r.id === id);
      if (rec) beforeMap[id] = { ...rec.fields };
    }
    // Strip quantity — must use ➕➖ buttons only
    for (const id of ids) { delete invChanges[id]['כמות']; if (!Object.keys(invChanges[id]).length) delete invChanges[id]; }
    const filteredIds = Object.keys(invChanges);
    if (!filteredIds.length) { toast('אין שינויים לשמור (כמות משתנה רק דרך ➕➖)', 'w'); hideLoading(); return; }

    const updates = filteredIds.map(id => ({ id, fields: invChanges[id] }));
    await batchUpdate(T.INV, updates);
    // Log each change
    for (const id of filteredIds) {
      const before = beforeMap[id] || {};
      const changed = invChanges[id] || {};
      const base = { barcode: before['ברקוד'], brand: before['חברה / מותג'], model: before['דגם'] };
      // Price changed
      if ('מחיר מכירה' in changed && changed['מחיר מכירה'] !== before['מחיר מכירה']) {
        writeLog('edit_price', id, { ...base, price_before: before['מחיר מכירה'] ?? 0, price_after: changed['מחיר מכירה'] ?? 0 });
      }
      // Other fields changed (not qty/price)
      const otherKeys = Object.keys(changed).filter(k => k !== 'כמות' && k !== 'מחיר מכירה');
      if (otherKeys.length) {
        writeLog('edit_details', id, { ...base, reason: 'עריכת פרטים' });
      }
    }
    invChanges = {};
    $('inv-edit-notice').style.display = 'none';
    toast(`${ids.length} רשומות עודכנו בהצלחה`, 's');
    loadInventoryTab();
  } catch(e) {
    const msg = e.message || '';
    if (msg.includes('כבר קיים במערכת') || msg.includes('כפול')) {
      toast('ברקוד זה כבר קיים במערכת', 'e');
    }
    setAlert('inv-alerts', 'שגיאה: ' + msg, 'e');
  }
  hideLoading();
}
