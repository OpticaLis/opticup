// ai-historical-import.js — Historical document import with AI learning (Phase 5.5h-2)
// Load after: ai-batch-upload.js, ai-batch-ocr.js, supabase-ops.js
// Provides: _openHistoricalImportModal()
// Reuses: _computeFileHash, _batchCheckDBDupes from ai-batch-upload.js
//         window._startBatchOCR from ai-batch-ocr.js

var _histFiles = [], _histSupplierId = null, _histDefaultStatus = 'paid';
var _histBatchId = null, _histUploadedPaths = [], _histPreviewUrl = null;

function _openHistoricalImportModal() {
  _histFiles = []; _histSupplierId = null; _histDefaultStatus = 'paid';
  _histBatchId = null; _histUploadedPaths = [];
  var supOpts = '<option value="">\u05D1\u05D7\u05E8 \u05E1\u05E4\u05E7...</option>';
  (_docSuppliers || []).forEach(function(s) {
    supOpts += '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>';
  });
  var html =
    '<div class="modal-overlay" id="hist-import-modal" style="display:flex" ' +
      'onclick="if(event.target===this)_closeHistImport()">' +
    '<div class="modal" style="max-width:700px;width:95%;max-height:90vh;overflow-y:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<h3 style="margin:0;font-size:1.1rem">\uD83D\uDCE5 ייבוא מסמכים היסטוריים</h3>' +
        '<button class="btn-sm" onclick="_closeHistImport()">\u2715</button></div>' +
      '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;' +
        'margin-bottom:14px;font-size:.88rem;color:#856404">' +
        '\u26A0\uFE0F <strong>מצב ייבוא היסטורי</strong> — המסמכים לא ישפיעו על המלאי ' +
        'ולא ייצרו התראות. הם ילמדו את מנוע ה-AI.</div>' +
      '<div style="margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:.9rem;margin-bottom:6px">שלב 1: בחר ספק (אופציונלי)</div>' +
        '<select id="hist-supplier" class="nd-field" onchange="_histSupplierId=this.value||null">' +
          supOpts + '</select></div>' +
      '<div style="margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:.9rem;margin-bottom:6px">שלב 2: העלה קבצים</div>' +
        '<div id="hist-dropzone" style="border:2px dashed var(--g300);border-radius:8px;padding:24px;' +
          'text-align:center;cursor:pointer" onclick="_histPickFiles()">' +
          '<div style="font-size:1.1rem;margin-bottom:4px">\uD83D\uDCC1</div>' +
          '<div style="color:var(--g600);font-size:.88rem">גרור קבצים או לחץ לבחירה</div>' +
          '<div style="color:var(--g400);font-size:.75rem;margin-top:4px">' +
            'PDF, JPG, PNG (עד 10MB, עד 50 קבצים)</div></div></div>' +
      '<div id="hist-file-list"></div>' +
      '<div id="hist-summary" style="font-size:.85rem;color:var(--g600);margin:8px 0;display:none"></div>' +
      '<div style="margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:.9rem;margin-bottom:6px">שלב 3: סטטוס ברירת מחדל</div>' +
        '<div style="display:flex;gap:16px;font-size:.88rem">' +
          '<label><input type="radio" name="hist-status" value="paid" checked ' +
            'onchange="_histDefaultStatus=this.value"> שולם</label>' +
          '<label><input type="radio" name="hist-status" value="open" ' +
            'onchange="_histDefaultStatus=this.value"> לא שולם</label>' +
          '<label><input type="radio" name="hist-status" value="per_doc" ' +
            'onchange="_histDefaultStatus=this.value"> אגדיר לכל מסמך</label></div></div>' +
      '<div id="hist-progress" style="display:none;margin:10px 0">' +
        '<div style="font-size:.82rem;color:var(--g600);margin-bottom:4px" id="hist-progress-text"></div>' +
        '<div style="height:6px;background:var(--g200);border-radius:3px;overflow:hidden">' +
          '<div id="hist-progress-bar" style="height:100%;background:var(--primary);border-radius:3px;' +
            'width:0%;transition:width .3s"></div></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="_closeHistImport()">ביטול</button>' +
        '<button class="btn" style="background:#059669;color:#fff" id="hist-start-btn" onclick="_histStartImport()" disabled>' +
          '\u25B6 התחל ייבוא + סריקת AI</button></div>' +
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
  if (_histFiles.length + files.length > 50) { toast('מקסימום 50 קבצים', 'e'); return; }
  showLoading('בודק קבצים...');
  var newEntries = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!UPLOAD_ALLOWED_TYPES.includes(f.type)) { toast(f.name + ' — סוג לא נתמך', 'e'); continue; }
    if (f.size > UPLOAD_MAX_SIZE) { toast(f.name + ' — גדול מדי', 'e'); continue; }
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
  hideLoading();
  _renderHistFileList();
}

