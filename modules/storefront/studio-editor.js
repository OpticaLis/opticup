// modules/storefront/studio-editor.js — Block editor (CMS-2/CMS-9)

let currentPage = null;
let editedBlocks = [];
let hasUnsavedChanges = false;
let undoStack = [];

/** Push current state to undo stack (call BEFORE every edit action) */
function pushUndo() {
  undoStack.push(JSON.parse(JSON.stringify(editedBlocks)));
  if (undoStack.length > 10) undoStack.shift();
}

/** Undo last action */
function undoLastAction() {
  if (!undoStack.length) { Toast.info('\u05D0\u05D9\u05DF \u05E4\u05E2\u05D5\u05DC\u05D5\u05EA \u05DC\u05D1\u05D9\u05D8\u05D5\u05DC'); return; }
  editedBlocks = undoStack.pop();
  hasUnsavedChanges = true;
  refreshBlockList();
  updateSaveBtn();
  Toast.info('\u05E9\u05D9\u05E0\u05D5\u05D9 \u05D1\u05D5\u05D8\u05DC');
  if (typeof renderSeoPanel === 'function' && currentPage) renderSeoPanel({ ...currentPage, blocks: editedBlocks }, 'seo-panel-container');
}

/** Load page into editor */
async function loadPageEditor(pageId) {
  try {
    const { data, error } = await sb.from('v_admin_pages')
      .select('*').eq('id', pageId).eq('tenant_id', getTenantId()).single();
    if (error) throw error;
    currentPage = data;
    editedBlocks = JSON.parse(JSON.stringify(data.blocks || []));
    hasUnsavedChanges = false;
    undoStack = [];
    renderEditor();
  } catch (err) {
    console.error('Load page editor error:', err);
    Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05E2\u05DE\u05D5\u05D3');
  }
}

/** Render the full editor panel */
function renderEditor() {
  const editor = document.getElementById('studio-editor');
  if (!editor || !currentPage) return;
  const title = escapeHtml(currentPage.title || currentPage.slug);
  let html = `<div class="studio-editor-header">
    <h2>${title}</h2>
    <span class="studio-badge ${currentPage.status === 'published' ? 'badge-published' : 'badge-draft'}">${currentPage.status === 'published' ? '\u05E4\u05D5\u05E8\u05E1\u05DD' : '\u05D8\u05D9\u05D5\u05D8\u05D4'}</span>
  </div>`;
  html += `<div id="ai-prompt-container" class="hidden"></div>`;
  html += `<div id="seo-panel-container" class="hidden"></div>`;
  html += `<div class="studio-block-list" id="studio-block-list">${renderBlockList()}</div>`;
  html += renderToolbar();
  html += `<div class="shortcuts-hint">Ctrl+S \u05E9\u05DE\u05D9\u05E8\u05D4 | Ctrl+Z \u05D1\u05D9\u05D8\u05D5\u05DC | Escape \u05E1\u05D2\u05D5\u05E8</div>`;
  editor.innerHTML = html;
  updateSaveBtn();
  if (typeof renderAiPromptBar === 'function') renderAiPromptBar('ai-prompt-container');
  if (typeof renderSeoPanel === 'function') renderSeoPanel(currentPage, 'seo-panel-container');
}

