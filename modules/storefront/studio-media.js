// modules/storefront/studio-media.js
// Media Library — upload, organize, browse images with WebP conversion
// Storage bucket: media-library (private, proxied via /api/image/media/...)

let mediaItems = [];
let mediaLoaded = false;
let mediaFilter = { folder: 'all', sort: 'newest', search: '' };
let mediaSearchTimer = null;

const MEDIA_FOLDERS = [
  { value: 'general', label: 'כללי' },
  { value: 'campaigns', label: 'קמפיינים' },
  { value: 'store', label: 'חנות' },
  { value: 'products', label: 'מוצרים' },
  { value: 'blog', label: 'בלוג' }
];

const MEDIA_BUCKET = 'media-library';
const MEDIA_TABLE = 'media_library';

// ========== LOAD ==========

async function loadMediaLibrary() {
  const container = document.getElementById('studio-media-content');
  if (!container) return;

  container.innerHTML = '<div class="studio-empty">טוען מדיה...</div>';

  try {
    let query = sb.from(MEDIA_TABLE)
      .select('*')
      .eq('tenant_id', getTenantId())
      .eq('is_deleted', false);

    if (mediaFilter.folder !== 'all') {
      query = query.eq('folder', mediaFilter.folder);
    }

    if (mediaFilter.search) {
      query = query.or(`title.ilike.%${mediaFilter.search}%,description.ilike.%${mediaFilter.search}%,alt_text.ilike.%${mediaFilter.search}%`);
    }

    if (mediaFilter.sort === 'newest') query = query.order('created_at', { ascending: false });
    else if (mediaFilter.sort === 'oldest') query = query.order('created_at', { ascending: true });
    else if (mediaFilter.sort === 'name') query = query.order('title', { ascending: true });
    else if (mediaFilter.sort === 'size') query = query.order('file_size', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    mediaItems = data || [];
    mediaLoaded = true;
    renderMediaLibrary();
  } catch (err) {
    console.error('Media load error:', err);
    container.innerHTML = '<div class="studio-empty">שגיאה בטעינת מדיה</div>';
  }
}

// ========== RENDER ==========

function renderMediaLibrary() {
  const container = document.getElementById('studio-media-content');
  if (!container) return;

  const folderOptions = [{ value: 'all', label: 'הכל' }, ...MEDIA_FOLDERS]
    .map(f => `<option value="${f.value}" ${mediaFilter.folder === f.value ? 'selected' : ''}>${f.label}</option>`)
    .join('');

  const sortOptions = [
    { value: 'newest', label: 'חדש ביותר' },
    { value: 'oldest', label: 'ישן ביותר' },
    { value: 'name', label: 'לפי שם' },
    { value: 'size', label: 'לפי גודל' }
  ].map(s => `<option value="${s.value}" ${mediaFilter.sort === s.value ? 'selected' : ''}>${s.label}</option>`)
    .join('');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="margin:0;font-size:1.2rem;font-weight:700;">🖼️ מדיה</h2>
      <button class="btn btn-sm btn-primary" onclick="document.getElementById('media-file-input').click()">+ העלאה</button>
      <input type="file" id="media-file-input" multiple accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" style="display:none" onchange="handleMediaUpload(this.files)">
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
      <input type="text" id="media-search" placeholder="🔍 חיפוש..." value="${mediaFilter.search}"
        style="flex:1;min-width:150px;padding:8px 12px;border:1px solid var(--g200);border-radius:8px;font-size:.9rem;font-family:inherit;"
        oninput="onMediaSearch(this.value)">
      <select onchange="mediaFilter.folder=this.value;loadMediaLibrary()"
        style="padding:8px 12px;border:1px solid var(--g200);border-radius:8px;font-size:.9rem;font-family:inherit;">
        ${folderOptions}
      </select>
      <select onchange="mediaFilter.sort=this.value;loadMediaLibrary()"
        style="padding:8px 12px;border:1px solid var(--g200);border-radius:8px;font-size:.9rem;font-family:inherit;">
        ${sortOptions}
      </select>
    </div>

    <div id="media-upload-progress" style="display:none;margin-bottom:12px;"></div>

    <div id="media-grid" class="media-grid">
      ${mediaItems.length === 0
        ? '<div class="studio-empty" style="grid-column:1/-1;">אין תמונות עדיין</div>'
        : mediaItems.map(renderMediaThumb).join('')
      }
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
}

function renderMediaThumb(item) {
  const proxyUrl = '/api/image/' + item.storage_path;
  const title = item.title || item.original_filename || item.filename;
  const truncTitle = title.length > 20 ? title.slice(0, 18) + '...' : title;

  return `
    <div class="media-thumb" onclick="openMediaEdit('${item.id}')">
      <div class="media-thumb-img">
        <img src="${proxyUrl}" alt="${item.alt_text || title}" loading="lazy">
      </div>
      <div class="media-thumb-title">${truncTitle}</div>
      <div class="media-thumb-actions">
        <button onclick="event.stopPropagation();copyMediaUrl('${item.id}')" title="העתק URL">📋</button>
        <button onclick="event.stopPropagation();deleteMedia('${item.id}')" title="מחיקה">🗑️</button>
      </div>
    </div>
  `;
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

  let uploaded = 0;
  const total = files.length;

  for (const file of files) {
    const itemId = 'upload-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

    if (progressContainer) {
      progressContainer.innerHTML += `
        <div id="${itemId}" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:.85rem;flex:1;">${file.name}</span>
          <span class="upload-status" style="font-size:.8rem;color:var(--g400);">מעלה...</span>
        </div>
      `;
    }

    try {
      const isSVG = file.type === 'image/svg+xml';
      let uploadBlob, width = 0, height = 0, fileSize;

      if (isSVG) {
        // SVGs are not converted
        uploadBlob = file;
        fileSize = file.size;
      } else {
        // Convert to WebP
        const result = await convertMediaToWebP(file);
        uploadBlob = result.blob;
        width = result.width;
        height = result.height;
        fileSize = result.size;
      }

      const ext = isSVG ? 'svg' : 'webp';
      const mimeType = isSVG ? 'image/svg+xml' : 'image/webp';
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\u0590-\u05FF-]/g, '_');
      const timestamp = Date.now();
      const filename = `${baseName}_${timestamp}.${ext}`;
      const folder = mediaFilter.folder !== 'all' ? mediaFilter.folder : 'general';
      const storagePath = `media/${tid}/${folder}/${filename}`;

      // Upload to storage
      const { error: upErr } = await sb.storage
        .from(MEDIA_BUCKET)
        .upload(storagePath, uploadBlob, { contentType: mimeType, upsert: false });

      if (upErr) throw upErr;

      // Insert DB row
      const { error: dbErr } = await sb.from(MEDIA_TABLE).insert({
        tenant_id: tid,
        filename: filename,
        original_filename: file.name,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size: fileSize,
        width: width || null,
        height: height || null,
        folder: folder,
        tags: []
      });

      if (dbErr) throw dbErr;

      uploaded++;
      const statusEl = document.querySelector(`#${itemId} .upload-status`);
      if (statusEl) { statusEl.textContent = '✓'; statusEl.style.color = '#22c55e'; }

    } catch (err) {
      console.error('Upload error:', file.name, err);
      const statusEl = document.querySelector(`#${itemId} .upload-status`);
      if (statusEl) { statusEl.textContent = '✗ שגיאה'; statusEl.style.color = '#ef4444'; }
    }
  }

  // Reset file input
  const fileInput = document.getElementById('media-file-input');
  if (fileInput) fileInput.value = '';

  if (uploaded > 0) {
    Toast.success(`${uploaded}/${total} תמונות הועלו בהצלחה`);
    await loadMediaLibrary();
  } else {
    Toast.error('שגיאה בהעלאה');
  }

  // Clear progress after delay
  setTimeout(() => {
    if (progressContainer) { progressContainer.style.display = 'none'; progressContainer.innerHTML = ''; }
  }, 3000);
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
            resolve({
              blob,
              width: img.naturalWidth,
              height: img.naturalHeight,
              size: blob.size
            });
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

