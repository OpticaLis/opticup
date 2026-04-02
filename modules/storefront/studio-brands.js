// modules/storefront/studio-brands.js
// Brand Pages management inside Studio — "עמודי מותג" section in Pages tab
// Loads brand list, opens editor modal for brand page content

let studioBrands = [];
let studioBrandsLoaded = false;
let _brandPageView = false; // false = normal pages, true = brand pages view

const STOREFRONT_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:4321'
  : 'https://opticup-storefront.vercel.app';

/** Toggle between pages view and brand pages view */
function toggleBrandPagesView(showBrands) {
  _brandPageView = showBrands;

  // Update filter buttons
  document.querySelectorAll('.page-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === (showBrands ? 'brands' : 'pages'));
  });

  // Toggle visibility
  const pageList = document.getElementById('studio-page-list');
  const brandList = document.getElementById('studio-brand-list');
  const editorArea = document.getElementById('studio-editor');

  if (showBrands) {
    if (pageList) pageList.style.display = 'none';
    if (brandList) brandList.style.display = 'block';
    if (editorArea) editorArea.innerHTML = '<div class="studio-empty-editor"><p>בחר מותג מהרשימה לעריכת עמוד</p></div>';
    if (!studioBrandsLoaded) loadStudioBrands();
  } else {
    if (pageList) pageList.style.display = 'block';
    if (brandList) brandList.style.display = 'none';
    renderFilteredPageList();
  }
}

/** Load all brands with product counts */
async function loadStudioBrands() {
  const container = document.getElementById('studio-brand-list');
  if (!container) return;
  container.innerHTML = '<div class="studio-empty">טוען מותגים...</div>';

  try {
    const tid = getTenantId();

    // Fetch brands from v_storefront_brands (includes product_count)
    const { data, error } = await sb.from('v_storefront_brands')
      .select('brand_id, brand_name, slug, product_count, brand_page_enabled, brand_description_short, logo_url, brand_description, video_url, hero_image, brand_gallery, seo_title, seo_description')
      .eq('tenant_id', tid)
      .order('brand_name');

    if (error) throw error;

    // Aggregate brands (view may have multiple rows per brand)
    const brandMap = new Map();
    for (const row of (data || [])) {
      const existing = brandMap.get(row.brand_id);
      const rowCount = Number(row.product_count || 0);
      if (existing) {
        existing.product_count += rowCount;
      } else {
        brandMap.set(row.brand_id, { ...row, product_count: rowCount });
      }
    }

    studioBrands = Array.from(brandMap.values())
      .filter(b => b.product_count > 0)
      .sort((a, b) => a.brand_name.localeCompare(b.brand_name));

    studioBrandsLoaded = true;
    renderStudioBrandList();
  } catch (err) {
    console.error('loadStudioBrands error:', err);
    container.innerHTML = '<div class="studio-empty">שגיאה בטעינת מותגים</div>';
  }
}

/** Render the brand list in the sidebar */
function renderStudioBrandList() {
  const container = document.getElementById('studio-brand-list');
  if (!container) return;

  if (!studioBrands.length) {
    container.innerHTML = '<div class="studio-empty">אין מותגים עם מוצרים</div>';
    return;
  }

  const enabledCount = studioBrands.filter(b => b.brand_page_enabled).length;

  let html = `<div style="padding:8px 12px; font-size:.8rem; color:var(--g400); border-bottom:1px solid var(--g200);">
    ${enabledCount} מתוך ${studioBrands.length} עמודים פעילים
  </div>`;

  html += studioBrands.map(b => {
    const active = b.brand_page_enabled;
    const statusClass = active ? 'active' : 'inactive';
    const statusText = active ? 'פעיל' : 'כבוי';
    const logoHtml = b.logo_url
      ? `<img src="${escapeAttr(b.logo_url)}" alt="${escapeAttr(b.brand_name)}" class="brand-list-logo" />`
      : `<div class="brand-list-logo-placeholder">${escapeHtml(b.brand_name.charAt(0))}</div>`;

    return `<div class="brand-list-card" onclick="openStudioBrandEditor('${b.brand_id}')">
      ${logoHtml}
      <div class="brand-list-info">
        <div class="brand-list-name">${escapeHtml(b.brand_name)}</div>
        <div class="brand-list-count">${b.product_count} מוצרים</div>
      </div>
      <span class="brand-list-status ${statusClass}">${statusText}</span>
    </div>`;
  }).join('');

  container.innerHTML = html;
}

