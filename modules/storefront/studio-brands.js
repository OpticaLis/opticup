// modules/storefront/studio-brands.js
// Brand Pages management inside Studio — "עמודי מותג" section in Pages tab

let studioBrands = [];
let studioBrandsLoaded = false;
let _brandPageView = false;
let _quillDesc1 = null;
let _quillDesc2 = null;
let _aiMode = 'new'; // 'new' or 'edit'

const STOREFRONT_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:4321'
  : 'https://opticup-storefront.vercel.app';

/** Resolve logo/media URL — handles storage paths, local paths, and full URLs */
function resolveLogoUrl(url) {
  if (!url) return '';
  return resolveMediaUrl(url, STOREFRONT_BASE);
}

// ═══════════════════════════════════════════════════
// SEO SCORE (live recalculation)
// ═══════════════════════════════════════════════════

function calcBrandSeoScoreLive() {
  const title = document.getElementById('sbe-seo-title')?.value || '';
  const desc = document.getElementById('sbe-seo-desc')?.value || '';
  const body = getQuillHtml(_quillDesc1) + getQuillHtml(_quillDesc2);
  const tagline = document.getElementById('sbe-tagline')?.value || '';
  const video = document.getElementById('sbe-video')?.value || '';
  const name = window._studioEditBrandName || '';

  let score = 0;
  if (title.length > 0) score += 10;
  if (title.includes(name)) score += 10;
  if (title.length >= 50 && title.length <= 60) score += 10;
  if (desc.length > 0) score += 10;
  if (desc.length >= 140 && desc.length <= 160) score += 10;
  if ((body.match(/<\/p>/gi) || []).length >= 3) score += 10;
  if (body.includes('משקפי')) score += 10;
  if (body.includes('משקפי שמש')) score += 10;
  if (tagline.length > 0) score += 10;
  if (video.length > 0 || document.getElementById('sbe-enabled')?.checked) score += 10;

  return score;
}

function calcBrandSeoScoreStatic(brand) {
  let score = 0;
  const title = brand.seo_title || '';
  const desc = brand.seo_description || '';
  const body = brand.brand_description || '';
  const name = brand.brand_name || '';

  if (title.length > 0) score += 10;
  if (title.includes(name)) score += 10;
  if (title.length >= 50 && title.length <= 60) score += 10;
  if (desc.length > 0) score += 10;
  if (desc.length >= 140 && desc.length <= 160) score += 10;
  if ((body.match(/<\/p>/gi) || []).length >= 3) score += 10;
  if (body.includes('משקפי')) score += 10;
  if (body.includes('משקפי שמש')) score += 10;
  if ((brand.brand_description_short || '').length > 0) score += 10;
  if ((brand.video_url || '').length > 0 || brand.brand_page_enabled) score += 10;

  return score;
}

function seoScoreBadge(score) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  return `<span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:${color}; color:#fff; font-size:.75rem; font-weight:700; flex-shrink:0;">${score}</span>`;
}

function recalculateSEO() {
  const score = calcBrandSeoScoreLive();
  const el = document.getElementById('sbe-seo-score');
  if (el) el.innerHTML = seoScoreBadge(score) + ' SEO';
  updateBrandGooglePreview();
}

// ═══════════════════════════════════════════════════
// VIEW TOGGLE
// ═══════════════════════════════════════════════════

function toggleBrandPagesView(showBrands) {
  _brandPageView = showBrands;

  document.querySelectorAll('.page-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === (showBrands ? 'brands' : 'pages'));
  });

  const pageList = document.getElementById('studio-page-list');
  const brandList = document.getElementById('studio-brand-list');
  const campaignList = document.getElementById('studio-campaign-list');
  const editorArea = document.getElementById('studio-editor');

  // Always hide campaigns list when toggling pages/brands
  if (campaignList) campaignList.style.display = 'none';

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

// ═══════════════════════════════════════════════════
// LOAD BRANDS
// ═══════════════════════════════════════════════════

