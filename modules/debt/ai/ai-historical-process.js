// ai-historical-process.js — Historical import: file grouping + processing (split from ai-historical-import.js)
// Load after: ai-historical-import.js
// Provides: _groupFilesByBaseNumber(), _histStartImport(), _waitForHistOCRComplete(), _histShowLearningSummary()
// Uses globals: _histFiles, _histSupplierId, _histDefaultStatus, _histBatchId, _histUploadedPaths,
//   _histFileGroups (from ai-historical-import.js)

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
  var docStatus = _histDefaultStatus === 'per_doc' ? 'open' : (_histDefaultStatus === 'draft' ? 'open' : _histDefaultStatus);
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
          try { await saveDocFile(created[0].id, uploadedPaths[ai].path, uploadedPaths[ai].name, ai); } catch (e) { console.warn('saveDocFile skipped:', e.message); }
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
        try { await saveDocFile(created[0].id, filePath, bf.file.name, 0); } catch (e) { console.warn('saveDocFile skipped:', e.message); }
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
  toast(docIds.length + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05D4\u05D5\u05E2\u05DC\u05D5 \u2014 \u05DE\u05EA\u05D7\u05D9\u05DC \u05E1\u05E8\u05D9\u05E7\u05EA AI...');
  var modal = $('hist-import-modal'); if (modal) modal.remove();
  if (typeof window._startBatchOCR === 'function') {
    var origStartBatchOCR = window._startBatchOCR;
    window._startBatchOCR = async function(batchId, ids) {
      window._startBatchOCR = origStartBatchOCR;
      await origStartBatchOCR(batchId, ids);
      _waitForHistOCRComplete(ids);
    };
    window._startBatchOCR(_histBatchId, docIds);
  } else { toast('\u05E1\u05E8\u05D9\u05E7\u05EA AI \u05DC\u05D0 \u05D6\u05DE\u05D9\u05E0\u05D4', 'e'); }
  if (typeof loadDocumentsTab === 'function') loadDocumentsTab();
}

// =========================================================
// Wait for OCR completion + learning summary
// =========================================================
function _waitForHistOCRComplete(docIds) {
  var checkInterval = setInterval(function() {
    if (!_batchOCRState || !_batchOCRState.length) return;
    var allDone = _batchOCRState.every(function(s) {
      return s.status === 'done' || s.status === 'failed';
    });
    if (allDone) {
      clearInterval(checkInterval);
      setTimeout(function() { _histShowLearningSummary(docIds); }, 500);
    }
  }, 1000);
  setTimeout(function() { clearInterval(checkInterval); }, 600000);
}

async function _histShowLearningSummary(docIds) {
  var total = _batchOCRState.length;
  var done = _batchOCRState.filter(function(s) { return s.status === 'done'; }).length;
  var failed = _batchOCRState.filter(function(s) { return s.status === 'failed'; }).length;
  var supplierStats = {};
  for (var i = 0; i < _batchOCRState.length; i++) {
    var item = _batchOCRState[i];
    if (item.status !== 'done' || !item.supplierId) continue;
    var sid = item.ocrResult && item.ocrResult.supplier_match ? item.ocrResult.supplier_match.id : item.supplierId;
    if (!sid) continue;
    if (!supplierStats[sid]) supplierStats[sid] = { count: 0, confSum: 0 };
    supplierStats[sid].count++;
    supplierStats[sid].confSum += item.confidence;
  }
  var statsHtml = '';
  var sids = Object.keys(supplierStats);
  for (var j = 0; j < sids.length; j++) {
    var st = supplierStats[sids[j]];
    var supName = '';
    if (_docSuppliers) {
      var sup = _docSuppliers.find(function(s) { return s.id === sids[j]; });
      if (sup) supName = sup.name;
    }
    var avgConf = Math.round(st.confSum / st.count);
    var accText = '';
    try {
      var { data: tmpls } = await sb.from(T.OCR_TEMPLATES).select('accuracy_rate')
        .eq('supplier_id', sids[j]).eq('tenant_id', getTenantId()).limit(1);
      if (tmpls && tmpls[0]) accText = ' \u2192 \u05D3\u05D9\u05D5\u05E7: ' + Math.round(tmpls[0].accuracy_rate) + '%';
    } catch (e) {}
    statsHtml += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:.88rem">' +
      '<span>' + escapeHtml(supName || '\u05E1\u05E4\u05E7 \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2') + '</span>' +
      '<span style="color:var(--g500)">' + st.count + ' \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD, \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF: ' + avgConf + '%' + accText + '</span></div>';
  }
  if (!statsHtml) statsHtml = '<div style="color:var(--g400);font-size:.88rem">\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9 \u05E1\u05E4\u05E7\u05D9\u05DD</div>';
  var html =
    '<div class="modal-overlay" id="hist-learning-modal" style="display:flex;z-index:10010" ' +
      'onclick="if(event.target===this)this.remove()">' +
    '<div class="modal" style="max-width:500px;width:90%">' +
      '<h3 style="margin:0 0 12px">\uD83D\uDCCA \u05E1\u05D9\u05DB\u05D5\u05DD \u05D9\u05D9\u05D1\u05D5\u05D0 \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px;text-align:center">' +
        '<div><div style="font-size:1.4rem;font-weight:700;color:var(--primary)">' + total + '</div>' +
          '<div style="font-size:.78rem;color:var(--g500)">\u05D4\u05D5\u05E2\u05DC\u05D5</div></div>' +
        '<div><div style="font-size:1.4rem;font-weight:700;color:#27ae60">' + done + '</div>' +
          '<div style="font-size:.78rem;color:var(--g500)">\u05E0\u05E1\u05E8\u05E7\u05D5</div></div>' +
        '<div><div style="font-size:1.4rem;font-weight:700;color:#e74c3c">' + failed + '</div>' +
          '<div style="font-size:.78rem;color:var(--g500)">\u05E0\u05DB\u05E9\u05DC\u05D5</div></div></div>' +
      '<div style="border-top:1px solid var(--g200);padding-top:10px;margin-bottom:10px">' +
        '<div style="font-weight:600;font-size:.9rem;margin-bottom:6px">\uD83E\uDDE0 \u05DC\u05DE\u05D9\u05D3\u05EA AI \u05DC\u05E4\u05D9 \u05E1\u05E4\u05E7:</div>' +
        statsHtml + '</div>' +
      '<div style="background:#e8f5e9;border-radius:6px;padding:10px;font-size:.85rem;color:#2e7d32;margin-bottom:14px">' +
        '\uD83D\uDCA1 \u05D4\u05E1\u05E8\u05D9\u05E7\u05D5\u05EA \u05D4\u05D1\u05D0\u05D5\u05EA \u05DE\u05E1\u05E4\u05E7\u05D9\u05DD \u05D0\u05DC\u05D5 \u05D9\u05D4\u05D9\u05D5 \u05DE\u05D3\u05D5\u05D9\u05E7\u05D5\u05EA \u05DE\u05E9\u05DE\u05E2\u05D5\u05EA\u05D9\u05EA \u05D9\u05D5\u05EA\u05E8!</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="$(\'hist-learning-modal\').remove()">\u05E1\u05D2\u05D5\u05E8</button>' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="$(\'hist-learning-modal\').remove();switchDebtTab(\'documents\')">' +
          '\uD83D\uDCCB \u05E6\u05E4\u05D4 \u05D1\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD</button></div>' +
    '</div></div>';
  var ex = $('hist-learning-modal'); if (ex) ex.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}