/** Render block list cards */
function renderBlockList() {
  if (!editedBlocks.length) return '<div class="studio-empty">\u05D0\u05D9\u05DF \u05D1\u05DC\u05D5\u05E7\u05D9\u05DD. \u05D4\u05D5\u05E1\u05E3 \u05D1\u05DC\u05D5\u05E7 \u05E8\u05D0\u05E9\u05D5\u05DF!</div>';
  const showReorder = canSee('reorder_buttons');
  const showDelete = canSee('delete_block_button');
  return editedBlocks.map((block, i) => {
    const schema = getBlockSchema(block.type);
    const icon = schema?.icon || '\u2753';
    const label = schema?.label || block.type;
    const summary = escapeHtml(getBlockSummary(block));
    const hidden = block.settings?.hidden ? ' studio-block-hidden' : '';
    const editable = canEditBlockType(block.type);
    const editBtn = editable
      ? `<button title="\u05E2\u05E8\u05D5\u05DA" onclick="openBlockEditor(${i})">\u270E</button>`
      : `<button title="\u05D1\u05DC\u05D5\u05E7 \u05DE\u05E2\u05E8\u05DB\u05EA" disabled style="opacity:.5;cursor:default">\u{1F512}</button>`;
    let actions = '';
    if (showReorder) {
      actions += `<button title="\u05D4\u05D6\u05D6 \u05DC\u05DE\u05E2\u05DC\u05D4" ${i === 0 ? 'disabled' : ''} onclick="moveBlock(${i},-1)">\u25B2</button>`;
      actions += `<button title="\u05D4\u05D6\u05D6 \u05DC\u05DE\u05D8\u05D4" ${i === editedBlocks.length - 1 ? 'disabled' : ''} onclick="moveBlock(${i},1)">\u25BC</button>`;
    }
    actions += editBtn;
    actions += `<button title="\u05E9\u05DB\u05E4\u05DC" onclick="duplicateBlock(${i})">\u{1F4CB}</button>`;
    if (showDelete) actions += `<button title="\u05DE\u05D7\u05E7" onclick="deleteBlock(${i})">\u{1F5D1}</button>`;
    // Inline quick-edit data attribute for supported types
    const inlineEditable = ['hero', 'text', 'cta', 'banner', 'faq'].includes(block.type) && editable;
    const inlineAttr = inlineEditable ? ` ondblclick="startInlineEdit(${i})"` : '';
    return `<div class="studio-block-card${hidden}" data-index="${i}">
      <div class="studio-block-info">
        <span class="studio-block-type-badge">${icon} ${escapeHtml(label)}</span>
        <span class="studio-block-summary"${inlineAttr} title="${inlineEditable ? '\u05DC\u05D7\u05E5 \u05E4\u05E2\u05DE\u05D9\u05D9\u05DD \u05DC\u05E2\u05E8\u05D9\u05DB\u05D4 \u05DE\u05D4\u05D9\u05E8\u05D4' : ''}">${summary}</span>
      </div>
      <div class="studio-block-actions">${actions}</div>
    </div>`;
  }).join('');
}

/** Refresh block list in DOM */
function refreshBlockList() {
  const el = document.getElementById('studio-block-list');
  if (el) el.innerHTML = renderBlockList();
}

/** Get content summary for a block */
function getBlockSummary(block) {
  const d = block.data || {};
  switch (block.type) {
    case 'hero': return d.title || '';
    case 'text': return (d.body || '').replace(/<[^>]*>/g, '').substring(0, 50);
    case 'products': return `${d.filter || 'all'} (${d.limit || '?'})`;
    case 'faq': return `${(d.items || []).length} \u05E9\u05D0\u05DC\u05D5\u05EA`;
    case 'columns': return `${(d.items || []).length} \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD`;
    case 'steps': return `${(d.items || []).length} \u05E9\u05DC\u05D1\u05D9\u05DD`;
    case 'video': return `${(d.videos || []).length} \u05E1\u05E8\u05D8\u05D5\u05E0\u05D9\u05DD`;
    case 'gallery': return `${(d.images || []).length} \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA`;
    case 'cta': return d.text || '';
    case 'contact': return d.section_title || '';
    case 'banner': return d.title || '';
    case 'brands': return d.section_title || '';
    case 'blog_carousel': return d.section_title || '';
    case 'lead_form': return d.title || '';
    case 'reviews': return d.section_title || '';
    default: return block.type;
  }
}

/** Render toolbar */
function renderToolbar() {
  const addBtn = canSee('add_block_button') ? '<button class="btn btn-primary studio-add-block" onclick="addBlock()">+ \u05D4\u05D5\u05E1\u05E3 \u05D1\u05DC\u05D5\u05E7</button>' : '';
  const rollbackBtn = canSee('rollback_button') ? '<button class="btn btn-ghost" onclick="rollbackBlocks()" title="\u05D4\u05D7\u05D6\u05E8 \u05DC\u05D2\u05E8\u05E1\u05D4 \u05E7\u05D5\u05D3\u05DE\u05EA">\u21A9 Rollback</button>' : '';
  const jsonBtn = canSee('json_editor_button') ? '<button class="btn btn-ghost" onclick="showJsonEditor()" title="\u05E2\u05E8\u05D9\u05DB\u05EA JSON">\u{1F4CB} JSON</button>' : '';
  return `<div class="studio-toolbar">${addBtn}<div class="studio-toolbar-right">${rollbackBtn}<button class="btn btn-ghost" onclick="openPreview()" title="\u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4">\u{1F441} Preview</button>${jsonBtn}<button class="btn btn-primary btn-save" id="btn-save-blocks" onclick="saveBlocks()">\u{1F4BE} \u05E9\u05DE\u05D5\u05E8</button></div></div>`;
}

