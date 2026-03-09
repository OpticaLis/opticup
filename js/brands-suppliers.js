// =========================================================
// TAB 4: BRANDS
// =========================================================
let allBrandsData = [];
let brandsEdited = [];
let brandStockByBrand = {};

async function loadBrandsTab() {
  showLoading('טוען מותגים...');
  try {
    const [{ data: brandRows, error }, { data: stockData }] = await Promise.all([
      sb.from('brands').select('*'),
      sb.from(T.INV).select('brand_id, quantity').eq('is_deleted', false)
    ]);
    if (error) throw new Error(error.message);

    brandStockByBrand = {};
    (stockData || []).forEach(r => {
      brandStockByBrand[r.brand_id] = (brandStockByBrand[r.brand_id] || 0) + (r.quantity || 0);
    });

    allBrandsData = (brandRows || []).map(b => ({
      id: b.id,
      name: b.name || '',
      brand_type: b.brand_type || '',
      type: enToHe('brand_type', b.brand_type) || '',
      defaultSync: enToHe('website_sync', b.default_sync) || '',
      active: b.active !== false,
      excludeWebsite: b.exclude_website === true,
      minStockQty: b.min_stock_qty ?? null,
      currentQty: brandStockByBrand[b.id] || 0,
      isNew: false
    }));
    renderBrandsTable();
  } catch(e) {
    setAlert('brands-alerts', 'שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}

function renderBrandsTable() {
  const filterActive = document.getElementById('brand-filter-active')?.value ?? 'true';
  const filterSync   = document.getElementById('brand-filter-sync')?.value   || '';
  const filterType   = document.getElementById('brand-filter-type')?.value   || '';
  const filterLowStock = document.getElementById('brand-filter-low-stock')?.value || '';

  let filtered = allBrandsData;
  if (filterActive === 'true')  filtered = filtered.filter(b => b.active !== false);
  if (filterActive === 'false') filtered = filtered.filter(b => b.active === false);
  if (filterSync) filtered = filtered.filter(b => b.defaultSync === filterSync);
  if (filterType === 'luxury')  filtered = filtered.filter(b => b.brand_type === 'luxury');
  else if (filterType === 'brand') filtered = filtered.filter(b => b.brand_type === 'brand');
  else if (filterType === 'regular') filtered = filtered.filter(b => !b.brand_type);
  if (filterLowStock === 'low') {
    filtered = filtered.filter(b =>
      b.minStockQty !== null &&
      b.minStockQty !== undefined &&
      b.currentQty < b.minStockQty
    );
  }

  brandsEdited = filtered;

  const countEl = document.getElementById('brand-filter-count');
  if (countEl) countEl.textContent = `מציג ${filtered.length} מותגים`;

  const tb = $('brands-body');
  tb.innerHTML = brandsEdited.map((b, i) => `
    <tr data-idx="${i}">
      <td><input value="${b.name}" onchange="brandsEdited[${i}].name=this.value"></td>
      <td><select onchange="brandsEdited[${i}].type=this.value">
        <option value="">—</option>
        <option value="יוקרה"${b.type==='יוקרה'?' selected':''}>יוקרה</option>
        <option value="מותג"${b.type==='מותג'?' selected':''}>מותג</option>
      </select></td>
      <td><select onchange="brandsEdited[${i}].defaultSync=this.value">
        <option value="">—</option>
        <option value="מלא"${b.defaultSync==='מלא'?' selected':''}>מלא</option>
        <option value="תדמית"${b.defaultSync==='תדמית'?' selected':''}>תדמית</option>
        <option value="לא"${b.defaultSync==='לא'?' selected':''}>לא</option>
      </select></td>
      <td style="text-align:center"><input type="checkbox" ${b.active?'checked':''} onchange="setBrandActive('${b.id}',this.checked)" title="${b.active ? 'מותג פעיל' : 'מותג לא פעיל'}"></td>
      <td><input type="checkbox" ${b.excludeWebsite?'checked':''} onchange="brandsEdited[${i}].excludeWebsite=this.checked"></td>
      <td><input type="number" min="0" step="1" value="${b.minStockQty ?? ''}" placeholder="${b.type==='יוקרה'?'5':b.type==='מותג'?'15':'—'}" style="width:70px;text-align:center" data-id="${b.id||''}" data-field="min_stock_qty" class="brand-min-stock-input" onchange="brandsEdited[${i}].minStockQty=this.value===''?null:parseInt(this.value,10);${b.id?'saveBrandField(this)':''}"></td>
      ${(() => { const qty = b.currentQty; const minQ = b.minStockQty; const isLow = minQ != null && qty < minQ; const color = minQ == null ? '' : (isLow ? 'color:#e53935' : 'color:#2e7d32'); return `<td style="text-align:center;font-weight:600;${color}">${qty}${isLow ? ' ⚠️' : ''}</td>`; })()}
    </tr>
  `).join('');
}

async function setBrandActive(brandId, isActive) {
  if (!brandId) return;
  const { error } = await sb.from('brands')
    .update({ active: isActive })
    .eq('id', brandId);
  if (error) { toast('שגיאה: ' + error.message, 'e'); return; }

  const b = allBrandsData.find(x => x.id === brandId);
  if (b) b.active = isActive;

  toast(isActive ? 'מותג סומן כפעיל ✓' : 'מותג סומן כלא פעיל ✓', 's');
  renderBrandsTable();
}

function addBrandRow() {
  const newBrand = { id: null, name: '', brand_type: '', type: '', defaultSync: '', active: true, excludeWebsite: false, minStockQty: null, currentQty: 0, isNew: true };
  allBrandsData.push(newBrand);
  renderBrandsTable();
  const rows = $('brands-body').querySelectorAll('tr');
  const last = rows[rows.length-1];
  if (last) {
    last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    last.querySelector('input')?.focus();
  }
}

async function saveBrands() {
  showLoading('שומר מותגים...');
  try {
    let updCount = 0, createCount = 0;
    // Update existing brands (from allBrandsData to capture all edits)
    const existing = allBrandsData.filter(b => b.id && !b.isNew);
    for (const b of existing) {
      const { error } = await sb.from('brands').update({
        name: b.name,
        brand_type: heToEn('brand_type', b.type) || null,
        default_sync: heToEn('website_sync', b.defaultSync) || null,
        active: b.active,
        exclude_website: b.excludeWebsite,
        min_stock_qty: b.minStockQty ?? null
      }).eq('id', b.id);
      if (error) throw new Error(error.message);
      updCount++;
    }

    // Create new brands
    const newBrands = allBrandsData.filter(b => b.isNew && b.name);
    if (newBrands.length) {
      const rows = newBrands.map(b => ({
        name: b.name,
        brand_type: heToEn('brand_type', b.type) || null,
        default_sync: heToEn('website_sync', b.defaultSync) || null,
        active: b.active,
        exclude_website: b.excludeWebsite,
        min_stock_qty: b.minStockQty ?? null
      }));
      const { error } = await sb.from('brands').insert(rows);
      if (error) throw new Error(error.message);
      createCount = newBrands.length;
    }

    // Reload brands cache
    await loadLookupCaches();
    const { data: brandRows } = await sb.from('brands').select('*');
    brands = (brandRows || []).map(b => ({
      id: b.id,
      name: b.name || '',
      type: enToHe('brand_type', b.brand_type) || '',
      defaultSync: enToHe('website_sync', b.default_sync) || '',
      active: b.active === true
    })).filter(b => b.name);

    populateDropdowns();
    toast(`נשמרו ${updCount + createCount} מותגים`, 's');
    loadBrandsTab();
  } catch(e) {
    setAlert('brands-alerts', 'שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}

async function saveBrandField(input) {
  const id = input.dataset.id;
  const field = input.dataset.field;
  const raw = input.value.trim();
  const value = raw === '' ? null : parseInt(raw, 10);

  if (raw !== '' && (isNaN(value) || value < 0)) {
    toast('ערך לא תקין', 'e');
    return;
  }

  try {
    const { error } = await sb.from('brands').update({ [field]: value }).eq('id', id);
    if (error) throw error;
    toast('נשמר ✓', 's');
  } catch (err) {
    toast('שגיאה בשמירה: ' + err.message, 'e');
  }
}

// =========================================================
// TAB 5: SUPPLIERS
// =========================================================
let supplierEditMode = false;

function loadSuppliersTab() {
  const tb = $('suppliers-body');
  const editBtn = $('supplier-edit-btn');
  const saveBar = $('supplier-save-bar');

  // Toggle button/bar visibility
  if (editBtn) editBtn.style.display = supplierEditMode ? 'none' : '';
  if (saveBar) saveBar.style.display = supplierEditMode ? 'flex' : 'none';

  tb.innerHTML = suppliers.map((s, i) => {
    const sid = supplierCache[s];
    const num = supplierNumCache[sid] || '';
    if (supplierEditMode) {
      return `<tr>
        <td><input type="number" min="10" value="${num}" class="sup-num-input" data-sid="${sid}" style="width:70px;text-align:center"></td>
        <td><strong>${s}</strong></td>
        <td></td>
      </tr>`;
    }
    return `<tr>
      <td>${num || '—'}</td>
      <td><strong>${s}</strong></td>
      <td><button class="btn btn-d btn-sm" onclick="toast('לא ניתן למחוק ספק מהממשק','w')">&#10006;</button></td>
    </tr>`;
  }).join('');
}

function toggleSupplierNumberEdit() {
  supplierEditMode = true;
  loadSuppliersTab();
}

function cancelSupplierNumberEdit() {
  supplierEditMode = false;
  loadSuppliersTab();
}

async function saveSupplierNumbers() {
  const inputs = document.querySelectorAll('.sup-num-input');
  const changes = []; // { sid, oldNum, newNum }

  // 1. Collect & validate inputs
  for (const inp of inputs) {
    const sid = inp.dataset.sid;
    const newNum = parseInt(inp.value, 10);
    if (isNaN(newNum) || newNum < 10) {
      toast('מספר ספק חייב להיות 10 ומעלה', 'e');
      inp.focus();
      return;
    }
    changes.push({ sid, oldNum: supplierNumCache[sid], newNum });
  }

  // 2. Check for duplicate numbers in the form
  const nums = changes.map(c => c.newNum);
  const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
  if (dupes.length) {
    toast(`מספר ספק ${dupes[0]} מופיע יותר מפעם אחת`, 'e');
    return;
  }

  // 3. Filter to only changed rows
  const changed = changes.filter(c => c.oldNum !== c.newNum);
  if (!changed.length) {
    supplierEditMode = false;
    loadSuppliersTab();
    toast('לא בוצעו שינויים', 'w');
    return;
  }

  // 4. PO lock — block change if supplier has existing POs
  showLoading('בודק הזמנות רכש...');
  try {
    for (const c of changed) {
      const { data: pos } = await sb.from(T.PO)
        .select('id')
        .eq('supplier_id', c.sid)
        .limit(1);
      if (pos && pos.length > 0) {
        const supName = supplierCacheRev[c.sid] || c.sid;
        toast(`לא ניתן לשנות מספר לספק "${supName}" — יש לו הזמנות רכש`, 'e');
        hideLoading();
        return;
      }
    }
  } catch (e) {
    toast('שגיאה בבדיקת הזמנות: ' + (e.message || ''), 'e');
    hideLoading();
    return;
  }

  // 5. Save using temp negative numbers to avoid unique constraint collision
  showLoading('שומר מספרי ספקים...');
  try {
    // Step A: set changed rows to temp negative values
    for (let i = 0; i < changed.length; i++) {
      const tempNum = -(i + 1);
      const { error } = await sb.from('suppliers')
        .update({ supplier_number: tempNum })
        .eq('id', changed[i].sid);
      if (error) throw new Error(error.message);
    }
    // Step B: set final values
    for (const c of changed) {
      const { error } = await sb.from('suppliers')
        .update({ supplier_number: c.newNum })
        .eq('id', c.sid);
      if (error) throw new Error(error.message);
    }

    await loadLookupCaches();
    supplierEditMode = false;
    loadSuppliersTab();
    toast('מספרי ספקים נשמרו בהצלחה ✓', 's');
  } catch (e) {
    toast('שגיאה בשמירה: ' + (e.message || ''), 'e');
    // Attempt rollback — restore original numbers
    try {
      for (const c of changed) {
        await sb.from('suppliers')
          .update({ supplier_number: c.oldNum })
          .eq('id', c.sid);
      }
      await loadLookupCaches();
      loadSuppliersTab();
    } catch (_) { /* best effort */ }
  }
  hideLoading();
}

async function getNextSupplierNumber() {
  const { data: rows } = await sb.from('suppliers')
    .select('supplier_number')
    .order('supplier_number', { ascending: true });
  const used = new Set((rows || []).map(r => r.supplier_number).filter(n => n != null));
  let n = 10;
  while (used.has(n)) n++;
  return n;
}

async function addSupplier() {
  const name = $('new-supplier-name').value.trim();
  if (!name) { toast('יש להזין שם ספק', 'w'); return; }
  if (suppliers.includes(name)) { toast('ספק כבר קיים', 'w'); return; }

  showLoading('מוסיף ספק...');
  try {
    const nextNum = await getNextSupplierNumber();
    const { error } = await sb.from('suppliers').insert({ name, active: true, supplier_number: nextNum });
    if (error) throw new Error(error.message);
    await loadLookupCaches();
    suppliers = Object.keys(supplierCache).sort();
    populateDropdowns();
    loadSuppliersTab();
    $('new-supplier-name').value = '';
    toast(`ספק "${name}" נוסף בהצלחה (מספר ${nextNum})`, 's');
  } catch(e) {
    toast('שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}
