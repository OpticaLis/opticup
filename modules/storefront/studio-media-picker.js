// modules/storefront/studio-media-picker.js
// Reusable media picker modal — select images from media_library
// Provides: openMediaPicker({ folder?, multi?, onSelect })
// Used by: studio-brands.js (gallery section) and future consumers

let _pickerItems = [];
let _pickerSelected = new Set();
let _pickerSignedUrls = {};
let _pickerFilter = { folder: 'models', search: '' };
let _pickerCallback = null;
let _pickerMulti = false;
let _pickerSearchTimer = null;

const PICKER_FOLDERS = [
  { value: 'all', label: 'כל התיקיות' },
  { value: 'general', label: 'כללי' },
  { value: 'campaigns', label: 'קמפיינים' },
  { value: 'store', label: 'חנות' },
  { value: 'products', label: 'מוצרים' },
  { value: 'blog', label: 'בלוג' },
  { value: 'logos', label: 'לוגו מותגים' },
  { value: 'models', label: 'דוגמנים' }
];

// ========== PUBLIC API ==========

/**
 * Open the media picker modal.
 * @param {Object} opts
 * @param {string} [opts.folder='models'] - Default folder filter
 * @param {boolean} [opts.multi=false] - Allow multi-select
 * @param {Function} opts.onSelect - Callback: receives array of { id, storage_path, filename }
 */
function openMediaPicker(opts = {}) {
  _pickerFilter.folder = opts.folder || 'models';
  _pickerFilter.search = '';
  _pickerMulti = opts.multi !== false;
  _pickerCallback = opts.onSelect || null;
  _pickerSelected.clear();
  _pickerItems = [];

  const folderOpts = PICKER_FOLDERS
    .map(f => `<option value="${f.value}" ${_pickerFilter.folder === f.value ? 'selected' : ''}>${f.label}</option>`)
    .join('');

  const content = `
    <div class="media-picker-toolbar" style="display:flex; gap:8px; margin-bottom:12px; align-items:center;">
      <select id="mp-folder" class="brand-editor-input" style="width:140px; flex-shrink:0;"
        onchange="onPickerFolderChange(this.value)">${folderOpts}</select>
      <input type="text" id="mp-search" class="brand-editor-input" style="flex:1;"
        placeholder="חיפוש לפי שם קובץ, תגיות..." oninput="onPickerSearchInput(this.value)" />
      <span id="mp-count" style="font-size:.8rem; color:var(--g400); white-space:nowrap;"></span>
    </div>
    <div id="mp-grid" style="min-height:200px; max-height:400px; overflow-y:auto;">
      <div class="studio-empty">טוען...</div>
    </div>
    ${_pickerMulti ? `<div id="mp-selection-bar" style="margin-top:8px; font-size:.85rem; color:var(--g500);">נבחרו: 0</div>` : ''}
  `;

  Modal.show({
    title: 'בחירת תמונות ממדיה',
    size: 'lg',
    cssClass: 'media-picker-modal',
    content: content,
    footer: `
      <button class="btn btn-primary" onclick="confirmPickerSelection()">
        ${_pickerMulti ? '✓ הוסף נבחרים' : '✓ בחר'}
      </button>
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>
    `
  });

  loadPickerItems();
}

// ========== LOAD & RENDER ==========