async function loadStudioBrands() {
  const container = document.getElementById('studio-brand-list');
  if (!container) return;
  container.innerHTML = '<div class="studio-empty">טוען מותגים...</div>';

  try {
    const tid = getTenantId();
    // Fetch from view (product counts + page fields) — tags come from brands table join
    const { data, error } = await sb.from('v_storefront_brands')
      .select('brand_id, brand_name, slug, product_count, brand_page_enabled, brand_description_short, logo_url, brand_description, video_url, hero_image, brand_gallery, seo_title, seo_description, display_mode, brand_page_visibility, show_brand_products')
      .eq('tenant_id', tid)
      .order('brand_name');

    // Fetch tags from brands table separately (view doesn't include tags)
    const { data: brandTags } = await sb.from(T.BRANDS)
      .select('id, tags')
      .eq('tenant_id', tid);
    const tagMap = {};
    for (const bt of (brandTags || [])) { tagMap[bt.id] = bt.tags || []; }

    // Fetch translation status (entity_id + lang) for language badges
    const { data: trRows } = await sb.from('content_translations')
      .select('entity_id, lang')
      .eq('tenant_id', tid)
      .eq('entity_type', 'brand');
    const langMap = {};
    for (const r of (trRows || [])) {
      if (!langMap[r.entity_id]) langMap[r.entity_id] = { he: true };
      langMap[r.entity_id][r.lang] = true;
    }

    if (error) throw error;

    const brandMap = new Map();
    for (const row of (data || [])) {
      const existing = brandMap.get(row.brand_id);
      const rowCount = Number(row.product_count || 0);
      if (existing) {
        existing.product_count += rowCount;
      } else {
        brandMap.set(row.brand_id, { ...row, product_count: rowCount, tags: tagMap[row.brand_id] || [], _langs: langMap[row.brand_id] || { he: true } });
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

// ═══════════════════════════════════════════════════
// RENDER BRAND LIST (with SEO score + resolved logo URLs)
// ═══════════════════════════════════════════════════

function renderStudioBrandList() {
  const container = document.getElementById('studio-brand-list');
  if (!container) return;

  if (!studioBrands.length) {
    container.innerHTML = '<div class="studio-empty">אין מותגים עם מוצרים</div>';
    return;
  }

  const enabledCount = studioBrands.filter(b => b.brand_page_enabled).length;
  const inactiveBrands = studioBrands.filter(b => !b.brand_page_enabled);

  let html = `<div style="padding:8px 12px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--g200);">
    <span style="font-size:.8rem; color:var(--g400);">${enabledCount} מתוך ${studioBrands.length} עמודים פעילים</span>
    <button class="btn-ai-generate" style="font-size:.75rem; padding:5px 12px;" onclick="showNewBrandPagePicker()">+ עמוד מותג חדש</button>
  </div>`;

  html += studioBrands.map(b => {
    const active = b.brand_page_enabled;
    const statusClass = active ? 'active' : 'inactive';
    const statusText = active ? 'פעיל' : 'כבוי';
    const resolvedLogo = resolveLogoUrl(b.logo_url);
    const logoHtml = resolvedLogo
      ? `<img src="${escapeAttr(resolvedLogo)}" alt="${escapeAttr(b.brand_name)}" class="brand-list-logo" />`
      : `<div class="brand-list-logo-placeholder">${escapeHtml(b.brand_name.charAt(0))}</div>`;
    const score = calcBrandSeoScoreStatic(b);

    const brandTagBadges = typeof renderTagBadges === 'function' ? renderTagBadges(b.tags) : '';

    return `<div class="brand-list-card" onclick="openStudioBrandEditor('${b.brand_id}')">
      ${logoHtml}
      <div class="brand-list-info">
        <div class="brand-list-name">${escapeHtml(b.brand_name)}</div>
        <div class="brand-list-count">${b.product_count} מוצרים</div>
        ${typeof renderLangBadges === 'function' ? renderLangBadges(b._langs) : ''}
        ${brandTagBadges}
      </div>
      ${seoScoreBadge(score)}
      <span class="brand-list-status ${statusClass}">${statusText}</span>
    </div>`;
  }).join('');

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════
// NEW BRAND PAGE PICKER
// ═══════════════════════════════════════════════════

function showNewBrandPagePicker() {
  const inactive = studioBrands.filter(b => !b.brand_page_enabled && b.product_count > 0);

  if (!inactive.length) {
    Modal.show({
      title: 'עמוד מותג חדש',
      size: 'sm',
      content: '<p style="text-align:center; color:var(--g500); padding:1rem;">כל המותגים כבר פעילים 🎉</p>',
      footer: '<button class="btn btn-ghost" onclick="Modal.close()">סגור</button>'
    });
    return;
  }

  const listHtml = inactive.map(b => {
    const resolvedLogo = resolveLogoUrl(b.logo_url);
    const logoHtml = resolvedLogo
      ? `<img src="${escapeAttr(resolvedLogo)}" alt="" style="width:36px; height:24px; object-fit:contain;" />`
      : `<span style="width:36px; height:24px; display:inline-flex; align-items:center; justify-content:center; background:var(--g100); border-radius:4px; font-weight:700; font-size:.75rem; color:var(--g400);">${escapeHtml(b.brand_name.charAt(0))}</span>`;

    return `<div class="brand-list-card" onclick="Modal.close();openStudioBrandEditor('${b.brand_id}')" style="padding:8px 12px;">
      ${logoHtml}
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; font-size:.875rem;">${escapeHtml(b.brand_name)}</div>
      </div>
      <span style="font-size:.75rem; color:var(--g400);">${b.product_count} מוצרים</span>
    </div>`;
  }).join('');

  Modal.show({
    title: '+ עמוד מותג חדש',
    size: 'sm',
    content: `<p style="font-size:.85rem; color:var(--g500); margin-bottom:12px;">בחר מותג להפעלה:</p>${listHtml}`,
    footer: '<button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>'
  });
}

// ═══════════════════════════════════════════════════
// EDITOR MODAL
// ═══════════════════════════════════════════════════

function openStudioBrandEditor(brandId) {
  const brand = studioBrands.find(b => b.brand_id === brandId);
  if (!brand) return;

  const storeName = getTenantConfig('name') || 'אופטיקה פריזמה';
  _quillDesc1 = null;
  _quillDesc2 = null;
  _aiMode = 'new';

  const allParagraphs = (brand.brand_description || '').split('</p>').filter(p => p.trim());
  const midpoint = Math.ceil(allParagraphs.length / 2);
  const desc1 = allParagraphs.slice(0, midpoint).map(p => p.includes('<p>') ? p + '</p>' : '<p>' + p + '</p>').join('');
  const desc2 = allParagraphs.slice(midpoint).map(p => p.includes('<p>') ? p + '</p>' : '<p>' + p + '</p>').join('');

  const galleryArr = Array.isArray(brand.brand_gallery) ? brand.brand_gallery : [];
  const seoDescLen = (brand.seo_description || '').length;
  const seoDescClass = seoDescLen > 160 ? 'seo-char-count over' : 'seo-char-count';
  const seoScore = calcBrandSeoScoreStatic(brand);

  const resolvedLogo = resolveLogoUrl(brand.logo_url);
  const logoPreview = resolvedLogo
    ? `<img src="${escapeAttr(resolvedLogo)}" alt="לוגו" style="max-width:200px; max-height:80px; object-fit:contain; display:block;" />`
    : '<span style="color:var(--g400); font-size:.85rem;">אין לוגו</span>';

  const galleryPreviewHtml = galleryArr.length > 0
    ? `<div class="gallery-grid">${galleryArr.map((url, i) => `<div class="gallery-thumb">
        <img src="${escapeAttr(resolveLogoUrl(url))}" alt="תמונה ${i + 1}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;" />
        <button type="button" onclick="removeStudioGalleryImage(${i})" style="position:absolute; top:-5px; right:-5px; width:20px; height:20px; border-radius:50%; background:#ef4444; color:#fff; border:none; font-size:.75rem; cursor:pointer;">✕</button>
      </div>`).join('')}</div>`
    : '<span style="color:var(--g400); font-size:.85rem;">אין תמונות — ישתמש בתמונות מוצרים אוטומטית</span>';

  const googleTitle = escapeHtml(brand.seo_title || 'כותרת SEO');
  const googleDesc = escapeHtml(brand.seo_description || 'תיאור SEO');
  // TODO(B4): replace hardcoded domain with getTenantConfig('custom_domain') when added to schema
  const googleUrl = `prizma-optic.co.il › brands › ${brand.slug || ''}`;

  const content = `
    <div class="brand-editor-section" style="display:flex; align-items:center; gap:12px;">
      <label class="brand-toggle">
        <input type="checkbox" id="sbe-enabled" ${brand.brand_page_enabled ? 'checked' : ''} />
        <span style="font-weight:600;">${brand.brand_page_enabled ? '🟢 עמוד פעיל' : '🔴 עמוד כבוי'}</span>
      </label>
      <div style="margin-right:auto;"></div>
      <div id="sbe-seo-score" style="display:flex; align-items:center; gap:6px; font-size:.8rem; color:var(--g500);">
        ${seoScoreBadge(seoScore)} SEO
      </div>
    </div>

    <div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">הגדרות תצוגה</h4>

      <label class="brand-editor-label">תצוגת מוצרים</label>
      <select id="sbe-display-mode" class="brand-editor-input">
        <option value="catalog"   ${(brand.display_mode || 'store_all') === 'catalog'   ? 'selected' : ''}>קטלוג - כל הדגמים (להזמנה)</option>
        <option value="store_all" ${(brand.display_mode || 'store_all') === 'store_all' ? 'selected' : ''}>חנות - הכל כולל אזל</option>
        <option value="store"     ${(brand.display_mode || 'store_all') === 'store'     ? 'selected' : ''}>חנות - במלאי בלבד</option>
        <option value="hidden"    ${(brand.display_mode || 'store_all') === 'hidden'    ? 'selected' : ''}>הסתר - לא מוצג באתר</option>
      </select>

      <label class="brand-editor-label" style="margin-top:12px;">נראות עמוד מותג</label>
      <select id="sbe-page-visibility" class="brand-editor-input">
        <option value="listed"   ${(brand.brand_page_visibility || 'listed') === 'listed'   ? 'selected' : ''}>פעיל - מופיע ברשימה</option>
        <option value="unlisted" ${(brand.brand_page_visibility || 'listed') === 'unlisted' ? 'selected' : ''}>פעיל ומוסתר - לא ברשימה אבל URL עובד</option>
        <option value="hidden"   ${(brand.brand_page_visibility || 'listed') === 'hidden'   ? 'selected' : ''}>מוסתר לגמרי - אין עמוד</option>
      </select>

      <label class="brand-toggle" style="display:flex; align-items:center; gap:8px; margin-top:12px;">
        <input type="checkbox" id="sbe-show-products" ${brand.show_brand_products !== false ? 'checked' : ''} />
        <span>הצג מוצרים בעמוד מותג</span>
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
      <div style="display:flex; align-items:center; gap:12px;">
        <div id="sbe-logo-preview" style="border:1px solid #e5e5e5; border-radius:8px; padding:8px; background:#fff; display:inline-flex; align-items:center; justify-content:center; min-width:80px; min-height:48px;">${logoPreview}</div>
        <div>
          <label class="btn-ai-generate" style="cursor:pointer;">
            📤 העלאת לוגו
            <input type="file" id="sbe-logo-input" accept="image/*" style="display:none;" onchange="handleStudioLogoUpload(this, '${brandId}')" />
          </label>
          <div id="sbe-logo-status" style="font-size:.8rem; margin-top:4px;"></div>
        </div>
      </div>
      <input type="hidden" id="sbe-logo-url" value="${escapeAttr(brand.logo_url || '')}" />
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
      <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
        <button type="button" class="btn-ai-mode active" data-mode="new" onclick="switchAiMode('new')">יצירת תוכן חדש</button>
        <button type="button" class="btn-ai-mode" data-mode="edit" onclick="switchAiMode('edit')">שינוי בפרומפט</button>
      </div>
      <div id="sbe-ai-prompt-area" style="display:none; margin-bottom:0.75rem;">
        <textarea id="sbe-ai-prompt" class="brand-editor-textarea" style="min-height:70px;" placeholder="לדוגמה: שנה את הכותרת ל..., או: כתוב מחדש את הטקסט השני בטון יותר חם, או: הוסף משפט על המעבדה שלנו" rows="3"></textarea>
      </div>
      <button type="button" class="btn-ai-generate" id="sbe-ai-btn" onclick="generateStudioBrandContent('${escapeAttr(brand.brand_name)}', '${brandId}')">
        🤖 יצירת תוכן AI
      </button>

      <!-- HF1: AI translate buttons (translateStudioBrandContent) removed as part of
           the translate-content Edge Function retirement. Brand translations are
           handled via the manual export/import flow in the Translations tab. -->

      <label class="brand-editor-label" style="margin-top:12px;">Tagline</label>
      <input type="text" id="sbe-tagline" class="brand-editor-input" value="${escapeAttr(brand.brand_description_short || '')}" />

      <label class="brand-editor-label" style="margin-top:12px;">תיאור ראשון (מידע על המותג)</label>
      <div class="studio-richtext-wrap" id="sbe-desc1-wrap">
        <div id="sbe-desc1-editor"></div>
      </div>

      <label class="brand-editor-label" style="margin-top:12px;">תיאור שני (למה ב${storeName})</label>
      <div class="studio-richtext-wrap" id="sbe-desc2-wrap">
        <div id="sbe-desc2-editor"></div>
      </div>
    </div>

    <div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">SEO</h4>
      <label class="brand-editor-label">כותרת SEO</label>
      <input type="text" id="sbe-seo-title" class="brand-editor-input" value="${escapeAttr(brand.seo_title || '')}" />

      <label class="brand-editor-label" style="margin-top:8px;">תיאור SEO</label>
      <textarea id="sbe-seo-desc" class="brand-editor-textarea" style="min-height:60px;">${escapeHtml(brand.seo_description || '')}</textarea>
      <div id="sbe-seo-count" class="${seoDescClass}">${seoDescLen}/160</div>

      <div id="sbe-google-preview" style="font-family:arial,sans-serif; max-width:600px; direction:ltr; text-align:left; margin-top:1rem; padding:1rem; background:#fff; border:1px solid #e5e5e5; border-radius:8px;">
        <div id="sbe-gp-title" style="color:#1a0dab; font-size:18px; line-height:1.3;">${googleTitle}</div>
        <div style="color:#006621; font-size:14px; margin-top:2px;">${googleUrl}</div>
        <div id="sbe-gp-desc" style="color:#545454; font-size:13px; margin-top:4px; line-height:1.4;">${googleDesc}</div>
      </div>
    </div>

    ${studioTags.length ? `<div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">תגיות</h4>
      <div style="display:flex; flex-wrap:wrap; gap:4px;">${renderTagCheckboxes(brand.tags)}</div>
    </div>` : ''}

    <div class="brand-editor-section" style="border-bottom:none;">
      <a href="${STOREFRONT_BASE}/brands/${encodeURIComponent(brand.slug || '')}/?t=${encodeURIComponent(TENANT_SLUG || '')}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; color:var(--primary); font-weight:600; text-decoration:none;">
        👁 פתח עמוד מותג
      </a>
    </div>
  `;

  window._studioGallery = [...galleryArr];
  window._studioEditBrandId = brandId;
  window._studioEditBrandName = brand.brand_name;

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

  // Initialize Quill + attach live SEO listeners
  initBrandQuillEditors(desc1, desc2);
  attachSeoListeners();
}

// ═══════════════════════════════════════════════════
// LIVE SEO LISTENERS
// ═══════════════════════════════════════════════════

function attachSeoListeners() {
  const fields = ['sbe-seo-title', 'sbe-seo-desc', 'sbe-tagline', 'sbe-video'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalculateSEO);
  });
  // SEO desc also updates char count
  const seoDesc = document.getElementById('sbe-seo-desc');
  if (seoDesc) seoDesc.addEventListener('input', function() { updateSeoCharCount(this); });
  // Quill editors
  if (_quillDesc1) _quillDesc1.on('text-change', recalculateSEO);
  if (_quillDesc2) _quillDesc2.on('text-change', recalculateSEO);
}

// ═══════════════════════════════════════════════════
// AI MODE TOGGLE
// ═══════════════════════════════════════════════════

function switchAiMode(mode) {
  _aiMode = mode;
  document.querySelectorAll('.btn-ai-mode').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  const promptArea = document.getElementById('sbe-ai-prompt-area');
  const btn = document.getElementById('sbe-ai-btn');
  if (promptArea) promptArea.style.display = mode === 'edit' ? 'block' : 'none';
  if (btn) btn.textContent = mode === 'edit' ? '🤖 שלח הנחיה' : '🤖 יצירת תוכן AI';
}

// ═══════════════════════════════════════════════════
// QUILL RICHTEXT EDITORS
// ═══════════════════════════════════════════════════

function initBrandQuillEditors(desc1Html, desc2Html) {
  if (typeof Quill === 'undefined') {
    console.warn('Quill not loaded');
    return;
  }

  const toolbarOpts = [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean']
  ];

  const el1 = document.getElementById('sbe-desc1-editor');
  const el2 = document.getElementById('sbe-desc2-editor');

  if (el1) {
    _quillDesc1 = new Quill(el1, { theme: 'snow', modules: { toolbar: toolbarOpts }, placeholder: 'תיאור המותג — היסטוריה, עיצוב, ייחודיות...' });
    _quillDesc1.root.setAttribute('dir', 'rtl');
    _quillDesc1.root.style.textAlign = 'right';
    if (desc1Html) _quillDesc1.root.innerHTML = desc1Html;
  }

  if (el2) {
    _quillDesc2 = new Quill(el2, { theme: 'snow', modules: { toolbar: toolbarOpts }, placeholder: `למה לקנות ב${storeName} — שירות, התאמה, ניסיון...` });
    _quillDesc2.root.setAttribute('dir', 'rtl');
    _quillDesc2.root.style.textAlign = 'right';
    if (desc2Html) _quillDesc2.root.innerHTML = desc2Html;
  }
}

function getQuillHtml(quill) {
  if (!quill) return '';
  const html = quill.root.innerHTML;
  if (html === '<p><br></p>' || html === '<p></p>') return '';
  return html;
}

// ═══════════════════════════════════════════════════
// GOOGLE PREVIEW + SEO CHAR COUNT
// ═══════════════════════════════════════════════════

function updateBrandGooglePreview() {
  const titleEl = document.getElementById('sbe-gp-title');
  const descEl = document.getElementById('sbe-gp-desc');
  const titleInput = document.getElementById('sbe-seo-title');
  const descInput = document.getElementById('sbe-seo-desc');
  if (titleEl && titleInput) titleEl.textContent = titleInput.value || 'כותרת SEO';
  if (descEl && descInput) descEl.textContent = descInput.value || 'תיאור SEO';
}

function updateSeoCharCount(textarea) {
  const count = textarea.value.length;
  const el = document.getElementById('sbe-seo-count');
  if (el) {
    el.textContent = `${count}/160`;
    el.className = count > 160 ? 'seo-char-count over' : 'seo-char-count';
  }
}

// ═══════════════════════════════════════════════════
// GALLERY — FILE UPLOAD
// ═══════════════════════════════════════════════════

async function handleStudioGalleryUpload(input, brandId) {
  const files = input.files;
  if (!files || !files.length) return;

  const statusEl = document.getElementById('sbe-gallery-status');
  const tid = getTenantId();
  let uploaded = 0;

  if (statusEl) { statusEl.textContent = `מעלה ${files.length} תמונות...`; statusEl.style.color = '#666'; }

  for (const file of files) {
    try {
      const blob = await convertToWebp(file);
      const timestamp = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const storagePath = `media/${tid}/models/${timestamp}.webp`;

      const { data, error } = await sb.storage
        .from('media-library')
        .upload(storagePath, blob, { contentType: 'image/webp', upsert: false });

      if (error) throw error;

      // Register in media_library table for Gallery reuse
      const { error: dbErr } = await sb.from('media_library').insert({
        tenant_id: tid,
        filename: `${timestamp}.webp`,
        original_filename: file.name,
        storage_path: storagePath,
        mime_type: 'image/webp',
        file_size: blob.size,
        folder: 'models',
        tags: ['brand-gallery', brandId],
        uploaded_by: sessionStorage.getItem('current_user_name') || 'studio'
      });
      if (dbErr) console.warn('media_library insert warning:', dbErr.message);

      // Store storage path (not full URL) — resolved at render time via /api/image/ proxy
      const ref = storagePath;
      window._studioGallery.push(ref);
      uploaded++;
    } catch (err) {
      console.error('Gallery upload error:', err);
    }
  }

  refreshStudioGalleryPreview();
  input.value = '';
  if (statusEl) {
    statusEl.textContent = uploaded > 0 ? `✓ ${uploaded} תמונות הועלו` : '✗ שגיאה בהעלאה';
    statusEl.style.color = uploaded > 0 ? '#22c55e' : '#ef4444';
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  }
}

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
    <img src="${escapeAttr(resolveLogoUrl(url))}" alt="תמונה ${i + 1}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;" />
    <button type="button" onclick="removeStudioGalleryImage(${i})" style="position:absolute; top:-5px; right:-5px; width:20px; height:20px; border-radius:50%; background:#ef4444; color:#fff; border:none; font-size:.75rem; cursor:pointer;">✕</button>
  </div>`).join('')}</div>`;
}

// ═══════════════════════════════════════════════════
// LOGO UPLOAD
// ═══════════════════════════════════════════════════

async function handleStudioLogoUpload(input, brandId) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('sbe-logo-status');
  if (statusEl) { statusEl.textContent = 'מעבד ומנרמל...'; statusEl.style.color = '#666'; }

  const reader = new FileReader();
  reader.onload = async function() {
    const base64 = reader.result.split(',')[1];
    try {
      // tenant_auth_token is the canonical ERP session token (auth-service.js).
      // jwt_token is only set in JWT-based logins and may be stale.
      const _authToken = sessionStorage.getItem('tenant_auth_token')
        || sessionStorage.getItem('jwt_token')
        || '';
      const res = await fetch(`${STOREFRONT_BASE}/api/normalize-logo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + _authToken
        },
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
        const resolvedUrl = resolveLogoUrl(data.url);
        const preview = document.getElementById('sbe-logo-preview');
        if (preview) preview.innerHTML = `<img src="${resolvedUrl}" alt="לוגו" style="max-width:200px; max-height:80px; object-fit:contain; display:block;" />`;
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

// ═══════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════

async function saveStudioBrandPage(brandId) {
  const desc1 = getQuillHtml(_quillDesc1);
  const desc2 = getQuillHtml(_quillDesc2);
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
    tags: typeof getCheckedTags === 'function' ? getCheckedTags() : [],
    display_mode: document.getElementById('sbe-display-mode')?.value || 'store_all',
    brand_page_visibility: document.getElementById('sbe-page-visibility')?.value || 'listed',
    show_brand_products: document.getElementById('sbe-show-products')?.checked !== false,
  };

  try {
    const { error } = await sb.from(T.BRANDS)
      .update(updates)
      .eq('id', brandId)
      .eq('tenant_id', getTenantId());

    if (error) throw error;

    Toast.success('עמוד המותג נשמר בהצלחה');
    Modal.close();

    studioBrandsLoaded = false;
    await loadStudioBrands();
  } catch (err) {
    console.error('saveStudioBrandPage error:', err);
    Toast.error('שגיאה בשמירה: ' + (err.message || ''));
  }
}

// ═══════════════════════════════════════════════════
// AI CONTENT GENERATION (two modes)
// ═══════════════════════════════════════════════════

async function generateStudioBrandContent(brandName, brandId) {
  const btn = document.getElementById('sbe-ai-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '🤖 מייצר תוכן...';

  try {
    const payload = {
      brand_name: brandName,
      tenant_id: getTenantId()
    };

    if (_aiMode === 'edit') {
      const userPrompt = document.getElementById('sbe-ai-prompt')?.value.trim() || '';
      if (!userPrompt) {
        Toast.warning('יש לכתוב הנחיה לפני שליחה');
        return;
      }
      payload.prompt = userPrompt;
      payload.current_content = {
        tagline: document.getElementById('sbe-tagline')?.value || '',
        description1: getQuillHtml(_quillDesc1),
        description2: getQuillHtml(_quillDesc2),
        seo_title: document.getElementById('sbe-seo-title')?.value || '',
        seo_description: document.getElementById('sbe-seo-desc')?.value || ''
      };
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-brand-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      const tagline = document.getElementById('sbe-tagline');
      const seoTitle = document.getElementById('sbe-seo-title');
      const seoDesc = document.getElementById('sbe-seo-desc');

      if (tagline) tagline.value = data.tagline || '';
      if (_quillDesc1 && data.description1) _quillDesc1.root.innerHTML = data.description1;
      if (_quillDesc2 && data.description2) _quillDesc2.root.innerHTML = data.description2;
      if (seoTitle) seoTitle.value = data.seo_title || '';
      if (seoDesc) {
        seoDesc.value = data.seo_description || '';
        updateSeoCharCount(seoDesc);
      }
      recalculateSEO();

      Toast.success(_aiMode === 'edit' ? 'תוכן AI עודכן לפי ההנחיה' : 'תוכן AI נוצר — עיין ועריך לפי הצורך');
    } else {
      Toast.error('שגיאה ביצירת תוכן: ' + (data.error || 'Unknown'));
    }
  } catch (err) {
    console.error('AI generation error:', err);
    Toast.error('שגיאה ביצירת תוכן AI');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = _aiMode === 'edit' ? '🤖 שלח הנחיה' : '🤖 יצירת תוכן AI';
    }
  }
}

// HF1 (2026-04-10): translateStudioBrandContent removed as part of the
// translate-content Edge Function retirement (translation pivot). The function
// called `generate-brand-content` (a separate Edge Function — flagged as a
// potential follow-up cleanup; not in HF1 scope). Manual export/import in the
// Translations tab is the replacement workflow.

// Learning loop: when a saved brand translation is edited and re-saved,
// diff old vs new and write to translation_corrections + raise translation_memory confidence to 1.0.
async function saveBrandTranslationEdits(brandId, targetLang, oldFields, newFields) {
  const tid = getTenantId();
  const corrections = [];
  for (const ct of Object.keys(newFields)) {
    if (oldFields[ct] && newFields[ct] && oldFields[ct] !== newFields[ct]) {
      corrections.push({
        tenant_id: tid,
        lang: targetLang,
        original_translation: oldFields[ct],
        corrected_translation: newFields[ct],
        is_deleted: false,
      });
    }
  }
  if (corrections.length) {
    const { error } = await sb.from('translation_corrections').insert(corrections);
    if (error) console.error('translation_corrections insert:', error);
  }

  // Bump translation_memory to human-approved for the new versions
  const memRows = Object.entries(newFields)
    .filter(([_, v]) => !!v)
    .map(([ct, v]) => ({
      tenant_id: tid,
      source_lang: 'he',
      target_lang: targetLang,
      source_text: oldFields[ct] || v,
      translated_text: v,
      context: 'brand.' + ct,
      scope: 'tenant',
      confidence: 1.0,
      approved_by: 'human',
      times_used: 0,
    }));
  if (memRows.length) {
    const { error } = await sb.from('translation_memory').upsert(memRows, {
      onConflict: 'tenant_id,source_lang,target_lang,source_hash',
      ignoreDuplicates: false,
    });
    if (error) console.error('translation_memory upsert:', error);
  }
}

window.saveBrandTranslationEdits = saveBrandTranslationEdits;
