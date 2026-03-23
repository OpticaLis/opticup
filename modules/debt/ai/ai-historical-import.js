// ai-historical-import.js — Historical document import: modal, file management, grouped UI
// Load after: ai-batch-upload.js, ai-batch-ocr.js, supabase-ops.js
// Provides: _openHistoricalImportModal(), _histAddFiles(), _renderHistFileList(),
//   _histToggleFile(), _histToggleGroup(), _histRemoveFile(), _histPickFiles()
// See also: ai-historical-process.js (_groupFilesByBaseNumber, _histStartImport, OCR wait/summary)

var _histFiles = [], _histSupplierId = null, _histDefaultStatus = 'paid';
var _histBatchId = null, _histUploadedPaths = [], _histPreviewUrl = null;
var _histFileGroups = null;

function _openHistoricalImportModal() {
  _histFiles = []; _histSupplierId = null; _histDefaultStatus = 'paid';
  _histBatchId = null; _histUploadedPaths = []; _histFileGroups = null;
  var supOpts = '<option value="">\u05D1\u05D7\u05E8 \u05E1\u05E4\u05E7...</option>';
  (_docSuppliers || []).forEach(function(s) {
    supOpts += '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  });
  var html =
    '<div class="modal-overlay" id="hist-import-modal" style="display:flex" ' +
      'onclick="if(event.target===this)_closeHistImport()">' +
    '<div class="modal" style="max-width:700px;width:95%;max-height:90vh;overflow-y:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<h3 style="margin:0;font-size:1.1rem">\uD83D\uDCE5 \u05D9\u05D9\u05D1\u05D5\u05D0 \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05DD</h3>' +
        '<button class="btn-sm" onclick="_closeHistImport()">\u2715</button></div>' +
      '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;' +
        'margin-bottom:14px;font-size:.88rem;color:#856404">' +
        '\u26A0\uFE0F <strong>\u05DE\u05E6\u05D1 \u05D9\u05D9\u05D1\u05D5\u05D0 \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9</strong> \u2014 \u05D4\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05DC\u05D0 \u05D9\u05E9\u05E4\u05D9\u05E2\u05D5 \u05E2\u05DC \u05D4\u05DE\u05DC\u05D0\u05D9 ' +
        '\u05D5\u05DC\u05D0 \u05D9\u05D9\u05E6\u05E8\u05D5 \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA. \u05D4\u05DD \u05D9\u05DC\u05DE\u05D3\u05D5 \u05D0\u05EA \u05DE\u05E0\u05D5\u05E2 \u05D4-AI.</div>' +
      '<div style="margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:.9rem;margin-bottom:6px">\u05E9\u05DC\u05D1 1: \u05D1\u05D7\u05E8 \u05E1\u05E4\u05E7 (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9)</div>' +
        '<select id="hist-supplier" class="nd-field" onchange="_histSupplierId=this.value||null">' +
          supOpts + '</select></div>' +
      '<div style="margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:.9rem;margin-bottom:6px">\u05E9\u05DC\u05D1 2: \u05D4\u05E2\u05DC\u05D4 \u05E7\u05D1\u05E6\u05D9\u05DD</div>' +
        '<div id="hist-dropzone" style="border:2px dashed var(--g300);border-radius:8px;padding:24px;' +
          'text-align:center;cursor:pointer" onclick="_histPickFiles()">' +
          '<div style="font-size:1.1rem;margin-bottom:4px">\uD83D\uDCC1</div>' +
          '<div style="color:var(--g600);font-size:.88rem">\u05D2\u05E8\u05D5\u05E8 \u05E7\u05D1\u05E6\u05D9\u05DD \u05D0\u05D5 \u05DC\u05D7\u05E5 \u05DC\u05D1\u05D7\u05D9\u05E8\u05D4</div>' +
          '<div style="color:var(--g400);font-size:.75rem;margin-top:4px">' +
            'PDF, JPG, PNG (\u05E2\u05D3 10MB, \u05E2\u05D3 50 \u05E7\u05D1\u05E6\u05D9\u05DD)</div></div></div>' +
      '<div id="hist-file-list"></div>' +
      '<div id="hist-summary" style="font-size:.85rem;color:var(--g600);margin:8px 0;display:none"></div>' +
      '<div style="margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:.9rem;margin-bottom:6px">\u05E9\u05DC\u05D1 3: \u05E1\u05D8\u05D8\u05D5\u05E1 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC</div>' +
        '<div style="display:flex;gap:16px;font-size:.88rem">' +
          '<label><input type="radio" name="hist-status" value="paid" checked ' +
            'onchange="_histDefaultStatus=this.value"> \u05E9\u05D5\u05DC\u05DD</label>' +
          '<label><input type="radio" name="hist-status" value="open" ' +
            'onchange="_histDefaultStatus=this.value"> \u05DC\u05D0 \u05E9\u05D5\u05DC\u05DD</label>' +
          '<label><input type="radio" name="hist-status" value="per_doc" ' +
            'onchange="_histDefaultStatus=this.value"> \u05D0\u05D2\u05D3\u05D9\u05E8 \u05DC\u05DB\u05DC \u05DE\u05E1\u05DE\u05DA</label></div></div>' +
      '<div id="hist-progress" style="display:none;margin:10px 0">' +
        '<div style="font-size:.82rem;color:var(--g600);margin-bottom:4px" id="hist-progress-text"></div>' +
        '<div style="height:6px;background:var(--g200);border-radius:3px;overflow:hidden">' +
          '<div id="hist-progress-bar" style="height:100%;background:var(--primary);border-radius:3px;' +
            'width:0%;transition:width .3s"></div></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="_closeHistImport()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
        '<button class="btn" style="background:#059669;color:#fff" id="hist-start-btn" onclick="_histStartImport()" disabled>' +
          '\u25B6 \u05D4\u05EA\u05D7\u05DC \u05D9\u05D9\u05D1\u05D5\u05D0 + \u05E1\u05E8\u05D9\u05E7\u05EA AI</button></div>' +
    '</div></div>';
  var ex = $('hist-import-modal'); if (ex) ex.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  _setupHistDragDrop();
}

function _setupHistDragDrop() {
  var dz = $('hist-dropzone'); if (!dz) return;
  dz.addEventListener('dragover', function(e) {
    e.preventDefault(); e.stopPropagation();
    dz.style.borderColor = 'var(--primary)'; dz.style.background = 'var(--g100)';
  });
  dz.addEventListener('dragleave', function(e) {
    e.preventDefault(); e.stopPropagation();
    dz.style.borderColor = 'var(--g300)'; dz.style.background = '';
  });
  dz.addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation();
    dz.style.borderColor = 'var(--g300)'; dz.style.background = '';
    _histAddFiles(e.dataTransfer.files);
  });
}

