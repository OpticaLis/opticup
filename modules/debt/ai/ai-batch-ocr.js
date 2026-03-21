// ai-batch-ocr.js — Batch OCR processing with pipelining and resume (Phase 5.5h-1)
// Load after: ai-batch-upload.js, ai-ocr.js, supabase-ops.js
// Provides: window._startBatchOCR(batchId, docIds)

var _batchOCRState = []; // [{docId, fileName, fileUrl, supplierId, status, ocrResult, validationErrors, confidence, extractionId}]
var _batchOCRPaused = false;
var _batchOCRBatchId = null;
var _batchOCRCurrentIdx = -1;

// --- Entry point (called from ai-batch-upload.js) ---
window._startBatchOCR = async function(batchId, docIds) {
  _batchOCRBatchId = batchId;
  _batchOCRPaused = false;
  _batchOCRCurrentIdx = -1;
  // Fetch document records to get file_url and supplier_id
  _batchOCRState = [];
  for (var i = 0; i < docIds.length; i++) {
    try {
      var { data } = await sb.from(T.SUP_DOCS).select('id, file_url, file_name, supplier_id')
        .eq('id', docIds[i]).single();
      if (data) {
        _batchOCRState.push({
          docId: data.id, fileName: data.file_name || '', fileUrl: data.file_url,
          supplierId: data.supplier_id, status: 'pending', ocrResult: null,
          validationErrors: [], confidence: 0, extractionId: null
        });
      }
    } catch (e) { console.warn('Failed to fetch doc ' + docIds[i], e); }
  }
  if (!_batchOCRState.length) { toast('אין מסמכים לסריקה', 'e'); return; }
  _showBatchOCRPanel();
  _processNextInQueue();
};

// --- Show progress panel ---
function _showBatchOCRPanel() {
  var ex = $('batch-ocr-panel'); if (ex) ex.remove();
  var html =
    '<div class="modal-overlay" id="batch-ocr-panel" style="display:flex" ' +
      'onclick="if(event.target===this)return">' +
    '<div class="modal" style="max-width:700px;width:95%;max-height:90vh;overflow-y:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<h3 style="margin:0;font-size:1.1rem">\uD83E\uDD16 סריקה מרובה</h3>' +
        '<button class="btn-sm" onclick="_closeBatchOCRPanel()">\u2715</button></div>' +
      '<div id="batch-ocr-progress" style="font-size:.85rem;color:var(--g600);margin-bottom:10px"></div>' +
      '<div id="batch-ocr-list"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
        '<button class="btn btn-sm" id="batch-ocr-pause" onclick="_batchOCRTogglePause()" ' +
          'style="background:#e5e7eb;color:#1e293b">\u23F8 השהה תור</button>' +
        '<button class="btn btn-sm" onclick="_batchOCRRetryFailed()" ' +
          'style="background:#e5e7eb;color:#1e293b">\uD83D\uDD04 נסה כושלים</button>' +
        '<button class="btn btn-sm" id="batch-ocr-approve" onclick="_batchOCRApproveValid()" ' +
          'style="display:none;background:#059669;color:#fff">\u2705 אשר הכל תקינים</button>' +
        '<button class="btn btn-sm" id="batch-ocr-summary-btn" onclick="_batchOCRShowSummary()" ' +
          'style="display:none;background:#e5e7eb;color:#1e293b">\uD83D\uDCCB סיכום</button>' +
      '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  _updateBatchOCRUI();
}

function _closeBatchOCRPanel() {
  _batchOCRPaused = true;
  var m = $('batch-ocr-panel'); if (m) m.remove();
}

// --- Process queue sequentially ---
async function _processNextInQueue() {
  if (_batchOCRPaused) return;
  var nextIdx = _batchOCRState.findIndex(function(s) { return s.status === 'pending'; });
  if (nextIdx === -1) {
    // All done — show end-of-batch buttons
    var approveBtn = $('batch-ocr-approve'), summaryBtn = $('batch-ocr-summary-btn');
    if (approveBtn) approveBtn.style.display = '';
    if (summaryBtn) summaryBtn.style.display = '';
    _updateBatchOCRUI();
    return;
  }
  _batchOCRCurrentIdx = nextIdx;
  var item = _batchOCRState[nextIdx];
  item.status = 'processing';
  _updateBatchOCRUI();
  await _processSingleOCR(item);
  _updateBatchOCRUI();
  // Continue to next
  _processNextInQueue();
}

