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
      const sync = rec.website_sync || '';

      const mismatches = [];
      if (row['חברה'] && row['חברה'] !== rec.brand_name) mismatches.push(`חברה: "${row['חברה']}" ≠ "${rec.brand_name}"`);
      if (row['דגם'] && row['דגם'] !== rec.model) mismatches.push(`דגם: "${row['דגם']}" ≠ "${rec.model}"`);

      if (mismatches.length) {
        results.mismatch.push({ barcode, reason: mismatches.join(', '), row });
        continue;
      }

      if (sync === 'full') {
        const qtyBefore = rec.quantity || 1;
        const delta = parseInt(row['כמות'] || row['כמות שנמכרה']) || 1;
        const qty = Math.max(0, qtyBefore - delta);
        const { error: decErr } = await sb.rpc('decrement_inventory', { inv_id: rec.id, delta: delta });
        if (decErr) throw decErr;
        if (qty === 0) {
          await batchUpdate(T.INV, [{ id: rec.id, status: heToEn('status', 'נמכר') }]);
        }
        writeLog('sale', rec.id, { barcode, brand: rec.brand_name, model: rec.model, qty_before: qtyBefore, qty_after: qty, source_ref: redExcelFileName || 'ייבוא אדום' });
        results.updated.push({ barcode, model: rec.model || barcode });
      } else if (sync === 'display') {
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
      `<div style="padding:8px;border-bottom:1px solid var(--g200)"><strong>${escapeHtml(m.barcode)}</strong>: ${escapeHtml(m.reason)}</div>`
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
    ${results.updated.length ? `<div class="alert alert-s">&#10004; עודכנו: ${results.updated.map(r=>escapeHtml(r.model)).join(', ')}</div>` : ''}
    ${results.skipped.length ? `<div class="alert alert-w">${results.skipped.map(r=>`${escapeHtml(r.barcode)}: ${escapeHtml(r.reason)}`).join('<br>')}</div>` : ''}
  `;
  toast('עיבוד הושלם', 's');
  hideLoading();
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
  if (sl) sl.innerHTML = sizes.map(s => `<option value="${escapeHtml(s)}">`).join('');
  if (cl) cl.innerHTML = colors.map(c => `<option value="${escapeHtml(c)}">`).join('');
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
      const qty = r.quantity ?? 0;
      const qtyColor = qty > 0 ? 'var(--success)' : 'var(--error)';
      return `<div class="card" style="border-right:4px solid var(--accent);margin-top:12px">
        <div class="form-row">
          <div class="form-group"><label>ברקוד</label><strong style="font-family:monospace">${escapeHtml(r.barcode)||'—'}</strong></div>
          <div class="form-group"><label>חברה/מותג</label><strong>${escapeHtml(r.brand_name)||'—'}</strong></div>
          <div class="form-group"><label>דגם</label><strong>${escapeHtml(r.model)||'—'}</strong></div>
          <div class="form-group"><label>גודל</label><strong>${escapeHtml(r.size)||'—'}</strong></div>
          <div class="form-group"><label>צבע</label><strong>${escapeHtml(r.color)||'—'}</strong></div>
          <div class="form-group"><label>כמות</label><strong style="color:${qtyColor}">${qty}</strong></div>
          <div class="form-group"><label>סנכרון אתר</label><strong>${enToHe('website_sync', r.website_sync)||'—'}</strong></div>
          <div class="form-group"><label>סטטוס</label><strong>${enToHe('status', r.status)||'—'}</strong></div>
        </div>
        ${qty > 0 ? `<button class="btn btn-d btn-reduce" data-id="${escapeHtml(r.id)}">&#128230; הורדה מהמלאי</button>` : '<span style="color:var(--error);font-weight:600">פריט לא במלאי</span>'}
      </div>`;
    }).join('');
  } catch(e) {
    resultDiv.innerHTML = `<div class="alert alert-e">שגיאה: ${escapeHtml(e.message)||''}</div>`;
  }
  hideLoading();
}

function openReductionModal(recId) {
  const rec = redSearchResults.find(r => r.id === recId);
  if (!rec) { toast('פריט לא נמצא', 'e'); return; }
  const currentQty = parseInt(rec.quantity) || 0;

  reduceModalState = {
    id: recId, currentQty,
    barcode: rec.barcode || '',
    brand: rec.brand_name || '',
    model: rec.model || ''
  };

  $('reduce-modal-item').textContent = [rec.barcode, rec.brand_name, rec.model].filter(Boolean).join(' | ');
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
  const emp = await verifyPinOnly(pin);
  if (!emp) { toast('סיסמת עובד שגויה', 'e'); $('reduce-modal-pin').value = ''; $('reduce-modal-pin').focus(); return; }
  sessionStorage.setItem('prizma_user', emp.name);

  const newQty = currentQty - amount;

  // Action mapping
  let action = 'manual_remove';
  if (reason === 'נמכר') action = 'sale';
  else if (reason === 'נשלח לזיכוי') action = 'credit_return';

  try {
    const { error: decErr } = await sb.rpc('decrement_inventory', { inv_id: id, delta: amount });
    if (decErr) throw decErr;
    if (newQty === 0 && reason === 'נמכר') {
      await batchUpdate(T.INV, [{ id, status: heToEn('status', 'נמכר') }]);
    }
    await writeLog(action, id, {
      barcode, brand, model,
      qty_before: currentQty,
      qty_after: newQty,
      reason,
      source_ref: 'הורדת מלאי ידנית'
    });
    closeModal('reduce-modal');
    toast(`כמות עודכנה: ${currentQty} → ${newQty} (${reason})`, 's');
    $('red-result').innerHTML = `<div class="alert alert-s">&#10004; ${escapeHtml(brand)} ${escapeHtml(model)} — כמות ${currentQty} → ${newQty} (${reason})</div>`;
  } catch(e) {
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
}