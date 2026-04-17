// modules/storefront/studio-ai-diff.js
// AI diff view + component AI editing (CMS-5)

/**
 * Show diff view modal for page blocks
 */
function showAiDiffView(originalBlocks, newBlocks, explanation, prompt) {
  const changes = computeBlockDiff(originalBlocks, newBlocks);

  let changesHtml = '';
  if (changes.length === 0) {
    changesHtml = '<div class="ai-diff-no-changes">AI לא מצא שינויים לבצע</div>';
  } else {
    changesHtml = changes.map(c => renderDiffChange(c)).join('');
  }

  const content = `<div class="ai-diff-container">
    <div class="ai-diff-prompt">${escapeHtml(prompt)}</div>
    <div class="ai-diff-header">${escapeHtml(explanation)}</div>
    <div class="ai-diff-changes">${changesHtml}</div>
    <div class="ai-diff-actions">
      <button class="btn btn-primary" onclick="applyAiChanges()" ${changes.length === 0 ? 'disabled' : ''}>&#10003; אשר שינויים</button>
      <button class="btn btn-ghost" onclick="closeDiffView()">&#10007; בטל</button>
    </div>
  </div>`;

  const modal = document.getElementById('modal-ai-diff');
  const contentEl = document.getElementById('ai-diff-content');
  if (modal && contentEl) {
    contentEl.innerHTML = content;
    modal.classList.remove('hidden');
    modal._pendingBlocks = newBlocks;
  }
}

/**
 * Compute diff between original and new blocks
 */
function computeBlockDiff(original, updated) {
  const changes = [];
  const origMap = {};
  for (const b of original) origMap[b.id] = b;
  const newMap = {};
  for (const b of updated) newMap[b.id] = b;

  for (const orig of original) {
    if (!newMap[orig.id]) {
      changes.push({ type: 'removed', block: orig });
    } else {
      const diff = diffBlockData(orig, newMap[orig.id]);
      if (diff.length > 0) {
        changes.push({ type: 'modified', block: orig, newBlock: newMap[orig.id], fields: diff });
      }
    }
  }
  for (const nb of updated) {
    if (!origMap[nb.id]) {
      changes.push({ type: 'added', block: nb });
    }
  }
  return changes;
}

/**
 * Diff data fields between two blocks
 */
function diffBlockData(oldBlock, newBlock) {
  const diffs = [];
  const oldData = oldBlock.data || {};
  const newData = newBlock.data || {};
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldVal = JSON.stringify(oldData[key] ?? '');
    const newVal = JSON.stringify(newData[key] ?? '');
    if (oldVal !== newVal) {
      diffs.push({ key, oldVal: oldData[key], newVal: newData[key] });
    }
  }
  return diffs;
}

/**
 * Render a single change card
 */
function renderDiffChange(change) {
  const schema = typeof getBlockSchema === 'function' ? getBlockSchema(change.block.type) : null;
  const icon = schema?.icon || '';
  const label = schema?.label || change.block.type;
  const badge = `${icon} ${escapeHtml(label)}`;

  if (change.type === 'added') {
    return `<div class="ai-diff-block ai-diff-added">
      <div class="ai-diff-block-header"><span class="studio-block-type-badge">${badge}</span> <strong>בלוק חדש</strong></div>
      <div class="ai-diff-field"><span class="ai-diff-new">${escapeHtml(JSON.stringify(change.block.data, null, 2).substring(0, 200))}</span></div>
    </div>`;
  }
  if (change.type === 'removed') {
    return `<div class="ai-diff-block ai-diff-removed">
      <div class="ai-diff-block-header"><span class="studio-block-type-badge">${badge}</span> <strong>בלוק הוסר</strong></div>
    </div>`;
  }
  const fieldsHtml = change.fields.map(f => {
    const oldStr = typeof f.oldVal === 'object' ? JSON.stringify(f.oldVal) : String(f.oldVal ?? '');
    const newStr = typeof f.newVal === 'object' ? JSON.stringify(f.newVal) : String(f.newVal ?? '');
    return `<div class="ai-diff-field">
      <span class="ai-diff-field-name">${escapeHtml(f.key)}</span>
      <span class="ai-diff-old">${escapeHtml(oldStr.substring(0, 150))}</span>
      <span class="ai-diff-arrow">&larr;</span>
      <span class="ai-diff-new">${escapeHtml(newStr.substring(0, 150))}</span>
    </div>`;
  }).join('');

  return `<div class="ai-diff-block ai-diff-modified">
    <div class="ai-diff-block-header"><span class="studio-block-type-badge">${badge}</span> <strong>שונה</strong></div>
    ${fieldsHtml}
  </div>`;
}

/**
 * Apply AI changes to page blocks
 */