// --- Process single file OCR ---
async function _processSingleOCR(item) {
  var jwt = sessionStorage.getItem('prizma_auth_token') || sessionStorage.getItem('jwt_token');
  if (!jwt) { item.status = 'failed'; item.error = 'נדרשת התחברות מחדש'; return; }
  try {
    var res = await fetch(SUPABASE_URL + '/functions/v1/ocr-extract', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: item.fileUrl, supplier_id: item.supplierId || null,
        document_type_hint: null, tenant_id: getTenantId()
      })
    });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || 'שגיאה בסריקה');
    }
    var result = await res.json();
    if (!result.success) throw new Error(result.error || 'שגיאה בסריקה');
    item.ocrResult = result;
    item.confidence = Math.round((result.confidence_score || 0) * 100);
    item.extractionId = result.extraction_id;
    // Validate OCR data
    if (typeof validateOCRData === 'function') {
      var ext = result.extracted_data || {};
      ext.supplier_match = result.supplier_match;
      item.validationErrors = validateOCRData(ext);
    }
    // Store result in ocr_extractions
    if (result.extraction_id) {
      try {
        await batchUpdate(T.OCR_EXTRACTIONS, [{
          id: result.extraction_id, status: 'pending_review',
          supplier_document_id: item.docId
        }]);
      } catch (e) { console.warn('OCR extraction update error:', e); }
    }
    item.status = 'done';
  } catch (e) {
    console.error('Batch OCR error for ' + item.fileName + ':', e);
    item.status = 'failed';
    item.error = e.message || 'שגיאה';
  }
}

// --- Update UI ---
function _updateBatchOCRUI() {
  var progEl = $('batch-ocr-progress');
  var listEl = $('batch-ocr-list');
  if (!progEl || !listEl) return;
  var done = _batchOCRState.filter(function(s) { return s.status === 'done'; }).length;
  var failed = _batchOCRState.filter(function(s) { return s.status === 'failed'; }).length;
  var total = _batchOCRState.length;
  progEl.textContent = done + '/' + total + ' הושלמו' + (failed > 0 ? ' | ' + failed + ' נכשלו' : '');
  var rows = _batchOCRState.map(function(item, i) {
    var statusIcon, statusText, actions = '';
    if (item.status === 'done') {
      var hasErrors = item.validationErrors && item.validationErrors.some(function(v) { return v.level === 'error'; });
      statusIcon = hasErrors ? '\uD83D\uDD34' : '\u2705';
      statusText = 'ביטחון: ' + item.confidence + '%';
      if (hasErrors) statusText += ' — חובה לבדוק';
      actions = '<button class="btn-sm" onclick="_batchOCRReviewDoc(' + i + ')">\uD83D\uDC41 בדוק</button>';
    } else if (item.status === 'processing') {
      statusIcon = '\u23F3'; statusText = 'סורק...';
    } else if (item.status === 'failed') {
      statusIcon = '\u274C'; statusText = item.error || 'נכשל';
      actions = '<button class="btn-sm" onclick="_batchOCRRetrySingle(' + i + ')">\uD83D\uDD04</button>';
    } else {
      statusIcon = '\u23F8'; statusText = 'ממתין';
    }
    var name = item.fileName.length > 25 ? item.fileName.slice(0, 22) + '...' : item.fileName;
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;' +
      'border-bottom:1px solid var(--g100);font-size:.85rem">' +
      '<span>' + statusIcon + '</span>' +
      '<span style="flex:1">' + escapeHtml(name) + '</span>' +
      '<span style="color:var(--g500);font-size:.78rem">' + statusText + '</span>' +
      actions + '</div>';
  }).join('');
  listEl.innerHTML = rows;
}

// --- Pause/Resume ---
function _batchOCRTogglePause() {
  _batchOCRPaused = !_batchOCRPaused;
  var btn = $('batch-ocr-pause');
  if (btn) btn.textContent = _batchOCRPaused ? '\u25B6 המשך' : '\u23F8 השהה תור';
  if (!_batchOCRPaused) _processNextInQueue();
}

// --- Retry failed ---
function _batchOCRRetryFailed() {
  _batchOCRState.forEach(function(item) {
    if (item.status === 'failed') item.status = 'pending';
  });
  _batchOCRPaused = false;
  var btn = $('batch-ocr-pause');
  if (btn) btn.textContent = '\u23F8 השהה תור';
  _updateBatchOCRUI();
  _processNextInQueue();
}

async function _batchOCRRetrySingle(idx) {
  var item = _batchOCRState[idx]; if (!item || item.status !== 'failed') return;
  item.status = 'processing';
  _updateBatchOCRUI();
  await _processSingleOCR(item);
  _updateBatchOCRUI();
}

// --- Review document (open existing OCR review modal from ai-ocr.js) ---
function _batchOCRReviewDoc(idx) {
  var item = _batchOCRState[idx];
  if (!item || !item.ocrResult) return;
  if (typeof showOCRReview === 'function') {
    showOCRReview(item.ocrResult, item.fileUrl, item.docId);
  } else {
    toast('מודול סריקה לא זמין', 'e');
  }
}

