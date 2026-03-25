// inventory-images-bg.js — Background removal: remove.bg API (primary) + Canvas fallback
// Load after: inventory-images.js, shared.js
var _bgDebounceTimer = null;

// --- Entry point: open comparison modal for an image ---
function _bgRemoveStart(imageUrl, onConfirm) {
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() { _bgShowComparison(img, imageUrl, onConfirm); };
  img.onerror = function() {
    var img2 = new Image();
    img2.onload = function() { _bgShowComparison(img2, imageUrl, onConfirm); };
    img2.onerror = function() { toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05EA\u05DE\u05D5\u05E0\u05D4', 'e'); };
    img2.src = imageUrl;
  };
  img.src = imageUrl;
}

// --- Comparison modal (no threshold slider — remove.bg handles it) ---
function _bgShowComparison(img, originalUrl, onConfirm) {
  var processedUrl = null;
  var processedBlob = null;
  var old = document.getElementById('bg-compare-modal'); if (old) old.remove();
  var modal = document.createElement('div');
  modal.id = 'bg-compare-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:560px;width:95%">' +
      '<h3 style="margin:0 0 12px">\uD83D\uDCAB \u05D4\u05E1\u05E8\u05EA \u05E8\u05E7\u05E2</h3>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<div style="flex:1;text-align:center"><div style="font-size:.78rem;color:var(--g500);margin-bottom:4px">\u05DE\u05E7\u05D5\u05E8</div>' +
          '<img id="bg-img-before" style="width:100%;border-radius:6px;border:1px solid var(--g200)"></div>' +
        '<div style="flex:1;text-align:center"><div style="font-size:.78rem;color:var(--g500);margin-bottom:4px">\u05D0\u05D7\u05E8\u05D9</div>' +
          '<div id="bg-img-after-wrap" style="width:100%;border-radius:6px;border:1px solid var(--g200);aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--g100)">' +
            '<span style="color:var(--g400)">\u05DE\u05E2\u05D1\u05D3...</span></div></div>' +
      '</div>' +
      '<div id="bg-method-info" style="font-size:.75rem;color:var(--g400);text-align:center;margin-bottom:8px"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" id="bg-cancel">\u21A9\uFE0F \u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        '<button class="btn" style="background:#059669;color:#fff" id="bg-confirm" disabled>\u2705 \u05D0\u05E9\u05E8</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('bg-img-before').src = originalUrl;
  // Process via remove.bg API (primary) with Canvas fallback
  _bgProcess(img, 85, function(blob, url) {
    processedBlob = blob; processedUrl = url;
    var wrap = document.getElementById('bg-img-after-wrap');
    if (wrap) wrap.innerHTML = '<img src="' + url + '" style="width:100%;border-radius:6px">';
    var btn = document.getElementById('bg-confirm');
    if (btn) btn.disabled = false;
  });
  // Buttons
  document.getElementById('bg-cancel').onclick = function() {
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    modal.remove();
  };
  document.getElementById('bg-confirm').onclick = function() {
    if (processedBlob && onConfirm) onConfirm(processedBlob);
    modal.remove();
  };
  modal.onclick = function(e) {
    if (e.target === modal) { if (processedUrl) URL.revokeObjectURL(processedUrl); modal.remove(); }
  };
}

// --- Primary: call remove.bg via Edge Function, fallback to Canvas ---
function _bgProcess(img, thresholdPct, callback) {
  var jwt = sessionStorage.getItem('jwt_token');
  if (!jwt) {
    _bgSetMethodInfo('\u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05E7\u05D5\u05DE\u05D9');
    _bgProcessLocal(img, thresholdPct, callback);
    return;
  }
  // Convert image to base64 for API
  var canvas = document.createElement('canvas');
  var w = img.naturalWidth || img.width;
  var h = img.naturalHeight || img.height;
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  var dataUrl;
  try { dataUrl = canvas.toDataURL('image/png'); }
  catch (e) {
    _bgSetMethodInfo('\u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05E7\u05D5\u05DE\u05D9');
    _bgProcessLocal(img, thresholdPct, callback);
    return;
  }
  var base64 = dataUrl.split(',')[1];
  // Call Edge Function
  fetch(SUPABASE_URL + '/functions/v1/remove-background', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + jwt,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ image_base64: base64 })
  })
  .then(function(res) {
    if (!res.ok) throw new Error('API ' + res.status);
    return res.json();
  })
  .then(function(data) {
    if (!data.success || !data.image_base64) throw new Error('No result');
    // Convert base64 PNG to blob
    var bin = atob(data.image_base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var blob = new Blob([bytes], { type: 'image/png' });
    _bgSetMethodInfo('remove.bg');
    callback(blob, URL.createObjectURL(blob));
    writeLog('bg_removal', _imgCurrentInvId, { method: 'remove.bg' });
  })
  .catch(function() {
    Toast.warning('\u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05E1\u05E8\u05EA \u05E8\u05E7\u05E2 \u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF \u2014 \u05DE\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05E7\u05D5\u05DE\u05D9');
    _bgSetMethodInfo('\u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05E7\u05D5\u05DE\u05D9 (\u05D2\u05D9\u05D1\u05D5\u05D9)');
    _bgProcessLocal(img, thresholdPct, callback);
  });
}

// --- Helper: show which method was used ---
function _bgSetMethodInfo(method) {
  var el = document.getElementById('bg-method-info');
  if (el) el.textContent = '\u05E9\u05D9\u05D8\u05D4: ' + method;
}

