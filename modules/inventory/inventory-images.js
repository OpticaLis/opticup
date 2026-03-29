// inventory-images.js — Frame image capture, WEBP conversion, upload/delete
// Load after: inventory-table.js, shared.js, supabase-ops.js
var _imgPending = [];       // { blob, previewUrl }
var _imgCurrentInvId = null;
var _imgCurrentImages = [];  // rows from inventory_images (with _signedUrl added)
var _imgModalEl = null;
var _imgCurrentBarcode = '';
var FRAME_IMAGES_BUCKET = 'frame-images';
var _IMG_SIGN_EXPIRY = 3600; // 1 hour signed URL expiry
var _imgNavList = null;     // array of inventory IDs for prev/next navigation
var _imgNavIndex = -1;

// Update image count badge in the inventory table row
function _updateImageBadge() {
  var count = _imgCurrentImages.length;
  var row = document.querySelector('tr[data-id="' + _imgCurrentInvId + '"]');
  if (!row) return;
  var cell = row.querySelector('.img-cell');
  if (!cell) return;
  if (count > 0) {
    cell.innerHTML = '<span class="img-thumb-click" data-id="' + escapeHtml(_imgCurrentInvId) + '" style="cursor:pointer;color:#2196F3;font-size:.75rem;font-weight:600" title="' + count + ' \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u2014 \u05DC\u05D7\u05E5 \u05DC\u05E6\u05E4\u05D9\u05D9\u05D4">\uD83D\uDCF7' + count + '</span>';
  } else {
    cell.innerHTML = '<span style="color:var(--g400);font-size:.75rem">\uD83D\uDCF7</span>';
  }
}

// Generate signed URL from storage_path (private bucket), with retry
async function _getSignedUrl(storagePath, retries) {
  if (!storagePath) return '';
  var maxRetries = retries || 2;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    var { data, error } = await sb.storage.from(FRAME_IMAGES_BUCKET)
      .createSignedUrl(storagePath, _IMG_SIGN_EXPIRY);
    if (!error && data?.signedUrl) return data.signedUrl;
    if (attempt < maxRetries) {
      await new Promise(function(r) { setTimeout(r, 400); });
    }
  }
  console.warn('Signed URL failed after retries:', storagePath);
  return '';
}

// Sign all images in an array (adds _signedUrl property), with retry for failures
async function _signImages(images) {
  if (!images || !images.length) return;
  var paths = images.map(function(im) { return im.storage_path; }).filter(Boolean);
  if (!paths.length) return;
  // Batch sign for efficiency
  var { data, error } = await sb.storage.from(FRAME_IMAGES_BUCKET)
    .createSignedUrls(paths, _IMG_SIGN_EXPIRY);
  if (error || !data) { console.warn('Batch sign error:', error?.message); return; }
  // Map signed URLs back to images by path
  var urlMap = {};
  for (var i = 0; i < data.length; i++) {
    if (data[i].signedUrl) urlMap[data[i].path] = data[i].signedUrl;
  }
  for (var j = 0; j < images.length; j++) {
    images[j]._signedUrl = urlMap[images[j].storage_path] || '';
  }
  // Retry individually for any images that failed batch signing
  var failed = images.filter(function(im) { return im.storage_path && !im._signedUrl; });
  if (failed.length > 0) {
    await new Promise(function(r) { setTimeout(r, 400); });
    for (var k = 0; k < failed.length; k++) {
      failed[k]._signedUrl = await _getSignedUrl(failed[k].storage_path, 1);
    }
  }
}

