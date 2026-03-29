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
  const searchInput  = document.getElementById('brand-search-input');
  const searchTerm   = searchInput?.value?.trim().toLowerCase() || '';
  const clearBtn     = document.getElementById('brand-search-clear');
  if (clearBtn) clearBtn.style.display = searchTerm ? 'block' : 'none';

  let filtered = allBrandsData;
  if (filterActive === 'true')  filtered = filtered.filter(b => b.active !== false);
  if (filterActive === 'false') filtered = filtered.filter(b => b.active === false);
  if (filterSync) filtered = filtered.filter(b => b.defaultSync === filterSync);
  if (filterType === 'luxury')  filtered = filtered.filter(b => b.brand_type === 'luxury');
  else if (filterType === 'brand') filtered = filtered.filter(b => b.brand_type === 'brand');
  else if (filterType === 'regular') filtered = filtered.filter(b => !b.brand_type);
  if (filterLowStock === 'low') {
    filtered = filtered.filter(b =>
      b.active !== false &&
      b.minStockQty !== null &&
      b.minStockQty !== undefined &&
      b.currentQty < b.minStockQty
    );
  }
  if (searchTerm) filtered = filtered.filter(b => b.name.toLowerCase().includes(searchTerm));

  // Sort alphabetically by brand name (Hebrew + English aware)
  filtered.sort((a, b) => a.name.localeCompare(b.name, 'he'));

  brandsEdited = filtered;

  const countEl = document.getElementById('brand-filter-count');
  if (countEl) countEl.textContent = `מציג ${filtered.length} מותגים`;

  const tb = $('brands-body');
  tb.innerHTML = brandsEdited.map((b, i) => {
    const inactive = b.active === false;
    const minStockStyle = inactive
      ? 'width:70px;text-align:center;opacity:0.3;pointer-events:none'
      : 'width:70px;text-align:center';
    const qty = b.currentQty;
    const minQ = b.minStockQty;
    const isLow = !inactive && minQ != null && qty < minQ;
    const color = inactive ? 'color:#999' : (minQ == null ? '' : (isLow ? 'color:#e53935' : 'color:#2e7d32'));
    // Mark dirty on any field change
    var d = '_markDirty('+i+');';
    // Action buttons based on state
    var delBtn = '';
    if (b.isNew) {
      delBtn = '<button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;font-size:.75rem;padding:2px 6px" onclick="_cancelNewBrand(' + i + ')" title="\u05D1\u05D8\u05DC">\u2716</button>';
    } else if (b.id && inactive) {
      // Inactive brand: reactivate + permanent delete
      delBtn = '<button class="btn btn-sm" style="background:#dcfce7;color:#16a34a;font-size:.72rem;padding:2px 5px;margin-left:2px" onclick="_reactivateBrand(\'' + b.id + '\',' + i + ')" title="\u05D4\u05E4\u05E2\u05DC \u05DE\u05D7\u05D3\u05E9">\u267B\uFE0F</button>' +
        (qty > 0
          ? '<button class="btn btn-sm" style="background:#f3f4f6;color:#9ca3af;font-size:.72rem;padding:2px 5px;cursor:not-allowed" disabled title="' + qty + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D1\u05DE\u05DC\u05D0\u05D9">\u274C</button>'
          : '<button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;font-size:.72rem;padding:2px 5px" onclick="_permanentDeleteBrand(\'' + b.id + '\',' + i + ')" title="\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA">\u274C</button>');
    } else if (b.id) {
      // Active brand: soft-delete
      delBtn = qty > 0
        ? '<button class="btn btn-sm" style="background:#f3f4f6;color:#9ca3af;font-size:.75rem;padding:2px 6px;cursor:not-allowed" disabled title="\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D5\u05E7 \u2014 ' + qty + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D1\u05DE\u05DC\u05D0\u05D9">\uD83D\uDDD1\uFE0F</button>'
        : '<button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;font-size:.75rem;padding:2px 6px" onclick="_deleteBrand(\'' + b.id + '\',' + i + ')" title="\u05D4\u05E9\u05D1\u05EA \u05DE\u05D5\u05EA\u05D2">\uD83D\uDDD1\uFE0F</button>';
    }
    return `<tr data-idx="${i}"${inactive ? ' style="opacity:0.7"' : ''}>
      <td><input value="${escapeHtml(b.name)}" onchange="brandsEdited[${i}].name=this.value;${d}"></td>
      <td><select onchange="brandsEdited[${i}].type=this.value;${d}">
        <option value="">—</option>
        <option value="יוקרה"${b.type==='יוקרה'?' selected':''}>יוקרה</option>
        <option value="מותג"${b.type==='מותג'?' selected':''}>מותג</option>
      </select></td>
      <td><select onchange="brandsEdited[${i}].defaultSync=this.value;${d}">
        <option value="">—</option>
        <option value="מלא"${b.defaultSync==='מלא'?' selected':''}>מלא</option>
        <option value="תדמית"${b.defaultSync==='תדמית'?' selected':''}>תדמית</option>
        <option value="לא"${b.defaultSync==='לא'?' selected':''}>לא</option>
      </select></td>
      <td style="text-align:center"><input type="checkbox" ${b.active?'checked':''} onchange="setBrandActive('${b.id}',this.checked)" title="${b.active ? 'מותג פעיל' : 'מותג לא פעיל'}"></td>
      <td><input type="checkbox" ${b.excludeWebsite?'checked':''} onchange="brandsEdited[${i}].excludeWebsite=this.checked;${d}"></td>
      <td><input type="number" min="0" step="1" value="${b.minStockQty ?? ''}" placeholder="${b.type==='יוקרה'?'5':b.type==='מותג'?'15':'—'}" style="${minStockStyle}" data-id="${b.id||''}" data-field="min_stock_qty" class="brand-min-stock-input" onchange="brandsEdited[${i}].minStockQty=this.value===''?null:parseInt(this.value,10);${d}${b.id?'saveBrandField(this)':''}"></td>
      <td style="text-align:center;font-weight:600;${color}">${qty}${isLow ? ' ⚠️' : ''}</td>
      <td style="text-align:center">${delBtn}</td>
    </tr>`;
  }).join('');
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
  if (typeof refreshLowStockBanner === 'function') refreshLowStockBanner();
}

