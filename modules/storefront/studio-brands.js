// modules/storefront/studio-brands.js
// Brand Pages management inside Studio — "עמודי מותג" section in Pages tab

let studioBrands = [];
let studioBrandsLoaded = false;
let _brandPageView = false;
let brandSearchText = '';
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

  // Ensure search bar exists; only replace items area to preserve input focus
  let itemsEl = container.querySelector('.brand-list-items');
  if (!itemsEl) {
    container.innerHTML = `<div class="page-search-bar" style="padding:8px 12px; border-bottom:1px solid var(--g200);">
      <input type="text" class="studio-field page-search-input" placeholder="\u{1F50D} \u05D7\u05E4\u05E9 \u05DE\u05D5\u05EA\u05D2..."
        value="${escapeAttr(brandSearchText)}" oninput="brandSearchText=this.value;renderStudioBrandList()">
    </div><div class="brand-list-items"></div>`;
    itemsEl = container.querySelector('.brand-list-items');
  }

  // Filter by search text
  let filtered = studioBrands;
  if (brandSearchText) {
    const q = brandSearchText.toLowerCase();
    filtered = filtered.filter(b =>
      (b.brand_name || '').toLowerCase().includes(q));
  }

  const enabledCount = studioBrands.filter(b => b.brand_page_enabled).length;

  let html = `<div style="padding:8px 12px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--g200);">
    <span style="font-size:.8rem; color:var(--g400);">${brandSearchText ? filtered.length + ' תוצאות' : enabledCount + ' מתוך ' + studioBrands.length + ' עמודים פעילים'}</span>
    <button class="btn-ai-generate" style="font-size:.75rem; padding:5px 12px;" onclick="showNewBrandPagePicker()">+ עמוד מותג חדש</button>
  </div>`;

  html += filtered.map(b => {
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

  itemsEl.innerHTML = html;
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

async function openStudioBrandEditor(brandId) {
  const brand = studioBrands.find(b => b.brand_id === brandId);
  if (!brand) return;

  // Side-fetch the 3 visibility fields (exclude_website, brand_page_visibility,
  // brand_page_enabled) + product count — v_storefront_brands doesn't expose
  // them. One extra query per modal open — negligible.
  const { data: brandExtra } = await sb.from(T.BRANDS)
    .select('exclude_website, brand_page_visibility, brand_page_enabled')
    .eq('id', brandId)
    .eq('tenant_id', getTenantId())
    .single();
  const isExcluded = brandExtra?.exclude_website === true;
  const brandPageVisibility = brandExtra?.brand_page_visibility || 'listed';
  const brandPageEnabled = brandExtra?.brand_page_enabled !== false;
  const visibilityMode = deriveBrandVisibilityMode(isExcluded, brandPageVisibility, brandPageEnabled);

  // Product count for bulk-mode confirmation copy
  const { count: brandProductCount } = await sb.from(T.INV)
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('tenant_id', getTenantId())
    .eq('is_deleted', false);

  const storeName = getTenantConfig('name') || '';
  _quillDesc1 = null;
  _quillDesc2 = null;
  _aiMode = 'new';

  const allParagraphs = (brand.brand_description || '').split('</p>').filter(p => p.trim());
  const midpoint = Math.ceil(allParagraphs.length / 2);
  const desc1 = allParagraphs.slice(0, midpoint).map(p => p.includes('<p>') ? p + '</p>' : '<p>' + p + '</p>').join('');
  const desc2 = allParagraphs.slice(midpoint).map(p => p.includes('<p>') ? p + '</p>' : '<p>' + p + '</p>').join('');

  // View returns storage paths (resolved from UUIDs) — store for preview display
  const galleryPaths = Array.isArray(brand.brand_gallery) ? brand.brand_gallery : [];
  const seoDescLen = (brand.seo_description || '').length;
  const seoDescClass = seoDescLen > 160 ? 'seo-char-count over' : 'seo-char-count';
  const seoScore = calcBrandSeoScoreStatic(brand);

  const resolvedLogo = resolveLogoUrl(brand.logo_url);
  const logoPreview = resolvedLogo
    ? `<img src="${escapeAttr(resolvedLogo)}" alt="לוגו" style="max-width:200px; max-height:80px; object-fit:contain; display:block;" />`
    : '<span style="color:var(--g400); font-size:.85rem;">אין לוגו</span>';

  // Gallery preview is loaded async after modal opens (UUIDs → signed URLs)

  const googleTitle = escapeHtml(brand.seo_title || 'כותרת SEO');
  const googleDesc = escapeHtml(brand.seo_description || 'תיאור SEO');
  const googleUrl = `${getCustomDomain()} › brands › ${brand.slug || ''}`;

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
      <h4 style="font-weight:700; margin-bottom:8px;">נראות באתר</h4>
      <p style="color:var(--g500); font-size:.78rem; margin-bottom:8px;">
        בחר איך המותג יוצג באתר הציבורי. ההגדרה כאן לא משפיעה על הסנכרון של הדגמים הבודדים.
      </p>

      <label class="brand-visibility-radio" style="display:flex; align-items:flex-start; gap:8px; padding:8px; border:1px solid #e5e5e5; border-radius:6px; margin-bottom:6px; cursor:pointer;">
        <input type="radio" name="brand-visibility-mode" value="full" id="sbe-vis-full" ${visibilityMode === 'full' ? 'checked' : ''} style="margin-top:3px;" />
        <div>
          <strong>מוצג רגיל</strong>
          <span style="font-size:.78rem; color:var(--g500); display:block;">
            עמוד מותג פעיל, כרטיס מופיע בעמוד "מותגים", המוצרים נראים בכל המקומות באתר
          </span>
        </div>
      </label>

      <label class="brand-visibility-radio" style="display:flex; align-items:flex-start; gap:8px; padding:8px; border:1px solid #e5e5e5; border-radius:6px; margin-bottom:6px; cursor:pointer;">
        <input type="radio" name="brand-visibility-mode" value="hide-card" id="sbe-vis-hide-card" ${visibilityMode === 'hide-card' ? 'checked' : ''} style="margin-top:3px;" />
        <div>
          <strong>הסתר רק את הכרטיס בעמוד "מותגים"</strong>
          <span style="font-size:.78rem; color:var(--g500); display:block;">
            עמוד המותג נשאר זמין (URL פעיל, גוגל מוצא, תורם ל-SEO). כרטיס המותג לא מופיע בלוח המותגים. המוצרים ממשיכים להופיע בכל הלוחות (משקפי שמש, ראייה, חיפוש).
          </span>
        </div>
      </label>

      <label class="brand-visibility-radio" style="display:flex; align-items:flex-start; gap:8px; padding:8px; border:1px solid #e5e5e5; border-radius:6px; margin-bottom:6px; cursor:pointer;">
        <input type="radio" name="brand-visibility-mode" value="hide-customer-keep-seo" id="sbe-vis-hide-customer" ${visibilityMode === 'hide-customer-keep-seo' ? 'checked' : ''} style="margin-top:3px;" />
        <div>
          <strong>הסתר מהאתר אבל השאר ל-SEO</strong>
          <span style="font-size:.78rem; color:var(--g500); display:block;">
            המוצרים והכרטיס לא מופיעים בשום מקום ציבורי. עמוד המותג עדיין מוגש (גוגל מוצא, מקדם דומיין). מתאים למותגים שאתה רוצה את ה-SEO שלהם בלי שלקוחות יראו שהם זמינים.
          </span>
        </div>
      </label>

      <label class="brand-visibility-radio" style="display:flex; align-items:flex-start; gap:8px; padding:8px; border:1px solid #e5e5e5; border-radius:6px; margin-bottom:6px; cursor:pointer;">
        <input type="radio" name="brand-visibility-mode" value="hide-all" id="sbe-vis-hide-all" ${visibilityMode === 'hide-all' ? 'checked' : ''} style="margin-top:3px;" />
        <div>
          <strong>הסתר לחלוטין</strong>
          <span style="font-size:.78rem; color:var(--g500); display:block;">
            המותג לא יופיע בשום מקום באתר. עמוד המותג עצמו לא יוגש (404). הכרטיס נשאר כאן בסטודיו כדי שתוכל להחזיר.
          </span>
        </div>
      </label>

      <label class="brand-toggle" style="display:flex; align-items:center; gap:8px; margin-top:12px;">
        <input type="checkbox" id="sbe-show-products" ${brand.show_brand_products !== false ? 'checked' : ''} />
        <span>הצג מוצרים בעמוד מותג</span>
      </label>
    </div>

    <div class="brand-editor-section">
      <h4 style="font-weight:700; margin-bottom:8px;">שינוי מסיבי של דגמי המותג</h4>
      <p style="color:var(--g500); font-size:.78rem; margin-bottom:8px;">
        מאלץ את הסנכרון של <strong>כל הדגמים</strong> תחת המותג הזה לערך הנבחר.
        הגדרות ידניות שעשית ברמת הדגם יידרסו. המותג כולל ${brandProductCount || 0} דגמים פעילים.
      </p>

      <label class="brand-editor-label">החל על כל הדגמים:</label>
      <select id="sbe-bulk-target" class="brand-editor-input">
        <option value="">— בחר מצב —</option>
        <option value="display">קטלוג (תדמית) - בלי מחיר, בלי "אזל"</option>
        <option value="full-all">חנות - כולל אזל מלאי</option>
        <option value="full-in-stock">חנות - רק מה שבמלאי</option>
      </select>
      <button type="button" id="sbe-bulk-apply-btn" class="btn-ai-generate" style="margin-top:8px;" onclick="bulkApplyBrandModeToProducts('${brandId}', '${escapeAttr(brand.brand_name)}', ${brandProductCount || 0})">
        🔄 החל על כל הדגמים
      </button>
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
      <div id="sbe-gallery-preview"><div class="studio-empty" style="font-size:.85rem;">טוען תמונות...</div></div>
      <div style="margin-top:8px;">
        <button type="button" class="btn-ai-generate" onclick="openGalleryMediaPicker()">🖼 בחר ממדיה</button>
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

  // Store view's storage paths for immediate preview rendering
  window._studioGalleryPaths = [...galleryPaths];
  // Raw UUIDs for saving back — fetched async from brands table below
  window._studioGallery = [];
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

  // Render gallery preview immediately from storage paths (no network call)
  refreshStudioGalleryPreview();

  // Fetch raw UUIDs from brands table for saving back correctly.
  // The view resolves UUIDs → storage paths, but we need raw UUIDs for save.
  sb.from(T.BRANDS).select('brand_gallery').eq('id', brandId).eq('tenant_id', getTenantId()).single()
    .then(({ data }) => {
      if (data && Array.isArray(data.brand_gallery)) {
        window._studioGallery = [...data.brand_gallery];
      }
    })
    .catch(err => console.error('Failed to fetch raw gallery UUIDs:', err));
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
    const sName = getTenantConfig('name') || '';
    _quillDesc2 = new Quill(el2, { theme: 'snow', modules: { toolbar: toolbarOpts }, placeholder: `למה לקנות ב${sName} — שירות, התאמה, ניסיון...` });
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

// Gallery upload removed — images are now selected from media library via picker.
// New uploads go through the Media tab; gallery uses openGalleryMediaPicker().

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
  if (window._studioGalleryPaths && index < window._studioGalleryPaths.length) {
    window._studioGalleryPaths.splice(index, 1);
  }
  refreshStudioGalleryPreview();
}

function openGalleryMediaPicker() {
  openMediaPicker({
    folder: 'models',
    multi: true,
    onSelect: (selected) => {
      const newIds = selected.map(s => s.id);
      const newPaths = selected.map(s => s.storage_path);
      const existing = window._studioGallery || [];
      const existingPaths = window._studioGalleryPaths || [];
      // Avoid duplicates
      const addIndices = [];
      const merged = [...existing];
      for (let i = 0; i < newIds.length; i++) {
        if (!existing.includes(newIds[i])) {
          merged.push(newIds[i]);
          addIndices.push(i);
        }
      }
      window._studioGallery = merged;
      window._studioGalleryPaths = [...existingPaths, ...addIndices.map(i => newPaths[i])];
      refreshStudioGalleryPreview();
    }
  });
}

async function refreshStudioGalleryPreview() {
  const container = document.getElementById('sbe-gallery-preview');
  if (!container) return;
  const paths = window._studioGalleryPaths || [];
  const uuids = window._studioGallery || [];
  if (!paths.length && !uuids.length) {
    container.innerHTML = '<span style="color:var(--g400); font-size:.85rem;">אין תמונות — ישתמש בתמונות מוצרים אוטומטית</span>';
    return;
  }

  // Prefer storage paths (from view, already resolved) — instant, no network call.
  // Fall back to UUID resolution only for newly-added items from media picker.
  let items = [];
  if (paths.length) {
    items = paths.map((p, i) => ({
      index: i,
      url: resolveMediaUrl(p, STOREFRONT_BASE)
    }));
  }

  // If there are more UUIDs than paths (user added new ones via picker),
  // resolve the extra UUIDs and append.
  if (uuids.length > paths.length) {
    const extraUuids = uuids.slice(paths.length);
    const resolved = await resolveMediaUUIDs(extraUuids);
    for (const r of resolved) {
      items.push({ index: items.length, url: r.signedUrl || '' });
    }
  }

  container.innerHTML = `<div class="gallery-grid">${items.map((item, i) => `<div class="gallery-thumb">
    <img src="${escapeAttr(item.url || '')}" alt="תמונה ${i + 1}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;" />
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
// VISIBILITY MODE — radio ↔ DB columns mapping
// ═══════════════════════════════════════════════════

// Derive radio value from current DB state.
// `hide-all`  ← exclude_website=true AND brand_page_visibility='hidden'
// `hide-customer-keep-seo` ← exclude_website=true (and not hide-all)
// `hide-card` ← brand_page_visibility='unlisted'
// `full`      ← everything else (default)
function deriveBrandVisibilityMode(isExcluded, brandPageVisibility, brandPageEnabled) {
  if (isExcluded && brandPageVisibility === 'hidden') return 'hide-all';
  if (isExcluded) return 'hide-customer-keep-seo';
  if (brandPageVisibility === 'unlisted') return 'hide-card';
  return 'full';
}

// Map radio value → the 3 brands columns that gate visibility.
// `display_mode` is preserved (legacy seed field; not driven by this radio).
// `brand_page_enabled` handled at SAVE time (depends on radio + legacy toggle).
function applyBrandVisibilityMode(mode) {
  switch (mode) {
    case 'hide-card':
      return { exclude_website: false, brand_page_visibility: 'unlisted' };
    case 'hide-customer-keep-seo':
      return { exclude_website: true, brand_page_visibility: 'listed' };
    case 'hide-all':
      return { exclude_website: true, brand_page_visibility: 'hidden' };
    case 'full':
    default:
      return { exclude_website: false, brand_page_visibility: 'listed' };
  }
}

// ═══════════════════════════════════════════════════
// BULK MODE — overwrite inventory.website_sync for every product of a brand
// ═══════════════════════════════════════════════════

async function bulkApplyBrandModeToProducts(brandId, brandName, productCount) {
  const select = document.getElementById('sbe-bulk-target');
  const target = select?.value;
  if (!target) {
    Toast.warning('יש לבחור מצב לפני החלת השינוי');
    return;
  }

  const labels = {
    'display':       'קטלוג (תדמית)',
    'full-all':      'חנות - כולל אזל מלאי',
    'full-in-stock': 'חנות - רק מה שבמלאי',
  };
  const label = labels[target] || target;
  const confirmed = await confirmDialog(
    `החלה על כל ${productCount} הדגמים של ${brandName}`,
    `האם להחיל '${label}' על כל ${productCount} הדגמים תחת ${brandName}? הגדרות ידניות שעשית ברמת הדגם יידרסו.`
  );
  if (!confirmed) return;

  const tid = getTenantId();

  // Map target → website_sync value (the only inventory column we modify)
  const syncValue = target === 'display' ? 'display' : 'full';

  // Map target → brands.display_mode (legacy seed — set as a hint for future
  // brand-level falls back; the storefront filter no longer reads it post-fix).
  const brandDisplayMode = target === 'display' ? 'catalog'
                          : target === 'full-in-stock' ? 'store'
                          : 'store_all';

  try {
    // Iron Rule 7: helper-style wrapper. Iron Rule 22: tenant_id on writes.
    // Brand-scoped + tenant-scoped + active-only — never touches is_deleted,
    // quantity, images, or any column other than website_sync.
    const { data: invRows, error: invErr } = await sb.from(T.INV)
      .update({ website_sync: syncValue })
      .eq('brand_id', brandId)
      .eq('tenant_id', tid)
      .eq('is_deleted', false)
      .select('id');

    if (invErr) throw invErr;

    const { error: brandErr } = await sb.from(T.BRANDS)
      .update({ display_mode: brandDisplayMode })
      .eq('id', brandId)
      .eq('tenant_id', tid);

    if (brandErr) throw brandErr;

    const updatedCount = Array.isArray(invRows) ? invRows.length : 0;
    Toast.success(`עודכנו ${updatedCount} דגמים תחת ${brandName} ל-'${label}'`);
    select.value = '';
  } catch (err) {
    console.error('bulkApplyBrandModeToProducts error:', err);
    Toast.error('שגיאה בהחלה: ' + (err.message || ''));
  }
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
    show_brand_products: document.getElementById('sbe-show-products')?.checked !== false,
  };

  // Single 4-mode radio drives the 3 visibility fields (display_mode is a
  // legacy seed field per STOREFRONT_SYNC_HIERARCHY_FIX — not driven here).
  const visibilityRadio = document.querySelector('input[name="brand-visibility-mode"]:checked');
  const visibilityMode = visibilityRadio?.value || 'full';
  Object.assign(updates, applyBrandVisibilityMode(visibilityMode));
  // brand_page_enabled is also driven by the radio + by the top "עמוד פעיל"
  // toggle (legacy). The radio wins for hide-all (forces false), full/hide-card/
  // hide-customer-keep-seo allow the top toggle to keep its current value.
  if (visibilityMode === 'hide-all') {
    updates.brand_page_enabled = false;
  } else {
    updates.brand_page_enabled = document.getElementById('sbe-enabled')?.checked || false;
  }

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
  // Visible spinner next to the button — CSS animation, no library
  injectAiSpinnerStylesOnce();
  let spinnerEl = document.getElementById('sbe-ai-spinner');
  if (!spinnerEl) {
    spinnerEl = document.createElement('span');
    spinnerEl.id = 'sbe-ai-spinner';
    spinnerEl.className = 'ai-thinking-spinner';
    spinnerEl.setAttribute('aria-label', 'AI חושב');
    btn.parentNode?.insertBefore(spinnerEl, btn.nextSibling);
  }
  spinnerEl.style.display = 'inline-block';

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
    const spinnerEl = document.getElementById('sbe-ai-spinner');
    if (spinnerEl) spinnerEl.style.display = 'none';
  }
}

// CSS-only spinner styles, injected once per page load
function injectAiSpinnerStylesOnce() {
  if (document.getElementById('sbe-ai-spinner-styles')) return;
  const style = document.createElement('style');
  style.id = 'sbe-ai-spinner-styles';
  style.textContent = `
    .ai-thinking-spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      margin-inline-start: 8px;
      vertical-align: middle;
      border: 2px solid var(--g300, #e5e5e5);
      border-top-color: var(--accent, #c9a555);
      border-radius: 50%;
      animation: ai-spin 0.8s linear infinite;
    }
    @keyframes ai-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
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
window.bulkApplyBrandModeToProducts = bulkApplyBrandModeToProducts;
