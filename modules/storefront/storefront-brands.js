// Storefront Brand Mode Manager
// Shows all brands with product count and storefront_mode selector

async function loadStorefrontBrands() {
  showLoading('טוען מותגים...');
  try {
    const tid = getTenantId();

    // Get brands with product counts
    const { data: brands, error: brandErr } = await sb.from(T.BRANDS)
      .select('id, name, storefront_mode, default_sync, exclude_website, active')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .order('name');

    if (brandErr) throw brandErr;

    // Get product counts per brand
    const { data: products, error: prodErr } = await sb.from(T.INV)
      .select('brand_id')
      .eq('tenant_id', tid)
      .eq('is_deleted', false);

    if (prodErr) throw prodErr;

    const countMap = {};
    for (const p of (products || [])) {
      countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1;
    }

    renderBrandsTable(brands || [], countMap);
  } catch (e) {
    console.error('loadStorefrontBrands error:', e);
    toast('שגיאה בטעינת מותגים', 'e');
  } finally {
    hideLoading();
  }
}

function renderBrandsTable(brands, countMap) {
  const container = document.getElementById('brands-table-container');

  if (!brands.length) {
    container.innerHTML = '<p style="color:var(--g400)">אין מותגים</p>';
    return;
  }

  const modeLabel = { catalog: 'קטלוג', shop: 'חנות', hidden: 'מוסתר' };
  const modeClass = { catalog: 'mode-catalog', shop: 'mode-shop', hidden: 'mode-hidden' };

  let html = `<table class="brands-table">
    <thead>
      <tr>
        <th>מותג</th>
        <th>מוצרים</th>
        <th>סנכרון</th>
        <th>מצב תצוגה</th>
      </tr>
    </thead>
    <tbody>`;

  for (const b of brands) {
    const count = countMap[b.id] || 0;
    const currentMode = b.storefront_mode || '';
    const syncLabel = b.exclude_website ? '🚫 מוסתר' :
      b.default_sync === 'full' ? '✅ מלא' :
      b.default_sync === 'display' ? '🖼️ תצוגה' : '—';

    html += `<tr>
      <td style="font-weight:600">${escapeHtml(b.name)}</td>
      <td><span class="badge-count">${count}</span></td>
      <td style="font-size:.85rem">${syncLabel}</td>
      <td>
        <select class="mode-select" data-brand-id="${b.id}" onchange="changeBrandMode(this)">
          <option value="" ${!currentMode ? 'selected' : ''}>— ברירת מחדל (קטלוג)</option>
          <option value="catalog" ${currentMode === 'catalog' ? 'selected' : ''}>📋 קטלוג</option>
          <option value="shop" ${currentMode === 'shop' ? 'selected' : ''}>🛒 חנות</option>
          <option value="hidden" ${currentMode === 'hidden' ? 'selected' : ''}>🚫 מוסתר</option>
        </select>
      </td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

async function changeBrandMode(selectEl) {
  const brandId = selectEl.dataset.brandId;
  const newMode = selectEl.value || null;

  try {
    const { error } = await sb.from(T.BRANDS)
      .update({ storefront_mode: newMode })
      .eq('id', brandId)
      .eq('tenant_id', getTenantId());

    if (error) throw error;

    const label = newMode ? { catalog: 'קטלוג', shop: 'חנות', hidden: 'מוסתר' }[newMode] : 'ברירת מחדל';
    toast(`מצב תצוגה עודכן ל: ${label}`, 's');
  } catch (e) {
    console.error('changeBrandMode error:', e);
    toast('שגיאה בעדכון מצב תצוגה', 'e');
  }
}
