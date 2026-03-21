// =========================================================
// file-upload.js — File upload helper for supplier documents
// Load after: shared.js, supabase-ops.js
// Provides: uploadSupplierFile(), getSupplierFileUrl(),
//   renderFilePreview(), pickAndUploadFile()
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
// Render file preview into a container
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
