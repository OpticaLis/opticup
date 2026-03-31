// modules/storefront/studio-editor.js
// Block editor: edit, reorder, add, delete, save, rollback (CMS-2)

let currentPage = null;
let editedBlocks = [];
let hasUnsavedChanges = false;

/**
 * Load page into editor
 */
async function loadPageEditor(pageId) {
  try {
    const { data, error } = await sb.from('v_admin_pages')
      .select('*').eq('id', pageId).eq('tenant_id', getTenantId()).single();
    if (error) throw error;
    currentPage = data;
    editedBlocks = JSON.parse(JSON.stringify(data.blocks || []));
    hasUnsavedChanges = false;
    renderEditor();
  } catch (err) {
    console.error('Load page editor error:', err);
    Toast.error('שגיאה בטעינת העמוד');
  }
}

/**
 * Render the full editor panel
 */
function renderEditor() {
  const editor = document.getElementById('studio-editor');
  if (!editor || !currentPage) return;

  const title = escapeHtml(currentPage.title || currentPage.slug);
  let html = `<div class="studio-editor-header">
    <h2>${title}</h2>
    <span class="studio-badge ${currentPage.status === 'published' ? 'badge-published' : 'badge-draft'}">${currentPage.status === 'published' ? 'פורסם' : 'טיוטה'}</span>
  </div>`;
  html += `<div id="ai-prompt-container" class="hidden"></div>`;
  html += `<div class="studio-block-list" id="studio-block-list">`;
  html += renderBlockList();
  html += `</div>`;
  html += renderToolbar();
  editor.innerHTML = html;
  updateSaveBtn();

  // Render AI prompt bar (CMS-5)
  if (typeof renderAiPromptBar === 'function') {
    renderAiPromptBar('ai-prompt-container');
  }
}

/**
 * Render block list cards
 */
function renderBlockList() {
  if (!editedBlocks.length) {
    return '<div class="studio-empty">אין בלוקים. הוסף בלוק ראשון!</div>';
  }
  const showReorder = canSee('reorder_buttons');
  const showDelete = canSee('delete_block_button');

  return editedBlocks.map((block, i) => {
    const schema = getBlockSchema(block.type);
    const icon = schema?.icon || '❓';
    const label = schema?.label || block.type;
    const summary = escapeHtml(getBlockSummary(block));
    const hidden = block.settings?.hidden ? ' studio-block-hidden' : '';
    const editable = canEditBlockType(block.type);
    const editBtn = editable
      ? `<button title="ערוך" onclick="openBlockEditor(${i})">✎</button>`
      : `<button title="בלוק מערכת — לעריכה פנה למנהל" disabled style="opacity:.5;cursor:default">🔒</button>`;

    let actions = '';
    if (showReorder) {
      actions += `<button title="הזז למעלה" ${i === 0 ? 'disabled' : ''} onclick="moveBlock(${i},-1)">▲</button>`;
      actions += `<button title="הזז למטה" ${i === editedBlocks.length - 1 ? 'disabled' : ''} onclick="moveBlock(${i},1)">▼</button>`;
    }
    actions += editBtn;
    if (showDelete) actions += `<button title="מחק" onclick="deleteBlock(${i})">🗑</button>`;

    return `<div class="studio-block-card${hidden}" data-index="${i}">
      <div class="studio-block-info">
        <span class="studio-block-type-badge">${icon} ${escapeHtml(label)}</span>
        <span class="studio-block-summary">${summary}</span>
      </div>
      <div class="studio-block-actions">${actions}</div>
    </div>`;
  }).join('');
}

/**
 * Get content summary for a block
 */
function getBlockSummary(block) {
  const d = block.data || {};
  switch (block.type) {
    case 'hero': return d.title || '';
    case 'text': return (d.body || '').substring(0, 50);
    case 'products': return `${d.filter || 'all'} (${d.limit || '?'})`;
    case 'faq': return `${(d.items || []).length} שאלות`;
    case 'columns': return `${(d.items || []).length} פריטים`;
    case 'steps': return `${(d.items || []).length} שלבים`;
    case 'video': return `${(d.videos || []).length} סרטונים`;
    case 'gallery': return `${(d.images || []).length} תמונות`;
    case 'cta': return d.text || '';
    case 'contact': return d.section_title || '';
    case 'banner': return d.title || '';
    case 'brands': return d.section_title || '';
    case 'blog_carousel': return d.section_title || '';
    case 'lead_form': return d.title || '';
    default: return block.type;
  }
}

