// modules/storefront/studio-media.js
// Media Library — upload, organize, browse images with WebP conversion
// Storage bucket: media-library (private)
// Studio uses signed URLs for preview; storefront uses /api/image/ proxy

let mediaItems = [];
let mediaLoaded = false;
let mediaSignedUrls = {}; // cache: id → signedUrl (used only for edit modal)
let mediaViewMode = 'grid'; // 'grid' | 'list'
let mediaFilter = { folder: 'all', sort: 'newest', search: '', date: 'all' };
let mediaSearchTimer = null;
let _mediaPage = 0;
let _mediaHasMore = false;
let _mediaLoading = false;
let _mediaTotalCount = 0;
const MEDIA_PAGE_SIZE = 30;

const MEDIA_FOLDERS = [
  { value: 'general', label: 'כללי' },
  { value: 'campaigns', label: 'קמפיינים' },
  { value: 'store', label: 'חנות' },
  { value: 'products', label: 'מוצרים' },
  { value: 'blog', label: 'בלוג' },
  { value: 'logos', label: 'לוגו מותגים' },
  { value: 'models', label: 'דוגמנים' }
];

const MEDIA_BUCKET = 'media-library';
const MEDIA_TABLE = 'media_library';

// ========== SIGNED URLS ==========

async function getMediaSignedUrl(storagePath) {
  if (mediaSignedUrls[storagePath]) return mediaSignedUrls[storagePath];
  try {
    const { data, error } = await sb.storage.from(MEDIA_BUCKET).createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) return '';
    mediaSignedUrls[storagePath] = data.signedUrl;
    return data.signedUrl;
  } catch { return ''; }
}

async function preloadMediaSignedUrls(items) {
  const uncached = items.filter(i => !mediaSignedUrls[i.storage_path]);
  if (!uncached.length) return;
  // Batch: Supabase JS v2 doesn't have batch signed URLs, so parallel fetch
  await Promise.all(uncached.map(i => getMediaSignedUrl(i.storage_path)));
}

// ========== LOAD ==========