function _histPickFiles() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png'; inp.multiple = true;
  inp.onchange = function() { if (inp.files.length) _histAddFiles(inp.files); };
  inp.click();
}

async function _histAddFiles(fileList) {
  var files = Array.from(fileList);
  if (_histFiles.length + files.length > 50) { toast('\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 50 \u05E7\u05D1\u05E6\u05D9\u05DD', 'e'); return; }
  showLoading('\u05D1\u05D5\u05D3\u05E7 \u05E7\u05D1\u05E6\u05D9\u05DD...');
  var newEntries = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!UPLOAD_ALLOWED_TYPES.includes(f.type)) { toast(f.name + ' \u2014 \u05E1\u05D5\u05D2 \u05DC\u05D0 \u05E0\u05EA\u05DE\u05DA', 'e'); continue; }
    if (f.size > UPLOAD_MAX_SIZE) { toast(f.name + ' \u2014 \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9', 'e'); continue; }
    var hash = await _computeFileHash(f);
    var dupType = 'none';
    var existingDup = _histFiles.concat(newEntries).find(function(bf) { return bf.hash === hash; });
    if (existingDup) dupType = 'batch';
    newEntries.push({ file: f, hash: hash, dupType: dupType, checked: dupType === 'none' });
  }
  if (newEntries.length > 0) {
    var hashes = newEntries.map(function(e) { return e.hash; });
    var dbDups = await _batchCheckDBDupes(hashes);
    newEntries.forEach(function(e) {
      if (dbDups[e.hash]) { e.dupType = 'db'; e.checked = false; }
    });
  }
  _histFiles = _histFiles.concat(newEntries);
  // Sort all files by name for consistent grouping
  _histFiles.sort(function(a, b) { return a.file.name.localeCompare(b.file.name); });
  hideLoading();
  _renderHistFileList();
}