/**
 * Render toolbar
 */
function renderToolbar() {
  const addBtn = canSee('add_block_button')
    ? '<button class="btn btn-primary studio-add-block" onclick="addBlock()">+ הוסף בלוק</button>' : '';
  const rollbackBtn = canSee('rollback_button')
    ? '<button class="btn btn-ghost" onclick="rollbackBlocks()" title="החזר לגרסה קודמת">↩ Rollback</button>' : '';
  const jsonBtn = canSee('json_editor_button')
    ? '<button class="btn btn-ghost" onclick="showJsonEditor()" title="עריכת JSON">📋 JSON</button>' : '';
  return `<div class="studio-toolbar">
    ${addBtn}
    <div class="studio-toolbar-right">
      ${rollbackBtn}
      <button class="btn btn-ghost" onclick="openPreview()" title="תצוגה מקדימה">👁 Preview</button>
      ${jsonBtn}
      <button class="btn btn-primary btn-save" id="btn-save-blocks" onclick="saveBlocks()">💾 שמור</button>
    </div>
  </div>`;
}

function updateSaveBtn() {
  const btn = document.getElementById('btn-save-blocks');
  if (!btn) return;
  btn.classList.toggle('has-changes', hasUnsavedChanges);
  btn.textContent = hasUnsavedChanges ? '💾 שמור *' : '💾 שמור';
}

function markUnsaved() {
  hasUnsavedChanges = true;
  updateSaveBtn();
}

/**
 * Open block edit modal
 */