function _renderHistFileList() {
  var wrap = $('hist-file-list'); if (!wrap) return;
  if (!_histFiles.length) {
    wrap.innerHTML = ''; _updateHistSummary(); return;
  }
  var rows = _histFiles.map(function(bf, i) {
    var icon = bf.file.type === 'application/pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
    var sizeMB = (bf.file.size / (1024 * 1024)).toFixed(1) + 'MB';
    var statusHtml;
    if (bf.dupType === 'batch') statusHtml = '<span style="color:#e67e22">\u26A0\uFE0F כפול</span>';
    else if (bf.dupType === 'db') statusHtml = '<span style="color:#e67e22">\u26A0\uFE0F קיים</span>';
    else statusHtml = '<span style="color:#27ae60">\u2705</span>';
    var name = bf.file.name.length > 25 ? bf.file.name.slice(0, 22) + '...' : bf.file.name;
    return '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;' +
      'border-bottom:1px solid var(--g100);font-size:.85rem">' +
      '<input type="checkbox" ' + (bf.checked ? 'checked' : '') +
        ' onchange="_histToggleFile(' + i + ')">' +
      '<span style="flex:1">' + icon + ' ' + escapeHtml(name) + '</span>' +
      '<span style="color:var(--g400);font-size:.78rem">' + sizeMB + '</span>' +
      '<span style="font-size:.78rem">' + statusHtml + '</span>' +
      '<button class="btn-sm" onclick="_histRemoveFile(' + i + ')">\u2716</button></div>';
  }).join('');
  wrap.innerHTML = rows;
  _updateHistSummary();
}

function _histToggleFile(idx) {
  if (_histFiles[idx]) { _histFiles[idx].checked = !_histFiles[idx].checked; _updateHistSummary(); }
}
function _histRemoveFile(idx) { _histFiles.splice(idx, 1); _renderHistFileList(); }

function _updateHistSummary() {
  var el = $('hist-summary'); if (!el) return;
  var total = _histFiles.length;
  var checked = _histFiles.filter(function(f) { return f.checked; }).length;
  if (total === 0) { el.style.display = 'none'; } else {
    el.style.display = 'block';
    el.textContent = checked + ' נבחרו מתוך ' + total;
  }
  var btn = $('hist-start-btn'); if (btn) btn.disabled = !checked;
}