// --- Fallback: client-side Canvas flood-fill ---
function _bgProcessLocal(img, thresholdPct, callback) {
  var canvas = document.createElement('canvas');
  var w = img.naturalWidth || img.width;
  var h = img.naturalHeight || img.height;
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  var imageData;
  try { imageData = ctx.getImageData(0, 0, w, h); }
  catch (e) {
    toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05D1\u05D3 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05D6\u05D5 \u2014 \u05D1\u05E2\u05D9\u05D9\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA', 'e');
    return;
  }
  var data = imageData.data;
  var dist = thresholdPct / 100 * 255;
  var visited = new Uint8Array(w * h);
  var queue = [];
  var seeds = [[0,0],[w-1,0],[0,h-1],[w-1,h-1],[Math.floor(w/2),0],[Math.floor(w/2),h-1],[0,Math.floor(h/2)],[w-1,Math.floor(h/2)]];
  for (var s = 0; s < seeds.length; s++) {
    var sx = seeds[s][0], sy = seeds[s][1];
    var si = (sy * w + sx) * 4;
    if (_bgIsNearWhite(data, si, dist)) { queue.push(sx, sy); visited[sy * w + sx] = 1; }
  }
  var head = 0;
  while (head < queue.length) {
    var x = queue[head++], y = queue[head++];
    var idx = (y * w + x) * 4;
    data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255;
    var neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
    for (var n = 0; n < 4; n++) {
      var nx = neighbors[n][0], ny = neighbors[n][1];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      var ni = ny * w + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;
      if (_bgIsNearWhite(data, ni * 4, dist)) { queue.push(nx, ny); }
    }
  }
  _bgSoftenEdges(data, visited, w, h);
  ctx.putImageData(imageData, 0, 0);
  canvas.toBlob(function(blob) {
    if (blob) callback(blob, URL.createObjectURL(blob));
    else toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D9\u05D1\u05D5\u05D3', 'e');
  }, 'image/webp', 0.92);
}

function _bgIsNearWhite(data, idx, dist) {
  var r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
  if (a < 128) return true;
  return (255 - r) + (255 - g) + (255 - b) < dist * 3;
}

function _bgSoftenEdges(data, visited, w, h) {
  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var i = y * w + x;
      if (visited[i]) continue;
      var bgCount = 0;
      if (visited[i-1]) bgCount++; if (visited[i+1]) bgCount++;
      if (visited[i-w]) bgCount++; if (visited[i+w]) bgCount++;
      if (bgCount >= 2) {
        var pi = i * 4;
        var blend = 0.4;
        data[pi]   = Math.round(data[pi]   + (255 - data[pi])   * blend);
        data[pi+1] = Math.round(data[pi+1] + (255 - data[pi+1]) * blend);
        data[pi+2] = Math.round(data[pi+2] + (255 - data[pi+2]) * blend);
      }
    }
  }
}

// --- Apply to pending image (replace blob in array) ---
function _bgRemovePending(idx) {
  var p = _imgPending[idx];
  if (!p) return;
  _bgRemoveStart(p.previewUrl, function(newBlob) {
    URL.revokeObjectURL(p.previewUrl);
    _imgPending[idx] = { blob: newBlob, previewUrl: URL.createObjectURL(newBlob) };
    _renderImageGrid();
    _updateSaveBtn();
    Toast.success('\u05E8\u05E7\u05E2 \u05D4\u05D5\u05D7\u05DC\u05E3');
  });
}

// --- Apply to saved image (check for existing _nobg, re-upload to Storage) ---
async function _bgRemoveSaved(imageId, imageUrl, storagePath) {
  // Duplicate check: if image already processed
  if (storagePath && storagePath.indexOf('_nobg') !== -1) {
    var ok = await Modal.confirm({
      title: '\u05EA\u05DE\u05D5\u05E0\u05D4 \u05DB\u05D1\u05E8 \u05DE\u05E2\u05D5\u05D1\u05D3\u05EA',
      message: '\u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DE\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4 \u05DE\u05E2\u05D5\u05D1\u05D3\u05EA \u2014 \u05DC\u05E2\u05D1\u05D3 \u05E9\u05D5\u05D1?',
      confirmText: '\u05DB\u05DF', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC'
    });
    if (!ok) return;
  }
  _bgRemoveStart(imageUrl, async function(newBlob) {
    showLoading('\u05E9\u05D5\u05DE\u05E8 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05EA...');
    try {
      var tid = getTenantId();
      var ext = newBlob.type === 'image/png' ? '.png' : '.webp';
      var contentType = newBlob.type === 'image/png' ? 'image/png' : 'image/webp';
      var newPath = 'frames/' + tid + '/' + _imgCurrentInvId + '/' + Date.now() + '_nobg' + ext;
      var { error: upErr } = await sb.storage.from(FRAME_IMAGES_BUCKET).upload(newPath, newBlob, {
        contentType: contentType, upsert: false
      });
      if (upErr) throw upErr;
      await sb.from(T.IMAGES).update({ url: newPath, storage_path: newPath, file_size: newBlob.size })
        .eq('id', imageId).eq('tenant_id', tid);
      var signedUrl = await _getSignedUrl(newPath);
      var img = _imgCurrentImages.find(function(im) { return im.id === imageId; });
      if (img) { img.url = newPath; img.storage_path = newPath; img._signedUrl = signedUrl; }
      _renderImageGrid();
      hideLoading();
      Toast.success('\u05E8\u05E7\u05E2 \u05D4\u05D5\u05D7\u05DC\u05E3 \u05D5\u05E0\u05E9\u05DE\u05E8');
      writeLog('image_bg_removed', _imgCurrentInvId, { image_id: imageId });
    } catch (e) {
      hideLoading();
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
    }
  });
}
