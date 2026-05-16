// =========================================================
// TAB 5: SUPPLIERS
// =========================================================
let supplierEditMode = false;

// M1_INVENTORY_REDESIGN SPEC §2.3 (2026-05-16) — supplier category state.
// supplies_frames is derived from supplier_brand_distribution (junction table).
// supplies_lenses is derived from supplier_catalog_offering (junction table).
// `brands.supplier_id` does NOT exist — Brief §2.3 was wrong (SPEC §0.C F-DB-1).
let supplyFramesSet = new Set();
let supplyLensesSet = new Set();
let supplierFilter  = 'all'; // 'all' | 'frames' | 'lenses' | 'none'

async function _loadSupplierCategoryData() {
  // Defense-in-depth (Iron Rule 22): tenant_id filter even though RLS handles it.
  const tid = getTenantId();
  try {
    const [sbdRes, scoRes] = await Promise.all([
      sb.from('supplier_brand_distribution')
        .select('supplier_id')
        .eq('tenant_id', tid)
        .eq('status', 'active')
        .eq('is_deleted', false),
      sb.from('supplier_catalog_offering')
        .select('supplier_id')
        .eq('tenant_id', tid)
        .eq('status', 'active')
        .eq('is_deleted', false)
    ]);
    supplyFramesSet = new Set((sbdRes.data || []).map(r => r.supplier_id));
    supplyLensesSet = new Set((scoRes.data || []).map(r => r.supplier_id));
  } catch (e) {
    // Non-fatal — badges just won't render. Log and continue.
    console.warn('[suppliers] category data fetch failed:', e && e.message);
    supplyFramesSet = new Set();
    supplyLensesSet = new Set();
  }
}

function _supplierBadgesHtml(sid) {
  const f = supplyFramesSet.has(sid);
  const l = supplyLensesSet.has(sid);
  if (!f && !l) return '<span style="color:#94a3b8;font-size:11px">—</span>';
  let html = '';
  if (f) html += '<span class="supplier-cat-badge frames">&#128083; מסגרות</span>';
  if (l) html += '<span class="supplier-cat-badge lenses">&#128300; עדשות</span>';
  return html;
}

function _supplierMatchesFilter(sid) {
  if (supplierFilter === 'all') return true;
  const f = supplyFramesSet.has(sid);
  const l = supplyLensesSet.has(sid);
  if (supplierFilter === 'frames') return f;
  if (supplierFilter === 'lenses') return l;
  if (supplierFilter === 'none')   return !f && !l;
  return true;
}

function _renderSupplierFilterBar() {
  const bar = $('supplier-filter-bar');
  if (!bar) return;
  // Counts based on the currently-loaded suppliers (id resolution via supplierCache).
  let cAll = 0, cFrames = 0, cLenses = 0, cNone = 0;
  for (const name of suppliers) {
    const sid = supplierCache[name];
    if (!sid) continue;
    cAll++;
    const f = supplyFramesSet.has(sid);
    const l = supplyLensesSet.has(sid);
    if (f) cFrames++;
    if (l) cLenses++;
    if (!f && !l) cNone++;
  }
  const pill = (val, label, count) => {
    const active = supplierFilter === val ? ' active' : '';
    return `<button class="supplier-filter-pill${active}" onclick="_setSupplierFilter('${val}')">${label} <span class="count">(${count})</span></button>`;
  };
  bar.innerHTML =
    '<span class="filter-label">קטגוריה:</span>' +
    pill('all',    'הכל',             cAll) +
    pill('frames', '\u{1F453} מסגרות', cFrames) +
    pill('lenses', '\u{1F52C} עדשות',  cLenses) +
    pill('none',   'ללא קטגוריה',     cNone);
}

function _setSupplierFilter(val) {
  supplierFilter = val;
  loadSuppliersTab();
}

async function loadSuppliersTab() {
  const tb = $('suppliers-body');
  const editBtn = $('supplier-edit-btn');
  const saveBar = $('supplier-save-bar');

  // Toggle button/bar visibility
  if (editBtn) editBtn.style.display = supplierEditMode ? 'none' : '';
  if (saveBar) saveBar.style.display = supplierEditMode ? 'flex' : 'none';

  // Refresh category-membership data (cheap — 2 small filtered SELECTs).
  await _loadSupplierCategoryData();
  _renderSupplierFilterBar();

  tb.innerHTML = suppliers.filter(s => {
    const sid = supplierCache[s];
    return _supplierMatchesFilter(sid);
  }).map((s, i) => {
    const sid = supplierCache[s];
    const num = supplierNumCache[sid] || '';
    const badges = _supplierBadgesHtml(sid);
    if (supplierEditMode) {
      return `<tr>
        <td><input type="number" min="10" value="${num}" class="sup-num-input" data-sid="${sid}" style="width:70px;text-align:center"></td>
        <td><strong>${escapeHtml(s)}</strong></td>
        <td>${badges}</td>
        <td></td>
      </tr>`;
    }
    return `<tr>
      <td>${num || '—'}</td>
      <td><strong>${escapeHtml(s)}</strong></td>
      <td>${badges}</td>
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
  let q = sb.from('suppliers').select('supplier_number').order('supplier_number', { ascending: true });
  const tid = getTenantId();
  if (tid) q = q.eq('tenant_id', tid);
  const { data: rows } = await q;
  const used = new Set((rows || []).map(r => r.supplier_number).filter(n => n != null));
  let n = 10;
  while (used.has(n)) n++;
  return n;
}

async function addSupplier() {
  const name = $('new-supplier-name').value.trim();
  if (!name) { toast('יש להזין שם ספק', 'w'); return; }
  if (suppliers.includes(name)) { toast('ספק כבר קיים', 'w'); return; }

  const limit = await checkPlanLimit('suppliers');
  if (!limit.allowed) { Toast.warning(limit.message || 'הגעת למגבלה'); return; }

  showLoading('מוסיף ספק...');
  try {
    const nextNum = await getNextSupplierNumber();
    const { error } = await sb.from('suppliers').insert({ name, active: true, supplier_number: nextNum, tenant_id: getTenantId() });
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
