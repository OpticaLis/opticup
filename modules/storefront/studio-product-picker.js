// =============================================================
// Studio Product Picker — search, barcode paste, product selection
// CMS-7
// =============================================================

/**
 * Open product picker modal
 * @param {string[]} currentSelection - currently selected barcodes
 * @param {Function} onSave - callback with updated barcode array
 */
function openProductPicker(currentSelection = [], onSave) {
  let selected = [...currentSelection];
  let productCache = new Map(); // barcode → product data

  // Pre-fetch current selection details
  if (selected.length > 0) {
    fetchProductsByBarcodes(selected).then(products => {
      products.forEach(p => productCache.set(p.barcode, p));
      renderSelectedSection();
    });
  }

  const content = `
    <div class="pp-container" dir="rtl">
      <div class="pp-search-section">
        <input type="text" id="pp-search-input" class="form-control"
               placeholder="חיפוש מותג / דגם / ברקוד..." oninput="ppSearch(this.value)">
        <button class="btn btn-sm btn-ghost mt-2" onclick="ppTogglePaste()">
          📋 הדבקה מהירה של ברקודים
        </button>
        <div id="pp-paste-area" style="display:none" class="mt-2">
          <textarea id="pp-paste-input" class="form-control" rows="3"
                    placeholder="הדביקו ברקודים (מופרדים בפסיק, שורה חדשה או טאב)"></textarea>
          <button class="btn btn-sm btn-primary mt-1" onclick="ppProcessPaste()">הוסף</button>
        </div>
      </div>
      <div id="pp-results" class="pp-results mt-3"></div>
      <div id="pp-selected-section" class="pp-selected-section mt-3"></div>
    </div>
  `;

  Modal.show({
    title: 'בחירת מוצרים',
    size: 'lg',
    content,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>
      <button class="btn btn-primary" id="pp-save-btn" onclick="ppSave()">שמור (<span id="pp-count">${selected.length}</span> מוצרים)</button>
    `
  });

  renderSelectedSection();

  // --- Inner functions stored on window for onclick ---
  window._ppState = { selected, productCache, onSave };

  // Load initial products
  ppSearch('');
}

/** Search products via Supabase */
async function ppSearch(query) {
  const state = window._ppState;
  if (!state) return;

  const resultsEl = document.getElementById('pp-results');
  if (!resultsEl) return;

  const tid = getTenantId();
  let products = [];

  try {
    let q = sb.from('inventory')
      .select('id, barcode, model, color, quantity, product_type, brand_id, brands!inner(name)')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .order('quantity', { ascending: false })
      .limit(30);

    if (query && query.trim()) {
      const term = query.trim();
      // Check if it looks like a barcode (starts with digit or D)
      if (/^[0-9D]/.test(term) && term.length >= 4) {
        q = q.ilike('barcode', `%${term}%`);
      } else {
        // Search by brand name or model
        q = q.or(`model.ilike.%${term}%,brands.name.ilike.%${term}%`);
      }
    }

    const { data, error } = await q;
    if (error) throw error;
    products = (data || []).map(p => ({
      barcode: p.barcode,
      brand_name: p.brands?.name || '',
      model: p.model || '',
      color: p.color || '',
      quantity: p.quantity || 0,
      product_type: p.product_type || ''
    }));

    // Cache results
    products.forEach(p => state.productCache.set(p.barcode, p));
  } catch (err) {
    console.error('Product search error:', err);
    resultsEl.innerHTML = '<div class="text-red-500">שגיאה בחיפוש</div>';
    return;
  }

  resultsEl.innerHTML = products.length === 0
    ? '<div class="text-gray-400 text-center py-4">לא נמצאו מוצרים</div>'
    : products.map(p => ppRenderSearchRow(p, state.selected.includes(p.barcode))).join('');
}

/** Render a single search result row */
function ppRenderSearchRow(product, isSelected) {
  const initial = product.brand_name ? product.brand_name.charAt(0).toUpperCase() : '?';
  const colors = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899'];
  let hash = 0;
  for (let i = 0; i < product.brand_name.length; i++) hash = product.brand_name.charCodeAt(i) + ((hash << 5) - hash);
  const bgColor = colors[Math.abs(hash) % colors.length];
  const qtyBadge = product.quantity === 0
    ? '<span class="pp-badge pp-badge-oos">אזל</span>'
    : `<span class="pp-badge pp-badge-qty">${product.quantity} יח׳</span>`;
  const checked = isSelected ? 'checked' : '';

  return `
    <label class="pp-row ${isSelected ? 'pp-row-selected' : ''}" data-barcode="${escapeHtml(product.barcode)}">
      <input type="checkbox" ${checked} onchange="ppToggleProduct('${escapeHtml(product.barcode)}', this.checked)">
      <div class="pp-thumb" style="background:${bgColor}">${escapeHtml(initial)}</div>
      <div class="pp-info">
        <strong>${escapeHtml(product.brand_name)} ${escapeHtml(product.model)}</strong>
        ${product.color ? `<span class="text-gray-400"> | ${escapeHtml(product.color)}</span>` : ''}
      </div>
      <code class="pp-barcode">${escapeHtml(product.barcode)}</code>
      ${qtyBadge}
    </label>
  `;
}

/** Toggle product selection */
function ppToggleProduct(barcode, add) {
  const state = window._ppState;
  if (!state) return;

  if (add && !state.selected.includes(barcode)) {
    state.selected.push(barcode);
  } else if (!add) {
    state.selected = state.selected.filter(b => b !== barcode);
    window._ppState.selected = state.selected;
  }

  // Update row highlighting
  const row = document.querySelector(`.pp-row[data-barcode="${barcode}"]`);
  if (row) row.classList.toggle('pp-row-selected', add);

  renderSelectedSection();
  updateSaveCount();
}

/** Render the selected products section */
function renderSelectedSection() {
  const state = window._ppState;
  if (!state) return;
  const el = document.getElementById('pp-selected-section');
  if (!el) return;

  if (state.selected.length === 0) {
    el.innerHTML = '';
    return;
  }

  const items = state.selected.map((barcode, idx) => {
    const p = state.productCache.get(barcode);
    const label = p ? `${p.brand_name} ${p.model}` : barcode;
    const initial = p?.brand_name ? p.brand_name.charAt(0).toUpperCase() : '?';
    return `
      <div class="pp-sel-row">
        <span class="pp-sel-num">${idx + 1}</span>
        <span class="pp-sel-label">${escapeHtml(label)}</span>
        <code class="pp-barcode">${escapeHtml(barcode)}</code>
        <div class="pp-sel-actions">
          <button class="btn-icon" onclick="ppMoveProduct(${idx},-1)" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn-icon" onclick="ppMoveProduct(${idx},1)" ${idx === state.selected.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn-icon text-red-500" onclick="ppRemoveProduct(${idx})">✕</button>
        </div>
      </div>
    `;
  });

  el.innerHTML = `
    <div class="pp-sel-header">נבחרו: ${state.selected.length} מוצרים</div>
    ${items.join('')}
  `;
}

/** Move product up/down in selection */
function ppMoveProduct(idx, dir) {
  const state = window._ppState;
  if (!state) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.selected.length) return;
  [state.selected[idx], state.selected[newIdx]] = [state.selected[newIdx], state.selected[idx]];
  renderSelectedSection();
}

/** Remove product from selection */
function ppRemoveProduct(idx) {
  const state = window._ppState;
  if (!state) return;
  const barcode = state.selected[idx];
  state.selected.splice(idx, 1);
  renderSelectedSection();
  updateSaveCount();

  // Uncheck in search results
  const row = document.querySelector(`.pp-row[data-barcode="${barcode}"]`);
  if (row) {
    row.classList.remove('pp-row-selected');
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = false;
  }
}

/** Toggle paste area */
function ppTogglePaste() {
  const el = document.getElementById('pp-paste-area');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

/** Process pasted barcodes */
async function ppProcessPaste() {
  const state = window._ppState;
  if (!state) return;
  const input = document.getElementById('pp-paste-input');
  if (!input || !input.value.trim()) return;

  const barcodes = input.value
    .split(/[,\n\t]+/)
    .map(b => b.trim())
    .filter(b => b.length > 0)
    .filter((b, i, arr) => arr.indexOf(b) === i); // dedupe

  if (barcodes.length === 0) return;

  const products = await fetchProductsByBarcodes(barcodes);
  const foundBarcodes = new Set(products.map(p => p.barcode));
  const notFound = barcodes.filter(b => !foundBarcodes.has(b));

  // Add found products to cache and selection
  products.forEach(p => {
    state.productCache.set(p.barcode, p);
    if (!state.selected.includes(p.barcode)) {
      state.selected.push(p.barcode);
    }
  });

  input.value = '';
  renderSelectedSection();
  updateSaveCount();
  ppSearch(''); // refresh results

  if (notFound.length > 0) {
    Toast.warning(`לא נמצאו: ${notFound.join(', ')}`);
  }
  Toast.success(`נוספו ${products.length} מוצרים`);
}

/** Fetch products by barcode list */
async function fetchProductsByBarcodes(barcodes) {
  const tid = getTenantId();
  try {
    const { data, error } = await sb.from('inventory')
      .select('barcode, model, color, quantity, product_type, brand_id, brands!inner(name)')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .in('barcode', barcodes);

    if (error) throw error;
    return (data || []).map(p => ({
      barcode: p.barcode,
      brand_name: p.brands?.name || '',
      model: p.model || '',
      color: p.color || '',
      quantity: p.quantity || 0,
      product_type: p.product_type || ''
    }));
  } catch (err) {
    console.error('Fetch by barcodes error:', err);
    return [];
  }
}

/** Update save button count */
function updateSaveCount() {
  const el = document.getElementById('pp-count');
  if (el) el.textContent = (window._ppState?.selected || []).length;
}

/** Save and close */
function ppSave() {
  const state = window._ppState;
  if (!state) return;
  if (typeof state.onSave === 'function') {
    state.onSave([...state.selected]);
  }
  Modal.close();
  window._ppState = null;
}