// --- Main import flow ---
async function _histStartImport() {
  var selected = _histFiles.filter(function(f) { return f.checked; });
  if (!selected.length) { toast('אין קבצים נבחרים', 'e'); return; }
  _histBatchId = crypto.randomUUID();
  var timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  var tid = getTenantId();
  var progWrap = $('hist-progress'), progBar = $('hist-progress-bar'), progText = $('hist-progress-text');
  if (progWrap) progWrap.style.display = 'block';
  var btn = $('hist-start-btn'); if (btn) btn.disabled = true;
  if (!_histSupplierId) { toast('\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05E4\u05E7', 'e'); return; }
  var docTypes = _docTypes || await fetchAll(T.DOC_TYPES, [['is_active', 'eq', true]]);
  var defaultType = docTypes.find(function(d) { return d.code === 'invoice'; }) || docTypes[0];
  if (!defaultType) { toast('\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05E1\u05D5\u05D2\u05D9 \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', 'e'); return; }
  var todayStr = new Date().toISOString().slice(0, 10);
  var docIds = [], logs = [];
  for (var i = 0; i < selected.length; i++) {
    var bf = selected[i];
    var pct = Math.round(((i + 1) / selected.length) * 100);
    if (progBar) progBar.style.width = pct + '%';
    if (progText) progText.textContent = '\u05DE\u05E2\u05DC\u05D4 ' + (i + 1) + '/' + selected.length + '...';
    try {
      var ext = (bf.file.name.match(/\.([a-zA-Z0-9]+)$/) || ['', 'bin'])[1].toLowerCase();
      var filePath = tid + '/batch_' + timestamp + '/' + Date.now() + '_' + (i + 1) + '.' + ext;
      var { error: upErr } = await sb.storage.from('supplier-docs')
        .upload(filePath, bf.file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      _histUploadedPaths.push(filePath);
      var intNum = await generateDocInternalNumber();
      var docStatus = _histDefaultStatus === 'per_doc' ? 'open' : (_histDefaultStatus === 'draft' ? 'open' : _histDefaultStatus);
      var docNum = 'HIST-' + timestamp + '-' + (i + 1);
      var created = await batchCreate(T.SUP_DOCS, [{
        internal_number: intNum, document_number: docNum,
        document_type_id: defaultType.id, supplier_id: _histSupplierId,
        document_date: todayStr, subtotal: 0, vat_amount: 0, total_amount: 0,
        status: docStatus, file_url: filePath, file_name: bf.file.name,
        file_hash: bf.hash, batch_id: _histBatchId, is_historical: true
      }]);
      if (created && created[0]) docIds.push(created[0].id);
      logs.push({
        action: 'historical_import',
        details: { batch_id: _histBatchId, file_name: bf.file.name, is_historical: true }
      });
    } catch (e) {
      console.error('Historical upload error:', bf.file.name, e, JSON.stringify(e));
      toast('שגיאה בהעלאת ' + bf.file.name + ': ' + (e.message || e.statusCode || 'unknown'), 'e');
    }
  }
  if (logs.length) { try { await batchWriteLog(logs); } catch (e) {} }
  if (progWrap) progWrap.style.display = 'none';
  if (!docIds.length) { toast('לא הועלו מסמכים', 'e'); return; }
  toast(docIds.length + ' מסמכים הועלו — מתחיל סריקת AI...');
  // Close import modal
  var modal = $('hist-import-modal'); if (modal) modal.remove();
  // Start batch OCR with historical flag
  if (typeof window._startBatchOCR === 'function') {
    // Store reference to show learning summary after OCR completes
    var origStartBatchOCR = window._startBatchOCR;
    window._startBatchOCR = async function(batchId, ids) {
      window._startBatchOCR = origStartBatchOCR; // restore
      await origStartBatchOCR(batchId, ids);
      // After OCR panel is shown, wait for completion to show learning summary
      _waitForHistOCRComplete(ids);
    };
    window._startBatchOCR(_histBatchId, docIds);
  } else {
    toast('סריקת AI לא זמינה', 'e');
  }
  if (typeof loadDocumentsTab === 'function') loadDocumentsTab();
}

// --- Wait for OCR completion and show learning summary ---
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
  // Safety timeout: stop checking after 10 minutes
  setTimeout(function() { clearInterval(checkInterval); }, 600000);
}

