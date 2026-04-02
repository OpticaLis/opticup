// modules/storefront/studio-pages.js
// Page list management for Studio (CMS-2, enhanced CMS-9)

let studioPages = [];
let selectedPageId = null;
let pageSearchText = '';
let pageFilterType = 'all';
let pageFilterStatus = 'active';
let bulkSelectedIds = new Set();

const PAGE_TYPE_ICONS = {
  homepage: '\u{1F3E0}', legal: '\u{1F4DC}', campaign: '\u{1F3AF}', guide: '\u{1F4D6}', custom: '\u{1F4C4}'
};

/** Generate slug from title (CMS-9) */
function generateSlug(title) {
  return '/' + title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0590-\u05FFa-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '/';
}

/** Relative time display (CMS-9) */
function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return '\u05E2\u05DB\u05E9\u05D9\u05D5';
  if (seconds < 3600) return `\u05DC\u05E4\u05E0\u05D9 ${Math.floor(seconds / 60)} \u05D3\u05E7\u05D5\u05EA`;
  if (seconds < 86400) return `\u05DC\u05E4\u05E0\u05D9 ${Math.floor(seconds / 3600)} \u05E9\u05E2\u05D5\u05EA`;
  if (seconds < 604800) return `\u05DC\u05E4\u05E0\u05D9 ${Math.floor(seconds / 86400)} \u05D9\u05DE\u05D9\u05DD`;
  return new Date(date).toLocaleDateString('he-IL');
}

/** Load all pages for current tenant */
async function loadStudioPages() {
  try {
    const { data, error } = await sb.from('v_admin_pages')
      .select('*')
      .eq('tenant_id', getTenantId())
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true });
    if (error) throw error;
    studioPages = data || [];
    renderFilteredPageList();
  } catch (err) {
    console.error('Failed to load pages:', err);
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD');
  }
}

/** Apply filters and render */
function renderFilteredPageList() {
  let filtered = studioPages;
  if (pageSearchText) {
    const q = pageSearchText.toLowerCase();
    filtered = filtered.filter(p =>
      (p.title || '').toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q));
  }
  if (pageFilterType !== 'all') filtered = filtered.filter(p => p.page_type === pageFilterType);
  if (pageFilterStatus === 'active') filtered = filtered.filter(p => p.status !== 'archived');
  else if (pageFilterStatus !== 'all') filtered = filtered.filter(p => p.status === pageFilterStatus);
  // Tag filter
  if (typeof filterByTag === 'function') filtered = filterByTag(filtered);
  renderPageList(filtered);
}

/** Render search/filter bar */
function renderPageSearchBar() {
  return `<div class="page-search-bar">
    <input type="text" class="studio-field page-search-input" placeholder="\u{1F50D} \u05D7\u05E4\u05E9 \u05E2\u05DE\u05D5\u05D3..."
      value="${escapeAttr(pageSearchText)}" oninput="pageSearchText=this.value;renderFilteredPageList()">
    <select class="studio-field page-filter-select" onchange="pageFilterType=this.value;renderFilteredPageList()">
      <option value="all">\u05DB\u05DC \u05D4\u05E1\u05D5\u05D2\u05D9\u05DD</option>
      <option value="homepage" ${pageFilterType === 'homepage' ? 'selected' : ''}>\u{1F3E0} \u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA</option>
      <option value="campaign" ${pageFilterType === 'campaign' ? 'selected' : ''}>\u{1F3AF} \u05E7\u05DE\u05E4\u05D9\u05D9\u05DF</option>
      <option value="guide" ${pageFilterType === 'guide' ? 'selected' : ''}>\u{1F4D6} \u05DE\u05D3\u05E8\u05D9\u05DA</option>
      <option value="legal" ${pageFilterType === 'legal' ? 'selected' : ''}>\u{1F4DC} \u05DE\u05E9\u05E4\u05D8\u05D9</option>
      <option value="custom" ${pageFilterType === 'custom' ? 'selected' : ''}>\u{1F4C4} \u05DE\u05D5\u05EA\u05D0\u05DD</option>
    </select>
    <select class="studio-field page-filter-select" onchange="pageFilterStatus=this.value;renderFilteredPageList()">
      <option value="active" ${pageFilterStatus === 'active' ? 'selected' : ''}>\u05E4\u05E2\u05D9\u05DC\u05D9\u05DD</option>
      <option value="all" ${pageFilterStatus === 'all' ? 'selected' : ''}>\u05D4\u05DB\u05DC</option>
      <option value="published" ${pageFilterStatus === 'published' ? 'selected' : ''}>\u05E4\u05D5\u05E8\u05E1\u05DD</option>
      <option value="draft" ${pageFilterStatus === 'draft' ? 'selected' : ''}>\u05D8\u05D9\u05D5\u05D8\u05D4</option>
      <option value="archived" ${pageFilterStatus === 'archived' ? 'selected' : ''}>\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF</option>
    </select>
    ${typeof renderTagFilterDropdown === 'function' ? renderTagFilterDropdown() : ''}
  </div>`;
}

