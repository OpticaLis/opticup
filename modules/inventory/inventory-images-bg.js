// inventory-images-bg.js — White background removal (client-side Canvas)
// Load after: inventory-images.js
// Algorithm: flood-fill from corners, replace near-white pixels with pure white
var _bgDebounceTimer = null;

// --- Entry point: open comparison modal for an image ---
function _bgRemoveStart(imageUrl, onConfirm) {
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() { _bgShowComparison(img, imageUrl, onConfirm); };
  img.onerror = function() {
    // Retry without crossOrigin — image will display but bg removal won't work
    var img2 = new Image();
    img2.onload = function() { _bgShowComparison(img2, imageUrl, onConfirm); };
    img2.onerror = function() { toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05EA\u05DE\u05D5\u05E0\u05D4', 'e'); };
    img2.src = imageUrl;
  };
  img.src = imageUrl;
}

function _bgShowComparison(img, originalUrl, onConfirm) {
  var threshold = 85;
  var processedUrl = null;
  var processedBlob = null;
  var old = document.getElementById('bg-compare-modal'); if (old) old.remove();
  var modal = document.createElement('div');
  modal.id = 'bg-compare-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:560px;width:95%">' +
      '<h3 style="margin:0 0 12px">\uD83D\uDCAB \u05D4\u05E1\u05E8\u05EA \u05E8\u05E7\u05E2 \u05DC\u05D1\u05DF</h3>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<div style="flex:1;text-align:center"><div style="font-size:.78rem;color:var(--g500);margin-bottom:4px">\u05DE\u05E7\u05D5\u05E8</div>' +
          '<img id="bg-img-before" style="width:100%;border-radius:6px;border:1px solid var(--g200)"></div>' +
        '<div style="flex:1;text-align:center"><div style="font-size:.78rem;color:var(--g500);margin-bottom:4px">\u05D0\u05D7\u05E8\u05D9</div>' +
          '<div id="bg-img-after-wrap" style="width:100%;border-radius:6px;border:1px solid var(--g200);aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--g100)">' +
            '<span style="color:var(--g400)">\u05DE\u05E2\u05D1\u05D3...</span></div></div>' +
      '</div>' +
      '<div style="margin-bottom:12px">' +
        '<label style="font-size:.82rem;display:flex;align-items:center;gap:8px">' +
          '\u05E8\u05D2\u05D9\u05E9\u05D5\u05EA' +
          '<input type="range" id="bg-threshold" min="30" max="100" value="' + threshold + '" style="flex:1">' +
          '<span id="bg-threshold-val">' + threshold + '%</span>' +
        '</label>' +
      '</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" id="bg-cancel">\u21A9\uFE0F \u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        '<button class="btn" style="background:#059669;color:#fff" id="bg-confirm" disabled>\u2705 \u05D0\u05E9\u05E8</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('bg-img-before').src = originalUrl;
  // Process with default threshold
  _bgProcess(img, threshold, function(blob, url) {
    processedBlob = blob; processedUrl = url;
    var wrap = document.getElementById('bg-img-after-wrap');
    if (wrap) wrap.innerHTML = '<img src="' + url + '" style="width:100%;border-radius:6px">';
    var btn = document.getElementById('bg-confirm');
    if (btn) btn.disabled = false;
  });
  // Threshold slider
  var slider = document.getElementById('bg-threshold');
  slider.oninput = function() {
    var val = parseInt(slider.value);
    document.getElementById('bg-threshold-val').textContent = val + '%';
    clearTimeout(_bgDebounceTimer);
    _bgDebounceTimer = setTimeout(function() {
      var wrap = document.getElementById('bg-img-after-wrap');
      if (wrap) wrap.innerHTML = '<span style="color:var(--g400)">\u05DE\u05E2\u05D1\u05D3...</span>';
      document.getElementById('bg-confirm').disabled = true;
      _bgProcess(img, val, function(blob, url) {
        if (processedUrl) URL.revokeObjectURL(processedUrl);
        processedBlob = blob; processedUrl = url;
        if (wrap) wrap.innerHTML = '<img src="' + url + '" style="width:100%;border-radius:6px">';
        document.getElementById('bg-confirm').disabled = false;
      });
    }, 300);
  };
  // Buttons
  document.getElementById('bg-cancel').onclick = function() {
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    modal.remove();
  };
  document.getElementById('bg-confirm').onclick = function() {
    if (processedBlob && onConfirm) onConfirm(processedBlob);
    modal.remove();
  };
  modal.onclick = function(e) { if (e.target === modal) { if (processedUrl) URL.revokeObjectURL(processedUrl); modal.remove(); } };
}

// --- Core processing: flood-fill from corners → white ---
function _bgProcess(img, thresholdPct, callback) {
  var canvas = document.createElement('canvas');
  var w = img.naturalWidth || img.width;
  var h = img.naturalHeight || img.height;
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  var imageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch (e) {
    // CORS / SecurityError — canvas tainted by cross-origin image
    toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05D1\u05D3 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05D6\u05D5 \u2014 \u05D1\u05E2\u05D9\u05D9\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA', 'e');
    return;
  }
  var data = imageData.data;
  var dist = thresholdPct / 100 * 255; // max distance from white to count as "background"
  // Flood-fill from 4 corners
  var visited = new Uint8Array(w * h);
  var queue = [];
  // Seed corners + edge midpoints for better coverage
  var seeds = [[0,0],[w-1,0],[0,h-1],[w-1,h-1],[Math.floor(w/2),0],[Math.floor(w/2),h-1],[0,Math.floor(h/2)],[w-1,Math.floor(h/2)]];
  for (var s = 0; s < seeds.length; s++) {
    var sx = seeds[s][0], sy = seeds[s][1];
    var si = (sy * w + sx) * 4;
    if (_bgIsNearWhite(data, si, dist)) { queue.push(sx, sy); visited[sy * w + sx] = 1; }
  }
  // BFS flood fill
  var head = 0;
  while (head < queue.length) {
    var x = queue[head++], y = queue[head++];
    var idx = (y * w + x) * 4;
    // Set to pure white
    data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255;
    // Check 4 neighbors
    var neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
    for (var n = 0; n < 4; n++) {
      var nx = neighbors[n][0], ny = neighbors[n][1];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      var ni = ny * w + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;
      var pi = ni * 4;
      if (_bgIsNearWhite(data, pi, dist)) { queue.push(nx, ny); }
    }
  }
  // Edge softening: for pixels adjacent to both white-bg and non-bg, blend
  _bgSoftenEdges(data, visited, w, h);
  ctx.putImageData(imageData, 0, 0);
  canvas.toBlob(function(blob) {
    if (blob) callback(blob, URL.createObjectURL(blob));
    else toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D9\u05D1\u05D5\u05D3', 'e');
  }, 'image/webp', 0.92);
}

function _bgIsNearWhite(data, idx, dist) {
  var r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
  if (a < 128) return true; // transparent = background
  return (255 - r) + (255 - g) + (255 - b) < dist * 3;
}

function _bgSoftenEdges(data, visited, w, h) {
  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var i = y * w + x;
      if (visited[i]) continue; // already white
      // Count background neighbors
      var bgCount = 0;
      if (visited[i-1]) bgCount++; if (visited[i+1]) bgCount++;
      if (visited[i-w]) bgCount++; if (visited[i+w]) bgCount++;
      if (bgCount >= 2) {
        // Edge pixel — blend toward white
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

// --- Apply to saved image (re-upload to Storage) ---
async function _bgRemoveSaved(imageId, imageUrl, storagePath) {
  _bgRemoveStart(imageUrl, async function(newBlob) {
    showLoading('\u05E9\u05D5\u05DE\u05E8 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05EA...');
    try {
      var tid = getTenantId();
      // Upload replacement (same path = overwrite)
      var newPath = storagePath || ('frames/' + tid + '/' + _imgCurrentInvId + '/' + Date.now() + '_bg.webp');
      var { error: upErr } = await sb.storage.from(FRAME_IMAGES_BUCKET).upload(newPath, newBlob, {
        contentType: 'image/webp', upsert: true
      });
      if (upErr) throw upErr;
      // Store path in DB (not URL — bucket is private, URLs are signed on demand)
      await sb.from(T.IMAGES).update({ url: newPath, storage_path: newPath, file_size: newBlob.size })
        .eq('id', imageId).eq('tenant_id', tid);
      // Get fresh signed URL for display
      var signedUrl = await _getSignedUrl(newPath);
      // Refresh local data
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