function updateSaveBtn() {
  const btn = document.getElementById('btn-save-blocks');
  if (!btn) return;
  btn.classList.toggle('has-changes', hasUnsavedChanges);
  btn.textContent = hasUnsavedChanges ? '\u{1F4BE} \u05E9\u05DE\u05D5\u05E8 *' : '\u{1F4BE} \u05E9\u05DE\u05D5\u05E8';
}

function markUnsaved() {
  hasUnsavedChanges = true;
  updateSaveBtn();
  // Update SEO score in real time
  if (typeof renderSeoPanel === 'function' && currentPage) renderSeoPanel({ ...currentPage, blocks: editedBlocks }, 'seo-panel-container');
}

/** Duplicate a block (CMS-9) */
function duplicateBlock(index) {
  pushUndo();
  const block = JSON.parse(JSON.stringify(editedBlocks[index]));
  block.id = block.type + '-' + Date.now().toString(36);
  editedBlocks.splice(index + 1, 0, block);
  markUnsaved();
  refreshBlockList();
}

/** Inline quick-edit for simple text fields (CMS-9) */
function startInlineEdit(index) {
  const block = editedBlocks[index];
  if (!block) return;
  const field = block.type === 'hero' ? 'title' : block.type === 'text' ? 'title' : block.type === 'cta' ? 'text' : block.type === 'banner' ? 'title' : block.type === 'faq' ? 'section_title' : null;
  if (!field) return;
  const current = block.data?.[field] || '';
  const card = document.querySelector(`[data-index="${index}"] .studio-block-summary`);
  if (!card) return;
  card.innerHTML = `<input type="text" class="inline-edit-input" value="${escapeAttr(current)}" onkeydown="handleInlineKey(event,${index},'${field}')" onblur="cancelInlineEdit(${index})">`;
  const input = card.querySelector('input');
  if (input) { input.focus(); input.select(); }
}

function handleInlineKey(e, index, field) {
  if (e.key === 'Enter') {
    e.preventDefault();
    pushUndo();
    editedBlocks[index].data[field] = e.target.value;
    markUnsaved();
    refreshBlockList();
  } else if (e.key === 'Escape') { cancelInlineEdit(index); }
}

function cancelInlineEdit(index) { refreshBlockList(); }

/** Open block edit modal */
function openBlockEditor(blockIndex) {
  const block = editedBlocks[blockIndex];
  if (!block) return;
  if (!canEditBlockType(block.type)) { Toast.warning('\u05D1\u05DC\u05D5\u05E7 \u05DE\u05E2\u05E8\u05DB\u05EA \u2014 \u05DC\u05E2\u05E8\u05D9\u05DB\u05D4 \u05E4\u05E0\u05D4 \u05DC\u05DE\u05E0\u05D4\u05DC'); return; }
  const schema = getBlockSchema(block.type);
  if (!schema) { Toast.error('\u05E1\u05D5\u05D2 \u05D1\u05DC\u05D5\u05E7 \u05DC\u05D0 \u05DE\u05D5\u05DB\u05E8: ' + block.type); return; }
  const allowedFields = getAllowedFields(block.type);
  const fields = allowedFields ? schema.fields.filter(f => allowedFields.includes(f.key)) : schema.fields;
  const formHtml = renderBlockForm(fields, block.data || {});
  const settingsHtml = isSuperAdmin() ? renderSettingsForm(block.settings || {}) : '';
  const settingsSection = settingsHtml ? `<div class="studio-settings-section"><button type="button" class="studio-settings-toggle" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('show')">\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DE\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA \u25BE</button><div class="studio-settings-body" id="block-settings-form">${settingsHtml}</div></div>` : '';
  const modal = Modal.show({
    title: `\u05E2\u05E8\u05D9\u05DB\u05EA \u05D1\u05DC\u05D5\u05E7: ${schema.icon} ${schema.label}`, size: 'lg',
    content: `<div id="block-edit-form" class="studio-edit-form">${formHtml}${settingsSection}</div>`,
    footer: `<button class="btn btn-primary" onclick="saveBlockEdit(${blockIndex})">\u05E9\u05DE\u05D5\u05E8</button><button class="btn btn-ghost" onclick="Modal.close()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>`,
    onClose: function() { if (typeof destroyRichtextEditors === 'function') destroyRichtextEditors(); }
  });
  if (typeof initRichtextEditors === 'function') setTimeout(function() { initRichtextEditors(modal.el); }, 50);
}