function addBrandRow() {
  const newBrand = { id: null, name: '', brand_type: '', type: '', defaultSync: '', active: true, excludeWebsite: false, minStockQty: null, currentQty: 0, isNew: true };
  allBrandsData.push(newBrand);
  renderBrandsTable();
  // New row with empty name sorts to top — scroll there
  var tb = $('brands-body');
  var firstRow = tb ? tb.querySelector('tr') : null;
  if (firstRow) {
    firstRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var inp = firstRow.querySelector('input');
    if (inp) setTimeout(function() { inp.focus(); }, 300);
  }
}

function _cancelNewBrand(filteredIdx) {
  var b = brandsEdited[filteredIdx];
  if (!b || !b.isNew) return;
  var realIdx = allBrandsData.indexOf(b);
  if (realIdx >= 0) allBrandsData.splice(realIdx, 1);
  renderBrandsTable();
}

function _markDirty(filteredIdx) {
  var b = brandsEdited[filteredIdx];
  if (b) b._dirty = true;
}

async function _deleteBrand(brandId, filteredIdx) {
  var b = brandsEdited[filteredIdx];
  if (!b || !brandId) return;
  if (b.currentQty > 0) {
    toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D5\u05E7 \u2014 ' + b.currentQty + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D1\u05DE\u05DC\u05D0\u05D9', 'w');
    return;
  }
  var ok = await confirmDialog('\u05DE\u05D7\u05D9\u05E7\u05EA \u05DE\u05D5\u05EA\u05D2', '\u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA "' + escapeHtml(b.name) + '"?');
  if (!ok) return;
  promptPin('\u05DE\u05D7\u05D9\u05E7\u05EA \u05DE\u05D5\u05EA\u05D2', function(pin) {
    verifyPinOnly(pin).then(function(valid) {
      if (!valid) { toast('PIN \u05E9\u05D2\u05D5\u05D9', 'e'); return; }
      _doDeleteBrand(brandId, b.name);
    });
  });
}

async function _doDeleteBrand(brandId, brandName) {
  try {
    var { error } = await sb.from('brands').update({ active: false })
      .eq('id', brandId).eq('tenant_id', getTenantId());
    if (error) throw error;
    writeLog('brand_delete', null, { brand_id: brandId, brand_name: brandName });
    toast('\u05D4\u05DE\u05D5\u05EA\u05D2 "' + brandName + '" \u05E0\u05DE\u05D7\u05E7', 's');
    loadBrandsTab();
  } catch (e) {
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  }
}

async function _reactivateBrand(brandId, filteredIdx) {
  var b = brandsEdited[filteredIdx];
  if (!b || !brandId) return;
  try {
    var { error } = await sb.from('brands').update({ active: true, updated_at: new Date().toISOString() })
      .eq('id', brandId).eq('tenant_id', getTenantId());
    if (error) throw error;
    var local = allBrandsData.find(function(x) { return x.id === brandId; });
    if (local) local.active = true;
    writeLog('brand_reactivate', null, { brand_id: brandId, brand_name: b.name });
    toast('\u05D4\u05DE\u05D5\u05EA\u05D2 "' + b.name + '" \u05D4\u05D5\u05E4\u05E2\u05DC \u05DE\u05D7\u05D3\u05E9', 's');
    renderBrandsTable();
    if (typeof refreshLowStockBanner === 'function') refreshLowStockBanner();
  } catch (e) { toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e'); }
}

async function _permanentDeleteBrand(brandId, filteredIdx) {
  var b = brandsEdited[filteredIdx];
  if (!b || !brandId) return;
  if (b.currentQty > 0) {
    toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D5\u05E7 \u2014 ' + b.currentQty + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D1\u05DE\u05DC\u05D0\u05D9', 'e');
    return;
  }
  var ok = await confirmDialog('\u05DE\u05D7\u05D9\u05E7\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA',
    '\u05DC\u05DE\u05D7\u05D5\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA \u05D0\u05EA "' + escapeHtml(b.name) + '"?\n\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05D1\u05DC\u05EA\u05D9 \u05D4\u05E4\u05D9\u05DB\u05D4!');
  if (!ok) return;
  // Double PIN (Iron Rule #3)
  promptPin('\u05DE\u05D7\u05D9\u05E7\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA \u2014 PIN \u05E8\u05D0\u05E9\u05D5\u05DF', function(pin1) {
    verifyPinOnly(pin1).then(function(v1) {
      if (!v1) { toast('PIN \u05E9\u05D2\u05D5\u05D9', 'e'); return; }
      promptPin('\u05DE\u05D7\u05D9\u05E7\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA \u2014 PIN \u05E9\u05E0\u05D9', function(pin2) {
        verifyPinOnly(pin2).then(function(v2) {
          if (!v2) { toast('PIN \u05E9\u05D2\u05D5\u05D9', 'e'); return; }
          _doPermanentDelete(brandId, b.name);
        });
      });
    });
  });
}

