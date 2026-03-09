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
        exclude_website: b.excludeWebsite
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
        exclude_website: b.excludeWebsite
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

// =========================================================
// TAB 5: SUPPLIERS
// =========================================================
function loadSuppliersTab() {
  const tb = $('suppliers-body');
  tb.innerHTML = suppliers.map((s,i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${s}</strong></td>
      <td><button class="btn btn-d btn-sm" onclick="toast('לא ניתן למחוק ספק מהממשק','w')">&#10006;</button></td>
    </tr>
  `).join('');
}

async function addSupplier() {
  const name = $('new-supplier-name').value.trim();
  if (!name) { toast('יש להזין שם ספק', 'w'); return; }
  if (suppliers.includes(name)) { toast('ספק כבר קיים', 'w'); return; }

  showLoading('מוסיף ספק...');
  try {
    const { error } = await sb.from('suppliers').insert({ name, active: true });
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
