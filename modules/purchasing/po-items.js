// ── Brand filter for PO items ────────────────────────────────
var _poBrandFilter = '';
function _filterPOByBrand(brand) {
  _poBrandFilter = brand;
  document.querySelectorAll('tr[data-po-row]').forEach(function(tr) {
    var idx = parseInt(tr.dataset.poRow), item = currentPOItems[idx];
    if (!item) return;
    var show = !brand || (item.brand || '').trim() === brand;
    tr.style.display = show ? '' : 'none';
    if (!show) { var d = document.getElementById('po-item-details-' + idx); if (d) d.style.display = 'none'; }
  });
}
function _updatePOBrandFilter() {
  var sel = document.getElementById('po-brand-filter'); if (!sel) return;
  var brands = [...new Set(currentPOItems.map(i => (i.brand||'').trim()).filter(Boolean))].sort();
  var cur = sel.value;
  sel.innerHTML = '<option value="">\u05D4\u05DB\u05DC</option>' + brands.map(function(b) { return '<option value="' + escapeHtml(b) + '"' + (b===cur?' selected':'') + '>' + escapeHtml(b) + '</option>'; }).join('');
}

// ── Items table render ───────────────────────────────────────
function ensurePOBrandDatalist() {
  if (document.getElementById('po-brand-list')) return;
  const dl = document.createElement('datalist');
  dl.id = 'po-brand-list';
  Object.keys(brandCache).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    dl.appendChild(opt);
  });
  document.body.appendChild(dl);
}

async function loadPOModelsForBrand(i, brandName) {
  const brandId = brandCache[brandName];
  if (!brandId) return;
  const { data } = await sb.from(T.INV)
    .select('model')
    .eq('brand_id', brandId)
    .eq('is_deleted', false)
    .order('model')
    .range(0, 99999);
  const models = [...new Set((data||[]).map(r=>r.model).filter(Boolean))].sort();
  const listId = `po-model-list-${i}`;
  let dl = document.getElementById(listId);
  if (!dl) { dl = document.createElement('datalist'); dl.id = listId; document.body.appendChild(dl); }
  dl.innerHTML = models.map(m => `<option value="${m}">`).join('');
  currentPOItems[i].model = '';
  currentPOItems[i].color = '';
  currentPOItems[i].size  = '';
  const row = document.querySelector(`tr[data-po-row="${i}"]`);
  if (row) {
    row.querySelector('.po-model-input').value = '';
    row.querySelector('.po-color-input').value = '';
    row.querySelector('.po-size-input').value  = '';
  }
  row?.querySelector('.po-model-input')?.setAttribute('list', listId);
}

async function loadPOColorsAndSizes(i, brandName, model) {
  const brandId = brandCache[brandName];
  if (!brandId || !model) return;
  const { data } = await sb.from(T.INV)
    .select('color, size, quantity')
    .eq('brand_id', brandId)
    .eq('model', model)
    .eq('is_deleted', false);
  const colors = [...new Set((data||[]).map(r=>r.color).filter(Boolean))].sort();
  const sizes  = [...new Set((data||[]).map(r=>r.size).filter(Boolean))].sort();
  const colorListId = `po-color-list-${i}`;
  const sizeListId  = `po-size-list-${i}`;
  let cdl = document.getElementById(colorListId);
  if (!cdl) { cdl = document.createElement('datalist'); cdl.id = colorListId; document.body.appendChild(cdl); }
  cdl.innerHTML = colors.map(c => `<option value="${c}">`).join('');
  let sdl = document.getElementById(sizeListId);
  if (!sdl) { sdl = document.createElement('datalist'); sdl.id = sizeListId; document.body.appendChild(sdl); }
  sdl.innerHTML = sizes.map(s => `<option value="${s}">`).join('');
  const row = document.querySelector(`tr[data-po-row="${i}"]`);
  row?.querySelector('.po-color-input')?.setAttribute('list', colorListId);
  row?.querySelector('.po-size-input')?.setAttribute('list', sizeListId);
  // Update live stock counter for this row
  _updatePOStockCounter(i, brandName, model, '', '');
}

