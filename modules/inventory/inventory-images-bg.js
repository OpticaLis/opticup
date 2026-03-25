// inventory-images-bg.js — Background removal: choice dialog → remove.bg API or Canvas
// Load after: inventory-images.js, shared.js
var _bgDebounceTimer = null;

// --- Entry point: show method choice dialog ---
function _bgRemoveStart(imageUrl, onConfirm) {
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() { _bgShowChoiceDialog(img, imageUrl, onConfirm); };
  img.onerror = function() {
    var img2 = new Image();
    img2.onload = function() { _bgShowChoiceDialog(img2, imageUrl, onConfirm); };
    img2.onerror = function() { toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05EA\u05DE\u05D5\u05E0\u05D4', 'e'); };
    img2.src = imageUrl;
  };
  img.src = imageUrl;
}

// --- Choice dialog: AI vs Canvas ---
function _bgShowChoiceDialog(img, originalUrl, onConfirm) {
  var old = document.getElementById('bg-compare-modal'); if (old) old.remove();
  var modal = document.createElement('div');
  modal.id = 'bg-compare-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:440px;width:90%;text-align:center">' +
      '<h3 style="margin:0 0 16px">\uD83D\uDCAB \u05D4\u05E1\u05E8\u05EA \u05E8\u05E7\u05E2 \u2014 \u05D1\u05D7\u05E8 \u05E9\u05D9\u05D8\u05D4</h3>' +
      '<div style="display:flex;gap:12px;margin-bottom:16px">' +
        '<button id="bg-choice-ai" class="btn" style="flex:1;padding:16px 8px;background:#2563eb;color:#fff;border-radius:10px;font-size:14px;cursor:pointer;border:none;display:flex;flex-direction:column;align-items:center;gap:4px">' +
          '<span style="font-size:24px">\uD83E\uDD16</span>' +
          '<b>AI \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9</b>' +
          '<span style="font-size:.75rem;opacity:.85">remove.bg</span>' +
          '<span style="font-size:.7rem;opacity:.7">\u05D0\u05D9\u05DB\u05D5\u05EA \u05D2\u05D1\u05D5\u05D4\u05D4 \u00B7 2\u20135 \u05E9\u05E0\u05D9\u05D5\u05EA</span>' +
        '</button>' +
        '<button id="bg-choice-local" class="btn" style="flex:1;padding:16px 8px;background:#059669;color:#fff;border-radius:10px;font-size:14px;cursor:pointer;border:none;display:flex;flex-direction:column;align-items:center;gap:4px">' +
          '<span style="font-size:24px">\u26A1</span>' +
          '<b>\u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05D4\u05D9\u05E8</b>' +
          '<span style="font-size:.75rem;opacity:.85">\u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05E7\u05D5\u05DE\u05D9</span>' +
          '<span style="font-size:.7rem;opacity:.7">\u05D1\u05E1\u05D9\u05E1\u05D9, \u05DE\u05D9\u05D9\u05D3\u05D9</span>' +
        '</button>' +
      '</div>' +
      '<button class="btn" style="background:#e5e7eb;color:#1e293b;width:100%" id="bg-choice-cancel">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('bg-choice-ai').onclick = function() {
    modal.remove();
    _bgRunAI(img, originalUrl, onConfirm);
  };
  document.getElementById('bg-choice-local').onclick = function() {
    modal.remove();
    _bgRunLocal(img, originalUrl, onConfirm);
  };
  document.getElementById('bg-choice-cancel').onclick = function() { modal.remove(); };
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
}