function openBlockEditor(blockIndex) {
  const block = editedBlocks[blockIndex];
  if (!block) return;
  if (!canEditBlockType(block.type)) { Toast.warning('בלוק מערכת — לעריכה פנה למנהל'); return; }
  const schema = getBlockSchema(block.type);
  if (!schema) { Toast.error('סוג בלוק לא מוכר: ' + block.type); return; }

  // Filter fields for tenant_admin
  const allowedFields = getAllowedFields(block.type);
  const fields = allowedFields ? schema.fields.filter(f => allowedFields.includes(f.key)) : schema.fields;

  const formHtml = renderBlockForm(fields, block.data || {});
  const settingsHtml = isSuperAdmin() ? renderSettingsForm(block.settings || {}) : '';

  const settingsSection = settingsHtml ? `<div class="studio-settings-section">
        <button type="button" class="studio-settings-toggle" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('show')">הגדרות מתקדמות ▾</button>
        <div class="studio-settings-body" id="block-settings-form">${settingsHtml}</div>
      </div>` : '';

  Modal.show({
    title: `עריכת בלוק: ${schema.icon} ${schema.label}`,
    size: 'lg',
    content: `<div id="block-edit-form" class="studio-edit-form">${formHtml}${settingsSection}</div>`,
    footer: `<button class="btn btn-primary" onclick="saveBlockEdit(${blockIndex})">שמור</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

function saveBlockEdit(blockIndex) {
  const formEl = document.getElementById('block-edit-form');
  const settingsEl = document.getElementById('block-settings-form');
  if (!formEl) return;

  const block = editedBlocks[blockIndex];
  const schema = getBlockSchema(block.type);
  const allowedFields = getAllowedFields(block.type);
  const fields = allowedFields ? schema.fields.filter(f => allowedFields.includes(f.key)) : schema.fields;
  const newData = collectBlockFormData(formEl, fields);

  // Tenant admin: merge edited fields into existing data (preserve fields they can't see)
  if (allowedFields) {
    editedBlocks[blockIndex].data = { ...block.data, ...newData };
  } else {
    editedBlocks[blockIndex].data = newData;
  }
  if (settingsEl) {
    editedBlocks[blockIndex].settings = collectSettingsFormData(settingsEl);
  }
  Modal.close();
  markUnsaved();
  document.getElementById('studio-block-list').innerHTML = renderBlockList();
}

/**
 * Move block up/down
 */
function moveBlock(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= editedBlocks.length) return;
  [editedBlocks[index], editedBlocks[target]] = [editedBlocks[target], editedBlocks[index]];
  markUnsaved();
  document.getElementById('studio-block-list').innerHTML = renderBlockList();
}

/**
 * Add new block
 */
function addBlock() {
  const types = getBlockTypeList();
  const options = types.map(t => `<div class="studio-type-option" onclick="submitAddBlock('${t.type}')">${t.icon} ${escapeHtml(t.label)}</div>`).join('');
  Modal.show({
    title: 'הוסף בלוק',
    size: 'sm',
    content: `<div class="studio-type-grid">${options}</div>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

function submitAddBlock(type) {
  const schema = getBlockSchema(type);
  if (!schema) return;
  const defaults = {};
  for (const f of schema.fields) {
    if (f.type === 'items') defaults[f.key] = [];
    else if (f.default !== undefined) defaults[f.key] = f.default;
    else defaults[f.key] = '';
  }
  editedBlocks.push({
    id: type + '-' + Date.now().toString(36),
    type, data: defaults, settings: {}
  });
  Modal.close();
  markUnsaved();
  document.getElementById('studio-block-list').innerHTML = renderBlockList();
}

/**
 * Delete block
 */
async function deleteBlock(index) {
  const block = editedBlocks[index];
  const schema = getBlockSchema(block?.type);
  const label = schema?.label || block?.type || '';
  const ok = await Modal.confirm({
    title: 'מחיקת בלוק',
    message: `למחוק את הבלוק "${label}"?`,
    confirmText: 'מחק', cancelText: 'ביטול'
  });
  if (!ok) return;
  editedBlocks.splice(index, 1);
  markUnsaved();
  document.getElementById('studio-block-list').innerHTML = renderBlockList();
}

/**
 * Save all changes to DB
 */
async function saveBlocks() {
  if (!currentPage) return;
  try {
    const { error } = await sb.from('storefront_pages')
      .update({ blocks: editedBlocks })
      .eq('id', currentPage.id).eq('tenant_id', getTenantId());
    if (error) throw error;
    hasUnsavedChanges = false;
    updateSaveBtn();
    Toast.success('השינויים נשמרו');
    // Refresh currentPage
    const { data } = await sb.from('v_admin_pages').select('*').eq('id', currentPage.id).single();
    if (data) currentPage = data;
  } catch (err) {
    console.error('Save error:', err);
    Toast.error('שגיאה בשמירה: ' + (err.message || ''));
  }
}

/**
 * Rollback to previous version
 */
async function rollbackBlocks() {
  if (!currentPage) return;
  const ok = await Modal.confirm({
    title: 'שחזור גרסה קודמת',
    message: 'להחזיר לגרסה הקודמת? השינויים הנוכחיים יאבדו.',
    confirmText: 'שחזר', cancelText: 'ביטול'
  });
  if (!ok) return;
  try {
    const { error } = await sb.from('storefront_pages')
      .update({ blocks: currentPage.previous_blocks || [] })
      .eq('id', currentPage.id).eq('tenant_id', getTenantId());
    if (error) throw error;
    Toast.success('הגרסה הקודמת שוחזרה');
    await loadPageEditor(currentPage.id);
  } catch (err) {
    Toast.error('שגיאה בשחזור');
  }
}

/**
 * Open preview in new tab
 */
function openPreview() {
  if (!currentPage) return;
  const base = 'https://opticup-storefront.vercel.app';
  const slug = currentPage.slug === '/' ? '' : '/' + currentPage.slug;
  window.open(`${base}${slug}?t=prizma`, '_blank');
}

/**
 * Show raw JSON editor
 */
function showJsonEditor() {
  const json = JSON.stringify(editedBlocks, null, 2);
  Modal.show({
    title: '📋 עריכת JSON',
    size: 'lg',
    content: `<textarea id="json-editor-ta" class="studio-json-editor" rows="25">${escapeHtml(json)}</textarea>`,
    footer: `<button class="btn btn-primary" onclick="submitJsonEdit()">החל</button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>`
  });
}

function submitJsonEdit() {
  const ta = document.getElementById('json-editor-ta');
  if (!ta) return;
  try {
    const parsed = JSON.parse(ta.value);
    if (!Array.isArray(parsed)) { Toast.error('JSON חייב להיות מערך'); return; }
    editedBlocks = parsed;
    Modal.close();
    markUnsaved();
    document.getElementById('studio-block-list').innerHTML = renderBlockList();
    Toast.success('JSON עודכן');
  } catch (e) {
    Toast.error('שגיאת JSON: ' + e.message);
  }
}

// Unsaved changes warning on page unload
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
});
