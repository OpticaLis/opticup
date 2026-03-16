// ============================================================
// stock-count-list.js — Stock Count list screen
// ============================================================

// ── Status labels ────────────────────────────────────────────
const SC_STATUS = {
  in_progress: { text: 'בתהליך',  color: '#2196F3' },
  completed:   { text: 'הושלם',   color: '#4CAF50' },
  cancelled:   { text: 'בוטל',    color: '#9e9e9e' }
};

// ── Restore list HTML if tab was replaced by session/pin screen ──
function ensureStockCountListHTML() {
  if (document.getElementById('sc-list-body')) return;
  const tab = document.getElementById('tab-stock-count');
  if (!tab) return;
  tab.innerHTML = `
    <div style="padding:16px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px">
        <h2 style="margin:0">&#128202; ספירת מלאי</h2>
        <button class="btn btn-p" onclick="startNewCount()" style="padding:8px 18px;font-size:15px">+ ספירה חדשה</button>
      </div>
      <div class="sc-summary" style="display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap">
        <div class="slog-card" style="flex:1;min-width:140px;background:var(--white);border-radius:var(--radius);padding:18px;text-align:center;box-shadow:var(--shadow)">
          <div style="font-size:2rem;font-weight:700;color:#2196F3" id="sc-open">0</div>
          <div style="font-size:.82rem;color:var(--g500);margin-top:4px">ספירות פתוחות</div>
        </div>
        <div class="slog-card" style="flex:1;min-width:140px;background:var(--white);border-radius:var(--radius);padding:18px;text-align:center;box-shadow:var(--shadow)">
          <div style="font-size:2rem;font-weight:700;color:#4CAF50" id="sc-completed">0</div>
          <div style="font-size:.82rem;color:var(--g500);margin-top:4px">הושלמו החודש</div>
        </div>
        <div class="slog-card" style="flex:1;min-width:140px;background:var(--white);border-radius:var(--radius);padding:18px;text-align:center;box-shadow:var(--shadow)">
          <div style="font-size:2rem;font-weight:700;color:#f44336" id="sc-diffs">0</div>
          <div style="font-size:.82rem;color:var(--g500);margin-top:4px">פערים החודש</div>
        </div>
      </div>
      <div id="sc-list-alerts"></div>
      <div style="overflow-x:auto; border:1px solid var(--g200); border-radius:8px">
        <table style="width:100%; border-collapse:collapse; font-size:.85rem">
          <thead>
            <tr style="background:var(--primary); color:white; text-align:right">
              <th style="padding:10px">מספר ספירה</th>
              <th style="padding:10px">תאריך</th>
              <th style="padding:10px">סטטוס</th>
              <th style="padding:10px">נספרו</th>
              <th style="padding:10px">פערים</th>
              <th style="padding:10px">מבצע</th>
              <th style="padding:10px">פעולות</th>
            </tr>
          </thead>
          <tbody id="sc-list-body">
            <tr><td colspan="7" style="text-align:center;padding:30px;color:#999">טוען...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Tab entry point ──────────────────────────────────────────
async function loadStockCountTab() {
  ensureStockCountListHTML();
  const body = document.getElementById('sc-list-body');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#999">טוען...</td></tr>';

  try {
    showLoading('טוען ספירות מלאי...');
    const counts = await fetchAll(T.STOCK_COUNTS, null);
    counts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Summary cards
    const now = new Date();
    const thisMonth = counts.filter(c => {
      const d = new Date(c.count_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const open = counts.filter(c => c.status === 'in_progress').length;
    const completedMonth = thisMonth.filter(c => c.status === 'completed').length;
    const diffsMonth = thisMonth.reduce((sum, c) => sum + (c.total_diffs || 0), 0);

    document.getElementById('sc-open').textContent = open;
    document.getElementById('sc-completed').textContent = completedMonth;
    document.getElementById('sc-diffs').textContent = diffsMonth;

    renderStockCountList(counts);
  } catch (err) {
    setAlert('sc-list-alerts', 'שגיאה בטעינת ספירות: ' + err.message, 'e');
    body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--error)">שגיאה בטעינה</td></tr>';
  } finally {
    hideLoading();
  }
}

// ── Render table ─────────────────────────────────────────────
function renderStockCountList(counts) {
  const body = document.getElementById('sc-list-body');
  if (!counts.length) {
    body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#999">אין ספירות מלאי עדיין</td></tr>';
    return;
  }

  body.innerHTML = counts.map(c => {
    const s = SC_STATUS[c.status] || { text: c.status, color: '#888' };
    const date = c.count_date ? new Date(c.count_date).toLocaleDateString('he-IL') : '—';
    const counted = c.total_items || 0;
    const diffs = c.total_diffs || 0;
    const performer = c.counted_by ? escapeHtml(c.counted_by) : '—';

    let actions = '';
    if (c.status === 'in_progress') {
      actions = `<button class="btn btn-p btn-sm" onclick="openWorkerPin('${escapeHtml(c.id)}')">המשך</button>
        <button class="btn btn-d btn-sm" onclick="toast('בקרוב','w')">ביטול</button>`;
    } else if (c.status === 'completed') {
      actions = `<button class="btn btn-g btn-sm" onclick="toast('בקרוב','w')">צפייה</button>`;
    } else {
      actions = '—';
    }

    return `<tr>
      <td style="font-weight:600">${escapeHtml(c.count_number || '—')}</td>
      <td>${date}</td>
      <td><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:.78rem;font-weight:600;color:white;background:${s.color}">${s.text}</span></td>
      <td>${counted}</td>
      <td>${diffs}</td>
      <td>${performer}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
}