async function loadMediaLibrary(reset) {
  if (_mediaLoading) return;
  _mediaLoading = true;

  const container = document.getElementById('studio-media-content');
  if (!container) { _mediaLoading = false; return; }

  if (reset !== false) {
    // Default: full reset (backwards compatible with existing callers)
    mediaItems = [];
    _mediaPage = 0;
    container.innerHTML = '<div class="studio-empty">טוען מדיה...</div>';
  }

  try {
    const from = _mediaPage * MEDIA_PAGE_SIZE;
    const to = from + MEDIA_PAGE_SIZE - 1;

    // Helper: apply shared filters to any query builder
    function applyMediaFilters(q) {
      q = q.eq('tenant_id', getTenantId()).eq('is_deleted', false);
      if (mediaFilter.folder !== 'all') q = q.eq('folder', mediaFilter.folder);
      if (mediaFilter.search) {
        const s = mediaFilter.search;
        q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%,alt_text.ilike.%${s}%,original_filename.ilike.%${s}%`);
      }
      if (mediaFilter.date === 'this_month') {
        const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
        q = q.gte('created_at', start.toISOString());
      } else if (mediaFilter.date === 'last_month') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
      }
      return q;
    }

    // On reset: fetch exact total count (single lightweight query)
    if (reset !== false) {
      const countQ = applyMediaFilters(sb.from(MEDIA_TABLE).select('id', { count: 'exact', head: true }));
      const { count: totalCount } = await countQ;
      _mediaTotalCount = totalCount || 0;
    }

    // Data query with pagination + sort
    let query = applyMediaFilters(sb.from(MEDIA_TABLE).select('*'));

    if (mediaFilter.sort === 'newest') query = query.order('created_at', { ascending: false });
    else if (mediaFilter.sort === 'oldest') query = query.order('created_at', { ascending: true });
    else if (mediaFilter.sort === 'name') query = query.order('title', { ascending: true });
    else if (mediaFilter.sort === 'size') query = query.order('file_size', { ascending: false });

    query = query.range(from, to);

    const { data, error } = await query;
    if (error) throw error;

    const newItems = data || [];
    _mediaHasMore = newItems.length === MEDIA_PAGE_SIZE;
    mediaItems = reset === false ? [...mediaItems, ...newItems] : newItems;
    _mediaPage++;
    mediaLoaded = true;

    renderMediaLibrary();
  } catch (err) {
    console.error('Media load error:', err);
    if (reset !== false) container.innerHTML = '<div class="studio-empty">שגיאה בטעינת מדיה</div>';
  } finally {
    _mediaLoading = false;
  }
}

// ========== RENDER ==========

function renderMediaLibrary() {
  const container = document.getElementById('studio-media-content');
  if (!container) return;

  const folderOptions = [{ value: 'all', label: 'כל התיקיות' }, ...MEDIA_FOLDERS]
    .map(f => `<option value="${f.value}" ${mediaFilter.folder === f.value ? 'selected' : ''}>${f.label}</option>`)
    .join('');

  const sortOptions = [
    { value: 'newest', label: 'חדש ביותר' },
    { value: 'oldest', label: 'ישן ביותר' },
    { value: 'name', label: 'לפי שם' },
    { value: 'size', label: 'לפי גודל' }
  ].map(s => `<option value="${s.value}" ${mediaFilter.sort === s.value ? 'selected' : ''}>${s.label}</option>`)
    .join('');

  const dateOptions = [
    { value: 'all', label: 'כל התאריכים' },
    { value: 'this_month', label: 'החודש' },
    { value: 'last_month', label: 'חודש שעבר' }
  ].map(d => `<option value="${d.value}" ${mediaFilter.date === d.value ? 'selected' : ''}>${d.label}</option>`)
    .join('');

  const gridActive = mediaViewMode === 'grid' ? 'media-view-btn-active' : '';
  const listActive = mediaViewMode === 'list' ? 'media-view-btn-active' : '';

  const countLabel = _mediaTotalCount > 0 ? `${_mediaTotalCount}` : `${mediaItems.length}`;
  const itemsHtml = mediaItems.length === 0
    ? '<div class="studio-empty" style="grid-column:1/-1;">אין תמונות</div>'
    : mediaViewMode === 'grid'
      ? mediaItems.map(renderMediaThumbGrid).join('')
      : mediaItems.map(renderMediaThumbList).join('');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="margin:0;font-size:1.2rem;font-weight:700;">🖼️ מדיה <span style="font-size:.85rem;font-weight:400;color:var(--g400);">(${countLabel})</span></h2>
      <button class="btn btn-sm btn-primary" onclick="document.getElementById('media-file-input').click()">+ העלאה</button>
      <input type="file" id="media-file-input" multiple accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" style="display:none" onchange="handleMediaUpload(this.files)">
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
      <input type="text" id="media-search" placeholder="🔍 חיפוש..." value="${mediaFilter.search}"
        style="flex:1;min-width:140px;padding:8px 12px;border:1px solid var(--g200);border-radius:8px;font-size:.9rem;font-family:inherit;"
        oninput="onMediaSearch(this.value)">
      <select onchange="mediaFilter.folder=this.value;loadMediaLibrary()" class="media-filter-select">
        ${folderOptions}
      </select>
      <select onchange="mediaFilter.date=this.value;loadMediaLibrary()" class="media-filter-select">
        ${dateOptions}
      </select>
      <select onchange="mediaFilter.sort=this.value;loadMediaLibrary()" class="media-filter-select">
        ${sortOptions}
      </select>
      <div class="media-view-toggle">
        <button class="media-view-btn ${gridActive}" onclick="mediaViewMode='grid';renderMediaLibrary()" title="תצוגת רשת">⊞</button>
        <button class="media-view-btn ${listActive}" onclick="mediaViewMode='list';renderMediaLibrary()" title="תצוגת רשימה">☰</button>
      </div>
    </div>

    <div id="media-upload-progress" style="display:none;margin-bottom:12px;"></div>

    <div id="media-scroll-wrap" style="max-height:500px; overflow-y:auto;">
      <div id="media-grid" class="${mediaViewMode === 'grid' ? 'media-grid' : 'media-list'}">
        ${itemsHtml}
      </div>
      ${_mediaHasMore ? '<div style="text-align:center; padding:12px; color:var(--g400); font-size:.85rem;">גולל למטה לעוד...</div>' : ''}
    </div>

    <div id="media-dropzone" class="media-dropzone"
      ondragover="event.preventDefault();this.classList.add('dragover')"
      ondragleave="this.classList.remove('dragover')"
      ondrop="event.preventDefault();this.classList.remove('dragover');handleMediaUpload(event.dataTransfer.files)"
      onclick="document.getElementById('media-file-input').click()">
      <div class="drop-icon">📁</div>
      <p>גררו תמונות לכאן או לחצו לבחירת קבצים</p>
      <p style="font-size:.75rem;color:var(--g400);margin-top:4px;">JPEG, PNG, GIF, WebP, SVG — עד 10MB</p>
    </div>
  `;

  // Attach infinite scroll
  const scrollWrap = document.getElementById('media-scroll-wrap');
  if (scrollWrap) {
    scrollWrap.addEventListener('scroll', onMediaScroll);
  }
}

function onMediaScroll() {
  if (!_mediaHasMore || _mediaLoading) return;
  const wrap = document.getElementById('media-scroll-wrap');
  if (!wrap) return;
  if (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 100) {
    loadMediaLibrary(false);
  }
}

// Grid view thumbnail
function renderMediaThumbGrid(item) {
  const imgUrl = resolveMediaUrl(item.storage_path, STOREFRONT_BASE);
  const title = item.title || item.original_filename || item.filename;
  const truncTitle = title.length > 20 ? title.slice(0, 18) + '...' : title;

  return `
    <div class="media-thumb" onclick="openMediaEdit('${item.id}')">
      <div class="media-thumb-img">
        ${imgUrl
          ? `<img src="${imgUrl}" alt="${escHtml(item.alt_text || title)}" loading="lazy">`
          : '<div style="color:var(--g300);font-size:1.5rem;">🖼️</div>'}
      </div>
      <div class="media-thumb-title">${escHtml(truncTitle)}</div>
      <div class="media-thumb-actions">
        <button onclick="event.stopPropagation();copyMediaUrl('${item.id}')" title="העתק URL">📋</button>
        <button onclick="event.stopPropagation();deleteMedia('${item.id}')" title="מחיקה">🗑️</button>
      </div>
    </div>
  `;
}

// List view row
function renderMediaThumbList(item) {
  const imgUrl = resolveMediaUrl(item.storage_path, STOREFRONT_BASE);
  const title = item.title || item.original_filename || item.filename;
  const sizeKB = item.file_size ? Math.round(item.file_size / 1024) + ' KB' : '';
  const dims = (item.width && item.height) ? `${item.width}×${item.height}` : '';
  const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('he-IL') : '';
  const folderLabel = MEDIA_FOLDERS.find(f => f.value === item.folder)?.label || item.folder;

  return `
    <div class="media-list-row" onclick="openMediaEdit('${item.id}')">
      <div class="media-list-thumb">
        ${imgUrl
          ? `<img src="${imgUrl}" alt="${escHtml(item.alt_text || title)}" loading="lazy">`
          : '<div style="color:var(--g300);font-size:1.2rem;">🖼️</div>'}
      </div>
      <div class="media-list-info">
        <div class="media-list-title">${escHtml(title)}</div>
        <div class="media-list-meta">${item.filename}</div>
      </div>
      <div class="media-list-col">${folderLabel}</div>
      <div class="media-list-col">${sizeKB}</div>
      <div class="media-list-col">${dims}</div>
      <div class="media-list-col">${dateStr}</div>
      <div class="media-list-actions">
        <button onclick="event.stopPropagation();copyMediaUrl('${item.id}')" title="העתק URL">📋</button>
        <button onclick="event.stopPropagation();deleteMedia('${item.id}')" title="מחיקה">🗑️</button>
      </div>
    </div>
  `;
}

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ========== SEARCH ==========

function onMediaSearch(val) {
  clearTimeout(mediaSearchTimer);
  mediaSearchTimer = setTimeout(() => {
    mediaFilter.search = val;
    loadMediaLibrary();
  }, 400);
}

// ========== UPLOAD ==========

async function handleMediaUpload(files) {
  if (!files || !files.length) return;

  const tid = getTenantId();
  const progressContainer = document.getElementById('media-upload-progress');
  if (progressContainer) {
    progressContainer.style.display = 'block';
    progressContainer.innerHTML = '';
  }

  // Build progress UI for all files first
  const fileArr = Array.from(files);
  const ids = fileArr.map(() => 'up-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));

  if (progressContainer) {
    progressContainer.innerHTML = fileArr.map((file, i) => `
      <div id="${ids[i]}" class="media-upload-item">
        <span class="media-upload-name">${escHtml(file.name)}</span>
        <div class="media-upload-bar-wrap">
          <div class="media-upload-bar" id="${ids[i]}-bar" style="width:0%"></div>
        </div>
        <span class="media-upload-status" id="${ids[i]}-status">ממתין...</span>
      </div>
    `).join('');
  }

  let uploaded = 0;

  for (let i = 0; i < fileArr.length; i++) {
    const file = fileArr[i];
    const itemId = ids[i];
    const barEl = document.getElementById(itemId + '-bar');
    const statusEl = document.getElementById(itemId + '-status');

    if (statusEl) statusEl.textContent = 'ממיר...';
    if (barEl) barEl.style.width = '15%';

    try {
      const isSVG = file.type === 'image/svg+xml';
      let uploadBlob, width = 0, height = 0, fileSize;

      if (isSVG) {
        uploadBlob = file;
        fileSize = file.size;
      } else {
        const result = await convertMediaToWebP(file);
        uploadBlob = result.blob;
        width = result.width;
        height = result.height;
        fileSize = result.size;
      }

      if (barEl) barEl.style.width = '40%';
      if (statusEl) statusEl.textContent = 'מעלה...';

      const ext = isSVG ? 'svg' : 'webp';
      const mimeType = isSVG ? 'image/svg+xml' : 'image/webp';
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const filename = `${baseName}_${timestamp}.${ext}`;
      const folder = mediaFilter.folder !== 'all' ? mediaFilter.folder : 'general';
      const storagePath = `media/${tid}/${folder}/${filename}`;

      const { error: upErr } = await sb.storage
        .from(MEDIA_BUCKET)
        .upload(storagePath, uploadBlob, { contentType: mimeType, upsert: false });

      if (upErr) throw upErr;

      if (barEl) barEl.style.width = '80%';
      if (statusEl) statusEl.textContent = 'שומר...';

      const { error: dbErr } = await sb.from(MEDIA_TABLE).insert({
        tenant_id: tid,
        filename,
        original_filename: file.name,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size: fileSize,
        width: width || null,
        height: height || null,
        folder,
        tags: []
      });

      if (dbErr) throw dbErr;

      uploaded++;
      if (barEl) { barEl.style.width = '100%'; barEl.classList.add('done'); }
      if (statusEl) { statusEl.textContent = '✓'; statusEl.style.color = '#22c55e'; }

    } catch (err) {
      console.error('Upload error:', file.name, err);
      if (barEl) { barEl.style.width = '100%'; barEl.style.background = '#ef4444'; }
      if (statusEl) { statusEl.textContent = '✗ ' + (err.message || 'שגיאה'); statusEl.style.color = '#ef4444'; }
    }
  }

  const fileInput = document.getElementById('media-file-input');
  if (fileInput) fileInput.value = '';

  if (uploaded > 0) {
    Toast.success(`${uploaded}/${fileArr.length} תמונות הועלו בהצלחה`);
    await loadMediaLibrary();
  } else {
    Toast.error('שגיאה בהעלאה');
  }

  setTimeout(() => {
    if (progressContainer) { progressContainer.style.display = 'none'; progressContainer.innerHTML = ''; }
  }, 4000);
}

// ========== WEBP CONVERSION ==========

function convertMediaToWebP(file, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width: img.naturalWidth, height: img.naturalHeight, size: blob.size });
          } else {
            reject(new Error('WebP conversion failed'));
          }
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// ========== EDIT MODAL ==========

async function openMediaEdit(id) {
  const item = mediaItems.find(m => m.id === id);
  if (!item) return;

  const signedUrl = mediaSignedUrls[item.storage_path] || await getMediaSignedUrl(item.storage_path);
  const sizeKB = item.file_size ? Math.round(item.file_size / 1024) : '?';
  const dims = (item.width && item.height) ? `${item.width}×${item.height}px` : '';
  const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString('he-IL') : '';
  const tagsStr = (item.tags || []).join(', ');
  const proxyUrl = '/api/image/' + item.storage_path;

  const folderOpts = MEDIA_FOLDERS
    .map(f => `<option value="${f.value}" ${item.folder === f.value ? 'selected' : ''}>${f.label}</option>`)
    .join('');

  const html = `
    <div class="media-edit-overlay" onclick="if(event.target===this)closeMediaEdit()">
      <div class="media-edit-modal">
        <div class="media-edit-header">
          <h3>עריכת תמונה</h3>
          <button onclick="closeMediaEdit()" style="background:var(--g100);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:1.1rem;">✕</button>
        </div>
        <div class="media-edit-body">
          <div class="media-edit-preview">
            ${signedUrl
              ? `<img src="${signedUrl}" alt="${escHtml(item.alt_text || item.filename)}" style="max-width:100%;max-height:300px;border-radius:8px;object-fit:contain;">`
              : '<div style="padding:40px;text-align:center;color:var(--g300);">🖼️ אין תצוגה מקדימה</div>'}
          </div>
          <div class="media-edit-fields">
            <label>כותרת
              <input type="text" id="me-title" value="${escHtml(item.title || '')}" placeholder="כותרת התמונה">
            </label>
            <label>כיתוב
              <input type="text" id="me-caption" value="${escHtml(item.caption || '')}" placeholder="כיתוב">
            </label>
            <label>תיאור
              <textarea id="me-description" rows="2" placeholder="תיאור">${escHtml(item.description || '')}</textarea>
            </label>
            <label>טקסט חלופי (alt)
              <input type="text" id="me-alt" value="${escHtml(item.alt_text || '')}" placeholder="תיאור לנגישות">
            </label>
            <label>תיקייה
              <select id="me-folder">${folderOpts}</select>
            </label>
            <label>תגיות (מופרדות בפסיקים)
              <input type="text" id="me-tags" value="${escHtml(tagsStr)}" placeholder="תגית1, תגית2">
            </label>
          </div>
        </div>

        <div class="media-edit-info">
          <span>קובץ: ${escHtml(item.filename)}</span>
          <span>גודל: ${sizeKB} KB ${dims ? '| ' + dims : ''}</span>
          ${createdDate ? `<span>הועלה: ${createdDate}</span>` : ''}
        </div>

        <div class="media-edit-used-in" id="me-used-in">
          <label style="font-size:.82rem;font-weight:600;color:var(--g600);">בשימוש ב:</label>
          <div id="me-used-in-list" style="font-size:.82rem;color:var(--g400);margin-top:4px;">בודק...</div>
        </div>

        <div class="media-edit-url">
          <label>URL לשימוש (בבלוקים/שורטקודים):</label>
          <div style="display:flex;gap:6px;">
            <input type="text" readonly value="${proxyUrl}" id="me-url" style="flex:1;font-size:.8rem;direction:ltr;">
            <button onclick="copyMediaUrlFromInput()" class="btn btn-sm" style="white-space:nowrap;">📋 העתק</button>
          </div>
        </div>

        <div class="media-edit-footer">
          <button onclick="deleteMedia('${item.id}')" class="btn btn-sm" style="color:#ef4444;border-color:#ef4444;">🗑️ מחיקה</button>
          <button onclick="saveMediaEdit('${item.id}')" class="btn btn-sm btn-primary">💾 שמירה</button>
        </div>
      </div>
    </div>
  `;

  closeMediaEdit();
  document.body.insertAdjacentHTML('beforeend', html);

  // Load "used in" asynchronously
  loadMediaUsedIn(item.storage_path);
}

async function loadMediaUsedIn(storagePath) {
  const listEl = document.getElementById('me-used-in-list');
  if (!listEl) return;

  try {
    // Fetch all pages and search blocks JSON client-side
    // (PostgREST doesn't support LIKE on JSONB cast)
    const { data, error } = await sb.from('storefront_pages')
      .select('id, title, slug, blocks')
      .eq('tenant_id', getTenantId());

    if (error) throw error;

    const matches = (data || []).filter(page => {
      if (!page.blocks) return false;
      const blocksStr = JSON.stringify(page.blocks);
      return blocksStr.includes(storagePath);
    });

    if (!matches.length) {
      listEl.textContent = 'לא בשימוש';
      listEl.style.color = 'var(--g400)';
      return;
    }

    listEl.innerHTML = matches.map(page =>
      `<a href="#" onclick="event.preventDefault();closeMediaEdit();switchStudioTab('pages');setTimeout(()=>selectStudioPage&&selectStudioPage('${page.id}'),300)" style="color:#c9a555;text-decoration:none;margin-left:12px;">${escHtml(page.title)} <span style="color:var(--g400);font-size:.75rem;">(${escHtml(page.slug)})</span></a>`
    ).join('');
  } catch (err) {
    console.error('Used-in query error:', err);
    listEl.textContent = 'שגיאה בבדיקה';
  }
}

function closeMediaEdit() {
  const overlay = document.querySelector('.media-edit-overlay');
  if (overlay) overlay.remove();
}

async function saveMediaEdit(id) {
  const title = document.getElementById('me-title')?.value?.trim() || null;
  const caption = document.getElementById('me-caption')?.value?.trim() || null;
  const description = document.getElementById('me-description')?.value?.trim() || null;
  const alt_text = document.getElementById('me-alt')?.value?.trim() || null;
  const folder = document.getElementById('me-folder')?.value || 'general';
  const tagsRaw = document.getElementById('me-tags')?.value || '';
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  try {
    const { error } = await sb.from(MEDIA_TABLE)
      .update({ title, caption, description, alt_text, folder, tags, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', getTenantId());

    if (error) throw error;

    Toast.success('נשמר בהצלחה');
    closeMediaEdit();
    await loadMediaLibrary();
  } catch (err) {
    console.error('Save error:', err);
    Toast.error('שגיאה בשמירה');
  }
}

// ========== DELETE ==========

async function deleteMedia(id) {
  if (!confirm('למחוק את התמונה?')) return;

  try {
    const { error } = await sb.from(MEDIA_TABLE)
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', getTenantId());

    if (error) throw error;

    Toast.success('התמונה נמחקה');
    closeMediaEdit();
    await loadMediaLibrary();
  } catch (err) {
    console.error('Delete error:', err);
    Toast.error('שגיאה במחיקה');
  }
}

// ========== COPY URL ==========

function copyMediaUrl(id) {
  const item = mediaItems.find(m => m.id === id);
  if (!item) return;
  const url = '/api/image/' + item.storage_path;
  navigator.clipboard.writeText(url).then(() => Toast.success('URL הועתק')).catch(() => Toast.error('שגיאה בהעתקה'));
}

function copyMediaUrlFromInput() {
  const input = document.getElementById('me-url');
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => Toast.success('URL הועתק')).catch(() => Toast.error('שגיאה בהעתקה'));
}
