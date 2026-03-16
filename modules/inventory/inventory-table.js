
// =========================================================
// TAB: FULL INVENTORY
// =========================================================
let invData = [];
let invFiltered = [];
let invChanges = {};
let invSelected = new Set();
let invSortField = '';
let invSortDir = 0; // 0=none, 1=asc, -1=desc

// =========================================================
// SERVER-SIDE PAGINATION
// =========================================================
const INV_PAGE_SIZE = 50;
let invPage = 0;
let invTotalCount = 0;
let invTotalPages = 0;
let invCurrentFilters = {};
let invDebounceTimer = null;

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
    // Build Supabase query with exact count
    let query = sb.from('inventory')
      .select('*, inventory_images(*), brands(name), suppliers(name)', { count: 'exact' })
      .eq('is_deleted', false);

    // Supplier filter (name → UUID)
    if (supplier) {
      const suppId = supplierCache[supplier];
      if (suppId) query = query.eq('supplier_id', suppId);
    }

    // Product type filter (Hebrew → English enum)
    if (ptype) {
      query = query.eq('product_type', heToEn('product_type', ptype));
    }

    // Quantity filter
    if (qtyFilter === '1') query = query.gt('quantity', 0);
    else if (qtyFilter === '0') query = query.lte('quantity', 0);

    // Free-text search via .or() on text columns + brand/supplier ID pre-lookup
    if (search && search.length >= 2) {
      const safe = search.replace(/[,().\\]/g, '');
      if (safe) {
        // Barcode search: exact prefix match (fast, uses index)
        const isNumeric = /^\d+$/.test(safe);
        const orParts = [];
        if (isNumeric) {
          // Numeric input — likely barcode, prioritize exact prefix
          orParts.push(`barcode.ilike.${safe}%`);
        } else {
          orParts.push(`barcode.ilike.%${safe}%`);
        }
        orParts.push(
          `model.ilike.%${safe}%`,
          `color.ilike.%${safe}%`
        );
        // Only search size/notes for longer queries (reduce OR branches)
        if (safe.length >= 3) {
          orParts.push(`size.ilike.%${safe}%`, `notes.ilike.%${safe}%`);
        }
        // Pre-lookup brand IDs whose name matches the search term
        const matchBrandIds = Object.entries(brandCache)
          .filter(([name]) => name.toLowerCase().includes(safe))
          .map(([, id]) => id);
        if (matchBrandIds.length) orParts.push(`brand_id.in.(${matchBrandIds.join(',')})`);
        // Pre-lookup supplier IDs whose name matches the search term
        const matchSupplierIds = Object.entries(supplierCache)
          .filter(([name]) => name.toLowerCase().includes(safe))
          .map(([, id]) => id);
        if (matchSupplierIds.length) orParts.push(`supplier_id.in.(${matchSupplierIds.join(',')})`);

        query = query.or(orParts.join(','));
      }
    } else if (search && search.length === 1) {
      // Single character — only search barcode prefix (fast)
      query = query.ilike('barcode', search + '%');
    }

    // Sorting (Hebrew field → English column)
    if (invSortField && invSortDir !== 0) {
      const enCol = FIELD_MAP.inventory[invSortField];
      if (enCol && enCol !== '_images') {
        query = query.order(enCol, { ascending: invSortDir === 1 });
      }
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const offset = invPage * INV_PAGE_SIZE;
    query = query.range(offset, offset + INV_PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    // Update pagination state
    invTotalCount = count || 0;
    invTotalPages = Math.max(1, Math.ceil(invTotalCount / INV_PAGE_SIZE));
    if (invPage >= invTotalPages) invPage = Math.max(0, invTotalPages - 1);

    // Enrich rows with display names + images
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
    invFiltered = invData; // Compatibility alias

    // Populate supplier dropdown (preserves current selection)
    const supplierSel = $('inv-filter-supplier');
    const curVal = supplierSel.value;
    supplierSel.innerHTML = '<option value="">הכל</option>' + suppliers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    supplierSel.value = curVal;

    // Update UI
    $('inv-count').textContent = invTotalCount;
    renderInventoryRows(invData);
    updatePaginationUI();
    updateSelectionUI();

    const isAdm = document.body.classList.contains('admin-mode');
    $('inv-admin-bar').style.display = isAdm ? 'flex' : 'none';
  } catch (e) {
    setAlert('inv-alerts', 'שגיאה בטעינת מלאי: ' + (e.message || ''), 'e');
  }
  hideLoading();
}