// =========================================================
// Grouped file list rendering
// =========================================================
function _renderHistFileList() {
  var wrap = $('hist-file-list'); if (!wrap) return;
  if (!_histFiles.length) { wrap.innerHTML = ''; _updateHistSummary(); return; }

  // Compute groups from all files (not just checked)
  _histFileGroups = _groupFilesByBaseNumber(_histFiles);
  var groupKeys = Object.keys(_histFileGroups.groups).sort(function(a, b) { return Number(a) - Number(b); });
  var html = '';

  // Render grouped files
  if (groupKeys.length) {
    html += '<div style="font-size:.78rem;color:var(--g500);margin-bottom:4px;font-weight:600">\u05E7\u05D1\u05D5\u05E6\u05D5\u05EA \u05DE\u05E7\u05D5\u05E9\u05E8\u05D5\u05EA:</div>';
    groupKeys.forEach(function(baseNum) {
      var grp = _histFileGroups.groups[baseNum];
      var allChecked = grp.every(function(f) { return _histFindEntry(f).checked; });
      var allDbDup = grp.every(function(f) { return _histFindEntry(f).dupType === 'db'; });
      var groupStatus = allDbDup ? '<span style="color:#e67e22;font-size:.78rem">\u26A0\uFE0F \u05E7\u05D9\u05D9\u05DD</span>' : '';
      html += '<div style="border:1px solid var(--g200);border-radius:8px;margin-bottom:8px;overflow:hidden">' +
        '<div style="background:var(--g100);padding:6px 10px;display:flex;align-items:center;gap:8px;font-size:.88rem">' +
          '<input type="checkbox" ' + (allChecked ? 'checked' : '') +
            ' onchange="_histToggleGroup(\'' + baseNum + '\')">' +
          '<strong>\uD83D\uDCC4 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA ' + escapeHtml(baseNum) + '</strong>' +
          '<span style="color:var(--g500);font-size:.78rem">(' + grp.length + ' \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD)</span>' +
          groupStatus + '</div>';
      grp.forEach(function(gf) {
        var entry = _histFindEntry(gf);
        var idx = _histFiles.indexOf(entry);
        html += _renderHistFileRow(entry, idx);
      });
      html += '</div>';
    });
  }

  // Render ungrouped files
  if (_histFileGroups.ungrouped.length) {
    if (groupKeys.length) html += '<div style="font-size:.78rem;color:var(--g500);margin:8px 0 4px;font-weight:600">\u05E7\u05D1\u05E6\u05D9\u05DD \u05D1\u05D5\u05D3\u05D3\u05D9\u05DD:</div>';
    _histFileGroups.ungrouped.forEach(function(uf) {
      var entry = _histFindEntry(uf);
      var idx = _histFiles.indexOf(entry);
      html += _renderHistFileRow(entry, idx);
    });
  }

  wrap.innerHTML = html;
  _updateHistSummary();
}

