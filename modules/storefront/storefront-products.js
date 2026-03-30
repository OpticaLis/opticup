// Storefront Product Manager — filter, override modes, bulk select
// Uses inventory table + brands for resolved mode display

let allProducts = [];
let allBrands = [];
let selectedIds = new Set();

async function loadStorefrontProducts() {
  showLoading('טוען מוצרים...');
  try {
    const tid = getTenantId();

    // Load brands for filter dropdown
    const { data: brands, error: brandErr } = await sb.from(T.BRANDS)
      .select('id, name, storefront_mode')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .order('name');

    if (brandErr) throw brandErr;
    allBrands = brands || [];

    // Populate brand filter
    const brandSelect = document.getElementById('filter-brand');
    for (const b of allBrands) {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      brandSelect.appendChild(opt);
    }

    // Load products (only non-deleted, with brand join)
    const { data: products, error: prodErr } = await sb.from(T.INV)
      .select('id, barcode, model, color, brand_id, storefront_mode_override, quantity')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .order('brand_id');

    if (prodErr) throw prodErr;
    allProducts = (products || []).map(p => {
      const brand = allBrands.find(b => b.id === p.brand_id);
      return {
        ...p,
        brand_name: brand?.name || '—',
        brand_mode: brand?.storefront_mode || null,
        resolved_mode: p.storefront_mode_override || brand?.storefront_mode || 'catalog'
      };
    });

    filterProducts();
  } catch (e) {
    console.error('loadStorefrontProducts error:', e);
    toast('שגיאה בטעינת מוצרים', 'e');
  } finally {
    hideLoading();
  }
}

function filterProducts() {
  const brandFilter = document.getElementById('filter-brand').value;
  const modeFilter = document.getElementById('filter-mode').value;
  const searchFilter = document.getElementById('filter-search').value.trim().toLowerCase();

  let filtered = allProducts;

  if (brandFilter) {
    filtered = filtered.filter(p => p.brand_id === brandFilter);
  }
  if (modeFilter) {
    filtered = filtered.filter(p => p.resolved_mode === modeFilter);
  }
  if (searchFilter) {
    filtered = filtered.filter(p =>
      (p.model || '').toLowerCase().includes(searchFilter) ||
      (p.barcode || '').toLowerCase().includes(searchFilter)
    );
  }

  document.getElementById('products-count').textContent = `${filtered.length} מוצרים`;
  renderProductsTable(filtered);
}

function renderProductsTable(products) {
  const container = document.getElementById('products-table-container');

  if (!products.length) {
    container.innerHTML = '<p style="color:var(--g400)">לא נמצאו מוצרים</p>';
    return;
  }

  const modeLabels = { catalog: 'קטלוג', shop: 'חנות', hidden: 'מוסתר' };
  const modeTags = { catalog: 'resolved-catalog', shop: 'resolved-shop', hidden: 'resolved-hidden' };

  let html = `<table class="products-table">
    <thead><tr>
      <th><input type="checkbox" id="select-all" onchange="toggleSelectAll(this)"></th>
      <th>מותג</th>
      <th>דגם</th>
      <th>ברקוד</th>
      <th>מצב מותג</th>
      <th>דריסה</th>
      <th>תוצאה</th>
    </tr></thead>
    <tbody>`;

  for (const p of products) {
    const brandModeLabel = p.brand_mode ? modeLabels[p.brand_mode] : 'קטלוג (ברירת מחדל)';
    const overrideVal = p.storefront_mode_override || '';
    const resolvedLabel = modeLabels[p.resolved_mode] || 'קטלוג';
    const resolvedClass = modeTags[p.resolved_mode] || 'resolved-catalog';
    const checked = selectedIds.has(p.id) ? 'checked' : '';

    html += `<tr>
      <td><input type="checkbox" class="row-cb" value="${p.id}" ${checked} onchange="toggleRow(this)"></td>
      <td>${escapeHtml(p.brand_name)}</td>
      <td>${escapeHtml(p.model || '—')}</td>
      <td style="font-family:monospace;font-size:.85rem;direction:ltr">${escapeHtml(p.barcode || '')}</td>
      <td style="font-size:.85rem">${brandModeLabel}</td>
      <td>
        <select class="mode-select" data-product-id="${p.id}" onchange="changeProductMode(this)">
          <option value="" ${!overrideVal ? 'selected' : ''}>— עקוב אחרי מותג</option>
          <option value="catalog" ${overrideVal === 'catalog' ? 'selected' : ''}>📋 קטלוג</option>
          <option value="shop" ${overrideVal === 'shop' ? 'selected' : ''}>🛒 חנות</option>
          <option value="hidden" ${overrideVal === 'hidden' ? 'selected' : ''}>🚫 מוסתר</option>
        </select>
      </td>
      <td><span class="resolved-tag ${resolvedClass}">${resolvedLabel}</span></td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

function toggleRow(cb) {
  if (cb.checked) {
    selectedIds.add(cb.value);
  } else {
    selectedIds.delete(cb.value);
  }
  updateBulkBar();
}

function toggleSelectAll(cb) {
  const rows = document.querySelectorAll('.row-cb');
  selectedIds.clear();
  if (cb.checked) {
    rows.forEach(r => { r.checked = true; selectedIds.add(r.value); });
  } else {
    rows.forEach(r => { r.checked = false; });
  }
  updateBulkBar();
}

function clearSelection() {
  selectedIds.clear();
  document.querySelectorAll('.row-cb').forEach(r => { r.checked = false; });
  const selectAll = document.getElementById('select-all');
  if (selectAll) selectAll.checked = false;
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  const count = selectedIds.size;
  document.getElementById('bulk-count').textContent = `${count} מוצרים נבחרו`;
  bar.classList.toggle('visible', count > 0);
}

async function changeProductMode(selectEl) {
  const productId = selectEl.dataset.productId;
  const newMode = selectEl.value || null;

  try {
    const { error } = await sb.from(T.INV)
      .update({ storefront_mode_override: newMode })
      .eq('id', productId)
      .eq('tenant_id', getTenantId());

    if (error) throw error;

    // Update local data
    const prod = allProducts.find(p => p.id === productId);
    if (prod) {
      prod.storefront_mode_override = newMode;
      prod.resolved_mode = newMode || prod.brand_mode || 'catalog';
    }

    toast('מצב תצוגה עודכן', 's');
    filterProducts();
  } catch (e) {
    console.error('changeProductMode error:', e);
    toast('שגיאה בעדכון', 'e');
  }
}

async function applyBulkMode() {
  const ids = Array.from(selectedIds);
  if (!ids.length) return;

  const newMode = document.getElementById('bulk-mode').value || null;
  const label = newMode ? { catalog: 'קטלוג', shop: 'חנות', hidden: 'מוסתר' }[newMode] : 'עקוב אחרי מותג';

  showLoading(`מעדכן ${ids.length} מוצרים...`);
  try {
    // Batch update in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await sb.from(T.INV)
        .update({ storefront_mode_override: newMode })
        .in('id', chunk)
        .eq('tenant_id', getTenantId());

      if (error) throw error;
    }

    // Update local data
    for (const id of ids) {
      const prod = allProducts.find(p => p.id === id);
      if (prod) {
        prod.storefront_mode_override = newMode;
        prod.resolved_mode = newMode || prod.brand_mode || 'catalog';
      }
    }

    toast(`${ids.length} מוצרים עודכנו ל: ${label}`, 's');
    clearSelection();
    filterProducts();
  } catch (e) {
    console.error('applyBulkMode error:', e);
    toast('שגיאה בעדכון מרובה', 'e');
  } finally {
    hideLoading();
  }
}
