// modules/storefront/studio-templates.js
// Template management and template-based page creation (CMS-4)

let studioTemplates = [];

/**
 * Load available templates from DB
 */
async function loadTemplates() {
  try {
    const { data, error } = await sb.from('storefront_templates')
      .select('*').eq('is_active', true).order('name');
    if (error) throw error;
    studioTemplates = data || [];
    return studioTemplates;
  } catch (err) {
    console.error('Load templates error:', err);
    Toast.error('שגיאה בטעינת תבניות');
    return [];
  }
}

/**
 * Show template picker modal (for tenant_admin page creation)
 */
async function showTemplatePicker() {
  const templates = studioTemplates.length ? studioTemplates : await loadTemplates();

  if (!templates.length) {
    Toast.warning('אין תבניות זמינות כרגע');
    return;
  }

  const cards = templates.map(t => {
    const blockCount = Array.isArray(t.blocks) ? t.blocks.length : 0;
    return `<div class="studio-template-card" onclick="createPageFromTemplate('${t.id}')">
      <div class="studio-template-name">${escapeHtml(t.name)}</div>
      <div class="studio-template-desc">${escapeHtml(t.description || '')}</div>
      <div class="studio-template-meta">${blockCount} בלוקים | ${escapeHtml(t.page_type)}</div>
    </div>`;
  }).join('');

  Modal.show({
    title: 'בחר תבנית לעמוד חדש',
    size: 'md',
    content: `<div class="studio-template-grid">${cards}</div>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

/**
 * Create page from template
 */
async function createPageFromTemplate(templateId) {
  const template = studioTemplates.find(t => t.id === templateId);
  if (!template) { Toast.error('תבנית לא נמצאה'); return; }

  Modal.close();

  Modal.show({
    title: 'יצירת עמוד מתבנית: ' + escapeHtml(template.name),
    size: 'sm',
    content: `<div class="studio-field-group"><label>כותרת העמוד</label>
        <input type="text" id="tpl-title" class="studio-field" placeholder="שם העמוד"></div>
      <div class="studio-field-group"><label>Slug (אנגלית)</label>
        <input type="text" id="tpl-slug" class="studio-field" placeholder="my-page" pattern="[a-z0-9\\-/]+"></div>`,
    footer: `<button class="btn btn-primary" onclick="submitTemplateCreate('${templateId}')">צור עמוד</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

async function submitTemplateCreate(templateId) {
  const template = studioTemplates.find(t => t.id === templateId);
  if (!template) return;

  const title = document.getElementById('tpl-title')?.value.trim();
  const slug = document.getElementById('tpl-slug')?.value.trim();
  if (!slug) { Toast.warning('יש להזין slug'); return; }
  if (!title) { Toast.warning('יש להזין כותרת'); return; }

  // Deep clone template blocks with new IDs
  const blocks = JSON.parse(JSON.stringify(template.blocks || []));
  for (const block of blocks) {
    block.id = block.type + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  try {
    const { error } = await sb.from('storefront_pages').insert({
      tenant_id: getTenantId(), slug, title,
      page_type: template.page_type || 'custom',
      lang: 'he', blocks, status: 'draft', is_system: false
    });
    if (error) throw error;
    Modal.close();
    Toast.success('העמוד נוצר! ערוך את התוכן ופנה למנהל לפרסום');
    await loadStudioPages();
  } catch (err) {
    console.error('Template create error:', err);
    Toast.error('שגיאה ביצירת עמוד: ' + (err.message || ''));
  }
}

// ---- Super Admin: Template Management ----

/**
 * Render templates management UI (super_admin only)
 */
async function renderTemplatesManager() {
  const container = document.getElementById('studio-templates-content');
  if (!container) return;

  const templates = studioTemplates.length ? studioTemplates : await loadTemplates();

  if (!templates.length) {
    container.innerHTML = `<div class="studio-empty">
      <p>אין תבניות. צור תבנית ראשונה!</p>
      <button class="btn btn-primary" onclick="openCreateTemplate()" style="margin-top:12px">+ תבנית חדשה</button>
    </div>`;
    return;
  }

  let html = `<div class="studio-toolbar" style="margin-bottom:16px">
    <button class="btn btn-primary" onclick="openCreateTemplate()">+ תבנית חדשה</button>
    <button class="btn btn-ghost" onclick="openTemplateFromPage()">📄 צור מעמוד קיים</button>
  </div>`;

  html += '<div class="studio-template-list">';
  for (const t of templates) {
    const blockCount = Array.isArray(t.blocks) ? t.blocks.length : 0;
    html += `<div class="comp-item">
      <div class="comp-item-info">
        <span class="comp-item-name">${escapeHtml(t.name)}</span>
        <span class="comp-item-placements">${escapeHtml(t.description || '')} | ${blockCount} בלוקים | ${escapeHtml(t.page_type)}</span>
      </div>
      <div class="comp-item-actions">
        <button class="btn btn-sm" onclick="editTemplate('${t.id}')" title="ערוך">✎</button>
        <button class="btn btn-sm" onclick="deleteTemplate('${t.id}')" title="מחק">🗑</button>
      </div>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Open create template modal
 */
function openCreateTemplate() {
  Modal.show({
    title: '+ תבנית חדשה',
    size: 'sm',
    content: `<div class="studio-field-group"><label>שם התבנית</label>
        <input type="text" id="new-tpl-name" class="studio-field"></div>
      <div class="studio-field-group"><label>תיאור</label>
        <textarea id="new-tpl-desc" class="studio-field" rows="3"></textarea></div>
      <div class="studio-field-group"><label>סוג עמוד</label>
        <select id="new-tpl-type" class="studio-field">
          <option value="custom">מותאם אישית</option>
          <option value="campaign">קמפיין</option>
          <option value="guide">מדריך</option>
          <option value="legal">משפטי</option>
        </select></div>`,
    footer: `<button class="btn btn-primary" onclick="submitCreateTemplate()">צור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

async function submitCreateTemplate() {
  const name = document.getElementById('new-tpl-name')?.value.trim();
  const description = document.getElementById('new-tpl-desc')?.value.trim();
  const page_type = document.getElementById('new-tpl-type')?.value || 'custom';
  if (!name) { Toast.warning('יש להזין שם'); return; }

  try {
    const { error } = await sb.from('storefront_templates').insert({
      name, description, page_type, blocks: [], is_active: true
    });
    if (error) throw error;
    Modal.close();
    Toast.success('התבנית נוצרה');
    studioTemplates = [];
    await renderTemplatesManager();
  } catch (err) {
    Toast.error('שגיאה ביצירת תבנית: ' + (err.message || ''));
  }
}

/**
 * Create template from existing page
 */
function openTemplateFromPage() {
  if (!studioPages.length) { Toast.warning('אין עמודים זמינים'); return; }

  const options = studioPages.map(p =>
    `<div class="studio-type-option" onclick="createTemplateFromPage('${p.id}')">${escapeHtml(p.title || p.slug)}</div>`
  ).join('');

  Modal.show({
    title: 'בחר עמוד להפיכה לתבנית',
    size: 'sm',
    content: `<div class="studio-type-grid">${options}</div>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

async function createTemplateFromPage(pageId) {
  const page = studioPages.find(p => p.id === pageId);
  if (!page) return;
  Modal.close();

  Modal.show({
    title: 'צור תבנית מעמוד: ' + escapeHtml(page.title || page.slug),
    size: 'sm',
    content: `<div class="studio-field-group"><label>שם התבנית</label>
        <input type="text" id="tpl-from-name" class="studio-field" value="תבנית — ${escapeAttr(page.title || page.slug)}"></div>
      <div class="studio-field-group"><label>תיאור</label>
        <textarea id="tpl-from-desc" class="studio-field" rows="3"></textarea></div>`,
    footer: `<button class="btn btn-primary" onclick="submitTemplateFromPage('${pageId}')">צור תבנית</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

async function submitTemplateFromPage(pageId) {
  const name = document.getElementById('tpl-from-name')?.value.trim();
  const description = document.getElementById('tpl-from-desc')?.value.trim();
  if (!name) { Toast.warning('יש להזין שם'); return; }

  // Fetch page blocks
  try {
    const { data: page, error: pageErr } = await sb.from('v_admin_pages')
      .select('blocks,page_type').eq('id', pageId).single();
    if (pageErr) throw pageErr;

    const { error } = await sb.from('storefront_templates').insert({
      name, description, page_type: page.page_type || 'custom',
      blocks: page.blocks || [], is_active: true
    });
    if (error) throw error;
    Modal.close();
    Toast.success('התבנית נוצרה מהעמוד');
    studioTemplates = [];
    await renderTemplatesManager();
  } catch (err) {
    Toast.error('שגיאה: ' + (err.message || ''));
  }
}

/**
 * Edit template — open JSON editor for blocks
 */
async function editTemplate(templateId) {
  const template = studioTemplates.find(t => t.id === templateId);
  if (!template) return;

  Modal.show({
    title: 'עריכת תבנית: ' + escapeHtml(template.name),
    size: 'lg',
    content: `<div class="studio-field-group"><label>שם</label>
        <input type="text" id="edit-tpl-name" class="studio-field" value="${escapeAttr(template.name)}"></div>
      <div class="studio-field-group"><label>תיאור</label>
        <textarea id="edit-tpl-desc" class="studio-field" rows="3">${escapeAttr(template.description || '')}</textarea></div>
      <div class="studio-field-group"><label>בלוקים (JSON)</label>
        <textarea id="edit-tpl-blocks" class="studio-field studio-json" rows="15" dir="ltr" style="font-family:monospace;font-size:.82rem">${escapeAttr(JSON.stringify(template.blocks || [], null, 2))}</textarea></div>`,
    footer: `<button class="btn btn-primary" onclick="submitEditTemplate('${templateId}')">שמור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

async function submitEditTemplate(templateId) {
  const name = document.getElementById('edit-tpl-name')?.value.trim();
  const description = document.getElementById('edit-tpl-desc')?.value.trim();
  let blocks;
  try {
    blocks = JSON.parse(document.getElementById('edit-tpl-blocks')?.value || '[]');
  } catch { Toast.error('שגיאת JSON'); return; }

  try {
    const { error } = await sb.from('storefront_templates')
      .update({ name, description, blocks }).eq('id', templateId);
    if (error) throw error;
    Modal.close();
    Toast.success('התבנית עודכנה');
    studioTemplates = [];
    await renderTemplatesManager();
  } catch (err) {
    Toast.error('שגיאה: ' + (err.message || ''));
  }
}

/**
 * Delete template
 */
async function deleteTemplate(templateId) {
  const template = studioTemplates.find(t => t.id === templateId);
  const ok = await Modal.confirm({
    title: 'מחיקת תבנית',
    message: `למחוק את "${escapeHtml(template?.name || '')}"?`,
    confirmText: 'מחק', cancelText: 'ביטול'
  });
  if (!ok) return;
  try {
    const { error } = await sb.from('storefront_templates')
      .update({ is_active: false }).eq('id', templateId);
    if (error) throw error;
    Toast.success('התבנית נמחקה');
    studioTemplates = [];
    await renderTemplatesManager();
  } catch (err) {
    Toast.error('שגיאה במחיקת תבנית');
  }
}
