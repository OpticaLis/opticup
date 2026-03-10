// =========================================================
// TAB 1: ENTRY — Manual
// =========================================================
let entryRowNum = 0;

function addEntryRow(copyFrom) {
  entryRowNum++;
  const tb = $('entry-body');
  const prev = copyFrom || tb.lastElementChild;

  const tr = document.createElement('div');
  tr.className = 'item-card';
  tr.dataset.row = entryRowNum;

  tr.innerHTML = `
    <div class="card-header">
      <div class="card-num">${entryRowNum}</div>
      <div class="action-btns">
        <button class="btn btn-g btn-sm" onclick="copyEntryRow(this)" title="שכפל שורה">&#128203; העתק</button>
        <button class="btn btn-d btn-sm" onclick="removeEntryRow(this)" title="מחק שורה">&#10006;</button>
      </div>
    </div>
    <div class="card-row">
      <div class="card-field" style="min-width:130px"><label>ספק <span class="req">*</span></label><select class="col-supplier">${supplierOpts()}</select></div>
      <div class="card-field brand-cell" style="min-width:150px"><label>חברה/מותג <span class="req">*</span></label></div>
      <div class="card-field" style="min-width:90px"><label>סוג מותג</label><input class="col-brand-type" readonly placeholder="אוטו" tabindex="-1"></div>
      <div class="card-field"><label>דגם <span class="req">*</span></label><input class="col-model" placeholder="דגם"></div>
      <div class="card-field" style="min-width:80px"><label>גודל <span class="req">*</span></label><input class="col-size" placeholder="גודל"></div>
      <div class="card-field" style="min-width:70px"><label>גשר</label><input class="col-bridge" placeholder="גשר"></div>
      <div class="card-field"><label>צבע <span class="req">*</span></label><input class="col-color" placeholder="צבע"></div>
    </div>
    <div class="card-row">
      <div class="card-field" style="min-width:80px"><label>אורך מוט</label><input class="col-temple" placeholder="אורך מוט"></div>
      <div class="card-field" style="min-width:120px"><label>סוג מוצר <span class="req">*</span></label><select class="col-ptype">${productTypeOpts()}</select></div>
      <div class="card-field" style="min-width:100px"><label>מחיר מכירה <span class="req">*</span></label><input type="number" class="col-sprice" placeholder="₪" step="0.01"></div>
      <div class="card-field" style="min-width:80px"><label>הנחה % <span class="req">*</span></label><input type="number" class="col-sdisc" placeholder="%" min="0" max="100" value="0"></div>
      <div class="card-field cost-field" style="min-width:100px"><label>מחיר עלות</label><input type="number" class="col-cprice" placeholder="₪" step="0.01"></div>
      <div class="card-field cost-field" style="min-width:80px"><label>הנחה % עלות</label><input type="number" class="col-cdisc" placeholder="%" min="0" max="100"></div>
      <div class="card-field" style="min-width:90px"><label>סנכרון <span class="req">*</span></label><select class="col-sync">${syncOpts()}</select></div>
      <div class="card-field" style="min-width:150px"><label>תמונות</label><input type="file" class="col-images" multiple accept="image/*"><div class="img-preview"></div></div>
      <div class="card-field" style="min-width:90px"><label>ברקוד</label><div class="barcode-cell barcode-val"></div></div>
    </div>
  `;
  tb.appendChild(tr);

  // Get previous values for auto-fill
  let pSup = '', pBrand = '', pPtype = '', pSprice = '', pSdisc = '0', pCprice = '', pCdisc = '', pSync = '';
  let pModel = '', pColor = '', pTemple = '';
  if (prev && prev.classList?.contains('item-card')) {
    pSup = prev.querySelector('.col-supplier')?.value || '';
    pBrand = prev.querySelector('.col-brand')?.value || '';
    pPtype = prev.querySelector('.col-ptype')?.value || '';
    pSprice = prev.querySelector('.col-sprice')?.value || '';
    pSdisc = prev.querySelector('.col-sdisc')?.value || '0';
    pCprice = prev.querySelector('.col-cprice')?.value || '';
    pCdisc = prev.querySelector('.col-cdisc')?.value || '';
    pSync = prev.querySelector('.col-sync')?.value || '';
    // If copyFrom is provided, also copy model, color, temple
    if (copyFrom) {
      pModel = prev.querySelector('.col-model')?.value || '';
      pColor = prev.querySelector('.col-color')?.value || '';
      pTemple = prev.querySelector('.col-temple')?.value || '';
    }
  }

  // Insert searchable brand select
  const brandCell = tr.querySelector('.brand-cell');
  const ss = createSearchSelect(activeBrands().map(b=>b.name), pBrand, (val) => {
    tr.querySelector('.col-brand-type').value = getBrandType(val);
    const defSync = getBrandSync(val);
    if (defSync) tr.querySelector('.col-sync').value = defSync;
  });
  brandCell.appendChild(ss);

  // Auto-fill from previous
  if (pSup) tr.querySelector('.col-supplier').value = pSup;
  if (pBrand) tr.querySelector('.col-brand-type').value = getBrandType(pBrand);
  if (pPtype) tr.querySelector('.col-ptype').value = pPtype;
  if (pSprice) tr.querySelector('.col-sprice').value = pSprice;
  if (pSdisc) tr.querySelector('.col-sdisc').value = pSdisc;
  if (pCprice) tr.querySelector('.col-cprice').value = pCprice;
  if (pCdisc) tr.querySelector('.col-cdisc').value = pCdisc;
  if (pSync) tr.querySelector('.col-sync').value = pSync;
  if (pModel) tr.querySelector('.col-model').value = pModel;
  if (pColor) tr.querySelector('.col-color').value = pColor;
  if (pTemple) tr.querySelector('.col-temple').value = pTemple;

  // Image preview
  tr.querySelector('.col-images').onchange = function() {
    const preview = tr.querySelector('.img-preview');
    preview.innerHTML = '';
    Array.from(this.files).forEach(f => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      preview.appendChild(img);
    });
  };

  // Focus on model field for quick data entry (unless first row)
  if (entryRowNum > 1) {
    const focus = copyFrom ? tr.querySelector('.col-size') : tr.querySelector('.col-model');
    if (focus) setTimeout(() => focus.focus(), 50);
  }

  return tr;
}

