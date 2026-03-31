// modules/storefront/studio-pages.js
// Page list management for Studio (CMS-2, enhanced CMS-9)

let studioPages = [];
let selectedPageId = null;
let pageSearchText = '';
let pageFilterType = 'all';
let pageFilterStatus = 'all';
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
  if (pageFilterStatus !== 'all') filtered = filtered.filter(p => p.status === pageFilterStatus);
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
      <option value="all">\u05DB\u05DC \u05D4\u05E1\u05D8\u05D8\u05D5\u05E1\u05D9\u05DD</option>
      <option value="published" ${pageFilterStatus === 'published' ? 'selected' : ''}>\u05E4\u05D5\u05E8\u05E1\u05DD</option>
      <option value="draft" ${pageFilterStatus === 'draft' ? 'selected' : ''}>\u05D8\u05D9\u05D5\u05D8\u05D4</option>
    </select>
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
    const statusClass = p.status === 'published' ? 'badge-published' : 'badge-draft';
    const statusText = p.status === 'published' ? '\u05E4\u05D5\u05E8\u05E1\u05DD' : '\u05D8\u05D9\u05D5\u05D8\u05D4';
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

    const bulkChecked = bulkSelectedIds.has(p.id) ? 'checked' : '';

    return `<div class="studio-page-item${active}" data-id="${p.id}" onclick="selectPage('${p.id}')">
      <div class="studio-page-row-top">
        <input type="checkbox" class="page-bulk-check" ${bulkChecked} onclick="event.stopPropagation();toggleBulkSelect('${p.id}',this.checked)">
        <span class="studio-page-icon">${icon}</span>
        <div class="studio-page-info">
          <div class="studio-page-title">${title}</div>
          <div class="studio-page-slug-time"><span class="studio-page-slug">/${slug}</span><span class="studio-page-edited">${edited}</span></div>
        </div>
        ${seoBadge}
      </div>
      <div class="studio-page-meta">
        <span class="studio-badge ${statusClass}">${statusText}</span>
        <div class="studio-page-actions-mini">${dupBtn}${settingsBtn}${toggleBtn}</div>
      </div>
    </div>`;
  }).join('');

  // Bulk action bar
  if (bulkSelectedIds.size > 0) {
    html += `<div class="bulk-action-bar">
      \u05E0\u05D1\u05D7\u05E8\u05D5 ${bulkSelectedIds.size} \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD
      <button class="btn btn-sm btn-primary" onclick="bulkToggleStatus('published')">\u05E4\u05E8\u05E1\u05DD</button>
      <button class="btn btn-sm btn-ghost" onclick="bulkToggleStatus('draft')">\u05D8\u05D9\u05D5\u05D8\u05D4</button>
    </div>`;
  }

  container.innerHTML = html;
}

function toggleBulkSelect(id, checked) { checked ? bulkSelectedIds.add(id) : bulkSelectedIds.delete(id); renderFilteredPageList(); }

async function bulkToggleStatus(newStatus) {
  if (!bulkSelectedIds.size) return;
  const label = newStatus === 'published' ? '\u05DC\u05E4\u05E8\u05E1\u05DD' : '\u05DC\u05D4\u05E2\u05D1\u05D9\u05E8 \u05DC\u05D8\u05D9\u05D5\u05D8\u05D4';
  if (!await Modal.confirm({ title: '\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E1\u05D8\u05D8\u05D5\u05E1', message: `${label} ${bulkSelectedIds.size} \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD?`, confirmText: '\u05D0\u05D9\u05E9\u05D5\u05E8', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC' })) return;
  try {
    for (const id of bulkSelectedIds) await sb.from('storefront_pages').update({ status: newStatus }).eq('id', id).eq('tenant_id', getTenantId());
    Toast.success(`${bulkSelectedIds.size} \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5`);
    bulkSelectedIds.clear(); await loadStudioPages();
  } catch (err) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1'); }
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
async function selectPage(pageId) {
  if (hasUnsavedChanges && !await Modal.confirm({ title: '\u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8\u05D5', message: '\u05D9\u05E9 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05E9\u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8\u05D5. \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA?', confirmText: '\u05D4\u05DE\u05E9\u05DA', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC' })) return;
  selectedPageId = pageId; renderFilteredPageList(); await loadPageEditor(pageId);
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
    if (error) throw error;
    Modal.close();
    Toast.success('\u05D4\u05E2\u05DE\u05D5\u05D3 \u05E0\u05D5\u05E6\u05E8');
    await loadStudioPages();
  } catch (err) {
    console.error('Create page error:', err);
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05E2\u05DE\u05D5\u05D3: ' + (err.message || ''));
  }
}

/** Delete page (soft) */
async function deletePage(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;
  if (page.is_system) { Toast.error('\u05E2\u05DE\u05D5\u05D3 \u05DE\u05E2\u05E8\u05DB\u05EA \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D9\u05E7\u05D4'); return; }
  if (!await Modal.confirm({ title: '\u05DE\u05D7\u05D9\u05E7\u05EA \u05E2\u05DE\u05D5\u05D3', message: `\u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA "${escapeHtml(page.title || page.slug)}"?`, confirmText: '\u05DE\u05D7\u05E7', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC' })) return;
  try {
    const { error } = await sb.from('storefront_pages').update({ status: 'draft', slug: `[deleted]-${page.slug}` }).eq('id', pageId).eq('tenant_id', getTenantId());
    if (error) throw error;
    Toast.success('\u05D4\u05E2\u05DE\u05D5\u05D3 \u05E0\u05DE\u05D7\u05E7');
    if (selectedPageId === pageId) { selectedPageId = null; hideEditor(); }
    await loadStudioPages();
  } catch (err) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05E2\u05DE\u05D5\u05D3'); }
}

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
        <option value="legal" ${page.page_type === 'legal' ? 'selected' : ''}>\u{1F4DC} \u05DE\u05E9\u05E4\u05D8\u05D9</option></select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitPageSettings('${pageId}')">\u05E9\u05DE\u05D5\u05E8</button>
      <button class="btn btn-ghost" onclick="Modal.close()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>
      ${!page.is_system && canSee('delete_page_button') ? `<button class="btn btn-danger" style="margin-right:auto" onclick="Modal.close();deletePage('${pageId}')">\u{1F5D1} \u05DE\u05D7\u05E7</button>` : ''}`
  });
}

async function submitPageSettings(pageId) {
  const updates = {
    title: document.getElementById('ps-title')?.value.trim(),
    slug: document.getElementById('ps-slug')?.value.trim(),
    meta_title: document.getElementById('ps-meta-title')?.value.trim(),
    meta_description: document.getElementById('ps-meta-desc')?.value.trim(),
    page_type: document.getElementById('ps-type')?.value,
  };
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
