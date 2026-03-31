// modules/storefront/studio-form-renderer.js
// Renders edit forms from block schemas (CMS-2)

function escapeAttr(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Render a form for a block type
 * @param {Array} fields - Schema fields array
 * @param {Object} data - Current block data
 * @param {string} prefix - Field name prefix (for nested items)
 * @returns {string} HTML string
 */
function renderBlockForm(fields, data, prefix = '') {
  let html = '';
  // Determine selection_mode for showIf
  const selMode = data.selection_mode || 'filter';
  for (const field of fields) {
    const fullKey = prefix ? `${prefix}.${field.key}` : field.key;
    const val = data[field.key] ?? field.default ?? '';
    const req = field.required ? ' studio-field-required' : '';
    // showIf: hide field if selection_mode doesn't match
    const hidden = field.showIf && field.showIf !== selMode ? ' style="display:none"' : '';
    const showIfAttr = field.showIf ? ` data-show-if="${escapeAttr(field.showIf)}"` : '';
    html += `<div class="studio-field-group${req}"${hidden}${showIfAttr}>`;

    if (field.type !== 'toggle') {
      html += `<label for="sf-${fullKey}">${escapeAttr(field.label)}</label>`;
    }

    switch (field.type) {
      case 'text':
        html += `<input type="text" id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" value="${escapeAttr(val)}" placeholder="${escapeAttr(field.placeholder || '')}">`;
        break;

      case 'textarea':
        html += `<textarea id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" rows="${field.rows || 5}" placeholder="${escapeAttr(field.placeholder || '')}">${escapeAttr(val)}</textarea>`;
        break;

      case 'url':
        html += `<input type="url" id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" value="${escapeAttr(val)}" placeholder="${escapeAttr(field.placeholder || 'https://')}">`;
        break;

      case 'number':
        html += `<input type="number" id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" value="${escapeAttr(val)}" ${field.min != null ? `min="${field.min}"` : ''} ${field.max != null ? `max="${field.max}"` : ''}>`;
        break;

      case 'range':
        html += `<div class="studio-range-wrap">
          <input type="range" id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" value="${val}" min="${field.min || 0}" max="${field.max || 1}" step="${field.step || 0.1}" oninput="this.nextElementSibling.textContent=this.value">
          <span class="studio-range-val">${val}</span></div>`;
        break;

      case 'select': {
        const changeHandler = field.key === 'selection_mode' ? ` onchange="studioToggleShowIf(this)"` : '';
        html += `<select id="sf-${fullKey}" class="studio-field" data-key="${fullKey}"${changeHandler}>`;
        for (const opt of (field.options || [])) {
          const sel = String(val) === String(opt.value) ? ' selected' : '';
          html += `<option value="${escapeAttr(opt.value)}"${sel}>${escapeAttr(opt.label)}</option>`;
        }
        html += `</select>`;
        break;
      }

      case 'toggle':
        html += `<label class="studio-toggle"><input type="checkbox" id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" ${val ? 'checked' : ''}> ${escapeAttr(field.label)}</label>`;
        break;

      case 'image':
        html += `<div class="studio-image-field">
          <input type="url" id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" value="${escapeAttr(val)}" placeholder="https://..." oninput="studioUpdatePreview(this)">
          <div class="studio-image-preview">${val ? `<img src="${escapeAttr(val)}" alt="preview">` : '<span>אין תמונה</span>'}</div></div>`;
        break;

      case 'items':
        html += renderItemsField(field, Array.isArray(val) ? val : [], fullKey);
        break;

      case 'product_picker': {
        const count = Array.isArray(val) ? val.length : 0;
        html += `<input type="hidden" id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" data-type="product_picker" value='${escapeAttr(JSON.stringify(val || []))}'>`;
        html += `<button type="button" class="btn btn-sm btn-secondary" onclick="studioOpenProductPicker('${fullKey}')">בחר מוצרים (<span id="pp-field-count-${fullKey}">${count}</span> נבחרו)</button>`;
        if (count > 0) {
          html += `<div id="pp-field-summary-${fullKey}" class="mt-2" style="font-size:.82rem;color:var(--g400)">${(val || []).join(', ')}</div>`;
        } else {
          html += `<div id="pp-field-summary-${fullKey}" class="mt-2" style="font-size:.82rem;color:var(--g400)"></div>`;
        }
        break;
      }

      case 'json':
        html += `<textarea id="sf-${fullKey}" class="studio-field studio-json" data-key="${fullKey}" rows="${field.rows || 8}">${escapeAttr(typeof val === 'string' ? val : JSON.stringify(val, null, 2))}</textarea>`;
        break;

      default:
        html += `<input type="text" id="sf-${fullKey}" class="studio-field" data-key="${fullKey}" value="${escapeAttr(val)}">`;
    }
    html += `</div>`;
  }
  return html;
}

/**
 * Render repeatable items field
 */
function renderItemsField(field, items, fullKey) {
  let html = `<div class="studio-items-container" data-key="${fullKey}" data-item-fields='${escapeAttr(JSON.stringify(field.itemFields))}'>`;
  items.forEach((item, i) => {
    html += renderSingleItem(field.itemFields, item, fullKey, i);
  });
  html += `<button type="button" class="studio-item-add" onclick="studioAddItem(this.parentElement)">+ הוסף</button>`;
  html += `</div>`;
  return html;
}

function renderSingleItem(itemFields, item, parentKey, index) {
  let html = `<div class="studio-item-card" data-index="${index}">`;
  html += `<div class="studio-item-header"><span>#${index + 1}</span><button type="button" class="studio-item-remove" onclick="studioRemoveItem(this)">🗑 הסר</button></div>`;
  html += renderBlockForm(itemFields, item || {}, `${parentKey}.${index}`);
  html += `</div>`;
  return html;
}

/**
 * Add new empty item to an items container
 */
function studioAddItem(container) {
  const itemFields = JSON.parse(container.dataset.itemFields);
  const parentKey = container.dataset.key;
  const cards = container.querySelectorAll('.studio-item-card');
  const index = cards.length;
  const itemHtml = renderSingleItem(itemFields, {}, parentKey, index);
  container.querySelector('.studio-item-add').insertAdjacentHTML('beforebegin', itemHtml);
}

/**
 * Remove item from items container
 */
function studioRemoveItem(btn) {
  const card = btn.closest('.studio-item-card');
  const container = card.closest('.studio-items-container');
  card.remove();
  // Re-index remaining cards
  container.querySelectorAll('.studio-item-card').forEach((c, i) => {
    c.dataset.index = i;
    c.querySelector('.studio-item-header span').textContent = `#${i + 1}`;
  });
}

/**
 * Update image preview on input change
 */
function studioUpdatePreview(input) {
  const preview = input.nextElementSibling;
  if (!preview) return;
  const url = input.value.trim();
  preview.innerHTML = url ? `<img src="${escapeAttr(url)}" alt="preview" onerror="this.outerHTML='<span>תמונה לא נמצאה</span>'">` : '<span>אין תמונה</span>';
}

/**
 * Collect form values back into a data object
 * @param {HTMLElement} container - Form container element
 * @param {Array} fields - Schema fields array
 * @param {string} prefix - Field name prefix
 * @returns {Object} Updated data object
 */
function collectBlockFormData(container, fields, prefix = '') {
  const data = {};
  for (const field of fields) {
    const fullKey = prefix ? `${prefix}.${field.key}` : field.key;

    if (field.type === 'items') {
      const itemContainer = container.querySelector(`.studio-items-container[data-key="${fullKey}"]`);
      if (!itemContainer) { data[field.key] = []; continue; }
      const cards = itemContainer.querySelectorAll(':scope > .studio-item-card');
      data[field.key] = Array.from(cards).map((card, i) => {
        return collectBlockFormData(card, field.itemFields, `${fullKey}.${i}`);
      });
      continue;
    }

    const el = container.querySelector(`[data-key="${fullKey}"]`);
    if (!el) { data[field.key] = field.default ?? ''; continue; }

    if (field.type === 'product_picker') {
      try { data[field.key] = JSON.parse(el.value || '[]'); } catch { data[field.key] = []; }
      continue;
    }

    if (field.type === 'toggle') {
      data[field.key] = el.checked;
    } else if (field.type === 'number' || field.type === 'range') {
      data[field.key] = el.value === '' ? (field.default ?? '') : Number(el.value);
    } else if (field.type === 'json') {
      try { data[field.key] = JSON.parse(el.value); } catch { data[field.key] = el.value; }
    } else if (field.type === 'select' && field.options?.some(o => typeof o.value === 'number')) {
      data[field.key] = isNaN(Number(el.value)) ? el.value : Number(el.value);
    } else {
      data[field.key] = el.value;
    }
  }
  return data;
}

/**
 * Render settings form (shared by all blocks)
 */
function renderSettingsForm(settings) {
  return renderBlockForm(BLOCK_SETTINGS_SCHEMA, settings || {}, 'settings');
}

/**
 * Collect settings form data
 */
function collectSettingsFormData(container) {
  return collectBlockFormData(container, BLOCK_SETTINGS_SCHEMA, 'settings');
}

/**
 * Toggle showIf field visibility based on selection_mode value
 */
function studioToggleShowIf(selectEl) {
  const mode = selectEl.value;
  const form = selectEl.closest('.studio-edit-form') || selectEl.closest('.modal-body');
  if (!form) return;
  form.querySelectorAll('[data-show-if]').forEach(el => {
    el.style.display = el.dataset.showIf === mode ? '' : 'none';
  });
}

/**
 * Open product picker from form field
 */
function studioOpenProductPicker(fieldKey) {
  const input = document.getElementById(`sf-${fieldKey}`);
  if (!input) return;
  let current = [];
  try { current = JSON.parse(input.value || '[]'); } catch { current = []; }
  openProductPicker(current, (barcodes) => {
    input.value = JSON.stringify(barcodes);
    const countEl = document.getElementById(`pp-field-count-${fieldKey}`);
    if (countEl) countEl.textContent = barcodes.length;
    const summaryEl = document.getElementById(`pp-field-summary-${fieldKey}`);
    if (summaryEl) summaryEl.textContent = barcodes.join(', ');
  });
}