function renderPOItemsTable() {
  const tbody = document.getElementById('po-items-tbody');
  const tfoot = document.getElementById('po-items-tfoot');
  if (!tbody || !tfoot) return;

  ensurePOBrandDatalist();

  if (currentPOItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:20px;color:#888">\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u2014 \u05DC\u05D7\u05E5 "+ \u05E9\u05D5\u05E8\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA" \u05D0\u05D5 \u05D7\u05E4\u05E9 \u05D1\u05E8\u05E7\u05D5\u05D3</td></tr>`;
    tfoot.innerHTML = '';
    return;
  }

  tbody.innerHTML = currentPOItems.map((item, i) => {
    var finalPrice = _calcPOFinalPrice(item);
    return `
    <tr data-po-row="${i}">
      <td><input value="${escapeHtml(item.brand || '')}" list="po-brand-list" class="po-brand-input" oninput="currentPOItems[${i}].brand=this.value; loadPOModelsForBrand(${i},this.value)" placeholder="מותג..." style="width:110px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input value="${escapeHtml(item.model || '')}" class="po-model-input" oninput="currentPOItems[${i}].model=this.value; loadPOColorsAndSizes(${i},currentPOItems[${i}].brand,this.value)" style="width:90px;padding:4px 6px;border:1px solid #ddd;border-radius:4px">
        <div class="po-stock-counter" id="po-stock-${i}" style="font-size:.72rem;color:#888;margin-top:2px;min-height:14px"></div></td>
      <td><input value="${escapeHtml(item.color || '')}" class="po-color-input" oninput="currentPOItems[${i}].color=this.value; _updatePOStockCounter(${i},currentPOItems[${i}].brand,currentPOItems[${i}].model,this.value,currentPOItems[${i}].size)" style="width:70px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input value="${escapeHtml(item.size || '')}" class="po-size-input" oninput="currentPOItems[${i}].size=this.value; _updatePOStockCounter(${i},currentPOItems[${i}].brand,currentPOItems[${i}].model,currentPOItems[${i}].color,this.value)" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><select oninput="currentPOItems[${i}].product_type=this.value" style="width:60px;padding:4px 2px;border:1px solid #ddd;border-radius:4px;font-size:12px">
        <option value="eyeglasses" ${item.product_type!=='sunglasses'?'selected':''}>\u05E8\u05D0\u05D9\u05D9\u05D4</option>
        <option value="sunglasses" ${item.product_type==='sunglasses'?'selected':''}>\u05E9\u05DE\u05E9</option>
      </select></td>
      <td><input type="number" min="1" value="${item.qty_ordered || 1}"
                 oninput="currentPOItems[${i}].qty_ordered=+this.value; updatePOTotals()" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="0" step="0.01" value="${item.unit_cost || ''}"
                 oninput="currentPOItems[${i}].unit_cost=+this.value; _onPOCostChange(${i}); updatePOTotals()" style="width:75px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="0" max="100" step="0.1" value="${item.discount_pct || 0}"
                 oninput="currentPOItems[${i}].discount_pct=+this.value; _onPODiscountChange(${i}); updatePOTotals()" style="width:55px;padding:4px 6px;border:1px solid #ddd;border-radius:4px"></td>
      <td><input type="number" min="0" step="0.01" value="${finalPrice || ''}" class="po-final-price"
                 oninput="_onPOFinalPriceChange(${i}, +this.value); updatePOTotals()" style="width:75px;padding:4px 6px;border:1px solid #ddd;border-radius:4px" placeholder="מחיר סופי"></td>
      <td id="po-row-total-${i}" style="text-align:center; font-weight:600; padding:8px">—</td>
      <td>
        <button class="btn-po-note" data-index="${i}" style="background:none;border:none;cursor:pointer;font-size:14px;${item.notes ? 'color:#2196F3' : 'opacity:.4'}" title="הערה לפריט">${item.notes ? '\uD83D\uDCAC' : '\uD83D\uDCAD'}</button>
        <button class="btn-po-toggle" data-index="${i}" style="background:none;border:none;cursor:pointer;font-size:14px" title="פרטים נוספים">&#9660;</button>
        <button class="btn-po-dup" data-index="${i}" title="שכפל שורה" style="background:none;border:none;cursor:pointer;font-size:14px;color:#2196F3;padding:2px 4px">&#10697;</button>
        <button class="btn-po-remove" data-index="${i}" style="background:none;border:none;cursor:pointer;color:#f44336;font-size:16px">&#10005;</button>
      </td>
    </tr>
    <tr id="po-item-details-${i}" style="display:none; background:#f8f9fa">
      <td colspan="11" style="padding:8px 16px">
        <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:end">
          <div><label style="font-size:12px;display:block">מחיר מכירה ₪</label>
            <input type="number" min="0" step="0.01" value="${item.sell_price||''}"
                   oninput="currentPOItems[${i}].sell_price=+this.value"
                   style="width:90px;padding:4px 6px;border-radius:4px;border:1px solid #ccc"></div>
          <div><label style="font-size:12px;display:block">הנחת מכירה %</label>
            <input type="number" min="0" max="100" step="0.1" value="${item.sell_discount ? item.sell_discount*100 : 0}"
                   oninput="currentPOItems[${i}].sell_discount=this.value/100"
                   style="width:70px;padding:4px 6px;border-radius:4px;border:1px solid #ccc"></div>
          <div><label style="font-size:12px;display:block">סוג מוצר</label>
            <select oninput="currentPOItems[${i}].product_type=this.value"
                    style="padding:4px 6px;border-radius:4px;border:1px solid #ccc">
              <option value="">—</option>
              <option value="eyeglasses" ${item.product_type==='eyeglasses'?'selected':''}>משקפי ראייה</option>
              <option value="sunglasses" ${item.product_type==='sunglasses'?'selected':''}>משקפי שמש</option>
            </select></div>
          <div><label style="font-size:12px;display:block">סנכרון אתר</label>
            <select oninput="currentPOItems[${i}].website_sync=this.value"
                    style="padding:4px 6px;border-radius:4px;border:1px solid #ccc">
              <option value="">—</option>
              <option value="full" ${item.website_sync==='full'?'selected':''}>מלא</option>
              <option value="display" ${item.website_sync==='display'?'selected':''}>תצוגה</option>
              <option value="none" ${item.website_sync==='none'?'selected':''}>ללא</option>
            </select></div>
          <div><label style="font-size:12px;display:block">גשר</label>
            <input type="text" value="${escapeHtml(item.bridge||'')}" oninput="currentPOItems[${i}].bridge=this.value"
                   style="width:60px;padding:4px 6px;border-radius:4px;border:1px solid #ccc"></div>
          <div><label style="font-size:12px;display:block">אורך מוט</label>
            <input type="text" value="${escapeHtml(item.temple_length||'')}" oninput="currentPOItems[${i}].temple_length=this.value"
                   style="width:60px;padding:4px 6px;border-radius:4px;border:1px solid #ccc"></div>
        </div>
        <div style="margin-top:8px">
          <label style="font-size:12px;display:block">הערה</label>
          <textarea class="po-item-note" data-index="${i}" rows="2" maxlength="500"
                    oninput="currentPOItems[${i}].notes=this.value; _updatePONoteBtn(${i})"
                    placeholder="הערה לפריט..."
                    style="width:100%;padding:6px 8px;border-radius:4px;border:1px solid #ccc;direction:rtl;resize:vertical;font-size:13px">${escapeHtml(item.notes||'')}</textarea>
        </div>
      </td>
    </tr>
  `}).join('');

  tfoot.innerHTML = '<tr style="font-weight:700;border-top:2px solid #1a2744">' +
    '<td colspan="5" style="padding:8px;text-align:left">\u05E1\u05D4"\u05DB:</td>' +
    '<td id="po-total-qty" style="padding:8px"></td>' +
    '<td colspan="3" style="padding:8px;text-align:left">\u05E1\u05DB\u05D5\u05DD \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DE:</td>' +
    '<td id="po-total-amount" style="padding:8px;font-size:15px"></td><td></td></tr>' +
    '<tr style="color:#666;font-size:.88rem">' +
    '<td colspan="9" style="padding:4px 8px;text-align:left">\u05DE\u05E2"\u05DE (<span id="po-vat-rate"></span>%):</td>' +
    '<td id="po-vat-amount" style="padding:4px 8px"></td><td></td></tr>' +
    '<tr style="font-weight:700;font-size:1.05rem;border-top:1px solid #ddd">' +
    '<td colspan="9" style="padding:8px;text-align:left">\u05E1\u05D4"\u05DB \u05DB\u05D5\u05DC\u05DC \u05DE\u05E2"\u05DE:</td>' +
    '<td id="po-total-with-vat" style="padding:8px;font-size:15px;color:#059669"></td><td></td></tr>';

  updatePOTotals();
  _updatePOBrandFilter();
  if (_poBrandFilter) _filterPOByBrand(_poBrandFilter);
  // Restore sort indicator if active
  var poSt = typeof SortUtils !== 'undefined' ? SortUtils.getState('po-items') : null;
  if (poSt) { var th = document.querySelector('#po-items-tbody')?.closest('table')?.querySelector('thead');
    if (th) SortUtils.updateHeaders(th, poSt.key, poSt.dir); }
}