function updatePaginationUI() {
  const pag = $('inv-pagination');
  if (!pag) return;

  if (invTotalPages <= 1) {
    pag.style.display = 'none';
  } else {
    pag.style.display = 'flex';
    $('inv-page-info').textContent = `עמוד ${invPage + 1} מתוך ${invTotalPages} | סה"כ ${invTotalCount} פריטים`;
    $('inv-prev').disabled = invPage === 0;
    $('inv-next').disabled = invPage >= invTotalPages - 1;
  }

  // Update the "shown" counter with range
  const start = invPage * INV_PAGE_SIZE + 1;
  const end = Math.min((invPage + 1) * INV_PAGE_SIZE, invTotalCount);
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
      ? `<img class="img-thumb img-thumb-click" src="${encodeURI(imgs[0].thumbnails?.small?.url || imgs[0].url)}" data-id="${escapeHtml(r.id)}" title="${imgs.length} תמונות">`
      : '<span class="no-img">—</span>';
    const syncVal = enToHe('website_sync', r.website_sync) || '';
    return `<tr data-id="${r.id}" class="${sel}">
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
      ${isAdm?`<td><button class="btn btn-d btn-sm btn-inv-delete" data-id="${escapeHtml(r.id)}" title="מחק">🗑️</button></td>`:'<td class="admin-col"></td>'}
    </tr>`;
  }).join('');
}

// ---- Column sorting ----
function sortInventory(th) {
  const field = th.dataset.field;
  // Toggle sort direction
  if (invSortField === field) {
    invSortDir = invSortDir === 1 ? -1 : invSortDir === -1 ? 0 : 1;
  } else {
    invSortField = field;
    invSortDir = 1;
  }
  // Update header UI
  document.querySelectorAll('#inv-table th.sortable').forEach(h => {
    h.classList.remove('sort-asc', 'sort-desc');
    h.querySelector('.sort-icon').innerHTML = '&#9650;';
  });
  if (invSortDir !== 0) {
    th.classList.add(invSortDir === 1 ? 'sort-asc' : 'sort-desc');
    th.querySelector('.sort-icon').innerHTML = invSortDir === 1 ? '&#9650;' : '&#9660;';
  }
  // Server-side sort — reset to page 0 and re-fetch
  invPage = 0;
  loadInventoryPage();
}

// ─── EVENT DELEGATION — inventory-table.js ───────────────────────
document.addEventListener('click', function(e) {
  // #3 openItemHistory
  const histBtn = e.target.closest('.btn-item-history');
  if (histBtn) {
    openItemHistory(histBtn.dataset.id, histBtn.dataset.barcode, histBtn.dataset.brand, histBtn.dataset.model);
    return;
  }
  // #1 openReductionModal
  const reduceBtn = e.target.closest('.btn-reduce');
  if (reduceBtn) { openReductionModal(reduceBtn.dataset.id); return; }
  // #2 showImagePreview
  const imgThumb = e.target.closest('.img-thumb-click');
  if (imgThumb) { showImagePreview(imgThumb.dataset.id); return; }
  // #4-5 openQtyModal (add / remove)
  const qtyPlus = e.target.closest('.qty-plus');
  if (qtyPlus) { openQtyModal(qtyPlus.dataset.id, qtyPlus.dataset.dir); return; }
  const qtyMinus = e.target.closest('.qty-minus');
  if (qtyMinus) { openQtyModal(qtyMinus.dataset.id, qtyMinus.dataset.dir); return; }
  // #6 deleteInvRow
  const delBtn = e.target.closest('.btn-inv-delete');
  if (delBtn) { deleteInvRow(delBtn.dataset.id); return; }
});

document.addEventListener('change', function(e) {
  // #A toggleRowSelect
  const chk = e.target.closest('.inv-row-check');
  if (chk) { toggleRowSelect(chk.dataset.id, chk.checked); return; }
});