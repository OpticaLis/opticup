// ai-historical-process.js — Historical import: file grouping + processing (split from ai-historical-import.js)
// Load after: ai-historical-import.js
// Provides: _groupFilesByBaseNumber(), _histStartImport()
// Uses globals: _histFiles, _histSupplierId, _histBatchId, _histUploadedPaths,
//   _histFileGroups (from ai-historical-import.js)
// Note: Import creates documents as 'draft' — NO OCR during import.

// =========================================================
// File grouping by base number (e.g. "1A.pdf" + "1B.pdf" → group "1")
// =========================================================
function _groupFilesByBaseNumber(files) {
  var regex = /^(\d+)([A-Za-z\u05D0-\u05EA])?\.(.+)$/;
  var groups = {};
  var ungrouped = [];

  files.forEach(function(f) {
    var name = f.file ? f.file.name : (f.name || '');
    var match = name.match(regex);
    if (match) {
      var baseNum = match[1];
      var suffix = match[2] || '';
      if (!groups[baseNum]) groups[baseNum] = [];
      groups[baseNum].push(Object.assign({}, f, { _baseNum: baseNum, _suffix: suffix }));
    } else {
      ungrouped.push(Object.assign({}, f, { _baseNum: null, _suffix: '' }));
    }
  });

  // Sort each group by suffix (A, B, C...)
  Object.values(groups).forEach(function(g) {
    g.sort(function(a, b) { return a._suffix.localeCompare(b._suffix); });
  });

  // Solo files without letter suffix AND group has only 1 file → ungrouped
  Object.keys(groups).forEach(function(baseNum) {
    if (groups[baseNum].length === 1 && !groups[baseNum][0]._suffix) {
      ungrouped.push(groups[baseNum][0]);
      delete groups[baseNum];
    }
  });

  return { groups: groups, ungrouped: ungrouped };
}

// =========================================================
// Main import flow — group-aware processing
// =========================================================
async function _histStartImport() {
  var selected = _histFiles.filter(function(f) { return f.checked; });
  if (!selected.length) { toast('\u05D0\u05D9\u05DF \u05E7\u05D1\u05E6\u05D9\u05DD \u05E0\u05D1\u05D7\u05E8\u05D9\u05DD', 'e'); return; }
  _histBatchId = crypto.randomUUID();
  var timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  var tid = getTenantId();
  var progWrap = $('hist-progress'), progBar = $('hist-progress-bar'), progText = $('hist-progress-text');
  if (progWrap) progWrap.style.display = 'block';
  var btn = $('hist-start-btn'); if (btn) btn.disabled = true;
  if (!_histSupplierId) { toast('\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05E4\u05E7', 'e'); return; }
  var docTypes = _docTypes.length ? _docTypes : await fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]]);
  var defaultType = docTypes.find(function(d) { return d.code === 'invoice'; }) || docTypes[0];
  if (!defaultType) { toast('\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05E1\u05D5\u05D2\u05D9 \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', 'e'); return; }
  var todayStr = new Date().toISOString().slice(0, 10);
  var docStatus = 'draft';
  var docIds = [], logs = [];

  // Group selected files
  var grouped = _groupFilesByBaseNumber(selected);
  var groupKeys = Object.keys(grouped.groups).sort(function(a, b) { return Number(a) - Number(b); });
  var totalItems = groupKeys.length + grouped.ungrouped.length;
  var itemIdx = 0;

  // --- Process GROUPS ---
  for (var gi = 0; gi < groupKeys.length; gi++) {
    var baseNum = groupKeys[gi];
    var grpFiles = grouped.groups[baseNum];
    itemIdx++;
    var pct = Math.round((itemIdx / totalItems) * 100);
    if (progBar) progBar.style.width = pct + '%';
    if (progText) progText.textContent = '\u05DE\u05E2\u05DC\u05D4 \u05E7\u05D1\u05D5\u05E6\u05D4 ' + baseNum + ' (' + grpFiles.length + ' \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD)...';
    try {
      // Upload all files in group
      var uploadedPaths = [];
      for (var fi = 0; fi < grpFiles.length; fi++) {
        var bf = grpFiles[fi];
        var ext = (bf.file.name.match(/\.([a-zA-Z0-9]+)$/) || ['', 'bin'])[1].toLowerCase();
        var filePath = tid + '/batch_' + timestamp + '/' + Date.now() + '_G' + baseNum + '_' + (fi + 1) + '.' + ext;
        var { error: upErr } = await sb.storage.from('supplier-docs')
          .upload(filePath, bf.file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        _histUploadedPaths.push(filePath);
        uploadedPaths.push({ path: filePath, name: bf.file.name, hash: bf.hash });
      }
      // Create ONE document for the group
      var intNum = await generateDocInternalNumber();
      var docNum = 'HIST-' + timestamp + '-G' + baseNum;
      var docRow = {
        internal_number: intNum, document_number: docNum,
        document_type_id: defaultType.id, supplier_id: _histSupplierId,
        document_date: todayStr, subtotal: 0, vat_amount: 0, total_amount: 0,
        status: docStatus, file_url: uploadedPaths[0].path, file_name: uploadedPaths[0].name,
        file_hash: uploadedPaths[0].hash, batch_id: _histBatchId, is_historical: true
      };
      var created = null;
      try {
        created = await batchCreate(T.SUP_DOCS, [docRow]);
      } catch (dupErr) {
        if (dupErr.message && (dupErr.message.includes('unique') || dupErr.message.includes('duplicate') || dupErr.message.includes('23505'))) {
          docRow.internal_number = await generateDocInternalNumber();
          created = await batchCreate(T.SUP_DOCS, [docRow]);
        } else { throw dupErr; }
      }
      if (created && created[0]) {
        docIds.push(created[0].id);
        // Attach all files to supplier_document_files
        for (var ai = 0; ai < uploadedPaths.length; ai++) {
          try { await saveDocFile(created[0].id, uploadedPaths[ai].path, uploadedPaths[ai].name, ai); } catch (e) { console.error('saveDocFile FAILED:', e.message, e); }
        }
      }
      logs.push({
        action: 'historical_import',
        details: { batch_id: _histBatchId, group: baseNum, files: grpFiles.length, is_historical: true }
      });
    } catch (e) {
      console.error('Historical group upload error:', baseNum, e, JSON.stringify(e));
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05EA \u05E7\u05D1\u05D5\u05E6\u05D4 ' + baseNum + ': ' + (e.message || e.statusCode || 'unknown'), 'e');
    }
  }

  // --- Process UNGROUPED files (one doc per file) ---
  for (var ui = 0; ui < grouped.ungrouped.length; ui++) {
    var bf = grouped.ungrouped[ui];
    itemIdx++;
    var pct = Math.round((itemIdx / totalItems) * 100);
    if (progBar) progBar.style.width = pct + '%';
    if (progText) progText.textContent = '\u05DE\u05E2\u05DC\u05D4 ' + itemIdx + '/' + totalItems + '...';
    try {
      var ext = (bf.file.name.match(/\.([a-zA-Z0-9]+)$/) || ['', 'bin'])[1].toLowerCase();
      var filePath = tid + '/batch_' + timestamp + '/' + Date.now() + '_' + (ui + 1) + '.' + ext;
      var { error: upErr } = await sb.storage.from('supplier-docs')
        .upload(filePath, bf.file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      _histUploadedPaths.push(filePath);
      var intNum = await generateDocInternalNumber();
      var docNum = 'HIST-' + timestamp + '-' + (ui + 1);
      var docRow = {
        internal_number: intNum, document_number: docNum,
        document_type_id: defaultType.id, supplier_id: _histSupplierId,
        document_date: todayStr, subtotal: 0, vat_amount: 0, total_amount: 0,
        status: docStatus, file_url: filePath, file_name: bf.file.name,
        file_hash: bf.hash, batch_id: _histBatchId, is_historical: true
      };
      var created = null;
      try {
        created = await batchCreate(T.SUP_DOCS, [docRow]);
      } catch (dupErr) {
        if (dupErr.message && (dupErr.message.includes('unique') || dupErr.message.includes('duplicate') || dupErr.message.includes('23505'))) {
          docRow.internal_number = await generateDocInternalNumber();
          created = await batchCreate(T.SUP_DOCS, [docRow]);
        } else { throw dupErr; }
      }
      if (created && created[0]) {
        docIds.push(created[0].id);
        try { await saveDocFile(created[0].id, filePath, bf.file.name, 0); } catch (e) { console.error('saveDocFile FAILED:', e.message, e); }
      }
      logs.push({
        action: 'historical_import',
        details: { batch_id: _histBatchId, file_name: bf.file.name, is_historical: true }
      });
    } catch (e) {
      console.error('Historical upload error:', bf.file.name, e, JSON.stringify(e));
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05EA ' + bf.file.name + ': ' + (e.message || e.statusCode || 'unknown'), 'e');
    }
  }

  if (logs.length) { try { await batchWriteLog(logs); } catch (e) {} }
  if (progWrap) progWrap.style.display = 'none';
  if (!docIds.length) { toast('\u05DC\u05D0 \u05D4\u05D5\u05E2\u05DC\u05D5 \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', 'e'); return; }
  var totalFiles = selected.length;
  toast('\u05D4\u05D5\u05E2\u05DC\u05D5 ' + docIds.length + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD (' + totalFiles + ' \u05E7\u05D1\u05E6\u05D9\u05DD)', 's');
  var modal = $('hist-import-modal'); if (modal) modal.remove();
  if (typeof loadDocumentsTab === 'function') loadDocumentsTab();
}