async function openImageModal(inventoryId, navList) {
  _imgCurrentInvId = inventoryId;
  _imgPending = [];
  _imgNavList = (navList && navList.length > 1) ? navList : null;
  _imgNavIndex = _imgNavList ? _imgNavList.indexOf(inventoryId) : -1;
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA...');
  try {
    var tid = getTenantId();
    var { data: imgs, error: imgErr } = await sb.from(T.IMAGES)
      .select('*').eq('inventory_id', inventoryId).eq('tenant_id', tid)
      .order('sort_order', { ascending: true });
    if (imgErr) throw imgErr;
    _imgCurrentImages = imgs || [];
    await _signImages(_imgCurrentImages);
    var { data: item } = await sb.from(T.INV)
      .select('barcode, brand_id, model, color, size').eq('id', inventoryId).eq('tenant_id', tid).single();
    _imgCurrentBarcode = item?.barcode || '';
    var title = _buildImgTitle(item);
    hideLoading();
    // Nav buttons
    var navHtml = '';
    if (_imgNavList) {
      var prevDis = _imgNavIndex <= 0 ? ' disabled style="opacity:.4"' : '';
      var nextDis = _imgNavIndex >= _imgNavList.length - 1 ? ' disabled style="opacity:.4"' : '';
      navHtml = '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
        '<button class="btn btn-sm" id="img-btn-next"' + nextDis + ' onclick="_imgNavigate(1)">\u25C0 \u05D4\u05D1\u05D0</button>' +
        '<span id="img-nav-counter" style="font-size:.78rem;color:var(--g500);align-self:center">' + (_imgNavIndex + 1) + '/' + _imgNavList.length + '</span>' +
        '<button class="btn btn-sm" id="img-btn-prev"' + prevDis + ' onclick="_imgNavigate(-1)">\u05D4\u05E7\u05D5\u05D3\u05DD \u25B6</button></div>';
    }
    var modal = Modal.show({
      title: title, size: 'lg',
      content: navHtml + '<div id="img-modal-grid"></div>',
      footer: '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
        '<button class="btn" style="background:#2196F3;color:#fff" id="img-btn-capture">\uD83D\uDCF8 \u05E6\u05DC\u05DD</button>' +
        '<button class="btn" style="background:#4CAF50;color:#fff" id="img-btn-pick">\uD83D\uDCC1 \u05D4\u05E2\u05DC\u05D4</button>' +
        '<button class="btn" style="background:#059669;color:#fff;display:none" id="img-btn-save">\u2B06\uFE0F \u05E9\u05DE\u05D5\u05E8 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA</button>' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="Modal.close()">\u05E1\u05D2\u05D5\u05E8</button></div>',
      closeOnEscape: true, closeOnBackdrop: true
    });
    _imgModalEl = modal.el;
    _renderImageGrid();
    var captureBtn = modal.el.querySelector('#img-btn-capture');
    var pickBtn = modal.el.querySelector('#img-btn-pick');
    var saveBtn = modal.el.querySelector('#img-btn-save');
    if (captureBtn) captureBtn.onclick = _captureImage;
    if (pickBtn) pickBtn.onclick = _pickImage;
    if (saveBtn) saveBtn.onclick = function() { _uploadPendingImages(_imgCurrentInvId); };
  } catch (e) {
    hideLoading(); toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA: ' + (e.message || ''), 'e');
  }
}

function _buildImgTitle(item) {
  var brandName = item ? (brandCacheRev[item.brand_id] || '') : '';
  var parts = ['\uD83D\uDCF7'];
  if (brandName) parts.push(brandName);
  if (item?.model) parts.push(item.model);
  var details = [item?.color, item?.size].filter(Boolean).join(' | ');
  if (details) parts.push('\u2014 ' + details);
  if (item?.barcode) parts.push('(' + item.barcode + ')');
  return parts.join(' ');
}

async function _imgNavigate(dir) {
  if (!_imgNavList) return;
  var newIdx = _imgNavIndex + dir;
  if (newIdx < 0 || newIdx >= _imgNavList.length) return;
  _imgNavIndex = newIdx;
  var newId = _imgNavList[_imgNavIndex];
  _imgCurrentInvId = newId;
  _imgPending = [];
  // Update nav button state
  var prevBtn = _imgModalEl ? _imgModalEl.querySelector('#img-btn-prev') : null;
  var nextBtn = _imgModalEl ? _imgModalEl.querySelector('#img-btn-next') : null;
  var counter = _imgModalEl ? _imgModalEl.querySelector('#img-nav-counter') : null;
  if (prevBtn) { prevBtn.disabled = _imgNavIndex <= 0; prevBtn.style.opacity = _imgNavIndex <= 0 ? '.4' : ''; }
  if (nextBtn) { nextBtn.disabled = _imgNavIndex >= _imgNavList.length - 1; nextBtn.style.opacity = _imgNavIndex >= _imgNavList.length - 1 ? '.4' : ''; }
  if (counter) counter.textContent = (_imgNavIndex + 1) + '/' + _imgNavList.length;
  // Reload content
  showLoading('\u05D8\u05D5\u05E2\u05DF...');
  try {
    var tid = getTenantId();
    var { data: imgs } = await sb.from(T.IMAGES).select('*').eq('inventory_id', newId).eq('tenant_id', tid).order('sort_order', { ascending: true });
    _imgCurrentImages = imgs || [];
    await _signImages(_imgCurrentImages);
    var { data: item } = await sb.from(T.INV).select('barcode, brand_id, model, color, size').eq('id', newId).eq('tenant_id', tid).single();
    _imgCurrentBarcode = item?.barcode || '';
    // Update title
    var titleEl = _imgModalEl ? _imgModalEl.querySelector('.modal-title, h3') : null;
    if (titleEl) titleEl.textContent = _buildImgTitle(item);
    _renderImageGrid(); _updateSaveBtn();
    var saveBtn = _imgModalEl ? _imgModalEl.querySelector('#img-btn-save') : null;
    if (saveBtn) saveBtn.onclick = function() { _uploadPendingImages(_imgCurrentInvId); };
  } catch (e) { toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e'); }
  hideLoading(); _updateImageBadge();
}

function _captureImage() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
  inp.onchange = function() { if (inp.files[0]) _processAndPreview(inp.files[0]); };
  inp.click();
}

