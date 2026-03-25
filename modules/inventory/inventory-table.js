// inventory-table.js — Inventory tab: paginated loading, filtering, sorting, row rendering
let invData = [];
let invFiltered = [];
let invChanges = {};
let invSelected = new Set();
let invSortField = '';
let invSortDir = 0; // 0=none, 1=asc, -1=desc
const INV_PAGE_SIZE = 50;
let invPage = 0;
let invTotalCount = 0;
let invTotalPages = 0;
let invCurrentFilters = {};
let invDebounceTimer = null;
var _receiptFilterIds = null;  // array of inventory IDs from receipt
var _receiptFilterNumber = ''; // receipt number for banner
var _noImagesFilter = false;   // show only items without images

async function loadInventoryPage() {
  showLoading('טוען מלאי...');
  clearAlert('inv-alerts');
  invChanges = {};
  $('inv-edit-notice').style.display = 'none';

  // Read filters from DOM
  const search = ($('inv-search')?.value || '').trim().toLowerCase();
  const supplier = $('inv-filter-supplier')?.value || '';
  const ptype = $('inv-filter-ptype')?.value || '';
  const qtyFilter = $('inv-filter-qty')?.value || '';
  invCurrentFilters = { search, supplier, ptype, qtyFilter };

  try {
    let query = sb.from('inventory')
      .select('*, inventory_images(*), brands(name), suppliers(name)', { count: 'exact' })
      .eq('is_deleted', false);

    // Receipt filter — show only specific inventory IDs
    if (_receiptFilterIds && _receiptFilterIds.length) {
      query = query.in('id', _receiptFilterIds);
    }
    if (supplier) { const suppId = supplierCache[supplier]; if (suppId) query = query.eq('supplier_id', suppId); }
    if (ptype) query = query.eq('product_type', heToEn('product_type', ptype));
    if (qtyFilter === '1') query = query.gt('quantity', 0);
    else if (qtyFilter === '0') query = query.lte('quantity', 0);
    if (search && search.length >= 2) {
      const safe = search.replace(/[,().\\]/g, '');
      if (safe) {
        const isNumeric = /^\d+$/.test(safe);
        const orParts = [];
        orParts.push(isNumeric ? `barcode.ilike.${safe}%` : `barcode.ilike.%${safe}%`);
        orParts.push(`model.ilike.%${safe}%`, `color.ilike.%${safe}%`);
        if (safe.length >= 3) orParts.push(`size.ilike.%${safe}%`, `notes.ilike.%${safe}%`);
        const matchBrandIds = Object.entries(brandCache).filter(([name]) => name.toLowerCase().includes(safe)).map(([, id]) => id);
        if (matchBrandIds.length) orParts.push(`brand_id.in.(${matchBrandIds.join(',')})`);
        const matchSupplierIds = Object.entries(supplierCache).filter(([name]) => name.toLowerCase().includes(safe)).map(([, id]) => id);
        if (matchSupplierIds.length) orParts.push(`supplier_id.in.(${matchSupplierIds.join(',')})`);
        query = query.or(orParts.join(','));
      }
    } else if (search && search.length === 1) {
      query = query.ilike('barcode', search + '%');
    }
    if (invSortField && invSortDir !== 0) {
      const enCol = FIELD_MAP.inventory[invSortField];
      if (enCol && enCol !== '_images') {
        query = query.order(enCol, { ascending: invSortDir === 1 });
      }
    } else { query = query.order('created_at', { ascending: false }); }
    const offset = invPage * INV_PAGE_SIZE;
    query = query.range(offset, offset + INV_PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    invTotalCount = count || 0;
    invTotalPages = Math.max(1, Math.ceil(invTotalCount / INV_PAGE_SIZE));
    if (invPage >= invTotalPages) invPage = Math.max(0, invTotalPages - 1);
    invData = (data || []).map(row => ({
      ...row,
      brand_name: brandCacheRev[row.brand_id] || '',
      supplier_name: supplierCacheRev[row.supplier_id] || '',
      _images: (row.inventory_images || []).map(img => ({
        url: img.url,
        thumbnails: {
          small: { url: img.thumbnail_url || img.url },
          large: { url: img.url }
        }
      }))
    }));
    // No-images client-side filter
    if (_noImagesFilter) {
      invData = invData.filter(function(r) { return !r._images || r._images.length === 0; });
      invTotalCount = invData.length;
      invTotalPages = Math.max(1, Math.ceil(invTotalCount / INV_PAGE_SIZE));
    }
    invFiltered = invData;
    var supplierSel = $('inv-filter-supplier'); var curVal = supplierSel.value;
    supplierSel.innerHTML = '<option value="">הכל</option>' + suppliers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    supplierSel.value = curVal;
    $('inv-count').textContent = invTotalCount;
    renderInventoryRows(invData);
    updatePaginationUI();
    updateSelectionUI();

    var isAdm = document.body.classList.contains('admin-mode');
    $('inv-admin-bar').style.display = isAdm ? 'flex' : 'none'; _renderReceiptBanner();
  } catch (e) {
    setAlert('inv-alerts', 'שגיאה בטעינת מלאי: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function updatePaginationUI() {
  var pag = $('inv-pagination'); if (!pag) return;
  if (invTotalPages <= 1) { pag.style.display = 'none'; }
  else {
    pag.style.display = 'flex';
    $('inv-page-info').textContent = `עמוד ${invPage + 1} מתוך ${invTotalPages} | סה"כ ${invTotalCount} פריטים`;
    $('inv-prev').disabled = invPage === 0;
    $('inv-next').disabled = invPage >= invTotalPages - 1;
  }
  var start = invPage * INV_PAGE_SIZE + 1, end = Math.min((invPage + 1) * INV_PAGE_SIZE, invTotalCount);
  $('inv-shown').textContent = invTotalCount > 0 ? `${start}–${end}` : '0';
}

function invPageNav(delta) {
  invPage += delta;
  if (invPage < 0) invPage = 0;
  if (invPage >= invTotalPages) invPage = invTotalPages - 1;
  loadInventoryPage();
}

async function loadInventoryTab() {
  invPage = 0;
  invSelected.clear();
  updateSelectionUI();
  await loadInventoryPage();
}

function filterInventoryTable() {
  clearTimeout(invDebounceTimer);
  var search = ($('inv-search')?.value || '').trim();
  // Faster debounce for barcode scans (numeric), longer for text search
  var delay = /^\d+$/.test(search) ? 200 : 400;
  invDebounceTimer = setTimeout(() => {
    invPage = 0;
    loadInventoryPage();
  }, delay);
}

function renderInventoryRows(recs) {
  const isAdm = document.body.classList.contains('admin-mode');
  const tb = $('inv-body');
  const pageOffset = invPage * INV_PAGE_SIZE;
  tb.innerHTML = recs.map((r, i) => {
    const bc = r.barcode || '';
    const qty = r.quantity ?? 0;
    const qC = qty > 0 ? 'var(--success)' : 'var(--error)';
    const sp = r.sell_price || 0;
    const sd = r.sell_discount ? Math.round(r.sell_discount * 100) : 0;
    const cp = r.cost_price || 0;
    const cd = r.cost_discount ? Math.round(r.cost_discount * 100) : 0;
    const sel = invSelected.has(r.id) ? ' selected-row' : '';
    const chk = invSelected.has(r.id) ? ' checked' : '';
    const imgs = r._images || [];
    const imgCell = imgs.length > 0
      ? `<span class="img-thumb-click" data-id="${escapeHtml(r.id)}" style="cursor:pointer;color:#2196F3;font-size:.75rem;font-weight:600" title="${imgs.length} תמונות — לחץ לצפייה">\uD83D\uDCF7${imgs.length}</span>`
      : '<span style="color:var(--g400);font-size:.75rem">\uD83D\uDCF7</span>';
    const syncVal = enToHe('website_sync', r.website_sync) || '';
    return `<tr data-id="${r.id}" class="${sel}">
      <td style="position:relative"><button class="btn-inv-menu" data-id="${escapeHtml(r.id)}" style="background:none;border:none;cursor:pointer;font-size:1.1rem;padding:4px 8px" title="פעולות">⋯</button></td>
      <td><button class="btn-item-history" style="background:none;border:none;cursor:pointer;font-size:1rem" data-id="${escapeHtml(r.id)}" data-barcode="${escapeHtml(bc)}" data-brand="${escapeHtml(r.brand_name||'')}" data-model="${escapeHtml(r.model||'')}" title="היסטוריה">📋</button></td>
      <td><input type="checkbox"${chk} class="inv-row-check" data-id="${escapeHtml(r.id)}"></td>
      <td>${pageOffset+i+1}</td>
      <td class="barcode-cell">${escapeHtml(bc)}</td>
      <td>${escapeHtml(r.supplier_name)||''}</td>
      <td>${escapeHtml(r.brand_name)||''}${(window.lowStockData||[]).some(b=>b.name===r.brand_name)?' <span style="background:#f44336;color:white;border-radius:4px;padding:1px 5px;font-size:11px;margin-right:4px">&#9888;</span>':''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'model\')"':''}>${escapeHtml(r.model)||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'size\')"':''}>${escapeHtml(r.size)||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'bridge\')"':''}>${escapeHtml(r.bridge)||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'color\')"':''}>${escapeHtml(r.color)||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'temple_length\')"':''}>${escapeHtml(r.temple_length)||''}</td>
      <td>${enToHe('product_type', r.product_type)||''}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'sell_price\',\'number\')"':''}>${sp}</td>
      <td${isAdm?' class="editable" onclick="invEdit(this,\'sell_discount\',\'pct\')"':''}>${sd}%</td>
      <td class="cost-col">${cp}</td>
      <td class="cost-col">${cd}%</td>
      <td style="font-weight:700;color:${qC}" data-qty-id="${r.id}">${qty}${isAdm?` <span class="qty-btns"><button class="qty-btn qty-plus" data-id="${escapeHtml(r.id)}" data-dir="add" title="הוסף כמות">➕</button><button class="qty-btn qty-minus" data-id="${escapeHtml(r.id)}" data-dir="remove" title="הוצא כמות">➖</button></span>`:''}</td>
      <td class="img-cell">${imgCell}</td>
      <td${isAdm?' class="editable" onclick="invEditSync(this)"':''}>${syncVal}</td>
    </tr>`;
  }).join('');
}

function sortInventory(th) {
  var field = th.dataset.field;
  if (invSortField === field) {
    invSortDir = invSortDir === 1 ? -1 : invSortDir === -1 ? 0 : 1;
  } else { invSortField = field; invSortDir = 1; }
  document.querySelectorAll('#inv-table th.sortable').forEach(h => {
    h.classList.remove('sort-asc', 'sort-desc');
    h.querySelector('.sort-icon').innerHTML = '&#9650;';
  });
  if (invSortDir !== 0) { th.classList.add(invSortDir === 1 ? 'sort-asc' : 'sort-desc'); th.querySelector('.sort-icon').innerHTML = invSortDir === 1 ? '&#9650;' : '&#9660;'; }
  invPage = 0; loadInventoryPage();
}

// --- Receipt filter + No-images filter ---
async function filterByReceipt(receiptId, receiptNumber) {
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9 \u05E7\u05D1\u05DC\u05D4...');
  try {
    var { data: items } = await sb.from(T.RCPT_ITEMS).select('inventory_id')
      .eq('receipt_id', receiptId).eq('tenant_id', getTenantId()).not('inventory_id', 'is', null);
    var ids = (items || []).map(function(i) { return i.inventory_id; }).filter(Boolean);
    hideLoading();
    if (!ids.length) { toast('\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05E7\u05D1\u05DC\u05D4 \u05D6\u05D5', 'w'); return; }
    _receiptFilterIds = ids;
    _receiptFilterNumber = receiptNumber || '';
    showTab('inventory');
  } catch (e) {
    hideLoading();
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  }
}

function clearReceiptFilter() {
  _receiptFilterIds = null;
  _receiptFilterNumber = '';
  _removeReceiptBanner();
  invPage = 0;
  loadInventoryPage();
}

function toggleNoImagesFilter() {
  _noImagesFilter = !_noImagesFilter;
  var btn = $('inv-filter-no-images');
  if (btn) {
    btn.style.background = _noImagesFilter ? '#2196F3' : '#e5e7eb';
    btn.style.color = _noImagesFilter ? '#fff' : '#1e293b';
  }
  invPage = 0;
  loadInventoryPage();
}

function _renderReceiptBanner() {
  _removeReceiptBanner();
  if (!_receiptFilterIds) return;
  var banner = document.createElement('div');
  banner.id = 'inv-receipt-banner';
  banner.style.cssText = 'background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:10px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between';
  banner.innerHTML = '<span style="font-size:.92rem;color:#1e40af">\uD83D\uDCF7 \u05DE\u05E6\u05D9\u05D2 ' + _receiptFilterIds.length +
    ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05E7\u05D1\u05DC\u05D4 #' + escapeHtml(_receiptFilterNumber) + '</span>' +
    '<button class="btn btn-sm" style="background:#1e40af;color:#fff" onclick="clearReceiptFilter()">\u2715 \u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF</button>';
  var table = $('inv-table');
  if (table && table.parentNode) table.parentNode.insertBefore(banner, table);
}

function _removeReceiptBanner() {
  var el = $('inv-receipt-banner');
  if (el) el.remove();
}

// --- ⋯ Action Menu ---
var _invMenuOpen = null;
function _openInvMenu(btn) {
  _closeInvMenu();
  var id = btn.dataset.id;
  var rec = invData.find(function(r) { return r.id === id; });
  if (!rec) return;
  var isAdm = document.body.classList.contains('admin-mode');
  var items = [
    { icon: '\uD83D\uDCF7', label: '\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA', fn: 'openImageModal', id: id },
    { icon: '\uD83D\uDCCB', label: '\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4', fn: 'openItemHistory', id: id, extra: "'" + escapeHtml(rec.barcode||'') + "','" + escapeHtml(rec.brand_name||'') + "','" + escapeHtml(rec.model||'') + "'" }
  ];
  if (isAdm) {
    items.push({ icon: '\uD83D\uDDD1\uFE0F', label: '\u05DE\u05D7\u05D9\u05E7\u05D4', fn: 'deleteInvRow', id: id, cls: 'color:#ef4444' });
  }
  var dd = document.createElement('div');
  dd.className = 'inv-action-menu';
  dd.innerHTML = items.map(function(it) {
    var safeId = escapeHtml(it.id);
    var args = it.extra ? "'" + safeId + "'," + it.extra : "'" + safeId + "'";
    var style = it.cls ? ' style="' + it.cls + '"' : '';
    return '<button' + style + ' onclick="_closeInvMenu();' + it.fn + '(' + args + ')">' + it.icon + ' ' + it.label + '</button>';
  }).join('');
  var rect = btn.getBoundingClientRect();
  var dropRight = window.innerWidth - rect.right;
  var dropLeft = rect.left;
  // If near right edge (RTL first column), open toward left; otherwise align right
  var posStyle = dropRight < 160 ? 'left:' + dropLeft + 'px' : 'right:' + dropRight + 'px';
  dd.style.cssText = 'position:fixed;z-index:9999;background:#fff;border:1px solid var(--g200,#e5e7eb);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:150px;padding:4px 0;' +
    'top:' + (rect.bottom + 2) + 'px;' + posStyle;
  document.body.appendChild(dd);
  _invMenuOpen = dd;
}
function _closeInvMenu() {
  if (_invMenuOpen) { _invMenuOpen.remove(); _invMenuOpen = null; }
}

// ─── EVENT DELEGATION — inventory-table.js ───────────────────────
document.addEventListener('click', function(e) {
  // ⋯ menu toggle
  var menuBtn = e.target.closest('.btn-inv-menu');
  if (menuBtn) { _openInvMenu(menuBtn); return; }
  // Close menu on any outside click
  if (_invMenuOpen && !e.target.closest('.inv-action-menu')) _closeInvMenu();
  // #3 openItemHistory
  const histBtn = e.target.closest('.btn-item-history');
  if (histBtn) {
    openItemHistory(histBtn.dataset.id, histBtn.dataset.barcode, histBtn.dataset.brand, histBtn.dataset.model);
    return;
  }
  // #1 openReductionModal
  const reduceBtn = e.target.closest('.btn-reduce');
  if (reduceBtn) { openReductionModal(reduceBtn.dataset.id); return; }
  // #2 showImagePreview — click on thumbnail opens image modal
  const imgThumb = e.target.closest('.img-thumb-click');
  if (imgThumb) { openImageModal(imgThumb.dataset.id); return; }
  // #4-5 openQtyModal (add / remove)
  const qtyPlus = e.target.closest('.qty-plus');
  if (qtyPlus) { openQtyModal(qtyPlus.dataset.id, qtyPlus.dataset.dir); return; }
  const qtyMinus = e.target.closest('.qty-minus');
  if (qtyMinus) { openQtyModal(qtyMinus.dataset.id, qtyMinus.dataset.dir); return; }
});

document.addEventListener('change', function(e) {
  // #A toggleRowSelect
  const chk = e.target.closest('.inv-row-check');
  if (chk) { toggleRowSelect(chk.dataset.id, chk.checked); return; }
});