/** Open the brand page editor modal */
function openStudioBrandEditor(brandId) {
  const brand = studioBrands.find(b => b.brand_id === brandId);
  if (!brand) return;

  // Split description into two halves
  const allParagraphs = (brand.brand_description || '').split('</p>').filter(p => p.trim());
  const midpoint = Math.ceil(allParagraphs.length / 2);
  const desc1 = allParagraphs.slice(0, midpoint).map(p => p.includes('<p>') ? p + '</p>' : '<p>' + p + '</p>').join('');
  const desc2 = allParagraphs.slice(midpoint).map(p => p.includes('<p>') ? p + '</p>' : '<p>' + p + '</p>').join('');

  const galleryArr = Array.isArray(brand.brand_gallery) ? brand.brand_gallery : [];
  const seoDescLen = (brand.seo_description || '').length;
  const seoDescClass = seoDescLen > 160 ? 'seo-char-count over' : 'seo-char-count';

  const logoPreview = brand.logo_url
    ? `<div style="border:1px solid #e5e5e5; border-radius:8px; padding:0.5rem; background:#fff; display:inline-block;"><img src="${escapeAttr(brand.logo_url)}" alt="לוגו" style="max-height:80px; max-width:200px; object-fit:contain; display:block;" /></div>`
    : '<div style="border:1px solid #e5e5e5; border-radius:8px; padding:0.5rem 1rem; background:#fff; display:inline-block;"><span style="color:var(--g400); font-size:.85rem;">אין לוגו</span></div>';

  const galleryPreviewHtml = galleryArr.length > 0
    ? `<div class="gallery-grid">${galleryArr.map((url, i) => `<div class="gallery-thumb">
        <img src="${escapeAttr(url)}" alt="תמונה ${i + 1}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;" />
        <button type="button" onclick="removeStudioGalleryImage(${i})" style="position:absolute; top:-5px; right:-5px; width:20px; height:20px; border-radius:50%; background:#ef4444; color:#fff; border:none; font-size:.75rem; cursor:pointer;">✕</button>
      </div>`).join('')}</div>`
    : '<span style="color:var(--g400); font-size:.85rem;">אין תמונות — ישתמש בתמונות מוצרים אוטומטית</span>';

  const content = `
    <div class="brand-editor-section">
      <label class="brand-toggle">
        <input type="checkbox" id="sbe-enabled" ${brand.brand_page_enabled ? 'checked' : ''} />
        <span style="font-weight:600;">${brand.brand_page_enabled ? '🟢 עמוד פעיל' : '🔴 עמוד כבוי'}</span>
      </label>
    </div>

    <div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">הירו</h4>
      <label class="brand-editor-label">סרטון YouTube</label>
      <input type="text" id="sbe-video" class="brand-editor-input" dir="ltr" placeholder="https://www.youtube.com/watch?v=..." value="${escapeAttr(brand.video_url || '')}" />
      <span style="font-size:.8rem; color:var(--g400);">אם ריק — הירו סטטי עם לוגואים</span>
    </div>

    <div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">לוגו מותג</h4>
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
        <div id="sbe-logo-preview">${logoPreview}</div>
        <label class="btn-ai-generate" style="cursor:pointer;">
          📤 העלאת לוגו
          <input type="file" id="sbe-logo-input" accept="image/*" style="display:none;" onchange="handleStudioLogoUpload(this, '${brandId}')" />
        </label>
      </div>
      <input type="text" id="sbe-logo-url" class="brand-editor-input" dir="ltr" placeholder="URL לוגו" value="${escapeAttr(brand.logo_url || '')}" />
      <div id="sbe-logo-status" style="font-size:.8rem; margin-top:4px;"></div>
    </div>

    <div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">תמונות קרוסלה</h4>
      <div id="sbe-gallery-preview">${galleryPreviewHtml}</div>
      <div style="margin-top:8px;">
        <label class="btn-ai-generate" style="cursor:pointer;">
          📤 העלאת תמונות
          <input type="file" id="sbe-gallery-input" accept="image/*" multiple style="display:none;" onchange="handleStudioGalleryUpload(this, '${brandId}')" />
        </label>
        <span id="sbe-gallery-status" style="font-size:.8rem; margin-right:8px;"></span>
      </div>
      <span style="font-size:.8rem; color:var(--g400);">אם אין תמונות, ישתמש בתמונות מוצרים אוטומטית</span>
    </div>

    <div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">תוכן</h4>
      <button type="button" class="btn-ai-generate" id="sbe-ai-btn" onclick="generateStudioBrandContent('${escapeAttr(brand.brand_name)}', '${brandId}')">
        🤖 יצירת תוכן AI
      </button>

      <label class="brand-editor-label" style="margin-top:12px;">Tagline</label>
      <input type="text" id="sbe-tagline" class="brand-editor-input" value="${escapeAttr(brand.brand_description_short || '')}" />

      <label class="brand-editor-label" style="margin-top:12px;">תיאור ראשון (מידע על המותג)</label>
      <textarea id="sbe-desc1" class="brand-editor-textarea" style="min-height:180px;">${escapeHtml(desc1)}</textarea>

      <label class="brand-editor-label" style="margin-top:12px;">תיאור שני (למה באופטיקה פריזמה)</label>
      <textarea id="sbe-desc2" class="brand-editor-textarea" style="min-height:180px;">${escapeHtml(desc2)}</textarea>
    </div>

    <div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">SEO</h4>
      <label class="brand-editor-label">כותרת SEO</label>
      <input type="text" id="sbe-seo-title" class="brand-editor-input" value="${escapeAttr(brand.seo_title || '')}" />

      <label class="brand-editor-label" style="margin-top:8px;">תיאור SEO</label>
      <textarea id="sbe-seo-desc" class="brand-editor-textarea" style="min-height:60px;" oninput="updateSeoCharCount(this)">${escapeHtml(brand.seo_description || '')}</textarea>
      <div id="sbe-seo-count" class="${seoDescClass}">${seoDescLen}/160</div>
    </div>

    <div class="brand-editor-section" style="border-bottom:none;">
      <a href="${STOREFRONT_BASE}/brands/${encodeURIComponent(brand.slug || '')}/?t=prizma" target="_blank" style="display:inline-flex; align-items:center; gap:6px; color:var(--primary); font-weight:600; text-decoration:none;">
        👁 פתח עמוד מותג
      </a>
    </div>
  `;

  // Store gallery in a temp variable for add/remove operations
  window._studioGallery = [...galleryArr];
  window._studioEditBrandId = brandId;

  Modal.show({
    title: `עריכת עמוד מותג — ${brand.brand_name}`,
    size: 'lg',
    cssClass: 'brand-editor-modal',
    content: content,
    footer: `<button class="btn btn-primary" onclick="saveStudioBrandPage('${brandId}')">💾 שמור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });

  // Toggle label update
  const toggle = document.getElementById('sbe-enabled');
  if (toggle) {
    toggle.addEventListener('change', function() {
      const label = this.parentElement.querySelector('span');
      if (label) label.textContent = this.checked ? '🟢 עמוד פעיל' : '🔴 עמוד כבוי';
    });
  }
}

/** Update SEO char count display */
function updateSeoCharCount(textarea) {
  const count = textarea.value.length;
  const el = document.getElementById('sbe-seo-count');
  if (el) {
    el.textContent = `${count}/160`;
    el.className = count > 160 ? 'seo-char-count over' : 'seo-char-count';
  }
}

/** Gallery management — file upload to Supabase Storage */
async function handleStudioGalleryUpload(input, brandId) {
  const files = input.files;
  if (!files || !files.length) return;

  const statusEl = document.getElementById('sbe-gallery-status');
  const tid = getTenantId();
  let uploaded = 0;

  if (statusEl) { statusEl.textContent = `מעלה ${files.length} תמונות...`; statusEl.style.color = '#666'; }

  for (const file of files) {
    try {
      // Convert to WebP via canvas
      const blob = await convertToWebp(file);
      const timestamp = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const path = `brands/${tid}/${brandId}/gallery/${timestamp}.webp`;

      const { data, error } = await sb.storage
        .from('tenant-logos')
        .upload(path, blob, { contentType: 'image/webp', upsert: false });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = sb.storage.from('tenant-logos').getPublicUrl(path);
      if (urlData?.publicUrl) {
        window._studioGallery.push(urlData.publicUrl);
        uploaded++;
      }
    } catch (err) {
      console.error('Gallery upload error:', err);
    }
  }

  refreshStudioGalleryPreview();
  input.value = ''; // Reset file input
  if (statusEl) {
    statusEl.textContent = uploaded > 0 ? `✓ ${uploaded} תמונות הועלו` : '✗ שגיאה בהעלאה';
    statusEl.style.color = uploaded > 0 ? '#22c55e' : '#ef4444';
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  }
}

/** Convert image file to WebP blob via canvas */
function convertToWebp(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('toBlob failed'));
      }, 'image/webp', 0.85);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

function removeStudioGalleryImage(index) {
  window._studioGallery.splice(index, 1);
  refreshStudioGalleryPreview();
}

function refreshStudioGalleryPreview() {
  const container = document.getElementById('sbe-gallery-preview');
  if (!container) return;
  const arr = window._studioGallery || [];
  if (!arr.length) {
    container.innerHTML = '<span style="color:var(--g400); font-size:.85rem;">אין תמונות — ישתמש בתמונות מוצרים אוטומטית</span>';
    return;
  }
  container.innerHTML = `<div class="gallery-grid">${arr.map((url, i) => `<div class="gallery-thumb">
    <img src="${escapeAttr(url)}" alt="תמונה ${i + 1}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;" />
    <button type="button" onclick="removeStudioGalleryImage(${i})" style="position:absolute; top:-5px; right:-5px; width:20px; height:20px; border-radius:50%; background:#ef4444; color:#fff; border:none; font-size:.75rem; cursor:pointer;">✕</button>
  </div>`).join('')}</div>`;
}

/** Logo upload with normalization */
async function handleStudioLogoUpload(input, brandId) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('sbe-logo-status');
  if (statusEl) { statusEl.textContent = 'מעבד ומנרמל...'; statusEl.style.color = '#666'; }

  const reader = new FileReader();
  reader.onload = async function() {
    const base64 = reader.result.split(',')[1];
    try {
      const res = await fetch(`${STOREFRONT_BASE}/api/normalize-logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          filename: file.name,
          brand_id: brandId,
          tenant_id: getTenantId(),
          type: 'brand'
        })
      });
      const data = await res.json();
      if (data.success) {
        const preview = document.getElementById('sbe-logo-preview');
        if (preview) preview.innerHTML = `<div style="border:1px solid #e5e5e5; border-radius:8px; padding:0.5rem; background:#fff; display:inline-block;"><img src="${data.url}" alt="לוגו" style="max-height:80px; max-width:200px; object-fit:contain; display:block;" /></div>`;
        const urlField = document.getElementById('sbe-logo-url');
        if (urlField) urlField.value = data.url;
        if (statusEl) { statusEl.textContent = '✓ לוגו עודכן ונורמל'; statusEl.style.color = '#22c55e'; }
      } else {
        if (statusEl) { statusEl.textContent = '✗ שגיאה: ' + data.error; statusEl.style.color = '#ef4444'; }
      }
    } catch (err) {
      if (statusEl) { statusEl.textContent = '✗ שגיאה בהעלאה'; statusEl.style.color = '#ef4444'; }
      console.error('Logo upload error:', err);
    }
  };
  reader.readAsDataURL(file);
}

