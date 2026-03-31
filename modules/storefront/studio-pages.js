// modules/storefront/studio-pages.js
// Page list management for Studio (CMS-2)

let studioPages = [];
let selectedPageId = null;

const PAGE_TYPE_ICONS = {
  homepage: '🏠', legal: '📜', campaign: '🎯', guide: '📖', custom: '📄'
};

/**
 * Load all pages for current tenant
 */
async function loadStudioPages() {
  try {
    const { data, error } = await sb.from('v_admin_pages')
      .select('*')
      .eq('tenant_id', getTenantId())
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true });
    if (error) throw error;
    studioPages = data || [];
    renderPageList(studioPages);
  } catch (err) {
    console.error('Failed to load pages:', err);
    Toast.error('שגיאה בטעינת עמודים');
  }
}

/**
 * Render page list sidebar
 */
function renderPageList(pages) {
  const container = document.getElementById('studio-page-list');
  if (!container) return;

  if (!pages.length) {
    container.innerHTML = '<div class="studio-empty">אין עמודים</div>';
    return;
  }

  const showSettings = canSee('page_settings_button');
  const showToggle = canSee('status_toggle');

  container.innerHTML = pages.map(p => {
    const icon = PAGE_TYPE_ICONS[p.page_type] || '📄';
    const statusClass = p.status === 'published' ? 'badge-published' : 'badge-draft';
    const statusText = p.status === 'published' ? 'פורסם' : 'טיוטה';
    const active = p.id === selectedPageId ? ' active' : '';
    const title = escapeHtml(p.title || p.slug);
    const slug = escapeHtml(p.slug);
    const settingsBtn = showSettings ? `<button title="הגדרות" onclick="event.stopPropagation();editPageSettings('${p.id}')">⚙️</button>` : '';
    const toggleBtn = showToggle
      ? `<button title="${p.status === 'published' ? 'העבר לטיוטה' : 'פרסם'}" onclick="event.stopPropagation();togglePageStatus('${p.id}','${p.status}')">${p.status === 'published' ? '📤' : '📥'}</button>`
      : '';
    return `<div class="studio-page-item${active}" data-id="${p.id}" onclick="selectPage('${p.id}')">
      <div class="studio-page-info">
        <span class="studio-page-icon">${icon}</span>
        <div>
          <div class="studio-page-title">${title}</div>
          <div class="studio-page-slug">/${slug}</div>
        </div>
      </div>
      <div class="studio-page-meta">
        <span class="studio-badge ${statusClass}">${statusText}</span>
        ${(settingsBtn || toggleBtn) ? `<div class="studio-page-actions-mini">${settingsBtn}${toggleBtn}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

/**
 * Select a page → load into editor
 */
async function selectPage(pageId) {
  if (hasUnsavedChanges) {
    const proceed = await Modal.confirm({
      title: 'שינויים לא נשמרו',
      message: 'יש שינויים שלא נשמרו. להמשיך?',
      confirmText: 'המשך', cancelText: 'ביטול'
    });
    if (!proceed) return;
  }
  selectedPageId = pageId;
  renderPageList(studioPages);
  await loadPageEditor(pageId);
}

/**
 * Create new page — super_admin gets free-form, tenant_admin gets template picker
 */
async function createPage() {
  if (studioHasPermission('pages_create_from_template_only')) {
    showTemplatePicker();
    return;
  }
  Modal.show({
    title: '+ עמוד חדש',
    size: 'sm',
    content: `<div class="studio-field-group"><label>Slug (אנגלית)</label><input type="text" id="np-slug" placeholder="my-page" pattern="[a-z0-9\\-/]+" class="studio-field"></div>
      <div class="studio-field-group"><label>כותרת</label><input type="text" id="np-title" class="studio-field"></div>
      <div class="studio-field-group"><label>סוג עמוד</label><select id="np-type" class="studio-field">
        <option value="custom">📄 מותאם אישית</option><option value="campaign">🎯 קמפיין</option>
        <option value="guide">📖 מדריך</option><option value="legal">📜 משפטי</option></select></div>
      <div class="studio-field-group"><label>שפה</label><select id="np-lang" class="studio-field">
        <option value="he">עברית</option><option value="en">English</option><option value="ru">Русский</option></select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitCreatePage()">צור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

async function submitCreatePage() {
  const slug = document.getElementById('np-slug')?.value.trim();
  const title = document.getElementById('np-title')?.value.trim();
  const page_type = document.getElementById('np-type')?.value;
  const lang = document.getElementById('np-lang')?.value || 'he';

  if (!slug) { Toast.warning('יש להזין slug'); return; }

  try {
    const { error } = await sb.from('storefront_pages').insert({
      tenant_id: getTenantId(), slug, title, page_type, lang,
      blocks: [], status: 'draft', is_system: false
    });
    if (error) throw error;
    Modal.close();
    Toast.success('העמוד נוצר');
    await loadStudioPages();
  } catch (err) {
    console.error('Create page error:', err);
    Toast.error('שגיאה ביצירת עמוד: ' + (err.message || ''));
  }
}

/**
 * Delete page (soft)
 */
async function deletePage(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;
  if (page.is_system) { Toast.error('עמוד מערכת לא ניתן למחיקה'); return; }

  const ok = await Modal.confirm({
    title: 'מחיקת עמוד',
    message: `למחוק את "${escapeHtml(page.title || page.slug)}"?`,
    confirmText: 'מחק', cancelText: 'ביטול'
  });
  if (!ok) return;

  try {
    const { error } = await sb.from('storefront_pages').update({
      status: 'draft', slug: `[deleted]-${page.slug}`
    }).eq('id', pageId).eq('tenant_id', getTenantId());
    if (error) throw error;
    Toast.success('העמוד נמחק');
    if (selectedPageId === pageId) { selectedPageId = null; hideEditor(); }
    await loadStudioPages();
  } catch (err) {
    Toast.error('שגיאה במחיקת עמוד');
  }
}

/**
 * Toggle page status
 */
async function togglePageStatus(pageId, currentStatus) {
  const newStatus = currentStatus === 'published' ? 'draft' : 'published';
  try {
    const { error } = await sb.from('storefront_pages').update({ status: newStatus })
      .eq('id', pageId).eq('tenant_id', getTenantId());
    if (error) throw error;
    Toast.success(newStatus === 'published' ? 'העמוד פורסם' : 'העמוד הועבר לטיוטה');
    await loadStudioPages();
  } catch (err) {
    Toast.error('שגיאה בשינוי סטטוס');
  }
}

/**
 * Edit page settings modal
 */
async function editPageSettings(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;

  Modal.show({
    title: '⚙️ הגדרות עמוד',
    size: 'md',
    content: `<div class="studio-field-group"><label>כותרת</label><input type="text" id="ps-title" value="${escapeAttr(page.title || '')}" class="studio-field"></div>
      <div class="studio-field-group"><label>Slug</label><input type="text" id="ps-slug" value="${escapeAttr(page.slug || '')}" class="studio-field" ${page.is_system ? 'disabled' : ''}></div>
      <div class="studio-field-group"><label>Meta Title</label><input type="text" id="ps-meta-title" value="${escapeAttr(page.meta_title || '')}" class="studio-field"></div>
      <div class="studio-field-group"><label>Meta Description</label><textarea id="ps-meta-desc" rows="3" class="studio-field">${escapeAttr(page.meta_description || '')}</textarea></div>
      <div class="studio-field-group"><label>סוג עמוד</label><select id="ps-type" class="studio-field" ${page.is_system ? 'disabled' : ''}>
        <option value="homepage" ${page.page_type === 'homepage' ? 'selected' : ''}>🏠 דף הבית</option>
        <option value="custom" ${page.page_type === 'custom' ? 'selected' : ''}>📄 מותאם אישית</option>
        <option value="campaign" ${page.page_type === 'campaign' ? 'selected' : ''}>🎯 קמפיין</option>
        <option value="guide" ${page.page_type === 'guide' ? 'selected' : ''}>📖 מדריך</option>
        <option value="legal" ${page.page_type === 'legal' ? 'selected' : ''}>📜 משפטי</option></select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitPageSettings('${pageId}')">שמור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>
      ${!page.is_system && canSee('delete_page_button') ? `<button class="btn btn-danger" style="margin-right:auto" onclick="Modal.close();deletePage('${pageId}')">🗑 מחק</button>` : ''}`
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
    Toast.success('הגדרות נשמרו');
    await loadStudioPages();
    if (selectedPageId === pageId) await loadPageEditor(pageId);
  } catch (err) {
    Toast.error('שגיאה בשמירת הגדרות');
  }
}

function hideEditor() {
  const editor = document.getElementById('studio-editor');
  if (editor) editor.innerHTML = '<div class="studio-empty-editor"><p>בחר עמוד מהרשימה לעריכה</p></div>';
}