function saveBlockEdit(blockIndex) {
  const formEl = document.getElementById('block-edit-form');
  const settingsEl = document.getElementById('block-settings-form');
  if (!formEl) return;
  pushUndo();
  const block = editedBlocks[blockIndex];
  const schema = getBlockSchema(block.type);
  const allowedFields = getAllowedFields(block.type);
  const fields = allowedFields ? schema.fields.filter(f => allowedFields.includes(f.key)) : schema.fields;
  const newData = collectBlockFormData(formEl, fields);
  editedBlocks[blockIndex].data = allowedFields ? { ...block.data, ...newData } : newData;
  if (settingsEl) editedBlocks[blockIndex].settings = collectSettingsFormData(settingsEl);
  Modal.close();
  markUnsaved();
  refreshBlockList();
}

/** Move block up/down */
function moveBlock(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= editedBlocks.length) return;
  pushUndo();
  [editedBlocks[index], editedBlocks[target]] = [editedBlocks[target], editedBlocks[index]];
  markUnsaved();
  refreshBlockList();
}

/** Add new block — shows templates + raw types */
let _blockTemplates = null;

async function addBlock() {
  if (!_blockTemplates) {
    try { const { data } = await sb.from('storefront_block_templates').select('*').eq('is_active', true).order('sort_order'); _blockTemplates = data || []; } catch { _blockTemplates = []; }
  }
  const categories = ['products', 'content', 'media', 'marketing', 'layout'];
  const catLabels = { products: '\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD', content: '\u05EA\u05D5\u05DB\u05DF', media: '\u05DE\u05D3\u05D9\u05D4', marketing: '\u05E9\u05D9\u05D5\u05D5\u05E7', layout: '\u05E4\u05E8\u05D9\u05E1\u05D4' };
  const cats = categories.map(c => `<span class="bt-cat ${c === 'products' ? 'active' : ''}" data-cat="${c}" onclick="btFilterCat('${c}')">${catLabels[c]}</span>`).join('') + `<span class="bt-cat" data-cat="all" onclick="btFilterCat('all')">\u05D4\u05DB\u05DC</span>`;
  const templates = _blockTemplates.map(t => `<div class="bt-template" data-cat="${t.category}" onclick="submitAddFromTemplate('${t.id}')"><span class="bt-template-icon">${t.icon || '\u{1F4E6}'}</span><div class="bt-template-info"><span class="bt-template-name">${escapeHtml(t.name)}</span><span class="bt-template-desc">${escapeHtml(t.description || '')}</span></div></div>`).join('');
  const types = getBlockTypeList();
  const options = types.map(t => `<div class="studio-type-option" onclick="submitAddBlock('${t.type}')">${t.icon} ${escapeHtml(t.label)}</div>`).join('');
  const hasTemplates = _blockTemplates.length > 0;
  Modal.show({
    title: '\u05D4\u05D5\u05E1\u05E3 \u05D1\u05DC\u05D5\u05E7', size: 'md',
    content: `${hasTemplates ? `<div class="bt-section-title">\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05DE\u05D5\u05DB\u05E0\u05D5\u05EA</div><div class="bt-cats">${cats}</div><div id="bt-template-list" style="max-height:250px;overflow-y:auto">${templates}</div>` : ''}<div class="bt-section-title">\u05D1\u05DC\u05D5\u05E7 \u05E8\u05D9\u05E7</div><div class="studio-type-grid">${options}</div>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>`
  });
}

function btFilterCat(cat) {
  document.querySelectorAll('.bt-cat').forEach(el => el.classList.toggle('active', el.dataset.cat === cat));
  document.querySelectorAll('#bt-template-list .bt-template').forEach(el => { el.style.display = (cat === 'all' || el.dataset.cat === cat) ? '' : 'none'; });
}

function submitAddFromTemplate(templateId) {
  const tpl = (_blockTemplates || []).find(t => t.id === templateId);
  if (!tpl) return;
  pushUndo();
  editedBlocks.push({ id: tpl.block_type + '-' + Date.now().toString(36), type: tpl.block_type, data: JSON.parse(JSON.stringify(tpl.block_data || {})), settings: JSON.parse(JSON.stringify(tpl.block_settings || {})) });
  Modal.close(); markUnsaved(); refreshBlockList();
}

function submitAddBlock(type) {
  const schema = getBlockSchema(type);
  if (!schema) return;
  pushUndo();
  const defaults = {};
  for (const f of schema.fields) { if (f.type === 'items') defaults[f.key] = []; else if (f.default !== undefined) defaults[f.key] = f.default; else defaults[f.key] = ''; }
  editedBlocks.push({ id: type + '-' + Date.now().toString(36), type, data: defaults, settings: {} });
  Modal.close(); markUnsaved(); refreshBlockList();
}

