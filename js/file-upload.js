// =========================================================
// file-upload.js — File upload helper for supplier documents
// Load after: shared.js, supabase-ops.js
// Provides: uploadSupplierFile(), getSupplierFileUrl(),
//   renderFilePreview(), pickAndUploadFile(),
//   pickAndUploadFiles(), fetchDocFiles(), saveDocFile(),
//   renderFileGallery()
// =========================================================

var UPLOAD_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
var UPLOAD_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// =========================================================
// Upload a file to Supabase Storage bucket "supplier-docs"
// Returns { url, fileName } on success, null on error
// =========================================================
async function uploadSupplierFile(file, supplierId) {
  if (!file || !supplierId) { toast('חסרים נתונים להעלאה', 'e'); return null; }

  // Validate file type
  if (!UPLOAD_ALLOWED_TYPES.includes(file.type)) {
    toast('סוג קובץ לא נתמך — רק PDF, JPG, PNG', 'e');
    return null;
  }
  // Validate file size
  if (file.size > UPLOAD_MAX_SIZE) {
    toast('קובץ גדול מדי — מקסימום 10MB', 'e');
    return null;
  }

  var tid = getTenantId();
  var timestamp = Date.now();
  var ext = (file.name.match(/\.([a-zA-Z0-9]+)$/) || ['', 'bin'])[1].toLowerCase();
  var filePath = tid + '/' + supplierId + '/' + timestamp + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;

  try {
    var { error } = await sb.storage.from('supplier-docs').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (error) throw error;

    // Get signed URL (1 hour)
    var signedUrl = await getSupplierFileUrl(filePath);
    return { url: filePath, fileName: file.name, signedUrl: signedUrl };
  } catch (e) {
    console.error('uploadSupplierFile error:', e);
    toast('שגיאה בהעלאת קובץ: ' + (e.message || ''), 'e');
    return null;
  }
}

// =========================================================
// Get a signed URL for a stored file (1 hour expiry)
// =========================================================
async function getSupplierFileUrl(filePath) {
  if (!filePath) return null;
  try {
    var { data, error } = await sb.storage.from('supplier-docs')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  } catch (e) {
    console.error('getSupplierFileUrl error:', e);
    return null;
  }
}

// =========================================================
// Render single file preview into a container (legacy)
// =========================================================
function renderFilePreview(fileUrl, fileName, containerId) {
  var container = $(containerId);
  if (!container) return;

  if (!fileUrl) {
    container.innerHTML =
      '<div style="color:var(--g400);font-size:.88rem;text-align:center;padding:16px">' +
        'אין קובץ מצורף' +
      '</div>';
    return;
  }

  var ext = (fileName || fileUrl || '').split('.').pop().toLowerCase();
  var isPdf = ext === 'pdf';

  if (isPdf) {
    container.innerHTML =
      '<iframe src="' + escapeHtml(fileUrl) + '" ' +
        'style="width:100%;height:400px;border:1px solid var(--g200);border-radius:6px" ' +
        'title="' + escapeHtml(fileName || 'PDF') + '"></iframe>';
  } else {
    container.innerHTML =
      '<img src="' + escapeHtml(fileUrl) + '" ' +
        'alt="' + escapeHtml(fileName || 'Image') + '" ' +
        'style="max-width:100%;max-height:400px;border-radius:6px;border:1px solid var(--g200)">';
  }
}

// =========================================================
// Helper: pick file via hidden input, upload, return result
// =========================================================
function pickAndUploadFile(supplierId, callback) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.jpeg,.png';
  input.onchange = async function() {
    var file = input.files[0];
    if (!file) return;
    showLoading('מעלה קובץ...');
    var result = await uploadSupplierFile(file, supplierId);
    hideLoading();
    if (result && callback) callback(result);
  };
  input.click();
}