async function loadPickerItems() {
  const grid = document.getElementById('mp-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="studio-empty">טוען מדיה...</div>';

  try {
    let query = sb.from('media_library')
      .select('id, storage_path, original_filename, filename, title, alt_text, tags, folder, created_at')
      .eq('tenant_id', getTenantId())
      .eq('is_deleted', false);

    if (_pickerFilter.folder !== 'all') {
      query = query.eq('folder', _pickerFilter.folder);
    }

    if (_pickerFilter.search) {
      const s = _pickerFilter.search;
      query = query.or(`title.ilike.%${s}%,original_filename.ilike.%${s}%,alt_text.ilike.%${s}%,filename.ilike.%${s}%`);
    }

    query = query.order('created_at', { ascending: false }).limit(200);

    const { data, error } = await query;
    if (error) throw error;

    _pickerItems = data || [];
    await preloadPickerSignedUrls(_pickerItems);
    renderPickerGrid();
  } catch (err) {
    console.error('Picker load error:', err);
    if (grid) grid.innerHTML = '<div class="studio-empty">שגיאה בטעינת מדיה</div>';
  }
}

function renderPickerGrid() {
  const grid = document.getElementById('mp-grid');
  const countEl = document.getElementById('mp-count');
  if (!grid) return;

  if (countEl) countEl.textContent = `${_pickerItems.length} תמונות`;

  if (!_pickerItems.length) {
    grid.innerHTML = '<div class="studio-empty">לא נמצאו תמונות</div>';
    return;
  }

  grid.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:8px;">
    ${_pickerItems.map(item => {
      const url = _pickerSignedUrls[item.storage_path] || '';
      const isSelected = _pickerSelected.has(item.id);
      const label = escapeHtml(item.title || item.original_filename || item.filename || '');
      return `<div class="mp-item ${isSelected ? 'mp-selected' : ''}"
        data-id="${item.id}" onclick="togglePickerItem('${item.id}')"
        style="position:relative; cursor:pointer; border:2px solid ${isSelected ? '#c9a555' : '#e5e5e5'}; border-radius:8px; overflow:hidden; aspect-ratio:1; background:#f9f9f9;">
        ${url ? `<img src="${escapeAttr(url)}" alt="${escapeAttr(label)}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" />` : '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#999; font-size:.75rem;">אין תצוגה</div>'}
        ${isSelected ? '<div style="position:absolute; top:4px; right:4px; width:22px; height:22px; background:#c9a555; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:.8rem; font-weight:700;">✓</div>' : ''}
        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,.55); color:#fff; font-size:.65rem; padding:2px 4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${label}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ========== SIGNED URLS ==========

async function getPickerSignedUrl(storagePath) {
  if (_pickerSignedUrls[storagePath]) return _pickerSignedUrls[storagePath];
  // External URLs (e.g. old WordPress images) — use directly, no signed URL needed
  if (storagePath.startsWith('http')) {
    _pickerSignedUrls[storagePath] = storagePath;
    return storagePath;
  }
  try {
    const { data, error } = await sb.storage.from('media-library').createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) return '';
    _pickerSignedUrls[storagePath] = data.signedUrl;
    return data.signedUrl;
  } catch { return ''; }
}

async function preloadPickerSignedUrls(items) {
  const uncached = items.filter(i => i.storage_path && !_pickerSignedUrls[i.storage_path]);
  if (!uncached.length) return;
  // Chunk requests to avoid overwhelming the browser (10 at a time)
  for (let i = 0; i < uncached.length; i += 10) {
    const chunk = uncached.slice(i, i + 10);
    await Promise.all(chunk.map(item => getPickerSignedUrl(item.storage_path)));
  }
}

// ========== INTERACTION ==========

function togglePickerItem(id) {
  if (_pickerMulti) {
    if (_pickerSelected.has(id)) _pickerSelected.delete(id);
    else _pickerSelected.add(id);
  } else {
    _pickerSelected.clear();
    _pickerSelected.add(id);
  }
  renderPickerGrid();
  updatePickerSelectionBar();
}

function updatePickerSelectionBar() {
  const bar = document.getElementById('mp-selection-bar');
  if (bar) bar.textContent = `נבחרו: ${_pickerSelected.size}`;
}

function onPickerFolderChange(val) {
  _pickerFilter.folder = val;
  _pickerSelected.clear();
  loadPickerItems();
}

function onPickerSearchInput(val) {
  clearTimeout(_pickerSearchTimer);
  _pickerSearchTimer = setTimeout(() => {
    _pickerFilter.search = val.trim();
    loadPickerItems();
  }, 300);
}

function confirmPickerSelection() {
  if (!_pickerSelected.size) {
    Toast.warning('לא נבחרו תמונות');
    return;
  }

  const selected = _pickerItems
    .filter(item => _pickerSelected.has(item.id))
    .map(item => ({
      id: item.id,
      storage_path: item.storage_path,
      filename: item.original_filename || item.filename || ''
    }));

  Modal.close();

  if (_pickerCallback) {
    _pickerCallback(selected);
  }
}

// ========== UUID RESOLUTION HELPER ==========

/**
 * Resolve an array of media_library UUIDs to their storage_paths + signed URLs.
 * Used by gallery preview to display images from UUID references.
 * @param {string[]} uuids - Array of media_library IDs
 * @returns {Promise<Array<{id, storage_path, signedUrl}>>}
 */
async function resolveMediaUUIDs(uuids) {
  if (!uuids || !uuids.length) return [];

  // Filter valid UUIDs (36-char format)
  const validIds = uuids.filter(u => typeof u === 'string' && u.length >= 32);
  if (!validIds.length) return [];

  try {
    const { data, error } = await sb.from('media_library')
      .select('id, storage_path, original_filename')
      .eq('tenant_id', getTenantId())
      .eq('is_deleted', false)
      .in('id', validIds);

    if (error) throw error;

    const items = data || [];
    await preloadPickerSignedUrls(items);

    // Return in same order as input
    return validIds.map(uuid => {
      const item = items.find(i => i.id === uuid);
      if (!item) return null;
      return {
        id: item.id,
        storage_path: item.storage_path,
        signedUrl: _pickerSignedUrls[item.storage_path] || ''
      };
    }).filter(Boolean);
  } catch (err) {
    console.error('resolveMediaUUIDs error:', err);
    return [];
  }
}

/**
 * Check if a value looks like a UUID (media_library ID) vs a storage path.
 * @param {string} val
 * @returns {boolean}
 */
function isMediaUUID(val) {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}