// --- AI path: call remove.bg Edge Function ---
function _bgRunAI(img, originalUrl, onConfirm) {
  var token = sessionStorage.getItem('prizma_auth_token') || sessionStorage.getItem('jwt_token');
  if (!token) { Toast.error('\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9'); return; }
  // Convert image to base64
  var canvas = document.createElement('canvas');
  var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  var dataUrl;
  try { dataUrl = canvas.toDataURL('image/png'); }
  catch (e) { Toast.error('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05D1\u05D3 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05D6\u05D5'); return; }
  var base64 = dataUrl.split(',')[1];
  showLoading('\uD83E\uDD16 \u05DE\u05E2\u05D1\u05D3 \u05E2\u05DD AI...');
  fetch(SUPABASE_URL + '/functions/v1/remove-background', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64 })
  })
  .then(function(res) {
    if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'API ' + res.status); });
    return res.json();
  })
  .then(function(data) {
    hideLoading();
    if (!data.success || !data.image_base64) throw new Error('\u05DC\u05D0 \u05D4\u05EA\u05E7\u05D1\u05DC \u05EA\u05D5\u05E6\u05D0\u05D4');
    var bin = atob(data.image_base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var blob = new Blob([bytes], { type: 'image/png' });
    _bgShowResult(originalUrl, blob, URL.createObjectURL(blob), 'remove.bg', onConfirm);
    writeLog('bg_removal', _imgCurrentInvId, { method: 'remove.bg' });
  })
  .catch(function(err) {
    hideLoading();
    Toast.error(err.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA AI');
  });
}

// --- Local Canvas path: with threshold slider ---
function _bgRunLocal(img, originalUrl, onConfirm) {
  var threshold = 85;
  var processedUrl = null, processedBlob = null;
  var old = document.getElementById('bg-compare-modal'); if (old) old.remove();
  var modal = document.createElement('div');
  modal.id = 'bg-compare-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:560px;width:95%">' +
      '<h3 style="margin:0 0 12px">\u26A1 \u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05E7\u05D5\u05DE\u05D9</h3>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<div style="flex:1;text-align:center"><div style="font-size:.78rem;color:var(--g500);margin-bottom:4px">\u05DE\u05E7\u05D5\u05E8</div>' +
          '<img id="bg-img-before" style="width:100%;border-radius:6px;border:1px solid var(--g200)"></div>' +
        '<div style="flex:1;text-align:center"><div style="font-size:.78rem;color:var(--g500);margin-bottom:4px">\u05D0\u05D7\u05E8\u05D9</div>' +
          '<div id="bg-img-after-wrap" style="width:100%;border-radius:6px;border:1px solid var(--g200);aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--g100)">' +
            '<span style="color:var(--g400)">\u05DE\u05E2\u05D1\u05D3...</span></div></div>' +
      '</div>' +
      '<div style="margin-bottom:12px">' +
        '<label style="font-size:.82rem;display:flex;align-items:center;gap:8px">\u05E8\u05D2\u05D9\u05E9\u05D5\u05EA' +
          '<input type="range" id="bg-threshold" min="30" max="100" value="' + threshold + '" style="flex:1">' +
          '<span id="bg-threshold-val">' + threshold + '%</span></label></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" id="bg-cancel">\u21A9\uFE0F \u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        '<button class="btn" style="background:#059669;color:#fff" id="bg-confirm" disabled>\u2705 \u05D0\u05E9\u05E8</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById('bg-img-before').src = originalUrl;
  _bgProcessLocal(img, threshold, function(blob, url) {
    processedBlob = blob; processedUrl = url;
    var wrap = document.getElementById('bg-img-after-wrap');
    if (wrap) wrap.innerHTML = '<img src="' + url + '" style="width:100%;border-radius:6px">';
    document.getElementById('bg-confirm').disabled = false;
  });
  var slider = document.getElementById('bg-threshold');
  slider.oninput = function() {
    var val = parseInt(slider.value);
    document.getElementById('bg-threshold-val').textContent = val + '%';
    clearTimeout(_bgDebounceTimer);
    _bgDebounceTimer = setTimeout(function() {
      var wrap = document.getElementById('bg-img-after-wrap');
      if (wrap) wrap.innerHTML = '<span style="color:var(--g400)">\u05DE\u05E2\u05D1\u05D3...</span>';
      document.getElementById('bg-confirm').disabled = true;
      _bgProcessLocal(img, val, function(blob, url) {
        if (processedUrl) URL.revokeObjectURL(processedUrl);
        processedBlob = blob; processedUrl = url;
        if (wrap) wrap.innerHTML = '<img src="' + url + '" style="width:100%;border-radius:6px">';
        document.getElementById('bg-confirm').disabled = false;
      });
    }, 300);
  };
  document.getElementById('bg-cancel').onclick = function() { if (processedUrl) URL.revokeObjectURL(processedUrl); modal.remove(); };
  document.getElementById('bg-confirm').onclick = function() { if (processedBlob && onConfirm) onConfirm(processedBlob); modal.remove(); };
  modal.onclick = function(e) { if (e.target === modal) { if (processedUrl) URL.revokeObjectURL(processedUrl); modal.remove(); } };
}

// --- AI result: before/after comparison (no slider) ---
function _bgShowResult(originalUrl, blob, resultUrl, method, onConfirm) {
  var old = document.getElementById('bg-compare-modal'); if (old) old.remove();
  var modal = document.createElement('div');
  modal.id = 'bg-compare-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:560px;width:95%">' +
      '<h3 style="margin:0 0 12px">\uD83E\uDD16 \u05EA\u05D5\u05E6\u05D0\u05D4 \u2014 ' + escapeHtml(method) + '</h3>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<div style="flex:1;text-align:center"><div style="font-size:.78rem;color:var(--g500);margin-bottom:4px">\u05DE\u05E7\u05D5\u05E8</div>' +
          '<img src="' + escapeHtml(originalUrl) + '" style="width:100%;border-radius:6px;border:1px solid var(--g200)"></div>' +
        '<div style="flex:1;text-align:center"><div style="font-size:.78rem;color:var(--g500);margin-bottom:4px">\u05D0\u05D7\u05E8\u05D9</div>' +
          '<img src="' + resultUrl + '" style="width:100%;border-radius:6px;border:1px solid var(--g200)"></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" id="bg-cancel">\u21A9\uFE0F \u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        '<button class="btn" style="background:#059669;color:#fff" id="bg-confirm">\u2705 \u05D0\u05E9\u05E8</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById('bg-cancel').onclick = function() { URL.revokeObjectURL(resultUrl); modal.remove(); };
  document.getElementById('bg-confirm').onclick = function() { if (onConfirm) onConfirm(blob); modal.remove(); };
  modal.onclick = function(e) { if (e.target === modal) { URL.revokeObjectURL(resultUrl); modal.remove(); } };
}

// --- Canvas flood-fill processing ---
function _bgProcessLocal(img, thresholdPct, callback) {
  var canvas = document.createElement('canvas');
  var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  var imageData;
  try { imageData = ctx.getImageData(0, 0, w, h); }
  catch (e) { toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05D1\u05D3 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05D6\u05D5 \u2014 \u05D1\u05E2\u05D9\u05D9\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA', 'e'); return; }
  var data = imageData.data;
  var dist = thresholdPct / 100 * 255;
  var visited = new Uint8Array(w * h), queue = [];
  var seeds = [[0,0],[w-1,0],[0,h-1],[w-1,h-1],[Math.floor(w/2),0],[Math.floor(w/2),h-1],[0,Math.floor(h/2)],[w-1,Math.floor(h/2)]];
  for (var s = 0; s < seeds.length; s++) {
    var sx = seeds[s][0], sy = seeds[s][1], si = (sy * w + sx) * 4;
    if (_bgIsNearWhite(data, si, dist)) { queue.push(sx, sy); visited[sy * w + sx] = 1; }
  }
  var head = 0;
  while (head < queue.length) {
    var x = queue[head++], y = queue[head++], idx = (y * w + x) * 4;
    data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255;
    var nb = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
    for (var n = 0; n < 4; n++) {
      var nx = nb[n][0], ny = nb[n][1];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      var ni = ny * w + nx;
      if (!visited[ni]) { visited[ni] = 1; if (_bgIsNearWhite(data, ni * 4, dist)) queue.push(nx, ny); }
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
  if (data[idx+3] < 128) return true;
  return (255 - data[idx]) + (255 - data[idx+1]) + (255 - data[idx+2]) < dist * 3;
}

function _bgSoftenEdges(data, visited, w, h) {
  for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
    var i = y * w + x;
    if (visited[i]) continue;
    var bc = 0;
    if (visited[i-1]) bc++; if (visited[i+1]) bc++;
    if (visited[i-w]) bc++; if (visited[i+w]) bc++;
    if (bc >= 2) { var pi = i * 4; for (var c = 0; c < 3; c++) data[pi+c] = Math.round(data[pi+c] + (255 - data[pi+c]) * 0.4); }
  }
}

// --- Apply to pending image ---
function _bgRemovePending(idx) {
  var p = _imgPending[idx]; if (!p) return;
  _bgRemoveStart(p.previewUrl, function(newBlob) {
    URL.revokeObjectURL(p.previewUrl);
    _imgPending[idx] = { blob: newBlob, previewUrl: URL.createObjectURL(newBlob) };
    _renderImageGrid(); _updateSaveBtn();
    Toast.success('\u05E8\u05E7\u05E2 \u05D4\u05D5\u05D7\u05DC\u05E3');
  });
}

// --- Apply to saved image ---
async function _bgRemoveSaved(imageId, imageUrl, storagePath) {
  if (storagePath && storagePath.indexOf('_nobg') !== -1) {
    var ok = await Modal.confirm({ title: '\u05EA\u05DE\u05D5\u05E0\u05D4 \u05DB\u05D1\u05E8 \u05DE\u05E2\u05D5\u05D1\u05D3\u05EA',
      message: '\u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DE\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4 \u05DE\u05E2\u05D5\u05D1\u05D3\u05EA \u2014 \u05DC\u05E2\u05D1\u05D3 \u05E9\u05D5\u05D1?',
      confirmText: '\u05DB\u05DF', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC' });
    if (!ok) return;
  }
  _bgRemoveStart(imageUrl, async function(newBlob) {
    showLoading('\u05E9\u05D5\u05DE\u05E8 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05EA...');
    try {
      var tid = getTenantId();
      var ext = newBlob.type === 'image/png' ? '.png' : '.webp';
      var ct = newBlob.type === 'image/png' ? 'image/png' : 'image/webp';
      var newPath = 'frames/' + tid + '/' + _imgCurrentInvId + '/' + Date.now() + '_nobg' + ext;
      var { error: upErr } = await sb.storage.from(FRAME_IMAGES_BUCKET).upload(newPath, newBlob, { contentType: ct, upsert: false });
      if (upErr) throw upErr;
      await sb.from(T.IMAGES).update({ url: newPath, storage_path: newPath, file_size: newBlob.size })
        .eq('id', imageId).eq('tenant_id', tid);
      var signedUrl = await _getSignedUrl(newPath);
      var im = _imgCurrentImages.find(function(x) { return x.id === imageId; });
      if (im) { im.url = newPath; im.storage_path = newPath; im._signedUrl = signedUrl; }
      _renderImageGrid(); hideLoading();
      Toast.success('\u05E8\u05E7\u05E2 \u05D4\u05D5\u05D7\u05DC\u05E3 \u05D5\u05E0\u05E9\u05DE\u05E8');
      writeLog('image_bg_removed', _imgCurrentInvId, { image_id: imageId });
    } catch (e) { hideLoading(); toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e'); }
  });
}
