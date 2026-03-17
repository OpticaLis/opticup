// =========================================================
// TAB 4: BRANDS
// =========================================================
let allBrandsData = [];
let brandsEdited = [];
let brandStockByBrand = {};

async function loadBrandsTab() {
  showLoading('טוען מותגים...');
  try {
    const { data: brandRows, error } = await sb.from('brands').select('*').eq('tenant_id', getTenantId());
    if (error) throw new Error(error.message);

    // Paginate inventory stock query (server may cap at 1000 rows)
    let stockData = [], from = 0;
    const PAGE = 1000;
    while (true) {
      const { data: batch } = await sb.from(T.INV).select('brand_id, quantity')
        .eq('tenant_id', getTenantId()).eq('is_deleted', false)
        .range(from, from + PAGE - 1);
      if (!batch?.length) break;
      stockData.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }

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
      <td><input value="${escapeHtml(b.name)}" onchange="brandsEdited[${i}].name=this.value"></td>
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
  const msg = isActive
    ? 'הפעלת מותג תחזיר אותו לכל הרשימות. להמשיך?'
    : 'השבתת מותג תסתיר אותו מכל הרשימות. להמשיך?';
  const ok = await confirmDialog(isActive ? 'הפעלת מותג' : 'השבתת מותג', msg);
  if (!ok) { renderBrandsTable(); return; }
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
        min_stock_qty: b.minStockQty ?? null,
        tenant_id: getTenantId()
      }));
      const { error } = await sb.from('brands').insert(rows);
      if (error) throw new Error(error.message);
      createCount = newBrands.length;
    }

    // Reload brands cache
    await loadLookupCaches();
    const { data: brandRows } = await sb.from('brands').select('*').eq('tenant_id', getTenantId());
    brands = (brandRows || []).map(b => ({
      id: b.id,
      name: b.name || '',
      type: enToHe('brand_type', b.brand_type) || '',
      defaultSync: enToHe('website_sync', b.default_sync) || '',
      active: b.active === true
    })).filter(b => b.name);

    window.brandSyncCache = {};
    brands.forEach(b => { if (b.defaultSync) window.brandSyncCache[b.name] = b.defaultSync; });

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