/** Render page list sidebar */
function renderPageList(pages) {
  const container = document.getElementById('studio-page-list');
  if (!container) return;

  let html = renderPageSearchBar();

  if (!pages.length) {
    container.innerHTML = html + '<div class="studio-empty">\u05D0\u05D9\u05DF \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD</div>';
    return;
  }

  const showSettings = canSee('page_settings_button');
  const showToggle = canSee('status_toggle');

  html += pages.map(p => {
    const icon = PAGE_TYPE_ICONS[p.page_type] || '\u{1F4C4}';
    const statusClass = p.status === 'published' ? 'badge-published' : p.status === 'archived' ? 'badge-archived' : 'badge-draft';
    const statusText = p.status === 'published' ? '\u05E4\u05D5\u05E8\u05E1\u05DD' : p.status === 'archived' ? '\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF' : '\u05D8\u05D9\u05D5\u05D8\u05D4';
    const active = p.id === selectedPageId ? ' active' : '';
    const title = escapeHtml(p.title || p.slug);
    const slug = escapeHtml(p.slug);
    const edited = timeAgo(p.updated_at);

    // SEO score badge
    let seoBadge = '';
    if (typeof calculateSeoScore === 'function') {
      const { score } = calculateSeoScore(p);
      const color = getSeoScoreColor(score);
      seoBadge = `<span class="seo-score-mini ${color}">${score}</span>`;
    }

    const settingsBtn = showSettings ? `<button title="\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA" onclick="event.stopPropagation();editPageSettings('${p.id}')">\u2699\uFE0F</button>` : '';
    const dupBtn = `<button title="\u05E9\u05DB\u05E4\u05DC" onclick="event.stopPropagation();duplicatePage('${p.id}')">\u{1F4CB}</button>`;
    const toggleBtn = showToggle
      ? `<button title="${p.status === 'published' ? '\u05D4\u05E2\u05D1\u05E8 \u05DC\u05D8\u05D9\u05D5\u05D8\u05D4' : '\u05E4\u05E8\u05E1\u05DD'}" onclick="event.stopPropagation();togglePageStatus('${p.id}','${p.status}')">${p.status === 'published' ? '\u{1F4E4}' : '\u{1F4E5}'}</button>`
      : '';

    const archiveBtn = !p.is_system && p.status !== 'archived'
      ? `<button title="\u05D4\u05E2\u05D1\u05E8 \u05DC\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF" onclick="event.stopPropagation();archivePage('${p.id}')">\u{1F4E6}</button>` : '';
    const restoreBtn = p.status === 'archived'
      ? `<button title="\u05E9\u05D7\u05D6\u05E8" onclick="event.stopPropagation();restorePage('${p.id}')">\u{1F504}</button>` : '';
    const permDeleteBtn = p.status === 'archived'
      ? `<button title="\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA" class="btn-danger-text" onclick="event.stopPropagation();permanentDeletePage('${p.id}')">\u{1F5D1}</button>` : '';
    const systemLock = p.is_system ? `<span title="\u05E2\u05DE\u05D5\u05D3 \u05DE\u05E2\u05E8\u05DB\u05EA">\u{1F512}</span>` : '';

    const bulkChecked = bulkSelectedIds.has(p.id) ? 'checked' : '';

    const tagBadges = typeof renderTagBadges === 'function' ? renderTagBadges(p.tags) : '';

    return `<div class="studio-page-item${active}" data-id="${p.id}" onclick="selectPage('${p.id}')">
      <div class="studio-page-row-top">
        <input type="checkbox" class="page-bulk-check" ${bulkChecked} onclick="event.stopPropagation();toggleBulkSelect('${p.id}',this.checked)">
        <span class="studio-page-icon">${icon}</span>
        <div class="studio-page-info">
          <div class="studio-page-title">${title}</div>
          <div class="studio-page-slug-time"><span class="studio-page-slug">/${slug}</span><span class="studio-page-edited">${edited}</span></div>
          ${tagBadges}
        </div>
        ${seoBadge}
      </div>
      <div class="studio-page-meta">
        <span class="studio-badge ${statusClass}">${statusText}</span>${systemLock}
        <div class="studio-page-actions-mini">${dupBtn}${settingsBtn}${toggleBtn}${archiveBtn}${restoreBtn}${permDeleteBtn}</div>
      </div>
    </div>`;
  }).join('');

  // Bulk action bar
  if (bulkSelectedIds.size > 0) {
    const allArchived = [...bulkSelectedIds].every(id => {
      const p = studioPages.find(pg => pg.id === id);
      return p && p.status === 'archived';
    });
    html += `<div class="bulk-action-bar">
      \u05E0\u05D1\u05D7\u05E8\u05D5 ${bulkSelectedIds.size} \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD
      <button class="btn btn-sm btn-primary" onclick="bulkToggleStatus('published')">\u05E4\u05E8\u05E1\u05DD</button>
      <button class="btn btn-sm btn-ghost" onclick="bulkToggleStatus('draft')">\u05D8\u05D9\u05D5\u05D8\u05D4</button>
      <button class="btn btn-sm btn-ghost" onclick="bulkToggleStatus('archived')">\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF</button>
      ${allArchived ? '<button class="btn btn-sm btn-danger-text" onclick="bulkPermanentDelete()">\u{1F5D1} \u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA</button>' : ''}
    </div>`;
  }

  container.innerHTML = html;
}