// =========================================================
// Multi-file: pick multiple files, upload all, return results
// callback receives array of { url, fileName, signedUrl }
// =========================================================
function pickAndUploadFiles(supplierId, callback) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.jpeg,.png';
  input.multiple = true;
  input.onchange = async function() {
    var files = Array.from(input.files);
    if (!files.length) return;
    showLoading('מעלה ' + files.length + ' קבצים...');
    var results = [];
    for (var i = 0; i < files.length; i++) {
      var r = await uploadSupplierFile(files[i], supplierId);
      if (r) results.push(r);
    }
    hideLoading();
    if (results.length && callback) callback(results);
  };
  input.click();
}

// =========================================================
// Fetch all files for a document from supplier_document_files
// Fallback: if no rows, returns array with doc.file_url if present
// =========================================================
async function fetchDocFiles(docId, fallbackFileUrl, fallbackFileName) {
  try {
    var { data, error } = await sb.from(T.DOC_FILES)
      .select('id, file_url, file_name, sort_order')
      .eq('document_id', docId)
      .eq('tenant_id', getTenantId())
      .order('sort_order', { ascending: true });
    if (!error && data && data.length) return data;
  } catch (e) {
    console.warn('fetchDocFiles error:', e.message);
  }
  // Fallback to legacy file_url column
  if (fallbackFileUrl) {
    return [{ id: null, file_url: fallbackFileUrl, file_name: fallbackFileName || '', sort_order: 0 }];
  }
  return [];
}

// =========================================================
// Save a file record to supplier_document_files
// Also updates supplier_documents.file_url if it's the first file
// =========================================================
async function saveDocFile(docId, fileUrl, fileName, sortOrder) {
  var tid = getTenantId();
  var emp = (typeof getCurrentEmployee === 'function') ? getCurrentEmployee() : null;
  await batchCreate(T.DOC_FILES, [{
    tenant_id: tid,
    document_id: docId,
    file_url: fileUrl,
    file_name: fileName || null,
    sort_order: sortOrder || 0,
    created_by: emp ? emp.id : null
  }]);
}

// =========================================================
// Render file gallery: thumbnails with page navigation
// files = [{ file_url, file_name, signedUrl? }]
// containerId = DOM element id to render into
// =========================================================
async function renderFileGallery(files, containerId) {
  var container = $(containerId);
  if (!container) return;
  if (!files || !files.length) {
    container.innerHTML =
      '<div style="color:var(--g400);font-size:.88rem;text-align:center;padding:16px">' +
        'אין קבצים מצורפים</div>';
    return;
  }

  // Resolve signed URLs — carry file id for delete
  var resolved = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var signedUrl = f.signedUrl || await getSupplierFileUrl(f.file_url);
    resolved.push({ id: f.id || null, url: signedUrl, name: f.file_name || f.file_url || '', path: f.file_url });
  }

  // Store original files array for re-render after delete
  container._galleryFiles = files;
  container._galleryId = containerId;

  if (resolved.length === 1) {
    // Single file — show full preview with delete button
    var rf = resolved[0];
    var delHtml = rf.id ? '<div style="text-align:left;margin-bottom:4px">' +
      '<button class="btn-sm" style="background:#ef4444;color:#fff;font-size:11px;padding:2px 8px" ' +
      'onclick="_deleteGalleryFile(\'' + rf.id + '\',\'' + containerId + '\')">\u2715 מחק קובץ</button></div>' : '';
    container.innerHTML = delHtml;
    var previewDiv = document.createElement('div');
    container.appendChild(previewDiv);
    _renderSingleFilePreview(rf, previewDiv);
    return;
  }

  // Multiple files — gallery with thumbnails and main preview
  container.innerHTML =
    '<div class="file-gallery">' +
      '<div class="file-gallery-main" id="' + containerId + '-main"></div>' +
      '<div class="file-gallery-thumbs" id="' + containerId + '-thumbs"></div>' +
    '</div>';

  var thumbsEl = $(containerId + '-thumbs');
  resolved.forEach(function(rf, idx) {
    var ext = (rf.name || rf.url || '').split('.').pop().toLowerCase();
    var thumb = document.createElement('div');
    thumb.className = 'file-gallery-thumb' + (idx === 0 ? ' active' : '');
    thumb.style.position = 'relative';
    thumb.title = rf.name || ('עמוד ' + (idx + 1));
    // Clickable area for selecting this file
    var selectBtn = document.createElement('button');
    selectBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1.2rem;padding:4px';
    selectBtn.textContent = ext === 'pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
    selectBtn.insertAdjacentHTML('beforeend',
      '<span class="file-gallery-thumb-num">' + (idx + 1) + '</span>');
    selectBtn.onclick = function() {
      thumbsEl.querySelectorAll('.file-gallery-thumb').forEach(function(t) { t.classList.remove('active'); });
      thumb.classList.add('active');
      _renderSingleFilePreview(rf, $(containerId + '-main'));
    };
    thumb.appendChild(selectBtn);
    // Delete button
    if (rf.id) {
      var delBtn = document.createElement('button');
      delBtn.className = 'file-gallery-del';
      delBtn.style.cssText = 'position:absolute;top:-4px;left:-4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:1;padding:0;display:flex;align-items:center;justify-content:center';
      delBtn.textContent = '\u2715';
      delBtn.title = 'מחק קובץ';
      delBtn.setAttribute('data-file-id', rf.id);
      delBtn.setAttribute('data-container', containerId);
      delBtn.onclick = function(e) {
        e.stopPropagation();
        _deleteGalleryFile(rf.id, containerId);
      };
      thumb.appendChild(delBtn);
    }
    thumbsEl.appendChild(thumb);
  });

  // Show first file
  _renderSingleFilePreview(resolved[0], $(containerId + '-main'));
}