function openMediaEdit(id) {
  const item = mediaItems.find(m => m.id === id);
  if (!item) return;

  const proxyUrl = '/api/image/' + item.storage_path;
  const sizeKB = item.file_size ? Math.round(item.file_size / 1024) : '?';
  const dims = (item.width && item.height) ? `${item.width}×${item.height}px` : '';
  const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString('he-IL') : '';
  const tagsStr = (item.tags || []).join(', ');

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
            <img src="${proxyUrl}" alt="${item.alt_text || item.filename}" style="max-width:100%;max-height:300px;border-radius:8px;object-fit:contain;">
          </div>
          <div class="media-edit-fields">
            <label>כותרת
              <input type="text" id="me-title" value="${item.title || ''}" placeholder="כותרת התמונה">
            </label>
            <label>כיתוב
              <input type="text" id="me-caption" value="${item.caption || ''}" placeholder="כיתוב">
            </label>
            <label>תיאור
              <textarea id="me-description" rows="2" placeholder="תיאור">${item.description || ''}</textarea>
            </label>
            <label>טקסט חלופי (alt)
              <input type="text" id="me-alt" value="${item.alt_text || ''}" placeholder="תיאור לנגישות">
            </label>
            <label>תיקייה
              <select id="me-folder">${folderOpts}</select>
            </label>
            <label>תגיות (מופרדות בפסיקים)
              <input type="text" id="me-tags" value="${tagsStr}" placeholder="תגית1, תגית2">
            </label>
          </div>
        </div>

        <div class="media-edit-info">
          <span>קובץ: ${item.filename}</span>
          <span>גודל: ${sizeKB} KB ${dims ? '| ' + dims : ''}</span>
          ${createdDate ? `<span>הועלה: ${createdDate}</span>` : ''}
        </div>

        <div class="media-edit-url">
          <label>URL לשימוש:</label>
          <div style="display:flex;gap:6px;">
            <input type="text" readonly value="/api/image/${item.storage_path}" id="me-url" style="flex:1;font-size:.8rem;direction:ltr;">
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

  // Remove existing modal if any
  closeMediaEdit();
  document.body.insertAdjacentHTML('beforeend', html);
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
  navigator.clipboard.writeText(url).then(() => {
    Toast.success('URL הועתק');
  }).catch(() => {
    Toast.error('שגיאה בהעתקה');
  });
}

function copyMediaUrlFromInput() {
  const input = document.getElementById('me-url');
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => {
    Toast.success('URL הועתק');
  }).catch(() => {
    Toast.error('שגיאה בהעתקה');
  });
}