function copyEntryRow(btn) {
  const srcTr = btn.closest('.item-card');
  addEntryRow(srcTr);
  const newTr = $('entry-body').lastElementChild;
  newTr.querySelector('.col-size').value = '';
  newTr.querySelector('.col-bridge').value = '';
  newTr.querySelector('.barcode-cell').textContent = '';
}

function removeEntryRow(btn) {
  const tr = btn.closest('.item-card');
  const ss = tr.querySelector('.search-select');
  if (ss && ss._dropdown) ss._dropdown.remove();
  tr.remove();
  renumberRows($('entry-body'));
  if (!$('entry-body').querySelectorAll('.item-card').length) {
    entryRowNum = 0;
    addEntryRow();
  }
}

function renumberRows(container) {
  container.querySelectorAll('.item-card').forEach((r,i) => {
    const num = r.querySelector('.card-num');
    if (num) num.textContent = i+1;
  });
}

function getEntryRows() {
  return Array.from($('entry-body').querySelectorAll('.item-card')).map(tr => ({
    tr,
    supplier: tr.querySelector('.col-supplier')?.value || '',
    brand: tr.querySelector('.col-brand')?.value || '',
    brandType: tr.querySelector('.col-brand-type')?.value || '',
    model: tr.querySelector('.col-model')?.value?.trim() || '',
    size: tr.querySelector('.col-size')?.value?.trim() || '',
    bridge: tr.querySelector('.col-bridge')?.value?.trim() || '',
    color: tr.querySelector('.col-color')?.value?.trim() || '',
    temple: tr.querySelector('.col-temple')?.value?.trim() || '',
    ptype: tr.querySelector('.col-ptype')?.value || '',
    sprice: tr.querySelector('.col-sprice')?.value || '',
    sdisc: tr.querySelector('.col-sdisc')?.value || '0',
    cprice: tr.querySelector('.col-cprice')?.value || '',
    cdisc: tr.querySelector('.col-cdisc')?.value || '',
    sync: tr.querySelector('.col-sync')?.value || '',
    images: tr.querySelector('.col-images')?.files || [],
    barcode: tr.querySelector('.barcode-cell')?.textContent?.trim() || ''
  }));
}