async function _doPermanentDelete(brandId, brandName) {
  try {
    var { error } = await sb.from('brands').delete()
      .eq('id', brandId).eq('tenant_id', getTenantId());
    if (error) throw error;
    writeLog('brand_permanent_delete', null, { brand_id: brandId, brand_name: brandName });
    toast('\u05D4\u05DE\u05D5\u05EA\u05D2 "' + brandName + '" \u05E0\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA', 's');
    allBrandsData = allBrandsData.filter(function(x) { return x.id !== brandId; });
    renderBrandsTable();
  } catch (e) { toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e'); }
}

async function saveBrands() {
  showLoading('\u05E9\u05D5\u05DE\u05E8 \u05DE\u05D5\u05EA\u05D2\u05D9\u05DD...');
  try {
    let updCount = 0, createCount = 0;
    // Update only DIRTY existing brands
    const dirtyExisting = allBrandsData.filter(b => b.id && !b.isNew && b._dirty);
    for (const b of dirtyExisting) {
      const { error } = await sb.from('brands').update({
        name: b.name,
        brand_type: heToEn('brand_type', b.type) || null,
        default_sync: heToEn('website_sync', b.defaultSync) || null,
        active: b.active,
        exclude_website: b.excludeWebsite,
        min_stock_qty: b.minStockQty ?? null
      }).eq('id', b.id);
      if (error) throw new Error(error.message);
      b._dirty = false;
      updCount++;
    }

    // Create new brands — check for duplicates first
    const newBrands = allBrandsData.filter(b => b.isNew && b.name);
    if (newBrands.length) {
      // Check each new name against DB (including inactive)
      var dupes = [];
      for (var ni = 0; ni < newBrands.length; ni++) {
        var nm = newBrands[ni].name.trim();
        var { data: dup } = await sb.from('brands').select('id, name, active')
          .eq('tenant_id', getTenantId()).ilike('name', nm).maybeSingle();
        if (dup) {
          dupes.push(dup.active === false
            ? '\u05D4\u05DE\u05D5\u05EA\u05D2 "' + nm + '" \u05E7\u05D9\u05D9\u05DD \u05D1\u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD \u2014 \u05E1\u05E0\u05DF "\u05D4\u05DB\u05DC" \u05DC\u05D4\u05E4\u05E2\u05D9\u05DC'
            : '\u05DE\u05D5\u05EA\u05D2 \u05D1\u05E9\u05DD "' + nm + '" \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD');
        }
      }
      if (dupes.length) {
        toast(dupes[0], 'e');
        hideLoading(); return;
      }
      const rows = newBrands.map(b => ({
        name: b.name.trim(),
        brand_type: heToEn('brand_type', b.type) || null,
        default_sync: heToEn('website_sync', b.defaultSync) || null,
        active: b.active,
        exclude_website: b.excludeWebsite,
        min_stock_qty: b.minStockQty ?? null,
        tenant_id: getTenantId()
      }));
      var { error: insErr } = await sb.from('brands').insert(rows);
      if (insErr) {
        if ((insErr.message || '').includes('duplicate') || (insErr.message || '').includes('unique')) {
          toast('\u05DE\u05D5\u05EA\u05D2 \u05D1\u05E9\u05DD \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u2014 \u05D1\u05D3\u05D5\u05E7 \u05D1\u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD', 'e');
          hideLoading(); return;
        }
        throw new Error(insErr.message);
      }
      createCount = newBrands.length;
    }

    var total = updCount + createCount;
    if (total === 0) {
      toast('\u05D0\u05D9\u05DF \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05DC\u05E9\u05DE\u05D9\u05E8\u05D4', 'i');
      hideLoading(); return;
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
    toast('\u05E0\u05E9\u05DE\u05E8\u05D5 ' + total + ' \u05DE\u05D5\u05EA\u05D2\u05D9\u05DD', 's');
    loadBrandsTab();
  } catch(e) {
    setAlert('brands-alerts', '\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e.message||''), 'e');
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
