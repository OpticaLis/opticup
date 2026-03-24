// inventory-images.js — Frame image capture, WEBP conversion, upload/delete
// Load after: inventory-table.js, shared.js, supabase-ops.js
var _imgPending = [];       // { blob, previewUrl }
var _imgCurrentInvId = null;
var _imgCurrentImages = [];  // rows from inventory_images
var _imgModalEl = null;
var FRAME_IMAGES_BUCKET = 'frame-images';

async function openImageModal(inventoryId) {
  _imgCurrentInvId = inventoryId;
  _imgPending = [];
  showLoading('טוען תמונות...');
  try {
    var tid = getTenantId();
    var { data: imgs, error: imgErr } = await sb.from(T.IMAGES)
      .select('*').eq('inventory_id', inventoryId).eq('tenant_id', tid)
      .order('sort_order', { ascending: true });
    if (imgErr) throw imgErr;
    _imgCurrentImages = imgs || [];
    var { data: item } = await sb.from(T.INV)
      .select('barcode, brand_id, model').eq('id', inventoryId).eq('tenant_id', tid).single();
    var brandName = item ? (brandCacheRev[item.brand_id] || '') : '';
    var title = '\uD83D\uDCF7 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u2014 ' +
      (brandName ? brandName + ' ' : '') + (item?.model || '') +
      (item?.barcode ? ' (' + item.barcode + ')' : '');
    hideLoading();
    var modal = Modal.show({
      title: title, size: 'lg',
      content: '<div id="img-modal-grid"></div>',
      footer: '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
        '<button class="btn" style="background:#2196F3;color:#fff" id="img-btn-capture">\uD83D\uDCF8 \u05E6\u05DC\u05DD</button>' +
        '<button class="btn" style="background:#4CAF50;color:#fff" id="img-btn-pick">\uD83D\uDCC1 \u05D4\u05E2\u05DC\u05D4</button>' +
        '<button class="btn" style="background:#059669;color:#fff;display:none" id="img-btn-save">\u2B06\uFE0F \u05E9\u05DE\u05D5\u05E8 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA</button>' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="Modal.close()">\u05E1\u05D2\u05D5\u05E8</button>' +
        '</div>',
      closeOnEscape: true, closeOnBackdrop: true
    });
    _imgModalEl = modal.el;
    _renderImageGrid();
    var captureBtn = modal.el.querySelector('#img-btn-capture');
    var pickBtn = modal.el.querySelector('#img-btn-pick');
    var saveBtn = modal.el.querySelector('#img-btn-save');
    if (captureBtn) captureBtn.onclick = _captureImage;
    if (pickBtn) pickBtn.onclick = _pickImage;
    if (saveBtn) saveBtn.onclick = function() { _uploadPendingImages(inventoryId); };
  } catch (e) {
    hideLoading();
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA: ' + (e.message || ''), 'e');
  }
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
    // Existing images
    for (var i = 0; i < _imgCurrentImages.length; i++) {
      var im = _imgCurrentImages[i];
      html += '<div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--g200)">' +
        '<img src="' + encodeURI(im.url) + '" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" loading="lazy">' +
        '<button onclick="_deleteImage(\'' + im.id + '\',\'' + escapeHtml(im.storage_path || '') + '\')" ' +
          'style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px" ' +
          'title="\u05DE\u05D7\u05E7">\u2715</button></div>';
    }
    // Pending images
    for (var j = 0; j < _imgPending.length; j++) {
      html += '<div style="position:relative;border-radius:8px;overflow:hidden;border:2px dashed #4CAF50">' +
        '<img src="' + _imgPending[j].previewUrl + '" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">' +
        '<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(76,175,80,.85);color:#fff;text-align:center;font-size:.75rem;padding:2px">\u05DE\u05DE\u05EA\u05D9\u05DF</span>' +
        '<button onclick="_removePending(' + j + ')" ' +
          'style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px" ' +
          'title="\u05D4\u05E1\u05E8">\u2715</button></div>';
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
      var { data: urlData } = sb.storage.from(FRAME_IMAGES_BUCKET).getPublicUrl(storagePath);
      var publicUrl = urlData ? urlData.publicUrl : '';
      if (!publicUrl) continue;
      await sb.from(T.IMAGES).insert({
        inventory_id: inventoryId, storage_path: storagePath,
        url: publicUrl, file_size: p.blob.size,
        sort_order: _imgCurrentImages.length + i,
        tenant_id: tid
      });
      uploaded++;
      URL.revokeObjectURL(p.previewUrl);
    }
    _imgPending = [];
    // Refresh images from DB
    var { data: fresh } = await sb.from(T.IMAGES).select('*')
      .eq('inventory_id', inventoryId).eq('tenant_id', tid)
      .order('sort_order', { ascending: true });
    _imgCurrentImages = fresh || [];
    _renderImageGrid();
    _updateSaveBtn();
    hideLoading();
    Toast.success(uploaded + ' \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D5');
    writeLog('images_uploaded', inventoryId, { count: uploaded });
  } catch (e) {
    hideLoading();
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05D4: ' + (e.message || ''), 'e');
  }
}

async function _deleteImage(imageId, storagePath) {
  var ok = await Modal.confirm({
    title: '\u05DE\u05D7\u05D9\u05E7\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4',
    message: '\u05DC\u05DE\u05D7\u05D5\u05E7 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05D6\u05D5?',
    confirmText: '\u05DE\u05D7\u05E7', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC'
  });
  if (!ok) return;
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
    writeLog('image_deleted', _imgCurrentInvId, { image_id: imageId });
  } catch (e) {
    hideLoading();
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  }
}