function _pickImage() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
  inp.onchange = function() {
    for (var i = 0; i < inp.files.length; i++) _processAndPreview(inp.files[i]);
  };
  inp.click();
}

function _processAndPreview(file) {
  var img = new Image();
  var objectUrl = URL.createObjectURL(file);
  img.onload = function() {
    URL.revokeObjectURL(objectUrl);
    var maxDim = 1200;
    var w = img.width, h = img.height;
    if (w > maxDim || h > maxDim) {
      if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
      else { w = Math.round(w * maxDim / h); h = maxDim; }
    }
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob(function(blob) {
      if (!blob) { toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05DE\u05E8\u05D4', 'e'); return; }
      _imgPending.push({ blob: blob, previewUrl: URL.createObjectURL(blob) });
      _renderImageGrid();
      _updateSaveBtn();
    }, 'image/webp', 0.82);
  };
  img.onerror = function() { URL.revokeObjectURL(objectUrl); toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E7\u05E8\u05D5\u05D0 \u05EA\u05DE\u05D5\u05E0\u05D4', 'e'); };
  img.src = objectUrl;
}

function _renderImageGrid() {
  var container = _imgModalEl ? _imgModalEl.querySelector('#img-modal-grid') : null;
  if (!container) return;
  var html = '';
  if (!_imgCurrentImages.length && !_imgPending.length) {
    html = '<div style="text-align:center;padding:32px;color:var(--g500)">' +
      '\u05D0\u05D9\u05DF \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u2014 \u05DC\u05D7\u05E5 \uD83D\uDCF8 \u05DC\u05E6\u05D9\u05DC\u05D5\u05DD</div>';
  } else {
    html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:8px 0">';
    // Existing images (use signed URLs for private bucket)
    for (var i = 0; i < _imgCurrentImages.length; i++) {
      var im = _imgCurrentImages[i];
      var displayUrl = im._signedUrl || im.url || '';
      var safeUrl = encodeURI(displayUrl);
      var dlName = (_imgCurrentBarcode || 'img') + '_' + (i + 1) + (im.storage_path && im.storage_path.endsWith('.png') ? '.png' : '.webp');
      html += '<div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--g200);cursor:pointer" onclick="_showFullImage(\'' + safeUrl + '\')">' +
        '<img src="' + safeUrl + '" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" loading="lazy">' +
        '<button onclick="event.stopPropagation();_deleteImage(\'' + im.id + '\',\'' + escapeHtml(im.storage_path || '') + '\')" ' +
          'style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px" ' +
          'title="\u05DE\u05D7\u05E7">\u2715</button>' +
        '<button onclick="event.stopPropagation();_downloadImage(\'' + safeUrl + '\',\'' + escapeHtml(dlName) + '\')" ' +
          'style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px" ' +
          'title="\u05D4\u05D5\u05E8\u05D3">\u2B07\uFE0F</button>' +
        '<button onclick="event.stopPropagation();_bgRemoveSaved(\'' + im.id + '\',\'' + safeUrl + '\',\'' + escapeHtml(im.storage_path || '') + '\')" ' +
          'style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px" ' +
          'title="\u05D4\u05E1\u05E8 \u05E8\u05E7\u05E2 \u05DC\u05D1\u05DF">\uD83D\uDCAB</button></div>';
    }
    // Pending images
    for (var j = 0; j < _imgPending.length; j++) {
      html += '<div style="position:relative;border-radius:8px;overflow:hidden;border:2px dashed #4CAF50">' +
        '<img src="' + _imgPending[j].previewUrl + '" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">' +
        '<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(76,175,80,.85);color:#fff;text-align:center;font-size:.75rem;padding:2px">\u05DE\u05DE\u05EA\u05D9\u05DF</span>' +
        '<button onclick="_removePending(' + j + ')" ' +
          'style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px" ' +
          'title="\u05D4\u05E1\u05E8">\u2715</button>' +
        '<button onclick="_bgRemovePending(' + j + ')" ' +
          'style="position:absolute;bottom:22px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px" ' +
          'title="\u05D4\u05E1\u05E8 \u05E8\u05E7\u05E2 \u05DC\u05D1\u05DF">\uD83D\uDCAB</button></div>';
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

function _removePending(idx) {
  if (_imgPending[idx]) URL.revokeObjectURL(_imgPending[idx].previewUrl);
  _imgPending.splice(idx, 1);
  _renderImageGrid();
  _updateSaveBtn();
}

function _updateSaveBtn() {
  var btn = _imgModalEl ? _imgModalEl.querySelector('#img-btn-save') : null;
  if (btn) btn.style.display = _imgPending.length > 0 ? '' : 'none';
}

async function _uploadPendingImages(inventoryId) {
  if (!_imgPending.length) return;
  var tid = getTenantId();
  showLoading('\u05DE\u05E2\u05DC\u05D4 ' + _imgPending.length + ' \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA...');
  var uploaded = 0;
  try {
    for (var i = 0; i < _imgPending.length; i++) {
      var p = _imgPending[i];
      var ts = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      var storagePath = 'frames/' + tid + '/' + inventoryId + '/' + ts + '.webp';
      var { error: upErr } = await sb.storage.from(FRAME_IMAGES_BUCKET).upload(storagePath, p.blob, {
        contentType: 'image/webp', upsert: false
      });
      if (upErr) { console.error('Upload error:', upErr); continue; }
      await sb.from(T.IMAGES).insert({
        inventory_id: inventoryId, storage_path: storagePath,
        url: storagePath, file_size: p.blob.size,
        sort_order: _imgCurrentImages.length + i,
        tenant_id: tid
      });
      uploaded++;
      URL.revokeObjectURL(p.previewUrl);
    }
    _imgPending = [];
    // Brief delay to ensure Storage propagation before signing URLs
    await new Promise(function(r) { setTimeout(r, 300); });
    // Refresh images from DB + sign URLs
    var { data: fresh } = await sb.from(T.IMAGES).select('*')
      .eq('inventory_id', inventoryId).eq('tenant_id', tid)
      .order('sort_order', { ascending: true });
    _imgCurrentImages = fresh || [];
    await _signImages(_imgCurrentImages);
    _renderImageGrid();
    _updateSaveBtn();
    hideLoading();
    Toast.success(uploaded + ' \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D5');
    _updateImageBadge();
    writeLog('images_uploaded', inventoryId, { count: uploaded });
  } catch (e) {
    hideLoading();
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05D4: ' + (e.message || ''), 'e');
  }
}

function _downloadImage(url, filename) {
  fetch(url).then(function(r) { return r.blob(); }).then(function(blob) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename || 'image.webp'; a.click();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
  }).catch(function() { toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D5\u05E8\u05D3\u05D4', 'e'); });
}

function _showFullImage(url) {
  var o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer';
  o.innerHTML = '<img src="' + escapeHtml(url) + '" style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;touch-action:pinch-zoom">' +
    '<button style="position:absolute;top:20px;right:20px;background:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:18px;cursor:pointer">\u2715</button>' +
    '<button onclick="event.stopPropagation();_downloadImage(\'' + escapeHtml(url) + '\',\'' + escapeHtml(_imgCurrentBarcode || 'image') + '.webp\')" style="position:absolute;top:20px;right:70px;background:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:18px;cursor:pointer" title="\u05D4\u05D5\u05E8\u05D3">\u2B07\uFE0F</button>';
  o.onclick = function() { o.remove(); };
  document.body.appendChild(o);
}

function _deleteImage(imageId, storagePath) {
  Modal.confirm({ title: '\u05DE\u05D7\u05D9\u05E7\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4', message: '\u05DC\u05DE\u05D7\u05D5\u05E7 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05D6\u05D5?',
    confirmText: '\u05DE\u05D7\u05E7', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC', onConfirm: function() { _doDeleteImage(imageId, storagePath); } });
}

async function _doDeleteImage(imageId, storagePath) {
  showLoading('\u05DE\u05D5\u05D7\u05E7...');
  try {
    if (storagePath) {
      await sb.storage.from(FRAME_IMAGES_BUCKET).remove([storagePath]);
    }
    await sb.from(T.IMAGES).delete().eq('id', imageId).eq('tenant_id', getTenantId());
    _imgCurrentImages = _imgCurrentImages.filter(function(im) { return im.id !== imageId; });
    _renderImageGrid();
    hideLoading();
    Toast.success('\u05EA\u05DE\u05D5\u05E0\u05D4 \u05E0\u05DE\u05D7\u05E7\u05D4');
    _updateImageBadge();
    writeLog('image_deleted', _imgCurrentInvId, { image_id: imageId });
  } catch (e) {
    hideLoading();
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  }
}