/** Save brand page data */
async function saveStudioBrandPage(brandId) {
  const desc1 = document.getElementById('sbe-desc1')?.value.trim() || '';
  const desc2 = document.getElementById('sbe-desc2')?.value.trim() || '';
  const fullDescription = (desc1 + desc2) || null;

  const updates = {
    brand_page_enabled: document.getElementById('sbe-enabled')?.checked || false,
    brand_description_short: document.getElementById('sbe-tagline')?.value.trim() || null,
    brand_description: fullDescription,
    video_url: document.getElementById('sbe-video')?.value.trim() || null,
    logo_url: document.getElementById('sbe-logo-url')?.value.trim() || null,
    brand_gallery: window._studioGallery || [],
    seo_title: document.getElementById('sbe-seo-title')?.value.trim() || null,
    seo_description: document.getElementById('sbe-seo-desc')?.value.trim() || null,
  };

  try {
    const { error } = await sb.from(T.BRANDS)
      .update(updates)
      .eq('id', brandId)
      .eq('tenant_id', getTenantId());

    if (error) throw error;

    Toast.success('עמוד המותג נשמר בהצלחה');
    Modal.close();

    // Refresh brand list
    studioBrandsLoaded = false;
    await loadStudioBrands();
  } catch (err) {
    console.error('saveStudioBrandPage error:', err);
    Toast.error('שגיאה בשמירה: ' + (err.message || ''));
  }
}