// Delete a file from the gallery — confirms, deletes from DB, re-queries fresh data
async function _deleteGalleryFile(fileId, containerId) {
  if (!fileId) return;
  var ok = await confirmDialog('מחיקת קובץ', 'האם למחוק את הקובץ?');
  if (!ok) return;
  try {
    showLoading('מוחק קובץ...');
    // Also get the storage path before deleting DB record
    var { data: fileRow } = await sb.from('supplier_document_files')
      .select('file_url, document_id').eq('id', fileId).single();
    var { error } = await sb.from('supplier_document_files').delete().eq('id', fileId);
    if (error) throw error;
    // Delete from storage too (non-blocking)
    if (fileRow && fileRow.file_url) {
      sb.storage.from('supplier-docs').remove([fileRow.file_url]).catch(function(e) {
        console.warn('Storage delete failed (non-blocking):', e);
      });
    }
    // Re-query fresh files from DB (not stale in-memory array)
    var docId = fileRow ? fileRow.document_id : null;
    if (docId) {
      var freshFiles = await fetchDocFiles(docId);
      await renderFileGallery(freshFiles, containerId);
    } else {
      // Fallback: clear gallery
      var container = $(containerId);
      if (container) container.innerHTML = '<div style="color:var(--g400);font-size:.88rem;text-align:center;padding:16px">אין קבצים מצורפים</div>';
    }
    toast('הקובץ נמחק');
  } catch (e) {
    console.error('_deleteGalleryFile error:', e);
    toast('שגיאה במחיקת קובץ: ' + (e.message || ''), 'e');
  } finally {
    hideLoading();
  }
}

function _renderSingleFilePreview(rf, container) {
  if (!container || !rf || !rf.url) return;
  var ext = (rf.name || rf.url || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    container.innerHTML =
      '<iframe src="' + escapeHtml(rf.url) + '" ' +
        'style="width:100%;height:450px;border:1px solid var(--g200);border-radius:6px" ' +
        'title="' + escapeHtml(rf.name || 'PDF') + '"></iframe>';
  } else {
    container.innerHTML =
      '<img src="' + escapeHtml(rf.url) + '" ' +
        'alt="' + escapeHtml(rf.name || 'Image') + '" ' +
        'style="max-width:100%;max-height:450px;border-radius:6px;border:1px solid var(--g200);cursor:pointer" ' +
        'onclick="window.open(\'' + escapeHtml(rf.url) + '\',\'_blank\')">';
  }
}