// --- Learning summary ---
async function _histShowLearningSummary(docIds) {
  var total = _batchOCRState.length;
  var done = _batchOCRState.filter(function(s) { return s.status === 'done'; }).length;
  var failed = _batchOCRState.filter(function(s) { return s.status === 'failed'; }).length;
  // Gather per-supplier stats
  var supplierStats = {};
  for (var i = 0; i < _batchOCRState.length; i++) {
    var item = _batchOCRState[i];
    if (item.status !== 'done' || !item.supplierId) continue;
    var sid = item.ocrResult && item.ocrResult.supplier_match ? item.ocrResult.supplier_match.id : item.supplierId;
    if (!sid) continue;
    if (!supplierStats[sid]) supplierStats[sid] = { count: 0, confSum: 0, name: '' };
    supplierStats[sid].count++;
    supplierStats[sid].confSum += item.confidence;
  }
  // Get supplier names and template accuracy
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
    // Try to get template accuracy
    var accText = '';
    try {
      var { data: tmpls } = await sb.from(T.OCR_TEMPLATES).select('accuracy_rate')
        .eq('supplier_id', sids[j]).eq('tenant_id', getTenantId()).limit(1);
      if (tmpls && tmpls[0]) accText = ' \u2192 דיוק: ' + Math.round(tmpls[0].accuracy_rate) + '%';
    } catch (e) {}
    statsHtml += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:.88rem">' +
      '<span>' + escapeHtml(supName || 'ספק לא ידוע') + '</span>' +
      '<span style="color:var(--g500)">' + st.count + ' מסמכים, ביטחון: ' + avgConf + '%' + accText + '</span></div>';
  }
  if (!statsHtml) statsHtml = '<div style="color:var(--g400);font-size:.88rem">אין נתוני ספקים</div>';
  var html =
    '<div class="modal-overlay" id="hist-learning-modal" style="display:flex;z-index:10010" ' +
      'onclick="if(event.target===this)this.remove()">' +
    '<div class="modal" style="max-width:500px;width:90%">' +
      '<h3 style="margin:0 0 12px">\uD83D\uDCCA סיכום ייבוא היסטורי</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px;text-align:center">' +
        '<div><div style="font-size:1.4rem;font-weight:700;color:var(--primary)">' + total + '</div>' +
          '<div style="font-size:.78rem;color:var(--g500)">הועלו</div></div>' +
        '<div><div style="font-size:1.4rem;font-weight:700;color:#27ae60">' + done + '</div>' +
          '<div style="font-size:.78rem;color:var(--g500)">נסרקו</div></div>' +
        '<div><div style="font-size:1.4rem;font-weight:700;color:#e74c3c">' + failed + '</div>' +
          '<div style="font-size:.78rem;color:var(--g500)">נכשלו</div></div></div>' +
      '<div style="border-top:1px solid var(--g200);padding-top:10px;margin-bottom:10px">' +
        '<div style="font-weight:600;font-size:.9rem;margin-bottom:6px">\uD83E\uDDE0 למידת AI לפי ספק:</div>' +
        statsHtml + '</div>' +
      '<div style="background:#e8f5e9;border-radius:6px;padding:10px;font-size:.85rem;color:#2e7d32;margin-bottom:14px">' +
        '\uD83D\uDCA1 הסריקות הבאות מספקים אלו יהיו מדויקות משמעותית יותר!</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="$(\'hist-learning-modal\').remove()">סגור</button>' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="$(\'hist-learning-modal\').remove();switchDebtTab(\'documents\')">' +
          '\uD83D\uDCCB צפה במסמכים</button></div>' +
    '</div></div>';
  var ex = $('hist-learning-modal'); if (ex) ex.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function _closeHistImport() {
  _histFiles = []; _histUploadedPaths = [];
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
  btn.textContent = '\uD83D\uDCE5 ייבוא היסטורי';
  btn.onclick = _openHistoricalImportModal;
  // Insert after batch upload button if it exists, otherwise after add button
  var batchBtn = document.querySelector('.batch-upload-toolbar-btn');
  var ref = batchBtn ? batchBtn.nextSibling : addBtn.nextSibling;
  addBtn.parentElement.insertBefore(btn, ref);
}