function validateEntryRows() {
  const rows = getEntryRows();
  const errs = [];
  rows.forEach((r,i) => {
    r.tr.classList.remove('row-err');
    let hasErr = false;
    const checks = [
      [r.supplier, '.col-supplier', 'ספק'],
      [r.brand, '.col-brand', 'חברה/מותג'],
      [r.model, '.col-model', 'דגם'],
      [r.size, '.col-size', 'גודל'],
      [r.color, '.col-color', 'צבע'],
      [r.sprice, '.col-sprice', 'מחיר מכירה'],
      [r.ptype, '.col-ptype', 'סוג מוצר'],
      [r.sync, '.col-sync', 'סנכרון אתר'],
    ];
    checks.forEach(([val, sel, label]) => {
      const el = r.tr.querySelector(sel);
      if (!val) {
        hasErr = true;
        if (el) el.classList.add('err');
        errs.push(`שורה ${i+1}: חסר ${label}`);
      } else if (el) {
        el.classList.remove('err');
      }
    });
    // Image required for luxury/brand types
    if ((r.brandType === 'יוקרה' || r.brandType === 'מותג') && r.images.length === 0) {
      hasErr = true;
      errs.push(`שורה ${i+1}: חובה תמונה לסוג מותג "${r.brandType}"`);
    }
    // Image required for sync=מלא/תדמית
    if ((r.sync === 'מלא' || r.sync === 'תדמית') && r.images.length === 0) {
      hasErr = true;
      errs.push(`שורה ${i+1}: חובה תמונה לסנכרון "${r.sync}"`);
    }
    if (hasErr) r.tr.classList.add('row-err');
  });
  return errs;
}

async function submitEntry() {
  const rows = getEntryRows();
  if (!rows.length) { toast('אין שורות', 'w'); return; }
  const errs = validateEntryRows();
  if (errs.length) {
    setAlert('entry-alerts', errs.join('<br>'), 'e');
    toast('יש שדות חובה חסרים', 'e');
    return;
  }
  if (rows.some(r => !r.barcode)) {
    toast('יש ליצור ברקודים לפני שליחה', 'w');
    return;
  }
  const ok = await confirmDialog('אישור שליחה', `האם הדבקת ברקודים על ${rows.length} המסגרות?`);
  if (!ok) return;

  showLoading('שולח פריטים למלאי...');
  clearAlert('entry-alerts');
  try {
    // Retry loop for duplicate barcode race condition (STAB-04)
    let created;
    let attempt = 0;
    while (attempt < 3) {
      const currentRows = attempt === 0 ? rows : getEntryRows();
      const records = currentRows.map(r => {
        const fields = {
          'ברקוד': r.barcode,
          'ספק': r.supplier,
          'חברה / מותג': r.brand,
          'דגם': r.model,
          'גודל': r.size,
          'צבע': r.color,
          'סוג מוצר': r.ptype,
          'מחיר מכירה': parseFloat(r.sprice) || 0,
          'הנחה מכירה %': (parseFloat(r.sdisc) || 0) / 100,
          'סטטוס': 'במלאי',
          'מקור': 'כניסת מלאי',
          'כמות': 1,
          'סנכרון אתר': r.sync || getBrandSync(r.brand) || 'לא',
        };
        if (r.bridge) fields['גשר'] = r.bridge;
        if (r.temple) fields['אורך מוט'] = r.temple;
        if (r.brandType) fields['סוג מותג'] = r.brandType;
        if (r.cprice) fields['מחיר עלות'] = parseFloat(r.cprice);
        if (r.cdisc) fields['הנחה עלות %'] = parseFloat(r.cdisc) / 100;
        return {fields};
      });
      try {
        created = await batchCreate(T.INV, records);
        break;
      } catch (batchErr) {
        const errMsg = batchErr.message || '';
        const isDupe = errMsg.includes('23505') || errMsg.includes('כבר קיימים') || errMsg.includes('כפול');
        if (isDupe && attempt < 2) {
          attempt++;
          await loadMaxBarcode();
          await generateBarcodes('entry');
          continue;
        }
        if (isDupe) {
          throw new Error('לא ניתן ליצור ברקוד ייחודי לאחר 3 ניסיונות. נסה שוב.');
        }
        throw batchErr;
      }
    }
    // Log each created item
    for (const item of created) {
      writeLog('entry_manual', item.id, {
        barcode:    item.fields['ברקוד'],
        brand:      item.fields['חברה / מותג'],
        model:      item.fields['דגם'],
        qty_before: 0,
        qty_after:  item.fields['כמות'] || 1,
        source_ref: 'הכנסה ידנית'
      });
    }
    setAlert('entry-alerts', `&#10004; ${records.length} פריטים נכנסו למלאי בהצלחה`, 's');
    toast(`${records.length} פריטים נשלחו!`, 's');
    // Clean up dropdowns
    $('entry-body').querySelectorAll('.search-select').forEach(ss => { if (ss._dropdown) ss._dropdown.remove(); });
    $('entry-body').innerHTML = '';
    entryRowNum = 0;
    addEntryRow();
  } catch(e) {
    const msg = e.message || JSON.stringify(e);
    if (msg.includes('כבר קיימים במלאי') || msg.includes('כפול')) {
      toast('ברקוד זה כבר קיים במערכת', 'e');
    }
    setAlert('entry-alerts', 'שגיאה: ' + msg, 'e');
  }
  hideLoading();
}


