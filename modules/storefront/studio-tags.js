// modules/storefront/studio-tags.js
// Tags system for Studio — load, filter, edit, manage tags

let studioTags = []; // { id, name, color, sort_order }
let studioTagsLoaded = false;
let pageFilterTag = 'all'; // 'all' or tag name

/** Load predefined tags for tenant */
async function loadStudioTags() {
  try {
    const { data, error } = await sb.from('storefront_page_tags')
      .select('id, name, color, sort_order')
      .eq('tenant_id', getTenantId())
      .order('sort_order');
    if (error) throw error;
    studioTags = data || [];
    studioTagsLoaded = true;
  } catch (err) {
    console.error('loadStudioTags error:', err);
    studioTags = [];
  }
}

/** Get tag color by name */
function getTagColor(tagName) {
  const tag = studioTags.find(t => t.name === tagName);
  return tag?.color || '#6b7280';
}

/** Render tag badge HTML */
function tagBadgeHtml(tagName) {
  const color = getTagColor(tagName);
  // Light background version of the color
  return `<span class="studio-tag-badge" style="--tag-color:${color};">${escapeHtml(tagName)}</span>`;
}

/** Render tag badges for an array of tag names */
function renderTagBadges(tags) {
  if (!tags || !tags.length) return '';
  return `<div class="studio-tag-row">${tags.map(t => tagBadgeHtml(t)).join('')}</div>`;
}

/** Render tag filter dropdown (returns HTML string) */
function renderTagFilterDropdown() {
  if (!studioTags.length) return '';

  // Count pages per tag
  const tagCounts = {};
  for (const p of studioPages) {
    for (const t of (p.tags || [])) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  let options = `<option value="all">כל התגיות</option>`;
  options += studioTags.map(t => {
    const count = tagCounts[t.name] || 0;
    const selected = pageFilterTag === t.name ? 'selected' : '';
    return `<option value="${escapeAttr(t.name)}" ${selected}>${t.name} (${count})</option>`;
  }).join('');

  return `<select class="studio-field page-filter-select" onchange="pageFilterTag=this.value;renderFilteredPageList()" style="max-width:130px;">
    ${options}
  </select>
  <button type="button" class="page-filter-select" style="background:none; border:1px solid var(--g200); border-radius:6px; padding:4px 8px; cursor:pointer; font-size:.75rem; color:var(--g500);" onclick="openTagManager()" title="ניהול תגיות">⚙️</button>`;
}

/** Apply tag filter to page list */
function filterByTag(pages) {
  if (pageFilterTag === 'all') return pages;
  return pages.filter(p => (p.tags || []).includes(pageFilterTag));
}

/** Render tag checkboxes for page settings modal */
function renderTagCheckboxes(selectedTags) {
  const tags = selectedTags || [];
  return studioTags.map(t => {
    const checked = tags.includes(t.name) ? 'checked' : '';
    return `<label style="display:inline-flex; align-items:center; gap:4px; margin-left:12px; cursor:pointer; font-size:.85rem;">
      <input type="checkbox" class="ps-tag-check" value="${escapeAttr(t.name)}" ${checked} />
      <span style="width:10px; height:10px; border-radius:50%; background:${t.color}; display:inline-block;"></span>
      ${escapeHtml(t.name)}
    </label>`;
  }).join('');
}

/** Get checked tags from page settings modal */
function getCheckedTags() {
  return Array.from(document.querySelectorAll('.ps-tag-check:checked')).map(cb => cb.value);
}

// ═══════════════════════════════════════════════════
// TAG MANAGER MODAL
// ═══════════════════════════════════════════════════

const TAG_PRESET_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#c9a555'];

function openTagManager() {
  let html = `<div id="tag-manager-list">`;
  html += studioTags.map(t => `
    <div class="tag-manager-row" data-id="${t.id}">
      <span style="width:16px; height:16px; border-radius:50%; background:${t.color}; display:inline-block; flex-shrink:0;"></span>
      <span style="flex:1; font-weight:600; font-size:.9rem;">${escapeHtml(t.name)}</span>
      <button type="button" class="btn btn-sm btn-ghost" onclick="deleteTag('${t.id}', '${escapeAttr(t.name)}')" style="color:#ef4444; font-size:.75rem;">מחק</button>
    </div>
  `).join('');
  html += `</div>

  <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--g200);">
    <h4 style="font-weight:700; font-size:.85rem; margin-bottom:8px;">הוסף תגית חדשה</h4>
    <div style="display:flex; gap:8px; align-items:center;">
      <input type="text" id="new-tag-name" class="studio-field" placeholder="שם תגית" style="flex:1;" />
      <div style="display:flex; gap:4px;" id="new-tag-colors">
        ${TAG_PRESET_COLORS.map((c, i) => `<button type="button" class="tag-color-btn ${i === 0 ? 'active' : ''}" data-color="${c}" style="width:24px; height:24px; border-radius:50%; background:${c}; border:2px solid transparent; cursor:pointer;" onclick="selectTagColor(this)"></button>`).join('')}
      </div>
      <button type="button" class="btn btn-sm btn-primary" onclick="addNewTag()">הוסף</button>
    </div>
  </div>`;

  Modal.show({
    title: '⚙️ ניהול תגיות',
    size: 'sm',
    content: html,
    footer: '<button class="btn btn-ghost" onclick="Modal.close()">סגור</button>'
  });
}

function selectTagColor(btn) {
  document.querySelectorAll('.tag-color-btn').forEach(b => b.style.borderColor = 'transparent');
  btn.style.borderColor = '#000';
  btn.classList.add('active');
}

async function addNewTag() {
  const name = document.getElementById('new-tag-name')?.value.trim();
  if (!name) { Toast.warning('יש להזין שם תגית'); return; }

  const activeColor = document.querySelector('.tag-color-btn.active');
  const color = activeColor?.dataset.color || '#6b7280';

  try {
    const { error } = await sb.from('storefront_page_tags').insert({
      tenant_id: getTenantId(),
      name,
      color,
      sort_order: studioTags.length + 1
    });
    if (error) throw error;
    Toast.success('תגית נוספה');
    Modal.close();
    await loadStudioTags();
    renderFilteredPageList();
  } catch (err) {
    Toast.error('שגיאה בהוספת תגית: ' + (err.message || ''));
  }
}

async function deleteTag(tagId, tagName) {
  Modal.confirm({
    title: 'מחיקת תגית',
    message: `למחוק את התגית "${tagName}"? התגית תוסר מהרשימה אך לא מעמודים שכבר מסומנים.`,
    confirmText: 'מחק',
    cancelText: 'ביטול',
    danger: true,
    onConfirm: async function() {
      try {
        await sb.from('storefront_page_tags').delete().eq('id', tagId);
        Toast.success('תגית נמחקה');
        await loadStudioTags();
        renderFilteredPageList();
      } catch (err) {
        Toast.error('שגיאה במחיקה');
      }
    }
  });
}