function toggleBulkSelect(id, checked) { checked ? bulkSelectedIds.add(id) : bulkSelectedIds.delete(id); renderFilteredPageList(); }

function bulkToggleStatus(newStatus) {
  if (!bulkSelectedIds.size) return;
  const label = newStatus === 'published' ? '\u05DC\u05E4\u05E8\u05E1\u05DD' : '\u05DC\u05D4\u05E2\u05D1\u05D9\u05E8 \u05DC\u05D8\u05D9\u05D5\u05D8\u05D4';
  Modal.confirm({ title: '\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E1\u05D8\u05D8\u05D5\u05E1', message: `${label} ${bulkSelectedIds.size} \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD?`, confirmText: '\u05D0\u05D9\u05E9\u05D5\u05E8', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    onConfirm: async function() {
      try {
        for (const id of bulkSelectedIds) await sb.from('storefront_pages').update({ status: newStatus }).eq('id', id).eq('tenant_id', getTenantId());
        Toast.success(`${bulkSelectedIds.size} \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5`);
        bulkSelectedIds.clear(); await loadStudioPages();
      } catch (err) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1'); }
    }
  });
}

function bulkPermanentDelete() {
  if (!bulkSelectedIds.size) return;
  Modal.confirm({
    title: '\u05DE\u05D7\u05D9\u05E7\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA',
    message: `\u05DC\u05DE\u05D7\u05D5\u05E7 ${bulkSelectedIds.size} \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA?\n\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05DC\u05D0 \u05E0\u05D9\u05EA\u05E0\u05EA \u05DC\u05D1\u05D9\u05D8\u05D5\u05DC!`,
    confirmText: '\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA',
    cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    danger: true,
    onConfirm: async function() {
      try {
        for (const id of bulkSelectedIds) {
          await sb.from('storefront_pages').delete().eq('id', id).eq('tenant_id', getTenantId());
        }
        Toast.success(`${bulkSelectedIds.size} \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD \u05E0\u05DE\u05D7\u05E7\u05D5 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA`);
        bulkSelectedIds.clear();
        await loadStudioPages();
      } catch (err) {
        Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05D4');
      }
    }
  });
}

/** Duplicate page */
async function duplicatePage(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;
  try {
    const { error } = await sb.from('storefront_pages').insert({
      tenant_id: getTenantId(),
      slug: (page.slug || '').replace(/\/$/, '') + '-copy/',
      title: (page.title || '') + ' (\u05E2\u05D5\u05EA\u05E7)',
      page_type: page.page_type,
      lang: page.lang || 'he',
      blocks: JSON.parse(JSON.stringify(page.blocks || [])),
      status: 'draft',
      is_system: false,
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || ''
    });
    if (error) throw error;
    Toast.success('\u05D4\u05E2\u05DE\u05D5\u05D3 \u05E9\u05D5\u05DB\u05E4\u05DC! \u05E2\u05E8\u05D5\u05DA \u05D0\u05EA \u05D4\u05DB\u05D5\u05EA\u05E8\u05EA \u05D5\u05D4-slug');
    await loadStudioPages();
  } catch (err) {
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DB\u05E4\u05D5\u05DC: ' + (err.message || ''));
  }
}