/** Delete block */
function deleteBlock(index) {
  const block = editedBlocks[index];
  const schema = getBlockSchema(block?.type);
  const label = schema?.label || block?.type || '';
  Modal.confirm({ title: '\u05DE\u05D7\u05D9\u05E7\u05EA \u05D1\u05DC\u05D5\u05E7', message: `\u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D1\u05DC\u05D5\u05E7 "${label}"?`, confirmText: '\u05DE\u05D7\u05E7', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    onConfirm: function() { pushUndo(); editedBlocks.splice(index, 1); markUnsaved(); refreshBlockList(); }
  });
}

/** Save all changes to DB */
async function saveBlocks() {
  if (!currentPage) return;
  try {
    const { error } = await sb.from('storefront_pages').update({ blocks: editedBlocks }).eq('id', currentPage.id).eq('tenant_id', getTenantId());
    if (error) throw error;
    hasUnsavedChanges = false; updateSaveBtn();
    Toast.success('\u05D4\u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05E0\u05E9\u05DE\u05E8\u05D5');
    const { data } = await sb.from('v_admin_pages').select('*').eq('id', currentPage.id).single();
    if (data) currentPage = data;
  } catch (err) { console.error('Save error:', err); Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05D4: ' + (err.message || '')); }
}

/** Rollback to previous version */
function rollbackBlocks() {
  if (!currentPage) return;
  Modal.confirm({ title: '\u05E9\u05D7\u05D6\u05D5\u05E8 \u05D2\u05E8\u05E1\u05D4 \u05E7\u05D5\u05D3\u05DE\u05EA', message: '\u05DC\u05D4\u05D7\u05D6\u05D9\u05E8 \u05DC\u05D2\u05E8\u05E1\u05D4 \u05D4\u05E7\u05D5\u05D3\u05DE\u05EA? \u05D4\u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9\u05D9\u05DD \u05D9\u05D0\u05D1\u05D3\u05D5.', confirmText: '\u05E9\u05D7\u05D6\u05E8', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    onConfirm: async function() {
      try {
        const { error } = await sb.from('storefront_pages').update({ blocks: currentPage.previous_blocks || [] }).eq('id', currentPage.id).eq('tenant_id', getTenantId());
        if (error) throw error;
        Toast.success('\u05D4\u05D2\u05E8\u05E1\u05D4 \u05D4\u05E7\u05D5\u05D3\u05DE\u05EA \u05E9\u05D5\u05D7\u05D6\u05E8\u05D4');
        await loadPageEditor(currentPage.id);
      } catch (err) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D7\u05D6\u05D5\u05E8'); }
    }
  });
}

function openPreview() {
  if (!currentPage) return;
  // Slug is stored with leading slash (e.g., "/summer-sale/") — don't add another
  let slug = currentPage.slug || '/';
  if (slug === '/') slug = '';
  else if (!slug.startsWith('/')) slug = '/' + slug;
  const tenant = TENANT_SLUG || 'prizma';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocal ? 'http://localhost:4321' : 'https://opticup-storefront.vercel.app';
  const preview = currentPage.status !== 'published' ? '&preview=true' : '';
  window.open(`${baseUrl}${slug}?t=${tenant}${preview}`, '_blank');
}

/** Show raw JSON editor */
function showJsonEditor() {
  Modal.show({ title: '\u{1F4CB} \u05E2\u05E8\u05D9\u05DB\u05EA JSON', size: 'lg',
    content: `<textarea id="json-editor-ta" class="studio-json-editor" rows="25">${escapeHtml(JSON.stringify(editedBlocks, null, 2))}</textarea>`,
    footer: `<button class="btn btn-primary" onclick="submitJsonEdit()">\u05D4\u05D7\u05DC</button><button class="btn btn-ghost" onclick="Modal.close()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>` });
}

function submitJsonEdit() {
  const ta = document.getElementById('json-editor-ta');
  if (!ta) return;
  try {
    const parsed = JSON.parse(ta.value);
    if (!Array.isArray(parsed)) { Toast.error('JSON \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E2\u05E8\u05DA'); return; }
    pushUndo(); editedBlocks = parsed; Modal.close(); markUnsaved(); refreshBlockList(); Toast.success('JSON \u05E2\u05D5\u05D3\u05DB\u05DF');
  } catch (e) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05EA JSON: ' + e.message); }
}

document.addEventListener('keydown', (e) => {
  if (!currentPage) return;
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveBlocks(); }
  else if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoLastAction(); }
  else if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); if (canSee('add_block_button')) addBlock(); }
  else if (e.key === 'Escape') { if (typeof Modal !== 'undefined' && Modal.close) Modal.close(); }
});

// Unsaved changes warning on page unload
window.addEventListener('beforeunload', (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } });
