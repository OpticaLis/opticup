// ai-batch-upload.js — Batch document upload with dedup and drag-drop (Phase 5.5g)
// Load after: shared.js, supabase-ops.js, file-upload.js, debt-documents.js, ai-ocr.js, ai-alerts.js
// Provides: _openBatchUploadModal()

var _batchFiles = [], _batchId = null, _batchSupplierId = null;
var _batchUploadedPaths = [], _batchTimestamp = '', _batchPreviewUrl = null;

async function _computeFileHash(file) {
  var buf = await file.arrayBuffer();
  var hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function _openBatchUploadModal() {
  _batchFiles = [];
  _batchId = null;
  _batchSupplierId = null;
  _batchUploadedPaths = [];
  _batchTimestamp = '';
  var supOpts = '<option value="">\u05D1\u05D7\u05E8 \u05E1\u05E4\u05E7...</option>';
  (_docSuppliers || []).forEach(function(s) {
    supOpts += '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  });
  var html =
    '<div class="modal-overlay" id="batch-upload-modal" style="display:flex" ' +
      'onclick="if(event.target===this)_closeBatchUpload()">' +
    '<div class="modal" style="max-width:700px;width:95%;max-height:90vh;overflow-y:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<h3 style="margin:0;font-size:1.1rem">\uD83D\uDCE4 העלאת מסמכים מרובים</h3>' +
        '<button class="btn-sm" onclick="_closeBatchUpload()">\u2715</button></div>' +
      '<div id="batch-dropzone" style="border:2px dashed var(--g300);border-radius:8px;padding:28px;' +
        'text-align:center;cursor:pointer;margin-bottom:12px" onclick="_batchPickFiles()">' +
        '<div style="font-size:1.2rem;margin-bottom:4px">\uD83D\uDCC1</div>' +
        '<div style="color:var(--g600)">גרור קבצים לכאן</div>' +
        '<div style="color:var(--g400);font-size:.8rem">או לחץ לבחירת קבצים</div>' +
        '<div style="color:var(--g400);font-size:.75rem;margin-top:4px">' +
          'PDF, JPG, PNG (עד 10MB כל קובץ, עד 50 קבצים)</div></div>' +
      '<div id="batch-file-list"></div>' +
      '<div id="batch-summary" style="font-size:.85rem;color:var(--g600);margin:8px 0;display:none"></div>' +
      '<div style="margin:10px 0"><label style="font-size:.85rem;color:var(--g600)">\u05E1\u05E4\u05E7</label>' +
        '<select id="batch-supplier" class="nd-field" onchange="_batchSupplierId=this.value||null;_updateBatchButtons()">' +
          supOpts + '</select></div>' +
      '<div id="batch-progress" style="display:none;margin:10px 0">' +
        '<div style="font-size:.82rem;color:var(--g600);margin-bottom:4px" id="batch-progress-text"></div>' +
        '<div style="height:6px;background:var(--g200);border-radius:3px;overflow:hidden">' +
          '<div id="batch-progress-bar" style="height:100%;background:var(--primary);border-radius:3px;' +
            'width:0%;transition:width .3s"></div></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn btn-g" onclick="_closeBatchUpload()">ביטול</button>' +
        '<button class="btn btn-s" id="batch-btn-upload" onclick="_batchUploadOnly()" disabled>' +
          '\uD83D\uDCE4 העלה בלבד</button>' +
        '<button class="btn btn-s" id="batch-btn-ocr" onclick="_batchUploadAndOCR()" disabled ' +
          'style="background:#27ae60">\uD83D\uDCE4 העלה וסרוק עם AI</button>' +
      '</div></div></div>';
  var ex = $('batch-upload-modal'); if (ex) ex.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  _setupBatchDragDrop();
  window.addEventListener('beforeunload', _batchBeforeUnload);
}

function _setupBatchDragDrop() {
  var dz = $('batch-dropzone'); if (!dz) return;
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
    _batchAddFiles(e.dataTransfer.files);
  });
}

function _batchPickFiles() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png'; inp.multiple = true;
  inp.onchange = function() { if (inp.files.length) _batchAddFiles(inp.files); };
  inp.click();
}

async function _batchAddFiles(fileList) {
  var files = Array.from(fileList);
  if (_batchFiles.length + files.length > 50) {
    toast('מקסימום 50 קבצים בקבוצה', 'e'); return;
  }
  showLoading('בודק קבצים...');
  var newEntries = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!UPLOAD_ALLOWED_TYPES.includes(f.type)) {
      toast(f.name + ' — סוג לא נתמך', 'e'); continue;
    }
    if (f.size > UPLOAD_MAX_SIZE) {
      toast(f.name + ' — גדול מדי (מקס 10MB)', 'e'); continue;
    }
    var hash = await _computeFileHash(f);
    var dupType = 'none', dupDocId = null;
    // Check within current batch + new entries
    var existingDup = _batchFiles.concat(newEntries).find(function(bf) { return bf.hash === hash; });
    if (existingDup) dupType = 'batch';
    newEntries.push({
      file: f, hash: hash, status: 'pending', docId: null,
      dupType: dupType, dupDocId: dupDocId, checked: dupType === 'none', uploadPath: null
    });
  }
  // Check DB for all new hashes
  if (newEntries.length > 0) {
    var hashes = newEntries.map(function(e) { return e.hash; });
    var dbDups = await _batchCheckDBDupes(hashes);
    newEntries.forEach(function(e) {
      if (dbDups[e.hash]) { e.dupType = 'db'; e.dupDocId = dbDups[e.hash]; e.checked = false; }
    });
  }
  _batchFiles = _batchFiles.concat(newEntries);
  hideLoading();
  _renderBatchFileList();
}

async function _batchCheckDBDupes(hashes) {
  var result = {};
  if (!hashes.length) return result;
  try {
    var { data, error } = await sb.from(T.SUP_DOCS).select('id, file_hash')
      .eq('tenant_id', getTenantId()).eq('is_deleted', false)
      .in('file_hash', hashes);
    if (!error && data) data.forEach(function(d) { result[d.file_hash] = d.id; });
  } catch (e) { console.warn('_batchCheckDBDupes error:', e); }
  return result;
}

function _renderBatchFileList() {
  var wrap = $('batch-file-list'); if (!wrap) return;
  if (!_batchFiles.length) {
    wrap.innerHTML = '';
    _updateBatchSummary(); _updateBatchButtons(); return;
  }
  var rows = _batchFiles.map(function(bf, i) {
    var icon = bf.file.type === 'application/pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
    var sizeMB = (bf.file.size / (1024 * 1024)).toFixed(1) + 'MB';
    var statusHtml;
    if (bf.dupType === 'batch') statusHtml = '<span style="color:#e67e22">\u26A0\uFE0F כפול בקבוצה</span>';
    else if (bf.dupType === 'db') statusHtml = '<span style="color:#e67e22">\u26A0\uFE0F כבר קיים במערכת</span>';
    else if (bf.status === 'uploaded') statusHtml = '<span style="color:#27ae60">\u2705 הועלה</span>';
    else if (bf.status === 'failed') statusHtml = '<span style="color:#e74c3c">\u274C נכשל</span>';
    else statusHtml = '<span style="color:#27ae60">\u2705 תקין</span>';
    var name = bf.file.name.length > 25 ? bf.file.name.slice(0, 22) + '...' : bf.file.name;
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;' +
      'border-bottom:1px solid var(--g100);font-size:.85rem">' +
      '<input type="checkbox" ' + (bf.checked ? 'checked' : '') +
        ' onchange="_batchToggleFile(' + i + ')">' +
      '<span style="flex:1">' + icon + ' ' + escapeHtml(name) + '</span>' +
      '<span style="color:var(--g400);font-size:.78rem">' + sizeMB + '</span>' +
      '<span style="font-size:.78rem">' + statusHtml + '</span>' +
      '<button class="btn-sm" onclick="_batchPreviewFile(' + i + ')" title="תצוגה מקדימה">' +
        '\uD83D\uDC41</button>' +
      '<button class="btn-sm" onclick="_batchRemoveFile(' + i + ')" title="הסר">\u2716</button></div>';
  }).join('');
  wrap.innerHTML = rows;
  _updateBatchSummary();
  _updateBatchButtons();
}

function _batchToggleFile(idx) {
  if (_batchFiles[idx]) {
    _batchFiles[idx].checked = !_batchFiles[idx].checked;
    _updateBatchSummary(); _updateBatchButtons();
  }
}

async function _batchRemoveFile(idx) {
  var bf = _batchFiles[idx]; if (!bf) return;
  if (bf.uploadPath) {
    try { await sb.storage.from('supplier-docs').remove([bf.uploadPath]); } catch (e) {}
    _batchUploadedPaths = _batchUploadedPaths.filter(function(p) { return p !== bf.uploadPath; });
  }
  _batchFiles.splice(idx, 1);
  _renderBatchFileList();
}

function _batchPreviewFile(idx) {
  var bf = _batchFiles[idx]; if (!bf) return;
  if (_batchPreviewUrl) URL.revokeObjectURL(_batchPreviewUrl);
  _batchPreviewUrl = URL.createObjectURL(bf.file);
  var ext = bf.file.name.split('.').pop().toLowerCase();
  var content = ext === 'pdf'
    ? '<iframe src="' + _batchPreviewUrl + '" style="width:100%;height:70vh;border:none"></iframe>'
    : '<img src="' + _batchPreviewUrl + '" style="max-width:100%;max-height:70vh;object-fit:contain">';
  var html = '<div class="modal-overlay" id="batch-preview-modal" style="display:flex;z-index:10010" ' +
    'onclick="if(event.target===this)_closeBatchPreview()">' +
    '<div class="modal" style="max-width:800px;width:95%">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
        '<span style="font-size:.9rem">' + escapeHtml(bf.file.name) + '</span>' +
        '<button class="btn-sm" onclick="_closeBatchPreview()">\u2715</button></div>' +
      content + '</div></div>';
  var ex = $('batch-preview-modal'); if (ex) ex.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function _closeBatchPreview() {
  if (_batchPreviewUrl) { URL.revokeObjectURL(_batchPreviewUrl); _batchPreviewUrl = null; }
  var m = $('batch-preview-modal'); if (m) m.remove();
}

function _updateBatchSummary() {
  var el = $('batch-summary'); if (!el) return;
  var total = _batchFiles.length;
  var checked = _batchFiles.filter(function(f) { return f.checked; }).length;
  var dups = _batchFiles.filter(function(f) { return f.dupType !== 'none'; }).length;
  if (total === 0) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.textContent = checked + ' נבחרו מתוך ' + total + (dups > 0 ? ' | ' + dups + ' כפולים' : '');
}

function _updateBatchButtons() {
  var hasChecked = _batchFiles.some(function(f) { return f.checked; });
  var ready = hasChecked && !!_batchSupplierId;
  var btn1 = $('batch-btn-upload'), btn2 = $('batch-btn-ocr');
  if (btn1) btn1.disabled = !ready;
  if (btn2) btn2.disabled = !ready;
}

async function _batchUploadOnly() {
  if (!_batchSupplierId) { toast('\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05E4\u05E7', 'e'); return null; }
  var selected = _batchFiles.filter(function(f) { return f.checked && f.status !== 'uploaded'; });
  if (!selected.length) { toast('\u05D0\u05D9\u05DF \u05E7\u05D1\u05E6\u05D9\u05DD \u05E0\u05D1\u05D7\u05E8\u05D9\u05DD', 'e'); return null; }
  // Resolve default document type
  var docTypes = _docTypes || await fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]]);
  var defaultType = docTypes.find(function(d) { return d.code === 'invoice'; }) || docTypes[0];
  if (!defaultType) { toast('\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05E1\u05D5\u05D2\u05D9 \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', 'e'); return null; }
  _batchId = crypto.randomUUID();
  _batchTimestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  var tid = getTenantId();
  var progWrap = $('batch-progress'), progBar = $('batch-progress-bar'), progText = $('batch-progress-text');
  if (progWrap) progWrap.style.display = 'block';
  // Disable buttons during upload
  var btn1 = $('batch-btn-upload'), btn2 = $('batch-btn-ocr');
  if (btn1) btn1.disabled = true;
  if (btn2) btn2.disabled = true;
  var logs = [], docIds = [];
  for (var i = 0; i < selected.length; i++) {
    var bf = selected[i];
    var pct = Math.round(((i + 1) / selected.length) * 100);
    if (progBar) progBar.style.width = pct + '%';
    if (progText) progText.textContent = 'מעלה ' + (i + 1) + '/' + selected.length + '...';
    try {
      bf.status = 'uploading';
      var safeName = bf.file.name.replace(/[^a-zA-Z0-9._\u0590-\u05FF-]/g, '_');
      var filePath = tid + '/batch_' + _batchTimestamp + '/' + Date.now() + '_' + safeName;
      var { error: upErr } = await sb.storage.from('supplier-docs')
        .upload(filePath, bf.file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      bf.uploadPath = filePath;
      _batchUploadedPaths.push(filePath);
      var intNum = await generateDocInternalNumber();
      var created = await batchCreate(T.SUP_DOCS, [{
        internal_number: intNum, status: 'draft', file_url: filePath, file_name: bf.file.name,
        file_hash: bf.hash, batch_id: _batchId, supplier_id: _batchSupplierId,
        document_type_id: defaultType.id
      }]);
      if (created && created[0]) { bf.docId = created[0].id; docIds.push(created[0].id); }
      bf.status = 'uploaded';
      logs.push({
        action: 'batch_upload',
        details: { document_id: bf.docId, batch_id: _batchId, file_name: bf.file.name }
      });
    } catch (e) {
      console.error('Batch upload error for ' + bf.file.name + ':', e);
      bf.status = 'failed';
      toast('שגיאה בהעלאת ' + bf.file.name, 'e');
    }
    _renderBatchFileList();
  }
  if (logs.length) { try { await batchWriteLog(logs); } catch (e) { console.warn('batchWriteLog error:', e); } }
  if (progWrap) progWrap.style.display = 'none';
  toast(docIds.length + ' מסמכים הועלו בהצלחה');
  return docIds;
}

async function _batchUploadAndOCR() {
  var docIds = await _batchUploadOnly();
  if (!docIds || !docIds.length) return;
  var batchId = _batchId;
  var modal = $('batch-upload-modal'); if (modal) modal.remove();
  window.removeEventListener('beforeunload', _batchBeforeUnload);
  // Trigger batch OCR (implemented in ai-batch-ocr.js)
  if (typeof window._startBatchOCR === 'function') {
    window._startBatchOCR(batchId, docIds);
  } else {
    toast('סריקת AI לא זמינה', 'e');
  }
  if (typeof loadDocumentsTab === 'function') loadDocumentsTab();
}

async function _closeBatchUpload() {
  // Cleanup files uploaded to Storage but not saved as documents
  var unsaved = _batchFiles.filter(function(f) { return f.uploadPath && !f.docId; });
  if (unsaved.length > 0) {
    var paths = unsaved.map(function(f) { return f.uploadPath; });
    try { await sb.storage.from('supplier-docs').remove(paths); } catch (e) {}
  }
  _batchFiles = [];
  _batchUploadedPaths = [];
  var modal = $('batch-upload-modal'); if (modal) modal.remove();
  window.removeEventListener('beforeunload', _batchBeforeUnload);
}

function _batchBeforeUnload() {
  var unsaved = _batchFiles.filter(function(f) { return f.uploadPath && !f.docId; });
  if (unsaved.length > 0) {
    var paths = unsaved.map(function(f) { return f.uploadPath; });
    try { sb.storage.from('supplier-docs').remove(paths); } catch (e) {}
  }
}

// --- Inject toolbar button ---
(function() {
  var _origRenderFilterBar = typeof renderDocFilterBar === 'function' ? renderDocFilterBar : null;
  if (!_origRenderFilterBar) return;
  window.renderDocFilterBar = function() {
    _origRenderFilterBar();
    _injectBatchUploadBtn();
  };
})();

function _injectBatchUploadBtn() {
  var addBtn = document.querySelector('.doc-add-btn');
  if (!addBtn || document.querySelector('.batch-upload-toolbar-btn')) return;
  var btn = document.createElement('button');
  btn.className = 'btn btn-s btn-sm batch-upload-toolbar-btn';
  btn.style.marginRight = '4px';
  btn.textContent = '\uD83D\uDCE4 העלאה מרובה';
  btn.onclick = _openBatchUploadModal;
  addBtn.parentElement.insertBefore(btn, addBtn.nextSibling);
}