/** Select a page */
function selectPage(pageId) {
  function doSelect() { selectedPageId = pageId; renderFilteredPageList(); loadPageEditor(pageId); }
  if (hasUnsavedChanges) {
    Modal.confirm({ title: '\u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8\u05D5', message: '\u05D9\u05E9 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05E9\u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8\u05D5. \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA?', confirmText: '\u05D4\u05DE\u05E9\u05DA', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC', onConfirm: doSelect });
  } else { doSelect(); }
}

/** Create new page with auto-slug */
async function createPage() {
  if (studioHasPermission('pages_create_from_template_only')) {
    showTemplatePicker();
    return;
  }

  // Auto-slug linking state
  let slugLinked = true;

  Modal.show({
    title: '+ \u05E2\u05DE\u05D5\u05D3 \u05D7\u05D3\u05E9',
    size: 'sm',
    content: `<div class="studio-field-group"><label>\u05DB\u05D5\u05EA\u05E8\u05EA</label><input type="text" id="np-title" class="studio-field" oninput="autoSlugFromTitle()"></div>
      <div class="studio-field-group"><label>Slug <button type="button" id="np-slug-link" class="slug-link-btn" onclick="toggleSlugLink()" title="\u05E7\u05D9\u05E9\u05D5\u05E8/\u05E0\u05D9\u05EA\u05D5\u05E7">\u{1F517}</button></label><input type="text" id="np-slug" placeholder="my-page" class="studio-field" dir="ltr"></div>
      <div class="studio-field-group"><label>\u05E1\u05D5\u05D2 \u05E2\u05DE\u05D5\u05D3</label><select id="np-type" class="studio-field">
        <option value="custom">\u{1F4C4} \u05DE\u05D5\u05EA\u05D0\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA</option><option value="campaign">\u{1F3AF} \u05E7\u05DE\u05E4\u05D9\u05D9\u05DF</option>
        <option value="guide">\u{1F4D6} \u05DE\u05D3\u05E8\u05D9\u05DA</option><option value="legal">\u{1F4DC} \u05DE\u05E9\u05E4\u05D8\u05D9</option></select></div>
      <div class="studio-field-group"><label>\u05E9\u05E4\u05D4</label><select id="np-lang" class="studio-field">
        <option value="he">\u05E2\u05D1\u05E8\u05D9\u05EA</option><option value="en">English</option><option value="ru">\u0420\u0443\u0441\u0441\u043A\u0438\u0439</option></select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitCreatePage()">\u05E6\u05D5\u05E8</button>
      <button class="btn btn-ghost" onclick="Modal.close()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>`
  });

  window._slugLinked = true;
}

function autoSlugFromTitle() {
  if (!window._slugLinked) return;
  const t = document.getElementById('np-title'), s = document.getElementById('np-slug');
  if (t && s) s.value = generateSlug(t.value);
}

function toggleSlugLink() {
  window._slugLinked = !window._slugLinked;
  const btn = document.getElementById('np-slug-link');
  if (btn) btn.textContent = window._slugLinked ? '\u{1F517}' : '\u{1F512}';
}

async function submitCreatePage() {
  const slug = document.getElementById('np-slug')?.value.trim();
  const title = document.getElementById('np-title')?.value.trim();
  const page_type = document.getElementById('np-type')?.value;
  const lang = document.getElementById('np-lang')?.value || 'he';

  if (!slug) { Toast.warning('\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF slug'); return; }

  try {
    const { error } = await sb.from('storefront_pages').insert({
      tenant_id: getTenantId(), slug, title, page_type, lang,
      blocks: [], status: 'draft', is_system: false
    });
    if (error) {
      if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
        Toast.error('כתובת העמוד כבר קיימת. בחר כתובת אחרת.');
        return;
      }
      throw error;
    }
    Modal.close();
    Toast.success('העמוד נוצר');
    await loadStudioPages();
  } catch (err) {
    console.error('Create page error:', err);
    if (err && err.code === '23505') {
      Toast.error('כתובת העמוד כבר קיימת. בחר כתובת אחרת.');
    } else {
      Toast.error('שגיאה ביצירת עמוד: ' + (err.message || ''));
    }
  }
}

// ═══════════════════════════════════════════════════
// LANDING PAGE WIZARD
// ═══════════════════════════════════════════════════

function openLandingPageWizard() {
  // Load campaign templates for the dropdown
  const templateOpts = (typeof studioTemplates !== 'undefined' ? studioTemplates : [])
    .filter(t => t.page_type === 'campaign' || t.page_type === 'landing')
    .map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`)
    .join('');
  const templateSelect = templateOpts
    ? `<option value="">ללא תבנית — AI ייצר הכל</option>${templateOpts}`
    : '<option value="">אין תבניות זמינות — AI ייצר הכל</option>';

  const html = `<div class="lp-wizard-overlay" id="lp-wizard-overlay" onclick="if(event.target===this)closeLandingPageWizard()">
    <div class="lp-wizard">
      <div class="lp-wizard-header">
        <h3>🎯 יצירת דף נחיתה חדש</h3>
        <button class="close-btn" onclick="closeLandingPageWizard()">✕</button>
      </div>
      <div class="lp-wizard-body">
        <div class="lp-wizard-section">
          <label>כותרת העמוד</label>
          <input type="text" id="lp-title" placeholder="מבצע סוף עונה — משקפי שמש" oninput="lpAutoSlug()">
        </div>
        <div class="lp-wizard-section">
          <label>Slug (URL)</label>
          <input type="text" id="lp-slug" dir="ltr" placeholder="summer-sale">
        </div>
        <div class="lp-wizard-section">
          <label>תיאור הקמפיין — מה המטרה? מה המסר? מי קהל היעד?</label>
          <textarea id="lp-prompt" rows="5" style="min-height:120px;" placeholder="לדוגמה: מבצע סוף עונה על משקפי שמש. 30% הנחה על כל המותגים. קהל יעד: גברים ונשים 25-45. המטרה: יצירת לידים דרך טופס. המסר: עיצוב איטלקי במחירים מיוחדים."></textarea>
        </div>
        <div class="lp-wizard-section">
          <label>בחר תבנית (אופציונלי)</label>
          <select id="lp-template">${templateSelect}</select>
        </div>
        <div class="lp-wizard-section">
          <label>כתובות לדוגמה — עמודים שמעוניינים בסגנון שלהם (אופציונלי)</label>
          <textarea id="lp-refs" rows="2" style="min-height:50px;" placeholder="https://example.com/sale-page"></textarea>
        </div>
        <div class="lp-wizard-section">
          <label>תמונות השראה (אופציונלי)</label>
          <div class="lp-wizard-drop" id="lp-drop" onclick="document.getElementById('lp-files').click()">
            <div class="drop-icon">📤</div>
            <p>גרור תמונות לכאן או לחץ לבחירה</p>
            <input type="file" id="lp-files" multiple accept="image/*" style="display:none" onchange="lpFilesChanged(this)">
          </div>
          <div id="lp-file-list" style="font-size:.8rem;color:#6b7280;margin-top:6px;"></div>
        </div>
      </div>
      <div class="lp-wizard-footer">
        <button class="btn-create" id="lp-create-btn" onclick="submitLandingPageWizard()">🤖 צור דף נחיתה</button>
        <button class="btn-cancel" onclick="closeLandingPageWizard()">ביטול</button>
      </div>
    </div>
  </div>`;

  // Insert into DOM
  const container = document.createElement('div');
  container.id = 'lp-wizard-container';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Drag and drop
  const drop = document.getElementById('lp-drop');
  if (drop) {
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('dragover');
      const input = document.getElementById('lp-files');
      if (input) { input.files = e.dataTransfer.files; lpFilesChanged(input); }
    });
  }
}

function closeLandingPageWizard() {
  const el = document.getElementById('lp-wizard-container');
  if (el) el.remove();
}

function lpAutoSlug() {
  const t = document.getElementById('lp-title');
  const s = document.getElementById('lp-slug');
  if (t && s && !s._manual) s.value = generateSlug(t.value);
}

function lpFilesChanged(input) {
  const list = document.getElementById('lp-file-list');
  if (!list || !input.files.length) return;
  list.textContent = Array.from(input.files).map(f => f.name).join(', ');
}

async function submitLandingPageWizard() {
  console.log('%c[LP-DEBUG] submitLandingPageWizard CALLED', 'color:red;font-size:14px;font-weight:bold');
  const title = document.getElementById('lp-title')?.value.trim();
  const slug = document.getElementById('lp-slug')?.value.trim();
  const prompt = document.getElementById('lp-prompt')?.value.trim();
  const templateId = document.getElementById('lp-template')?.value;
  const refs = document.getElementById('lp-refs')?.value.trim();

  console.log('[LP-DEBUG] values:', { title, slug, prompt: prompt?.slice(0, 50), templateId, refs: refs?.slice(0, 50) });

  if (!title) { Toast.warning('יש להזין כותרת'); return; }
  if (!slug) { Toast.warning('יש להזין slug'); return; }

  const btn = document.getElementById('lp-create-btn');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 AI מייצר עמוד...'; }

  try {
    let blocks = [];
    let seoTitle = title;
    let seoDesc = prompt ? prompt.slice(0, 160) : '';

    // If a template was selected, use its blocks
    console.log('[LP-DEBUG] templateId:', JSON.stringify(templateId), 'truthy:', !!templateId);
    if (templateId && typeof studioTemplates !== 'undefined') {
      const template = studioTemplates.find(t => t.id === templateId);
      if (template?.blocks) {
        console.log('[LP-DEBUG] Using template blocks:', template.name, template.blocks.length);
        blocks = JSON.parse(JSON.stringify(template.blocks));
        for (const block of blocks) {
          block.id = block.type + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        }
      }
    }

    // No template — call AI Edge Function to generate blocks
    console.log('[LP-DEBUG] blocks.length before AI:', blocks.length);
    if (!blocks.length) {
      const edgeUrl = SUPABASE_URL + '/functions/v1/generate-landing-content';
      console.log('%c[LP-DEBUG] About to call AI Edge Function: ' + edgeUrl, 'color:blue;font-weight:bold');
      try {
        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_ANON
          },
          body: JSON.stringify({
            tenant_id: getTenantId(),
            title,
            prompt: prompt || title,
            references: refs || ''
          })
        });

        console.log('[LP-DEBUG] fetch status:', res.status, res.statusText);
        const data = await res.json();
        console.log('%c[LP-DEBUG] AI response:', 'color:green;font-weight:bold', JSON.stringify({ success: data.success, blockCount: data.blocks?.length, error: data.error }));

        if (data.success && Array.isArray(data.blocks) && data.blocks.length > 0) {
          blocks = data.blocks;
          if (data.seo_title) seoTitle = data.seo_title;
          if (data.seo_description) seoDesc = data.seo_description;
        } else {
          console.warn('[LP-Wizard] AI failed, using fallback:', data.error);
          blocks = _fallbackCampaignBlocks(title, prompt);
        }
      } catch (fetchErr) {
        console.warn('[LP-Wizard] Edge Function fetch failed:', fetchErr);
        blocks = _fallbackCampaignBlocks(title, prompt);
      }
    }

    // Insert into storefront_pages
    const pageSlug = slug.startsWith('/') ? slug : '/' + slug + '/';
    const { error } = await sb.from('storefront_pages').insert({
      tenant_id: getTenantId(),
      slug: pageSlug,
      title,
      page_type: 'campaign',
      lang: 'he',
      blocks,
      status: 'draft',
      is_system: false,
      tags: ['דף נחיתה'],
      meta_title: seoTitle,
      meta_description: seoDesc
    });

    if (error) {
      // Friendly message for duplicate slug
      if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
        Toast.error('כתובת העמוד כבר קיימת. בחר כתובת אחרת או מחק את העמוד הקיים מהארכיון.');
        return;
      }
      throw error;
    }

    closeLandingPageWizard();
    Toast.success('דף נחיתה AI נוצר! ערוך את הבלוקים ב-Studio');
    await loadStudioPages();

    const newPage = studioPages.find(p => p.slug === pageSlug);
    if (newPage) selectPage(newPage.id);
  } catch (err) {
    console.error('Landing page wizard error:', err);
    // Also catch duplicate slug from generic throw
    if (err && err.code === '23505') {
      Toast.error('כתובת העמוד כבר קיימת. בחר כתובת אחרת או מחק את העמוד הקיים מהארכיון.');
    } else {
      Toast.error('שגיאה ביצירת דף נחיתה: ' + (err.message || ''));
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🤖 צור דף נחיתה'; }
  }
}

/** Fallback blocks when AI Edge Function is unavailable */
function _fallbackCampaignBlocks(title, prompt) {
  const ts = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return [
    { id: 'hero-' + ts(), type: 'hero', data: { title, subtitle: prompt ? prompt.slice(0, 80) : '', status_text: 'מבצע מיוחד', status_bg: 'gold', title_size: 'large' }, settings: { bg_color: '#1a1a1a', text_color: '#ffffff', padding: 'lg' } },
    { id: 'text-' + ts(), type: 'text', data: { body: '<p>' + escapeHtml(prompt || 'תיאור הקמפיין') + '</p>' }, settings: { max_width: '800px', padding: 'md' } },
    { id: 'cta-' + ts(), type: 'cta', data: { title: 'מעוניינים? דברו איתנו', action: 'whatsapp', label: 'שלחו הודעה בוואטסאפ' }, settings: { padding: 'md' } },
    { id: 'lead_form-' + ts(), type: 'lead_form', data: { title: 'השאירו פרטים ונחזור אליכם', fields: ['name', 'phone'], submit_text: 'שלח' }, settings: { bg_color: '#f9fafb', padding: 'lg' } }
  ];
}

/** Archive page (move to archived status) */
function archivePage(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;
  if (page.is_system) { Toast.error('\u05E2\u05DE\u05D5\u05D3 \u05DE\u05E2\u05E8\u05DB\u05EA \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF'); return; }
  Modal.confirm({ title: '\u05D4\u05E2\u05D1\u05E8\u05D4 \u05DC\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF', message: `\u05DC\u05D4\u05E2\u05D1\u05D9\u05E8 \u05D0\u05EA "\u200F${escapeHtml(page.title || page.slug)}\u200F" \u05DC\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF?`, confirmText: '\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    onConfirm: async function() {
      try {
        const { error } = await sb.from('storefront_pages').update({ status: 'archived' }).eq('id', pageId).eq('tenant_id', getTenantId());
        if (error) throw error;
        Toast.success('\u05D4\u05E2\u05DE\u05D5\u05D3 \u05D4\u05D5\u05E2\u05D1\u05E8 \u05DC\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF');
        if (selectedPageId === pageId) { selectedPageId = null; hideEditor(); }
        await loadStudioPages();
      } catch (err) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF \u05E2\u05DE\u05D5\u05D3'); }
    }
  });
}

/** Restore page from archive (back to draft) */
function restorePage(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;
  Modal.confirm({ title: '\u05E9\u05D7\u05D6\u05D5\u05E8 \u05E2\u05DE\u05D5\u05D3', message: `\u05DC\u05E9\u05D7\u05D6\u05E8 \u05D0\u05EA "\u200F${escapeHtml(page.title || page.slug)}\u200F" \u05DE\u05D4\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF?`, confirmText: '\u05E9\u05D7\u05D6\u05E8', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    onConfirm: async function() {
      try {
        const { error } = await sb.from('storefront_pages').update({ status: 'draft' }).eq('id', pageId).eq('tenant_id', getTenantId());
        if (error) throw error;
        Toast.success('\u05D4\u05E2\u05DE\u05D5\u05D3 \u05E9\u05D5\u05D7\u05D6\u05E8 \u05DB\u05D8\u05D9\u05D5\u05D8\u05D4');
        await loadStudioPages();
      } catch (err) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D7\u05D6\u05D5\u05E8 \u05E2\u05DE\u05D5\u05D3'); }
    }
  });
}

/** Permanent delete (only for archived pages) */
function permanentDeletePage(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;
  if (page.is_system) { Toast.error('\u05E2\u05DE\u05D5\u05D3 \u05DE\u05E2\u05E8\u05DB\u05EA \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D9\u05E7\u05D4'); return; }
  if (page.status !== 'archived') { Toast.error('\u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D5\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA \u05E8\u05E7 \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD \u05D1\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF'); return; }
  Modal.confirm({ title: '\u05DE\u05D7\u05D9\u05E7\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA', message: `\u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA "\u200F${escapeHtml(page.title || page.slug)}\u200F" \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA?\n\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05DC\u05D0 \u05E0\u05D9\u05EA\u05E0\u05EA \u05DC\u05D1\u05D9\u05D8\u05D5\u05DC!`, confirmText: '\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC', danger: true,
    onConfirm: async function() {
      try {
        const { error } = await sb.from('storefront_pages').delete().eq('id', pageId).eq('tenant_id', getTenantId());
        if (error) throw error;
        Toast.success('\u05D4\u05E2\u05DE\u05D5\u05D3 \u05E0\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA');
        if (selectedPageId === pageId) { selectedPageId = null; hideEditor(); }
        await loadStudioPages();
      } catch (err) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05E2\u05DE\u05D5\u05D3'); }
    }
  });
}

/** Delete page — legacy alias, now archives instead */
function deletePage(pageId) { archivePage(pageId); }

/** Toggle page status */
async function togglePageStatus(pageId, currentStatus) {
  const newStatus = currentStatus === 'published' ? 'draft' : 'published';
  try {
    const { error } = await sb.from('storefront_pages').update({ status: newStatus })
      .eq('id', pageId).eq('tenant_id', getTenantId());
    if (error) throw error;
    Toast.success(newStatus === 'published' ? '\u05D4\u05E2\u05DE\u05D5\u05D3 \u05E4\u05D5\u05E8\u05E1\u05DD' : '\u05D4\u05E2\u05DE\u05D5\u05D3 \u05D4\u05D5\u05E2\u05D1\u05E8 \u05DC\u05D8\u05D9\u05D5\u05D8\u05D4');
    await loadStudioPages();
  } catch (err) {
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E1\u05D8\u05D8\u05D5\u05E1');
  }
}

/** Edit page settings modal */
async function editPageSettings(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;

  Modal.show({
    title: '\u2699\uFE0F \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E2\u05DE\u05D5\u05D3',
    size: 'md',
    content: `<div class="studio-field-group"><label>\u05DB\u05D5\u05EA\u05E8\u05EA</label><input type="text" id="ps-title" value="${escapeAttr(page.title || '')}" class="studio-field"></div>
      <div class="studio-field-group"><label>Slug</label><input type="text" id="ps-slug" value="${escapeAttr(page.slug || '')}" class="studio-field" ${page.is_system ? 'disabled' : ''}></div>
      <div class="studio-field-group"><label>Meta Title <span class="seo-char-inline" id="ps-mt-count">${(page.meta_title || '').length}/60</span></label><input type="text" id="ps-meta-title" value="${escapeAttr(page.meta_title || '')}" class="studio-field" oninput="document.getElementById('ps-mt-count').textContent=this.value.length+'/60'"></div>
      <div class="studio-field-group"><label>Meta Description <span class="seo-char-inline" id="ps-md-count">${(page.meta_description || '').length}/160</span></label><textarea id="ps-meta-desc" rows="3" class="studio-field" oninput="document.getElementById('ps-md-count').textContent=this.value.length+'/160'">${escapeAttr(page.meta_description || '')}</textarea></div>
      <div class="studio-field-group"><label>\u05E1\u05D5\u05D2 \u05E2\u05DE\u05D5\u05D3</label><select id="ps-type" class="studio-field" ${page.is_system ? 'disabled' : ''}>
        <option value="homepage" ${page.page_type === 'homepage' ? 'selected' : ''}>\u{1F3E0} \u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA</option>
        <option value="custom" ${page.page_type === 'custom' ? 'selected' : ''}>\u{1F4C4} \u05DE\u05D5\u05EA\u05D0\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA</option>
        <option value="campaign" ${page.page_type === 'campaign' ? 'selected' : ''}>\u{1F3AF} \u05E7\u05DE\u05E4\u05D9\u05D9\u05DF</option>
        <option value="guide" ${page.page_type === 'guide' ? 'selected' : ''}>\u{1F4D6} \u05DE\u05D3\u05E8\u05D9\u05DA</option>
        <option value="legal" ${page.page_type === 'legal' ? 'selected' : ''}>\u{1F4DC} \u05DE\u05E9\u05E4\u05D8\u05D9</option></select></div>
      ${studioTags.length ? `<div class="studio-field-group"><label>\u05EA\u05D2\u05D9\u05D5\u05EA</label><div style="display:flex; flex-wrap:wrap; gap:4px;">${renderTagCheckboxes(page.tags)}</div></div>` : ''}`,
    footer: `<button class="btn btn-primary" onclick="submitPageSettings('${pageId}')">\u05E9\u05DE\u05D5\u05E8</button>
      <button class="btn btn-ghost" onclick="Modal.close()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>
      ${!page.is_system && canSee('delete_page_button') ? `<button class="btn btn-ghost" style="margin-right:auto" onclick="Modal.close();archivePage('${pageId}')">\u{1F4E6} \u05D0\u05E8\u05DB\u05D9\u05D5\u05DF</button>` : ''}`
  });
}

async function submitPageSettings(pageId) {
  const updates = {
    title: document.getElementById('ps-title')?.value.trim(),
    slug: document.getElementById('ps-slug')?.value.trim(),
    meta_title: document.getElementById('ps-meta-title')?.value.trim(),
    meta_description: document.getElementById('ps-meta-desc')?.value.trim(),
    page_type: document.getElementById('ps-type')?.value,
    tags: typeof getCheckedTags === 'function' ? getCheckedTags() : undefined,
  };
  if (updates.tags === undefined) delete updates.tags;
  try {
    const { error } = await sb.from('storefront_pages').update(updates)
      .eq('id', pageId).eq('tenant_id', getTenantId());
    if (error) throw error;
    Modal.close();
    Toast.success('\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D5');
    await loadStudioPages();
    if (selectedPageId === pageId) await loadPageEditor(pageId);
  } catch (err) {
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA');
  }
}

function hideEditor() {
  const editor = document.getElementById('studio-editor');
  if (editor) editor.innerHTML = '<div class="studio-empty-editor"><p>\u05D1\u05D7\u05E8 \u05E2\u05DE\u05D5\u05D3 \u05DE\u05D4\u05E8\u05E9\u05D9\u05DE\u05D4 \u05DC\u05E2\u05E8\u05D9\u05DB\u05D4</p></div>';
}
