// Storefront Brand Mode Manager
// Shows only brands with storefront products (website_sync = full/display, has images)
// + Brand Page Editor (hero, description, gallery, SEO)

let _currentBrandId = null;

async function loadStorefrontBrands() {
  showLoading('טוען מותגים...');
  try {
    const tid = getTenantId();

    // Get brands with product counts + brand page fields
    const { data: brands, error: brandErr } = await sb.from(T.BRANDS)
      .select('id, name, storefront_mode, default_sync, exclude_website, active, brand_page_enabled, brand_description, brand_description_short, video_url, hero_image, logo_url, brand_gallery, seo_title, seo_description')
      .eq('tenant_id', tid)
      .eq('active', true)
      .order('name');

    if (brandErr) throw brandErr;

    // Get storefront product counts per brand (only website_sync + has images)
    const { data: sfProducts, error: prodErr } = await sb.from(T.INV)
      .select('brand_id, quantity, website_sync, storefront_mode_override, inventory_images!inner(id)')
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .in('website_sync', ['full', 'display']);

    if (prodErr) throw prodErr;

    // Build brand lookup for resolved mode
    const brandMap = {};
    for (const b of (brands || [])) { brandMap[b.id] = b; }

    // Apply same filters as v_storefront_products view
    const excludedBrandIds = new Set((brands || []).filter(b => b.exclude_website).map(b => b.id));
    const countMap = {};
    for (const p of (sfProducts || [])) {
      if (excludedBrandIds.has(p.brand_id)) continue;
      if (p.website_sync === 'full' && p.quantity <= 0) continue;
      const brand = brandMap[p.brand_id];
      const resolved = p.storefront_mode_override || brand?.storefront_mode || 'catalog';
      if (resolved === 'hidden') continue;
      countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1;
    }

    // Only show brands that have at least 1 visible storefront product
    const sfBrands = (brands || []).filter(b => (countMap[b.id] || 0) > 0);
    renderBrandsTable(sfBrands, countMap);
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
        <th>עמוד מותג</th>
      </tr>
    </thead>
    <tbody>`;

  for (const b of brands) {
    const count = countMap[b.id] || 0;
    const currentMode = b.storefront_mode || '';
    const syncLabel = b.exclude_website ? '🚫 מוסתר' :
      b.default_sync === 'full' ? '✅ מלא' :
      b.default_sync === 'display' ? '🖼️ תצוגה' : '—';
    const pageActive = b.brand_page_enabled === true;

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
      <td>
        <button class="btn-page ${pageActive ? 'active' : ''}" onclick="openBrandPageModal('${b.id}')">
          ${pageActive ? '✅ פעיל' : '📄 ערוך'}
        </button>
      </td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  // Store brands data for modal
  window._brandsData = {};
  for (const b of brands) { window._brandsData[b.id] = b; }
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

// ═══ Brand Page Editor Modal ═══

function openBrandPageModal(brandId) {
  const brand = window._brandsData?.[brandId];
  if (!brand) return;

  _currentBrandId = brandId;
  document.getElementById('brand-page-title').textContent = `📄 עמוד מותג — ${brand.name}`;
  document.getElementById('bp-enabled').checked = brand.brand_page_enabled === true;
  document.getElementById('bp-short-desc').value = brand.brand_description_short || '';
  document.getElementById('bp-description').value = brand.brand_description || '';
  document.getElementById('bp-video').value = brand.video_url || '';
  document.getElementById('bp-hero').value = brand.hero_image || '';
  document.getElementById('bp-logo').value = brand.logo_url || '';
  // Update logo preview
  const logoImg = document.getElementById('brand-logo-img');
  const logoPlaceholder = document.getElementById('brand-logo-placeholder');
  if (brand.logo_url) {
    logoImg.src = brand.logo_url;
    logoImg.style.display = 'block';
    logoPlaceholder.style.display = 'none';
  } else {
    logoImg.style.display = 'none';
    logoPlaceholder.style.display = 'block';
  }
  document.getElementById('brand-logo-status').textContent = '';
  document.getElementById('bp-seo-title').value = brand.seo_title || '';
  document.getElementById('bp-seo-desc').value = brand.seo_description || '';

  // Gallery: JSONB array → one URL per line
  const gallery = brand.brand_gallery;
  const galleryText = Array.isArray(gallery) ? gallery.join('\n') : '';
  document.getElementById('bp-gallery').value = galleryText;

  document.getElementById('brand-page-modal').style.display = 'flex';
}

function closeBrandPageModal() {
  document.getElementById('brand-page-modal').style.display = 'none';
  _currentBrandId = null;
}

async function saveBrandPage() {
  if (!_currentBrandId) return;

  const galleryText = document.getElementById('bp-gallery').value.trim();
  const galleryArr = galleryText ? galleryText.split('\n').map(u => u.trim()).filter(Boolean) : [];

  const updates = {
    brand_page_enabled: document.getElementById('bp-enabled').checked,
    brand_description_short: document.getElementById('bp-short-desc').value.trim() || null,
    brand_description: document.getElementById('bp-description').value.trim() || null,
    video_url: document.getElementById('bp-video').value.trim() || null,
    hero_image: document.getElementById('bp-hero').value.trim() || null,
    logo_url: document.getElementById('bp-logo').value.trim() || null,
    brand_gallery: galleryArr,
    seo_title: document.getElementById('bp-seo-title').value.trim() || null,
    seo_description: document.getElementById('bp-seo-desc').value.trim() || null,
  };

  try {
    showLoading('שומר עמוד מותג...');
    const { error } = await sb.from(T.BRANDS)
      .update(updates)
      .eq('id', _currentBrandId)
      .eq('tenant_id', getTenantId());

    if (error) throw error;

    toast('עמוד מותג נשמר בהצלחה', 's');
    closeBrandPageModal();
    await loadStorefrontBrands(); // Refresh table
  } catch (e) {
    console.error('saveBrandPage error:', e);
    toast('שגיאה בשמירת עמוד מותג', 'e');
  } finally {
    hideLoading();
  }
}

// ═══ Logo Upload with Auto-Normalization ═══

const STOREFRONT_URL = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:4321'
  : 'https://opticup-storefront.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const logoInput = document.getElementById('brand-logo-input');
  if (!logoInput) return;

  logoInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('brand-logo-status');
    statusEl.textContent = 'מעבד ומנרמל...';
    statusEl.style.color = '#666';

    const reader = new FileReader();
    reader.onload = async function() {
      const base64 = reader.result.split(',')[1];

      try {
        // prizma_auth_token is the canonical ERP session token.
        const _authToken = sessionStorage.getItem('prizma_auth_token')
          || sessionStorage.getItem('jwt_token')
          || '';
        const res = await fetch(`${STOREFRONT_URL}/api/normalize-logo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + _authToken
          },
          body: JSON.stringify({
            image_base64: base64,
            filename: file.name,
            brand_id: _currentBrandId,
            tenant_id: getTenantId(),
            type: 'brand'
          })
        });

        const data = await res.json();

        if (data.success) {
          // Update preview
          const img = document.getElementById('brand-logo-img');
          img.src = data.url;
          img.style.display = 'block';
          document.getElementById('brand-logo-placeholder').style.display = 'none';
          // Update URL field
          document.getElementById('bp-logo').value = data.url;
          statusEl.textContent = '✓ לוגו עודכן ונורמל';
          statusEl.style.color = '#22c55e';
        } else {
          statusEl.textContent = '✗ שגיאה: ' + data.error;
          statusEl.style.color = '#ef4444';
        }
      } catch (err) {
        statusEl.textContent = '✗ שגיאה בהעלאה';
        statusEl.style.color = '#ef4444';
        console.error('Logo upload error:', err);
      }
    };
    reader.readAsDataURL(file);
  });
});
