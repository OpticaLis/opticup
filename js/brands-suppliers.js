// =========================================================
// TAB 4: BRANDS
// =========================================================
let brandsEdited = [];

async function loadBrandsTab() {
  showLoading('טוען מותגים...');
  try {
    const { data: brandRows, error } = await sb.from('brands').select('*');
    if (error) throw new Error(error.message);
    brandsEdited = (brandRows || []).map(b => ({
      id: b.id,
      name: b.name || '',
      type: enToHe('brand_type', b.brand_type) || '',
      defaultSync: enToHe('website_sync', b.default_sync) || '',
      active: b.active === true,
      excludeWebsite: b.exclude_website === true,
      minStockQty: b.min_stock_qty ?? null,
      isNew: false
    }));
    renderBrandsTable();
  } catch(e) {
    setAlert('brands-alerts', 'שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}

function renderBrandsTable() {
  const tb = $('brands-body');
  tb.innerHTML = brandsEdited.map((b,i) => `
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
      <td><input type="checkbox" ${b.active?'checked':''} onchange="brandsEdited[${i}].active=this.checked"></td>
      <td><input type="checkbox" ${b.excludeWebsite?'checked':''} onchange="brandsEdited[${i}].excludeWebsite=this.checked"></td>
      <td><input type="number" min="0" step="1" value="${b.minStockQty ?? ''}" placeholder="${b.type==='יוקרה'?'5':b.type==='מותג'?'15':'—'}" style="width:70px;text-align:center" data-id="${b.id||''}" data-field="min_stock_qty" class="brand-min-stock-input" onchange="brandsEdited[${i}].minStockQty=this.value===''?null:parseInt(this.value,10);${b.id?'saveBrandField(this)':''}"></td>
    </tr>
  `).join('');
}

function addBrandRow() {
  brandsEdited.push({ id: null, name: '', type: '', defaultSync: '', active: true, excludeWebsite: false, isNew: true });
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
    // Update existing brands
    const existing = brandsEdited.filter(b => b.id && !b.isNew);
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
    const newBrands = brandsEdited.filter(b => b.isNew && b.name);
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
function loadSuppliersTab() {
  const tb = $('suppliers-body');
  tb.innerHTML = suppliers.map((s,i) => {
    const sid = supplierCache[s];
    const num = supplierNumCache[sid] || '—';
    return `<tr>
      <td>${num}</td>
      <td><strong>${s}</strong></td>
      <td><button class="btn btn-d btn-sm" onclick="toast('לא ניתן למחוק ספק מהממשק','w')">&#10006;</button></td>
    </tr>`;
  }).join('');
}

async function addSupplier() {
  const name = $('new-supplier-name').value.trim();
  if (!name) { toast('יש להזין שם ספק', 'w'); return; }
  if (suppliers.includes(name)) { toast('ספק כבר קיים', 'w'); return; }

  showLoading('מוסיף ספק...');
  try {
    const { data: maxRow } = await sb.from('suppliers')
      .select('supplier_number')
      .order('supplier_number', { ascending: false })
      .limit(1)
      .single();
    const nextNum = (maxRow?.supplier_number || 9) + 1;
    const { error } = await sb.from('suppliers').insert({ name, active: true, supplier_number: nextNum });
    if (error) throw new Error(error.message);
    await loadLookupCaches();
    suppliers = Object.keys(supplierCache).sort();
    populateDropdowns();
    loadSuppliersTab();
    $('new-supplier-name').value = '';
    toast(`ספק "${name}" נוסף בהצלחה`, 's');
  } catch(e) {
    toast('שגיאה: '+(e.message||''), 'e');
  }
  hideLoading();
}