function _renderHistFileRow(bf, idx) {
  var icon = bf.file.type === 'application/pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
  var sizeMB = (bf.file.size / (1024 * 1024)).toFixed(1) + 'MB';
  var statusHtml;
  if (bf.dupType === 'batch') statusHtml = '<span style="color:#e67e22">\u26A0\uFE0F \u05DB\u05E4\u05D5\u05DC</span>';
  else if (bf.dupType === 'db') statusHtml = '<span style="color:#e67e22">\u26A0\uFE0F \u05E7\u05D9\u05D9\u05DD</span>';
  else statusHtml = '<span style="color:#27ae60">\u2705</span>';
  var name = bf.file.name.length > 30 ? bf.file.name.slice(0, 27) + '...' : bf.file.name;
  return '<div style="display:flex;align-items:center;gap:8px;padding:4px 10px;' +
    'border-bottom:1px solid var(--g100);font-size:.85rem">' +
    '<input type="checkbox" ' + (bf.checked ? 'checked' : '') +
      ' onchange="_histToggleFile(' + idx + ')">' +
    '<span style="flex:1">' + icon + ' ' + escapeHtml(name) + '</span>' +
    '<span style="color:var(--g400);font-size:.78rem">' + sizeMB + '</span>' +
    '<span style="font-size:.78rem">' + statusHtml + '</span>' +
    '<button class="btn-sm" onclick="_histRemoveFile(' + idx + ')">\u2716</button></div>';
}

// Find the original _histFiles entry matching a grouped file object
function _histFindEntry(gf) {
  return _histFiles.find(function(f) { return f.file === (gf.file || gf) || f === gf; }) || gf;
}

function _histToggleFile(idx) {
  if (_histFiles[idx]) { _histFiles[idx].checked = !_histFiles[idx].checked; _renderHistFileList(); }
}

function _histToggleGroup(baseNum) {
  if (!_histFileGroups || !_histFileGroups.groups[baseNum]) return;
  var grp = _histFileGroups.groups[baseNum];
  var allChecked = grp.every(function(gf) { return _histFindEntry(gf).checked; });
  grp.forEach(function(gf) { var entry = _histFindEntry(gf); entry.checked = !allChecked; });
  _renderHistFileList();
}

function _histRemoveFile(idx) { _histFiles.splice(idx, 1); _renderHistFileList(); }

function _updateHistSummary() {
  var el = $('hist-summary'); if (!el) return;
  var total = _histFiles.length;
  var checked = _histFiles.filter(function(f) { return f.checked; }).length;
  // Count groups + ungrouped for document estimate
  var docCount = 0;
  if (_histFileGroups) {
    var grpKeys = Object.keys(_histFileGroups.groups);
    grpKeys.forEach(function(k) {
      var grp = _histFileGroups.groups[k];
      if (grp.some(function(gf) { return _histFindEntry(gf).checked; })) docCount++;
    });
    _histFileGroups.ungrouped.forEach(function(uf) {
      if (_histFindEntry(uf).checked) docCount++;
    });
  } else { docCount = checked; }
  if (total === 0) { el.style.display = 'none'; } else {
    el.style.display = 'block';
    el.textContent = checked + ' \u05E7\u05D1\u05E6\u05D9\u05DD \u05E0\u05D1\u05D7\u05E8\u05D5 \u2192 ' + docCount + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD';
  }
  var btn = $('hist-start-btn'); if (btn) btn.disabled = !checked;
}

function _closeHistImport() {
  _histFiles = []; _histUploadedPaths = []; _histFileGroups = null;
  var modal = $('hist-import-modal'); if (modal) modal.remove();
}

// --- Inject toolbar button ---
(function() {
  var _prevRenderFilterBar = typeof renderDocFilterBar === 'function' ? renderDocFilterBar : null;
  if (!_prevRenderFilterBar) return;
  window.renderDocFilterBar = function() {
    _prevRenderFilterBar();
    _injectHistImportBtn();
  };
})();

function _injectHistImportBtn() {
  var addBtn = document.querySelector('.doc-add-btn');
  if (!addBtn || document.querySelector('.hist-import-toolbar-btn')) return;
  var btn = document.createElement('button');
  btn.className = 'btn btn-sm hist-import-toolbar-btn';
  btn.style.cssText = 'margin-right:4px;background:var(--success,#10b981);color:#fff';
  btn.textContent = '\uD83D\uDCE5 \u05D9\u05D9\u05D1\u05D5\u05D0 \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9';
  btn.onclick = _openHistoricalImportModal;
  var batchBtn = document.querySelector('.batch-upload-toolbar-btn');
  var ref = batchBtn ? batchBtn.nextSibling : addBtn.nextSibling;
  addBtn.parentElement.insertBefore(btn, ref);
}