// ── Count number generation ──────────────────────────────────
async function generateCountNumber() {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;
  const { data } = await sb.from(T.STOCK_COUNTS)
    .select('count_number')
    .like('count_number', `${prefix}%`)
    .order('count_number', { ascending: false })
    .limit(1);
  let seq = 1;
  if (data?.length) {
    const parts = data[0].count_number.split('-');
    seq = (parseInt(parts[parts.length - 1]) || 0) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Start new count — show filter screen ─────────────────────
function startNewCount() {
  _scFilterCriteria = {};
  _showCountFilterScreen();
}

let _scFilterCriteria = {};
let _scBrandsList = []; // brands loaded for filter screen
let _scActiveCats = []; // active category filters

async function _showCountFilterScreen() {
  const tab = document.getElementById('tab-stock-count');
  if (!tab) return;

  // Load brands
  var brands = [];
  if (typeof allBrandsData !== 'undefined' && allBrandsData.length) {
    brands = allBrandsData.filter(b => b.active !== false);
  } else {
    try { brands = await fetchAll(T.BRANDS, [['active', 'eq', true]]); } catch(e) {}
  }
  brands.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  _scBrandsList = brands;
  _scActiveCats = [];

  // Load suppliers
  var suppliers = [];
  if (typeof allSuppliersData !== 'undefined' && allSuppliersData.length) {
    suppliers = allSuppliersData.filter(s => s.active !== false);
  } else {
    try { suppliers = await fetchAll(T.SUPPLIERS, [['active', 'eq', true]]); } catch(e) {}
  }

  var brandChecks = brands.map(b =>
    '<label class="sc-brand-label" data-brand-type="' + (b.brand_type || '') + '" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#f0f4ff;border-radius:6px;font-size:.82rem;cursor:pointer;white-space:nowrap">' +
      '<input type="checkbox" class="sc-brand-cb" value="' + b.id + '"> ' + escapeHtml(b.name) +
    '</label>'
  ).join('');

  var supOpts = '<option value="">ספק — הכל</option>';
  suppliers.forEach(s => { supOpts += '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>'; });

  var ptypes = [
    { val: 'eyeglasses', he: 'משקפי ראייה' },
    { val: 'sunglasses', he: 'משקפי שמש' }
  ];
  var ptypeChecks = ptypes.map(p =>
    '<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#f0fff0;border-radius:6px;font-size:.82rem;cursor:pointer">' +
      '<input type="checkbox" class="sc-ptype-cb" value="' + p.val + '"> ' + escapeHtml(p.he) +
    '</label>'
  ).join('');

  tab.innerHTML = `
    <div style="padding:16px;max-width:700px;margin:0 auto">
      <h2 style="color:var(--primary);margin-bottom:16px">&#128202; ספירה חדשה — סינון פריטים</h2>
      <div style="background:var(--white);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow)">
        <div style="margin-bottom:16px">
          <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:6px">מותגים</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px">
            <span style="font-size:.82rem;color:var(--g600);margin-left:6px">סנן לפי קטגוריה:</span>
            <button class="sc-cat-btn sc-cat-active" data-cat="all" onclick="_scToggleCat('all')" style="padding:4px 14px;border-radius:16px;border:2px solid var(--primary);background:var(--primary);color:white;font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s">הכל</button>
            <button class="sc-cat-btn" data-cat="luxury" onclick="_scToggleCat('luxury')" style="padding:4px 14px;border-radius:16px;border:2px solid var(--primary);background:transparent;color:var(--primary);font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s">יוקרה</button>
            <button class="sc-cat-btn" data-cat="brand" onclick="_scToggleCat('brand')" style="padding:4px 14px;border-radius:16px;border:2px solid var(--primary);background:transparent;color:var(--primary);font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s">מותג</button>
            <button class="sc-cat-btn" data-cat="none" onclick="_scToggleCat('none')" style="padding:4px 14px;border-radius:16px;border:2px solid var(--primary);background:transparent;color:var(--primary);font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s">ללא מותג</button>
          </div>
          <div style="display:flex;gap:4px;margin-bottom:6px">
            <button class="btn btn-sm" onclick="_scToggleAllBrands(true)" style="font-size:.78rem;padding:4px 10px">בחר הכל</button>
            <button class="btn btn-sm" onclick="_scToggleAllBrands(false)" style="font-size:.78rem;padding:4px 10px">נקה הכל</button>
          </div>
          <div id="sc-filter-brands" style="display:flex;flex-wrap:wrap;gap:6px;max-height:200px;overflow-y:auto;padding:4px;border:1px solid var(--g200);border-radius:6px">
            ${brandChecks || '<span style="color:#999">אין מותגים</span>'}
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:6px">סוג מוצר</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${ptypeChecks}</div>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:6px">ספק</label>
          <select id="sc-filter-supplier" style="padding:8px;border:1px solid var(--g300);border-radius:6px;font-family:inherit;font-size:.88rem;width:100%">${supOpts}</select>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:6px">טווח מחירים (עלות)</label>
          <div style="display:flex;gap:10px;align-items:center">
            <input type="number" id="sc-filter-price-min" placeholder="מינימום" min="0" style="width:120px;padding:8px;border:1px solid var(--g300);border-radius:6px;font-family:inherit">
            <span>—</span>
            <input type="number" id="sc-filter-price-max" placeholder="מקסימום" min="0" style="width:120px;padding:8px;border:1px solid var(--g300);border-radius:6px;font-family:inherit">
          </div>
        </div>
        <div id="sc-filter-preview" style="background:#f5f7fa;border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;font-size:.9rem;color:var(--primary)">
          טוען תצוגה מקדימה...
        </div>
        <div id="sc-filter-desc" style="font-size:.82rem;color:var(--g500);margin-bottom:12px;min-height:18px"></div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-p" onclick="_scConfirmFilters()" style="min-height:48px;font-size:15px;padding:8px 24px">&#9989; צור ספירה</button>
          <button class="btn btn-g" onclick="loadStockCountTab()" style="min-height:48px;font-size:15px;padding:8px 24px">&#8592; חזרה</button>
        </div>
      </div>
    </div>`;

  // Preview count after short delay
  setTimeout(_scUpdateFilterPreview, 300);

  // Add change listeners for live preview
  document.querySelectorAll('.sc-brand-cb, .sc-ptype-cb').forEach(cb => {
    cb.addEventListener('change', () => { clearTimeout(_scPreviewTimer); _scPreviewTimer = setTimeout(_scUpdateFilterPreview, 400); });
  });
  var supSel = document.getElementById('sc-filter-supplier');
  if (supSel) supSel.addEventListener('change', () => { clearTimeout(_scPreviewTimer); _scPreviewTimer = setTimeout(_scUpdateFilterPreview, 400); });
  ['sc-filter-price-min', 'sc-filter-price-max'].forEach(id => {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { clearTimeout(_scPreviewTimer); _scPreviewTimer = setTimeout(_scUpdateFilterPreview, 500); });
  });
}

let _scPreviewTimer = null;

function _scToggleCat(cat) {
  if (cat === 'all') {
    _scActiveCats = [];
  } else {
    var idx = _scActiveCats.indexOf(cat);
    if (idx >= 0) _scActiveCats.splice(idx, 1);
    else _scActiveCats.push(cat);
  }
  // Update button styles
  document.querySelectorAll('.sc-cat-btn').forEach(function(btn) {
    var bc = btn.getAttribute('data-cat');
    var isActive = (bc === 'all' && !_scActiveCats.length) || _scActiveCats.indexOf(bc) >= 0;
    btn.style.background = isActive ? 'var(--primary)' : 'transparent';
    btn.style.color = isActive ? 'white' : 'var(--primary)';
    btn.classList.toggle('sc-cat-active', isActive);
  });
  // Filter visible brands
  _scApplyCategoryFilter();
  clearTimeout(_scPreviewTimer);
  _scPreviewTimer = setTimeout(_scUpdateFilterPreview, 300);
}

function _scApplyCategoryFilter() {
  document.querySelectorAll('.sc-brand-label').forEach(function(lbl) {
    var bt = lbl.getAttribute('data-brand-type') || '';
    if (!_scActiveCats.length) {
      lbl.style.display = '';
      return;
    }
    var show = false;
    for (var i = 0; i < _scActiveCats.length; i++) {
      if (_scActiveCats[i] === 'luxury' && bt === 'luxury') show = true;
      else if (_scActiveCats[i] === 'brand' && bt === 'brand') show = true;
      else if (_scActiveCats[i] === 'none' && !bt) show = true;
    }
    lbl.style.display = show ? '' : 'none';
  });
}

function _scToggleAllBrands(checked) {
  // Only toggle visible (not hidden by category filter) brands
  document.querySelectorAll('.sc-brand-label').forEach(function(lbl) {
    if (lbl.style.display === 'none') return;
    var cb = lbl.querySelector('.sc-brand-cb');
    if (cb) cb.checked = checked;
  });
  clearTimeout(_scPreviewTimer);
  _scPreviewTimer = setTimeout(_scUpdateFilterPreview, 300);
}

function _scCollectFilters() {
  var brandIds = [];
  document.querySelectorAll('.sc-brand-cb:checked').forEach(cb => { brandIds.push(cb.value); });
  var ptypes = [];
  document.querySelectorAll('.sc-ptype-cb:checked').forEach(cb => { ptypes.push(cb.value); });
  var supplierId = (document.getElementById('sc-filter-supplier') || {}).value || '';
  var priceMin = parseFloat((document.getElementById('sc-filter-price-min') || {}).value) || null;
  var priceMax = parseFloat((document.getElementById('sc-filter-price-max') || {}).value) || null;
  return { brands: brandIds, product_types: ptypes, supplier_id: supplierId, price_min: priceMin, price_max: priceMax };
}

async function _scUpdateFilterPreview() {
  var previewEl = document.getElementById('sc-filter-preview');
  var descEl = document.getElementById('sc-filter-desc');
  if (!previewEl) return;
  previewEl.textContent = 'טוען...';

  var f = _scCollectFilters();
  var hasFilters = f.brands.length || f.product_types.length || f.supplier_id || f.price_min || f.price_max;

  try {
    var filters = [['is_deleted', 'eq', false], ['quantity', 'gt', 0]];
    if (f.brands.length) filters.push(['brand_id', 'in', f.brands]);
    if (f.product_types.length) filters.push(['product_type', 'in', f.product_types]);
    if (f.supplier_id) filters.push(['supplier_id', 'eq', f.supplier_id]);
    if (f.price_min) filters.push(['cost_price', 'gte', f.price_min]);
    if (f.price_max) filters.push(['cost_price', 'lte', f.price_max]);

    var items = await fetchAll(T.INV, filters);
    var count = items.length;
    previewEl.innerHTML = '<strong style="font-size:1.4rem">' + count + '</strong> \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D9\u05D9\u05DB\u05DC\u05DC\u05D5 \u05D1\u05E1\u05E4\u05D9\u05E8\u05D4';

    // Description
    if (descEl) {
      if (!hasFilters) {
        descEl.textContent = '\u05DB\u05DC \u05D4\u05DE\u05DC\u05D0\u05D9 — \u05DC\u05DC\u05D0 \u05E1\u05D9\u05E0\u05D5\u05DF';
      } else {
        var parts = [];
        if (f.brands.length) {
          var brandNames = [];
          document.querySelectorAll('.sc-brand-cb:checked').forEach(cb => {
            var lbl = cb.parentElement;
            if (lbl) brandNames.push(lbl.textContent.trim());
          });
          parts.push('\u05DE\u05D5\u05EA\u05D2\u05D9\u05DD: ' + brandNames.slice(0, 5).join(', ') + (brandNames.length > 5 ? ' (+' + (brandNames.length - 5) + ')' : ''));
        }
        if (f.product_types.length) {
          var ptMap = { eyeglasses: '\u05DE\u05E9\u05E7\u05E4\u05D9 \u05E8\u05D0\u05D9\u05D9\u05D4', sunglasses: '\u05DE\u05E9\u05E7\u05E4\u05D9 \u05E9\u05DE\u05E9' };
          parts.push('\u05E1\u05D5\u05D2: ' + f.product_types.map(p => ptMap[p] || p).join(', '));
        }
        if (f.supplier_id) {
          var sel = document.getElementById('sc-filter-supplier');
          if (sel && sel.selectedOptions[0]) parts.push('\u05E1\u05E4\u05E7: ' + sel.selectedOptions[0].textContent);
        }
        if (f.price_min || f.price_max) {
          parts.push('\u05DE\u05D7\u05D9\u05E8: ' + (f.price_min || 0) + '–' + (f.price_max || '\u221E'));
        }
        descEl.textContent = '\u05E1\u05E4\u05D9\u05E8\u05D4 \u05DC\u05E4\u05D9: ' + parts.join(' | ');
      }
    }
  } catch (e) {
    previewEl.textContent = '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05D4';
    console.error('_scUpdateFilterPreview error:', e);
  }
}

function _scConfirmFilters() {
  _scFilterCriteria = _scCollectFilters();
  var hasFilters = _scFilterCriteria.brands.length || _scFilterCriteria.product_types.length ||
    _scFilterCriteria.supplier_id || _scFilterCriteria.price_min || _scFilterCriteria.price_max;
  if (!hasFilters) _scFilterCriteria = {};
  openWorkerPin(null);
}
