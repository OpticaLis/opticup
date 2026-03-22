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

  // Resolve signed URLs
  var resolved = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var signedUrl = f.signedUrl || await getSupplierFileUrl(f.file_url);
    resolved.push({ url: signedUrl, name: f.file_name || f.file_url || '', path: f.file_url });
  }

  if (resolved.length === 1) {
    // Single file — show full preview
    _renderSingleFilePreview(resolved[0], container);
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
    var thumb = document.createElement('button');
    thumb.className = 'file-gallery-thumb' + (idx === 0 ? ' active' : '');
    thumb.title = rf.name || ('עמוד ' + (idx + 1));
    thumb.textContent = ext === 'pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
    thumb.insertAdjacentHTML('beforeend',
      '<span class="file-gallery-thumb-num">' + (idx + 1) + '</span>');
    thumb.onclick = function() {
      thumbsEl.querySelectorAll('.file-gallery-thumb').forEach(function(t) { t.classList.remove('active'); });
      thumb.classList.add('active');
      _renderSingleFilePreview(rf, $(containerId + '-main'));
    };
    thumbsEl.appendChild(thumb);
  });

  // Show first file
  _renderSingleFilePreview(resolved[0], $(containerId + '-main'));
}

function _renderSingleFilePreview(rf, container) {
  if (!container || !rf || !rf.url) return;
  var ext = (rf.name || rf.url || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    container.innerHTML =
      '<iframe src="' + escapeHtml(rf.url) + '" ' +
        'style="width:100%;height:300px;border:1px solid var(--g200);border-radius:6px" ' +
        'title="' + escapeHtml(rf.name || 'PDF') + '"></iframe>';
  } else {
    container.innerHTML =
      '<img src="' + escapeHtml(rf.url) + '" ' +
        'alt="' + escapeHtml(rf.name || 'Image') + '" ' +
        'style="max-width:100%;max-height:300px;border-radius:6px;border:1px solid var(--g200);cursor:pointer" ' +
        'onclick="window.open(\'' + escapeHtml(rf.url) + '\',\'_blank\')">';
  }
}
