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
      <div class="card-field"><label>צבע <span class="req">*</span></label><input class="col-color" placeholder="צבע"></div>
      <div class="card-field" style="min-width:80px"><label>גודל <span class="req">*</span></label><input class="col-size" placeholder="גודל"></div>
      <div class="card-field" style="min-width:70px"><label>גשר</label><input class="col-bridge" placeholder="גשר"></div>
      <div class="card-field" style="min-width:80px"><label>אורך מוט</label><input class="col-temple" placeholder="אורך מוט"></div>
    </div>
    <div class="card-row">
      <div class="card-field" style="min-width:120px"><label>סוג מוצר <span class="req">*</span></label><select class="col-ptype">${productTypeOpts()}</select></div>
      <div class="card-field" style="min-width:100px"><label>מחיר מכירה <span class="req">*</span></label><input type="number" class="col-sprice" placeholder="₪" step="0.01" min="0"></div>
      <div class="card-field" style="min-width:80px"><label>הנחה % <span class="req">*</span></label><input type="number" class="col-sdisc" placeholder="%" min="0" max="100" value="0"></div>
      <div class="card-field" style="min-width:100px"><label>מחיר סופי</label><input type="number" class="col-fprice" readonly placeholder="—" tabindex="-1" style="background:#f5f7fa;font-weight:600"></div>
      <div class="card-field cost-field" style="min-width:100px"><label>מחיר עלות</label><input type="number" class="col-cprice" placeholder="₪" step="0.01" min="0"></div>
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

  // Calculate final price after auto-fill
  if (pSprice) {
    var _initPrice = parseFloat(pSprice) || 0;
    var _initDisc = parseFloat(pSdisc) || 0;
    var _fpEl = tr.querySelector('.col-fprice');
    if (_fpEl && _initPrice > 0) _fpEl.value = Math.round(_initPrice * (1 - _initDisc / 100));
  }

  // Final price calculation
  function _calcFinalPrice() {
    var price = parseFloat(tr.querySelector('.col-sprice')?.value) || 0;
    var disc = parseFloat(tr.querySelector('.col-sdisc')?.value) || 0;
    var fp = tr.querySelector('.col-fprice');
    if (fp) fp.value = price > 0 ? Math.round(price * (1 - disc / 100)) : '';
  }
  tr.querySelector('.col-sprice')?.addEventListener('input', _calcFinalPrice);
  tr.querySelector('.col-sdisc')?.addEventListener('input', _calcFinalPrice);

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
    // Negative price validation
    if (r.sprice && parseFloat(r.sprice) < 0) {
      hasErr = true;
      errs.push(`שורה ${i+1}: מחיר מכירה לא יכול להיות שלילי`);
    }
    if (r.cprice && parseFloat(r.cprice) < 0) {
      hasErr = true;
      errs.push(`שורה ${i+1}: מחיר עלות לא יכול להיות שלילי`);
    }
    // Image requirement removed — may be restored in future
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
  const physicalRows = rows.filter(r => r.sync !== 'תדמית');
  if (physicalRows.length > 0) {
    const ok = await confirmDialog('אישור שליחה', `האם הדבקת ברקודים על ${physicalRows.length} המסגרות?`);
    if (!ok) return;
  }

  const limit = await checkPlanLimit('inventory');
  if (!limit.allowed) { Toast.warning(limit.message || 'הגעת למגבלה'); return; }

  showLoading('שולח פריטים למלאי...');
  clearAlert('entry-alerts');
  try {
    // Retry loop for duplicate barcode race condition (STAB-04)
    let created;
    let attempt = 0;
    while (attempt < 3) {
      const currentRows = attempt === 0 ? rows : getEntryRows();
      // Validate brand_id exists for all rows before insert
      const invalidBrand = currentRows.find(r => !brandCache[r.brand]);
      if (invalidBrand) {
        Toast.error('מותג "' + escapeHtml(invalidBrand.brand) + '" לא נמצא במערכת — יש לבחור מותג תקין');
        hideLoading();
        return;
      }
      const records = currentRows.map(r => {
        const rec = {
          barcode: r.barcode,
          supplier_id: supplierCache[r.supplier] || null,
          brand_id: brandCache[r.brand],
          model: r.model,
          size: r.size,
          color: r.color,
          product_type: heToEn('product_type', r.ptype),
          sell_price: parseFloat(r.sprice) || 0,
          sell_discount: (parseFloat(r.sdisc) || 0) / 100,
          status: heToEn('status', 'במלאי'),
          origin: 'כניסת מלאי',
          quantity: r.sync === 'תדמית' ? 0 : 1,
          website_sync: heToEn('website_sync', r.sync || getBrandSync(r.brand) || 'לא'),
        };
        if (r.bridge) rec.bridge = r.bridge;
        if (r.temple) rec.temple_length = r.temple;
        if (r.brandType) rec.brand_type = heToEn('brand_type', r.brandType);
        if (r.cprice) rec.cost_price = parseFloat(r.cprice);
        if (r.cdisc) rec.cost_discount = parseFloat(r.cdisc) / 100;
        return rec;
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
        barcode:    item.barcode,
        brand:      item.brand_name,
        model:      item.model,
        qty_before: 0,
        qty_after:  item.quantity ?? 1,
        source_ref: 'הכנסה ידנית'
      });
    }
    setAlert('entry-alerts', `&#10004; ${created.length} פריטים נכנסו למלאי בהצלחה`, 's');
    toast(`${created.length} פריטים נשלחו!`, 's');
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