// =========================================================
// BARCODE GENERATION
// =========================================================
async function generateBarcodes(source) {
  let rows;
  if (source === 'entry') {
    rows = getEntryRows();
  }
  if (!rows?.length) { toast('אין שורות ליצירת ברקודים', 'w'); return; }

  // Validate required fields first
  const incomplete = rows.filter(r => !r.brand || !r.model || !r.size || !r.color);
  if (incomplete.length) {
    toast(`${incomplete.length} שורות חסרות שדות חובה (חברה, דגם, גודל, צבע)`, 'e');
    return;
  }

  const noPrice = rows.filter(r => !r.sprice || parseFloat(r.sprice) <= 0);
  if (noPrice.length) {
    toast(`${noPrice.length} שורות חסרות מחיר מכירה — חובה לפני יצירת ברקוד`, 'e');
    return;
  }

  showLoading('מייצר ברקודים...');
  try {
    await loadMaxBarcode();
    const prefix = branchCode.padStart(2, '0');
    let nextSeq = maxBarcode;

    for (const row of rows) {
      // Search existing in inventory (same brand+model+size+color with qty>0)
      const brandId = brandCache[row.brand] || null;
      let barcode = '';

      if (brandId) {
        const existing = await fetchAll(T.INV, [
          ['brand_id','eq',brandId],['model','eq',row.model],
          ['size','eq',row.size],['color','eq',row.color],
          ['is_deleted','eq',false]
        ]);
        const withQty = existing.find(r => (r.fields['כמות'] || 0) > 0);
        if (withQty && withQty.fields['ברקוד']) {
          barcode = withQty.fields['ברקוד'];
        }
      }

      if (!barcode) {
        nextSeq++;
        if (nextSeq > 99999) throw new Error('חריגה — מקסימום 99,999 ברקודים לסניף ' + prefix);
        barcode = prefix + String(nextSeq).padStart(5, '0');
      }

      const cell = row.tr.querySelector('.barcode-cell');
      if (cell) cell.textContent = barcode;
    }
    maxBarcode = nextSeq;
    toast('ברקודים נוצרו בהצלחה!', 's');
  } catch(e) {
    toast('שגיאה ביצירת ברקודים: ' + (e.message||''), 'e');
  }
  hideLoading();
}

// =========================================================
// BARCODE EXCEL EXPORT
// =========================================================
function exportBarcodesExcel(source) {
  let data = [];
  if (source === 'entry') {
    getEntryRows().forEach(r => {
      if (r.barcode) data.push({
        'ברקוד': r.barcode, 'ספק': r.supplier, 'חברה': r.brand, 'דגם': r.model,
        'גודל': r.size, 'גשר': r.bridge, 'צבע': r.color, 'אורך מוט': r.temple,
        'סוג מוצר': r.ptype, 'מחיר מכירה': r.sprice, 'הנחה %': r.sdisc
      });
    });
  }
  if (!data.length) { toast('אין ברקודים לייצוא', 'w'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ברקודים');
  XLSX.writeFile(wb, `barcodes_${Date.now()}.xlsx`);
  toast('קובץ Excel יורד...', 's');
}

// =========================================================
// INVENTORY EXCEL EXPORT
// =========================================================
async function exportInventoryExcel() {
  toast('טוען נתונים לייצוא...', 'w');

  // Full fetch with current filters (no pagination limit)
  try {
    const f = invCurrentFilters || {};
    let query = sb.from('inventory')
      .select('*, inventory_images(*)', { count: 'exact' })
      .eq('is_deleted', false);
    if (f.supplier) {
      const suppId = supplierCache[f.supplier];
      if (suppId) query = query.eq('supplier_id', suppId);
    }
    if (f.ptype) query = query.eq('product_type', heToEn('product_type', f.ptype));
    if (f.qtyFilter === '1') query = query.gt('quantity', 0);
    else if (f.qtyFilter === '0') query = query.lte('quantity', 0);
    if (f.search) {
      const safe = f.search.replace(/[,().\\]/g, '');
      if (safe) {
        const orParts = [
          `barcode.ilike.%${safe}%`, `model.ilike.%${safe}%`,
          `size.ilike.%${safe}%`, `color.ilike.%${safe}%`, `notes.ilike.%${safe}%`
        ];
        const bIds = Object.entries(brandCache).filter(([n]) => n.toLowerCase().includes(safe)).map(([,id]) => id);
        if (bIds.length) orParts.push(`brand_id.in.(${bIds.join(',')})`);
        const sIds = Object.entries(supplierCache).filter(([n]) => n.toLowerCase().includes(safe)).map(([,id]) => id);
        if (sIds.length) orParts.push(`supplier_id.in.(${sIds.join(',')})`);
        query = query.or(orParts.join(','));
      }
    }
    query = query.order('created_at', { ascending: false });
    // Paginate in 1000-row batches (no single-page limit)
    let allRows = [], from = 0;
    while (true) {
      const { data, error } = await query.range(from, from + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allRows.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
    var exportData = allRows.map(row => rowToRecord(row, 'inventory'));
  } catch (e) {
    toast('שגיאה בטעינת נתונים לייצוא: ' + (e.message || ''), 'e');
    return;
  }

  if (!exportData.length) { toast('אין פריטים לייצוא', 'w'); return; }

  const headers = ['ברקוד','חברה/מותג','דגם','גודל','גשר','צבע','סוג מוצר','מחיר מכירה','הנחה%','כמות','סנכרון'];
  const rows = exportData.map(r => {
    const f = r.fields;
    return [
      f['ברקוד'] || '',
      f['חברה / מותג'] || '',
      f['דגם'] || '',
      f['גודל'] || '',
      f['גשר'] || '',
      f['צבע'] || '',
      f['סוג מוצר'] || '',
      parseFloat(f['מחיר מכירה']) || 0,
      f['הנחה מכירה %'] != null ? Math.round((parseFloat(f['הנחה מכירה %']) || 0) * 100) : 0,
      parseInt(f['כמות']) || 0,
      f['סנכרון אתר'] || ''
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths — auto-fit based on content
  const colWidths = headers.map((h, ci) => {
    let mx = h.length;
    rows.forEach(r => { const len = String(r[ci]).length; if (len > mx) mx = len; });
    return { wch: Math.min(mx + 3, 30) };
  });
  ws['!cols'] = colWidths;

  // Header styling — bold, dark blue bg, white text
  const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1A237E' } }, alignment: { horizontal: 'center' } };
  headers.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (!ws[ref]) return;
    ws[ref].s = headerStyle;
  });

  // Number format for price column (col index 7) and discount (8) and quantity (9)
  for (let ri = 1; ri <= rows.length; ri++) {
    const priceRef = XLSX.utils.encode_cell({ r: ri, c: 7 });
    if (ws[priceRef]) ws[priceRef].t = 'n';
    const discRef = XLSX.utils.encode_cell({ r: ri, c: 8 });
    if (ws[discRef]) ws[discRef].t = 'n';
    const qtyRef = XLSX.utils.encode_cell({ r: ri, c: 9 });
    if (ws[qtyRef]) ws[qtyRef].t = 'n';
  }

  // RTL
  ws['!views'] = [{ RTL: true }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'מלאי');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `מלאי-פריזמה-${today}.xlsx`);
  toast('\u{1F4E5} הקובץ הורד בהצלחה', 's');
}

// =========================================================
// EXCEL BULK IMPORT
// =========================================================
let excelImportRows = []; // validated rows ready for insert
let excelImportFileName = ''; // filename for logging

function openExcelFormatPopup() {
  const m = document.getElementById('excel-format-modal');
  if (m) m.style.display = 'flex';
}
function closeExcelFormatPopup() {
  const m = document.getElementById('excel-format-modal');
  if (m) m.style.display = 'none';
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('excel-format-modal')
    ?.addEventListener('click', function(e) {
      if (e.target === this) closeExcelFormatPopup();
    });
});

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
        errEl.innerHTML = `<div class="alert alert-e" style="max-height:160px;overflow-y:auto;font-size:.82rem">${errors.join('<br>')}</div>`;
      } else {
        errEl.style.display = 'none';
      }

      // Show preview table
      const tbody = $('excel-import-body');
      tbody.innerHTML = validRows.map((r, i) =>
        `<tr>
          <td>${i + 1}</td><td>${r.brand}</td><td>${r.model}</td><td>${r.size}</td><td>${r.price}</td>
          <td>${r.bridge}</td><td>${r.color}</td><td>${r.ptype}</td><td>${r.discount}</td><td>${r.sync}</td><td>${r.notes}</td>
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
  const fields = {
    'ברקוד': barcode,
    'חברה / מותג': r.brand,
    'דגם': r.model,
    'גודל': r.size,
    'מחיר מכירה': r.price,
    'סוג מוצר': r.ptype,
    'סטטוס': 'במלאי',
    'מקור': 'ייבוא אקסל',
    'כמות': 1,
  };
  if (r.bridge) fields['גשר'] = r.bridge;
  if (r.color) fields['צבע'] = r.color;
  if (r.discount) fields['הנחה מכירה %'] = (parseFloat(r.discount) || 0) / 100;
  if (r.notes) fields['הערות'] = r.notes;
  fields['סנכרון אתר'] = r.sync || getBrandSync(r.brand) || 'לא';
  const bt = getBrandType(r.brand);
  if (bt) fields['סוג מותג'] = bt;
  return fields;
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
        matchRec = existing.find(e => (e.fields['כמות'] || 0) > 0 && e.fields['ברקוד']);
      }

      if (matchRec) {
        withBarcode.push({ ...r, barcode: matchRec.fields['ברקוד'], existingId: matchRec.id, existingQty: matchRec.fields['כמות'] || 0 });
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
      await batchUpdate(T.INV, [{ id: r.existingId, fields: { 'כמות': newQty } }]);
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
      html += `<tr><td>${r.brand}</td><td>${r.model}</td><td>${r.size}</td><td>${r.color}</td><td style="font-family:monospace;font-weight:600">${r.barcode}</td></tr>`;
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
      html += `<tr><td>${r.brand}</td><td>${r.model}</td><td>${r.size}</td><td>${r.color}</td><td>${r.reason}</td></tr>`;
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

    // Insert all pending items with their new barcodes
    const records = excelPendingRows.map(r => ({ fields: buildExcelRecordFields(r, r.barcode) }));
    const created = await batchCreate(T.INV, records);
    for (const item of created) {
      writeLog('entry_excel', item.id, {
        barcode: item.fields['ברקוד'], brand: item.fields['חברה / מותג'],
        model: item.fields['דגם'], qty_before: 0, qty_after: 1,
        source_ref: excelImportFileName || 'ייבוא אקסל'
      });
    }

    // Update modal — show success for these items too
    const pendingDiv = $('excel-results-pending');
    let html = `<h4 style="color:var(--success);margin-bottom:8px">&#10004;&#65039; ${created.length} פריטים נוספים נכנסו למלאי</h4>`;
    html += '<div class="table-wrap" style="max-height:200px;overflow-y:auto"><table style="font-size:.82rem"><thead><tr><th>מותג</th><th>דגם</th><th>גודל</th><th>צבע</th><th>ברקוד</th></tr></thead><tbody>';
    for (const r of excelPendingRows) {
      html += `<tr><td>${r.brand}</td><td>${r.model}</td><td>${r.size}</td><td>${r.color}</td><td style="font-family:monospace;font-weight:600">${r.barcode}</td></tr>`;
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