// --- Approve all valid ---
async function _batchOCRApproveValid() {
  // Get confidence threshold from config
  var threshold = 70;
  try {
    var tid = getTenantId();
    var { data: cfgRows } = await sb.from(T.AI_CONFIG).select('confidence_threshold')
      .eq('tenant_id', tid).limit(1);
    if (cfgRows && cfgRows[0] && cfgRows[0].confidence_threshold) {
      threshold = Math.round(cfgRows[0].confidence_threshold * 100);
    }
  } catch (e) {}
  var approved = 0, skipped = 0;
  for (var i = 0; i < _batchOCRState.length; i++) {
    var item = _batchOCRState[i];
    if (item.status !== 'done') continue;
    var hasErrors = item.validationErrors && item.validationErrors.some(function(v) { return v.level === 'error'; });
    if (hasErrors || item.confidence < threshold) { skipped++; continue; }
    // Auto-save: create document from OCR data
    try {
      var ext = item.ocrResult.extracted_data || {};
      var fv = function(f) { var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
      var supplierId = (item.ocrResult.supplier_match && item.ocrResult.supplier_match.id) || item.supplierId;
      var docTypeCode = fv('document_type') || '';
      var typeId = null;
      if (_docTypes) {
        var matchType = _docTypes.find(function(t) { return t.code === docTypeCode; });
        if (matchType) typeId = matchType.id;
      }
      var subtotal = Number(fv('subtotal')) || 0;
      var vatRate = fv('vat_rate') != null ? Number(fv('vat_rate')) : (Number(getTenantConfig('vat_rate')) || 17);
      var vatAmt = Number(fv('vat_amount')) || Math.round(subtotal * vatRate) / 100;
      var totalAmt = Number(fv('total_amount')) || (subtotal + vatAmt);
      // Update the draft document with OCR data
      var updateData = {
        id: item.docId, status: 'open',
        document_number: fv('document_number') || '', document_date: fv('document_date') || null,
        due_date: fv('due_date') || null, subtotal: subtotal, vat_rate: vatRate,
        vat_amount: vatAmt, total_amount: totalAmt, currency: fv('currency') || 'ILS'
      };
      if (supplierId) updateData.supplier_id = supplierId;
      if (typeId) updateData.document_type_id = typeId;
      await batchUpdate(T.SUP_DOCS, [updateData]);
      // Update OCR extraction status
      if (item.extractionId) {
        await batchUpdate(T.OCR_EXTRACTIONS, [{ id: item.extractionId, status: 'accepted' }]);
      }
      // Update OCR learning
      if (supplierId && typeof updateOCRTemplate === 'function') {
        await updateOCRTemplate(supplierId, docTypeCode, null, ext);
      }
      approved++;
    } catch (e) {
      console.warn('Auto-approve error for doc ' + item.docId + ':', e);
      skipped++;
    }
  }
  toast(approved + ' מסמכים אושרו' + (skipped > 0 ? ', ' + skipped + ' דורשים בדיקה' : ''));
  if (typeof loadDocumentsTab === 'function') loadDocumentsTab();
}

// --- Summary modal ---
function _batchOCRShowSummary() {
  var total = _batchOCRState.length;
  var done = _batchOCRState.filter(function(s) { return s.status === 'done'; }).length;
  var failed = _batchOCRState.filter(function(s) { return s.status === 'failed'; }).length;
  var confSum = 0, confCount = 0;
  _batchOCRState.forEach(function(s) {
    if (s.status === 'done') { confSum += s.confidence; confCount++; }
  });
  var avgConf = confCount > 0 ? Math.round(confSum / confCount) : 0;
  var html =
    '<div class="modal-overlay" id="batch-ocr-summary" style="display:flex;z-index:10010" ' +
      'onclick="if(event.target===this)this.remove()">' +
    '<div class="modal" style="max-width:450px;width:90%;text-align:center">' +
      '<h3 style="margin:0 0 12px">\uD83D\uDCCB סיכום סריקה מרובה</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">' +
        '<div><div style="font-size:1.5rem;font-weight:700;color:var(--primary)">' + total + '</div>' +
          '<div style="font-size:.8rem;color:var(--g500)">סה"כ</div></div>' +
        '<div><div style="font-size:1.5rem;font-weight:700;color:#27ae60">' + done + '</div>' +
          '<div style="font-size:.8rem;color:var(--g500)">הצליחו</div></div>' +
        '<div><div style="font-size:1.5rem;font-weight:700;color:#e74c3c">' + failed + '</div>' +
          '<div style="font-size:.8rem;color:var(--g500)">נכשלו</div></div></div>' +
      '<div style="font-size:.9rem;color:var(--g600);margin-bottom:14px">' +
        'ביטחון ממוצע: <strong>' + avgConf + '%</strong></div>' +
      '<button class="btn" onclick="$(\'batch-ocr-summary\').remove()" style="background:#e5e7eb;color:#1e293b">סגור</button>' +
    '</div></div>';
  var ex = $('batch-ocr-summary'); if (ex) ex.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}