function applyAiChanges() {
  const modal = document.getElementById('modal-ai-diff');
  if (!modal?._pendingBlocks) return;

  editedBlocks = JSON.parse(JSON.stringify(modal._pendingBlocks));
  hasUnsavedChanges = true;

  const blockList = document.getElementById('studio-block-list');
  if (blockList) blockList.innerHTML = renderBlockList();
  updateSaveBtn();

  closeDiffView();
  Toast.success('השינויים הוחלו! לחץ שמור לשמירה סופית');
  document.getElementById('ai-prompt-input').value = '';
}

function closeDiffView() {
  const modal = document.getElementById('modal-ai-diff');
  if (modal) {
    modal.classList.add('hidden');
    modal._pendingBlocks = null;
    modal._pendingComponentConfig = null;
    modal._pendingComponentId = null;
  }
}

/**
 * Handle AI prompt for COMPONENTS
 */
async function handleComponentAiPrompt(componentConfig, componentId) {
  const prompt = document.getElementById('ai-component-prompt-input')?.value?.trim();
  if (!prompt) return;

  showComponentAiStatus('loading', 'AI מעבד...');
  const result = await aiEditComponent(componentConfig, prompt);

  if (result.error) {
    showComponentAiStatus('error', result.error);
    return;
  }

  showComponentDiffView(componentConfig, result.config, result.explanation, componentId);
  showComponentAiStatus('hidden');
}

function showComponentAiStatus(type, message) {
  const el = document.getElementById('ai-component-status');
  if (!el) return;
  if (type === 'hidden') { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.className = 'ai-status ai-status-' + type;
  el.textContent = type === 'loading' ? '... ' + message : message;
}

/**
 * Component diff view
 */
function showComponentDiffView(originalConfig, newConfig, explanation, componentId) {
  const diffs = [];
  const allKeys = new Set([...Object.keys(originalConfig), ...Object.keys(newConfig)]);
  for (const key of allKeys) {
    const oldVal = JSON.stringify(originalConfig[key] ?? '');
    const newVal = JSON.stringify(newConfig[key] ?? '');
    if (oldVal !== newVal) {
      diffs.push({ key, oldVal: originalConfig[key], newVal: newConfig[key] });
    }
  }

  let changesHtml = '';
  if (diffs.length === 0) {
    changesHtml = '<div class="ai-diff-no-changes">AI לא מצא שינויים לבצע</div>';
  } else {
    changesHtml = diffs.map(f => {
      const oldStr = typeof f.oldVal === 'object' ? JSON.stringify(f.oldVal) : String(f.oldVal ?? '');
      const newStr = typeof f.newVal === 'object' ? JSON.stringify(f.newVal) : String(f.newVal ?? '');
      return `<div class="ai-diff-field">
        <span class="ai-diff-field-name">${escapeHtml(f.key)}</span>
        <span class="ai-diff-old">${escapeHtml(oldStr)}</span>
        <span class="ai-diff-arrow">&larr;</span>
        <span class="ai-diff-new">${escapeHtml(newStr)}</span>
      </div>`;
    }).join('');
  }

  const modal = document.getElementById('modal-ai-diff');
  const contentEl = document.getElementById('ai-diff-content');
  if (modal && contentEl) {
    contentEl.innerHTML = `<div class="ai-diff-container">
      <div class="ai-diff-header">${escapeHtml(explanation)}</div>
      <div class="ai-diff-changes"><div class="ai-diff-block ai-diff-modified">${changesHtml}</div></div>
      <div class="ai-diff-actions">
        <button class="btn btn-primary" onclick="applyComponentAiChanges()" ${diffs.length === 0 ? 'disabled' : ''}>&#10003; אשר</button>
        <button class="btn btn-ghost" onclick="closeDiffView()">&#10007; בטל</button>
      </div>
    </div>`;
    modal._pendingComponentConfig = newConfig;
    modal._pendingComponentId = componentId;
    modal.classList.remove('hidden');
  }
}

function applyComponentAiChanges() {
  const modal = document.getElementById('modal-ai-diff');
  if (!modal?._pendingComponentConfig || !modal._pendingComponentId) return;

  const newConfig = modal._pendingComponentConfig;
  const comp = studioComponents.find(c => c.id === modal._pendingComponentId);
  if (comp) comp.config = newConfig;

  closeDiffView();
  Modal.close();
  Toast.success('רכיב עודכן! שומר...');

  const compId = modal._pendingComponentId;
  sb.from('storefront_components')
    .update({ config: newConfig })
    .eq('id', compId).eq('tenant_id', getTenantId())
    .then(({ error }) => {
      if (error) { Toast.error('שגיאה בשמירה: ' + error.message); return; }
      Toast.success('הרכיב נשמר');
      loadComponents();
    });
}