// ── PO items sort (delegated — click on th with data-sort-key inside PO table) ──
document.addEventListener('click', function(e) {
  var th = e.target.closest('th[data-sort-key]');
  if (!th || typeof SortUtils === 'undefined') return;
  var table = th.closest('table');
  if (!table || !table.querySelector('#po-items-tbody')) return;
  var s = SortUtils.toggle('po-items', th.dataset.sortKey);
  SortUtils.sortArray(currentPOItems, s.key, s.dir);
  renderPOItemsTable();
});

// ── Final price helpers ───────────────────────────────────────
function _calcPOFinalPrice(item) {
  var cost = item.unit_cost || 0;
  var disc = item.discount_pct || 0;
  if (!cost) return '';
  return +(cost * (1 - disc / 100)).toFixed(2);
}

function _onPOFinalPriceChange(i, finalPrice) {
  var cost = currentPOItems[i].unit_cost || 0;
  if (cost > 0 && finalPrice >= 0) {
    // Reverse-calc discount: ((cost - finalPrice) / cost) * 100
    var disc = ((cost - finalPrice) / cost) * 100;
    currentPOItems[i].discount_pct = Math.max(0, Math.min(100, +disc.toFixed(1)));
    var row = document.querySelector('tr[data-po-row="' + i + '"]');
    if (row) {
      var discInput = row.querySelectorAll('input[type="number"]')[2]; // 3rd number input = discount
      if (discInput) discInput.value = currentPOItems[i].discount_pct;
    }
  }
}

function _onPODiscountChange(i) {
  // Recalc final price from current discount
  var fp = _calcPOFinalPrice(currentPOItems[i]);
  var row = document.querySelector('tr[data-po-row="' + i + '"]');
  if (row) {
    var fpInput = row.querySelector('.po-final-price');
    if (fpInput) fpInput.value = fp || '';
  }
}

function _onPOCostChange(i) {
  // Recalc final price when cost_price changes
  _onPODiscountChange(i);
}

// ── Totals ───────────────────────────────────────────────────
function updatePOTotals() {
  var totalQty = 0, totalAmount = 0;
  var fmt = function(n) { return '\u20AA' + n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  currentPOItems.forEach(function(item, i) {
    var qty = item.qty_ordered || 0, cost = item.unit_cost || 0, disc = item.discount_pct || 0;
    var rowTotal = qty * cost * (1 - disc / 100);
    totalQty += qty; totalAmount += rowTotal;
    var cell = document.getElementById('po-row-total-' + i);
    if (cell) cell.textContent = rowTotal > 0 ? fmt(rowTotal) : '\u2014';
  });
  var qtyEl = document.getElementById('po-total-qty');
  var amtEl = document.getElementById('po-total-amount');
  if (qtyEl) qtyEl.textContent = totalQty;
  if (amtEl) amtEl.textContent = fmt(totalAmount);
  var vatRate = Number(typeof getTenantConfig === 'function' ? getTenantConfig('vat_rate') : 0) || 17;
  var vatAmount = totalAmount * vatRate / 100, totalWithVat = totalAmount + vatAmount;
  var vatRateEl = document.getElementById('po-vat-rate');
  var vatAmtEl = document.getElementById('po-vat-amount');
  var totalVatEl = document.getElementById('po-total-with-vat');
  if (vatRateEl) vatRateEl.textContent = vatRate;
  if (vatAmtEl) vatAmtEl.textContent = fmt(vatAmount);
  if (totalVatEl) totalVatEl.textContent = fmt(totalWithVat);
}

// ── Add/remove items ─────────────────────────────────────────
function addPOItemManual() {
  currentPOItems.push({
    brand: '', model: '', color: '', size: '',
    qty_ordered: 1, unit_cost: 0, discount_pct: 0,
    notes: '', inventory_id: null, barcode: ''
  });
  renderPOItemsTable();
}

async function addPOItemByBarcode() {
  const input = document.getElementById('po-barcode-search');
  const barcode = input?.value?.trim();
  if (!barcode) return;

  const { data, error } = await sb.from(T.INV)
    .select('id, barcode, brand_id, model, color, size, cost_price')
    .eq('barcode', barcode)
    .eq('is_deleted', false)
    .limit(1)
    .single();

  if (error || !data) { toast('ברקוד לא נמצא', 'e'); return; }

  currentPOItems.push({
    inventory_id: data.id,
    barcode: data.barcode,
    brand: brandCacheRev[data.brand_id] || '',
    model: data.model || '',
    color: data.color || '',
    size: data.size || '',
    qty_ordered: 1,
    unit_cost: data.cost_price || 0,
    discount_pct: 0,
    notes: ''
  });
  renderPOItemsTable();
  input.value = '';
  toast('פריט נוסף ✓', 's');
}

function removePOItem(index) {
  currentPOItems.splice(index, 1);
  renderPOItemsTable();
}

function duplicatePOItem(i) {
  var copy = { ...currentPOItems[i], size: '' };
  currentPOItems.splice(i + 1, 0, copy); renderPOItemsTable();
}

function togglePOItemDetails(i) {
  const row = document.getElementById(`po-item-details-${i}`);
  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
}

function togglePOItemNote(i) {
  var row = document.getElementById('po-item-details-' + i);
  if (row) { if (row.style.display === 'none') row.style.display = '';
    var ta = row.querySelector('.po-item-note'); if (ta) setTimeout(function() { ta.focus(); }, 50); }
}
function _updatePONoteBtn(i) {
  var btn = document.querySelector('.btn-po-note[data-index="' + i + '"]'); if (!btn) return;
  var hasNote = !!(currentPOItems[i] && currentPOItems[i].notes);
  btn.textContent = hasNote ? '\uD83D\uDCAC' : '\uD83D\uDCAD';
  btn.style.color = hasNote ? '#2196F3' : ''; btn.style.opacity = hasNote ? '1' : '.4';
}

// ── Live stock counter ──
var _poStockCounterTimer = {};
function _updatePOStockCounter(i, brandName, model, color, size) {
  if (_poStockCounterTimer[i]) clearTimeout(_poStockCounterTimer[i]);
  _poStockCounterTimer[i] = setTimeout(function() { _doUpdatePOStockCounter(i, brandName, model, color, size); }, 300);
}
async function _doUpdatePOStockCounter(i, bn, model, color, size) {
  var el = document.getElementById('po-stock-' + i); if (!el) return;
  var brandId = brandCache[(bn || '').trim()];
  if (!brandId || !(model || '').trim()) { el.textContent = ''; return; }
  try { var q = sb.from(T.INV).select('id', { count: 'exact', head: true }).eq('brand_id', brandId).ilike('model', (model||'').trim()).eq('tenant_id', getTenantId()).eq('is_deleted', false);
    if ((color||'').trim()) q = q.ilike('color', (color||'').trim());
    if ((size||'').trim()) q = q.ilike('size', (size||'').trim());
    var { count } = await q;
    el.textContent = count ? '\uD83D\uDCE6 ' + count + ' \u05D1\u05DE\u05DC\u05D0\u05D9' : '\u2728 \u05D7\u05D3\u05E9';
    el.style.color = count ? '#d97706' : '#059669';
  } catch (e) { el.textContent = ''; }
}