/** AI Content Generation */
async function generateStudioBrandContent(brandName, brandId) {
  const btn = document.getElementById('sbe-ai-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '🤖 מייצר תוכן...';

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-brand-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`
      },
      body: JSON.stringify({
        brand_name: brandName,
        tenant_id: getTenantId()
      })
    });

    const data = await res.json();

    if (data.success) {
      const tagline = document.getElementById('sbe-tagline');
      const desc1 = document.getElementById('sbe-desc1');
      const desc2 = document.getElementById('sbe-desc2');
      const seoTitle = document.getElementById('sbe-seo-title');
      const seoDesc = document.getElementById('sbe-seo-desc');

      if (tagline) tagline.value = data.tagline || '';
      if (desc1) desc1.value = data.description1 || '';
      if (desc2) desc2.value = data.description2 || '';
      if (seoTitle) seoTitle.value = data.seo_title || '';
      if (seoDesc) {
        seoDesc.value = data.seo_description || '';
        updateSeoCharCount(seoDesc);
      }

      Toast.success('תוכן AI נוצר — עיין ועריך לפי הצורך');
    } else {
      Toast.error('שגיאה ביצירת תוכן: ' + (data.error || 'Unknown'));
    }
  } catch (err) {
    console.error('AI generation error:', err);
    Toast.error('שגיאה ביצירת תוכן AI');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🤖 יצירת תוכן AI';
    }
  }
}
