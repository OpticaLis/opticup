// receipt-ocr.js — OCR integration in goods receipt flow (Phase 5d)
// Load after: receipt-form.js, before receipt-actions.js
// Provides: initReceiptOCR(), _rcptOcrScan(), _applyOCRToReceipt(), _rcptOcrShowBanner()
// Uses: _pendingReceiptFile, supplierCache/Rev, brandCacheRev, addReceiptItemRow,
//   updateReceiptItemsStats, uploadSupplierFile, getSupplierFileUrl

var _rcptOcrResult = null; // Phase 5e: stored when OCR applied, used for learning

// --- 1. Inject OCR button next to file attach button ---
function initReceiptOCR() {
  var attachName = $('rcpt-attach-name');
  if (!attachName || $('rcpt-ocr-btn')) return;
  var btn = document.createElement('button');
  btn.id = 'rcpt-ocr-btn';
  btn.className = 'btn btn-s btn-sm';
  btn.style.cssText = 'width:100%;margin-top:4px;display:none';
  btn.innerHTML = '\uD83E\uDD16 \u05E1\u05E8\u05D5\u05E7 \u05E2\u05DD AI';
  btn.onclick = _rcptOcrScan;
  attachName.parentNode.appendChild(btn);
  // Patch _pickReceiptFile to preserve original behavior
  var origPick = window._pickReceiptFile;
  window._pickReceiptFile = function() { origPick(); };
  // MutationObserver on attach elements to detect file selection
  var obs = new MutationObserver(function() { _rcptOcrUpdateBtn(); });
  obs.observe(attachName, { childList: true, characterData: true, subtree: true });
  var attachBtn = $('rcpt-attach-btn');
  if (attachBtn) {
    new MutationObserver(function() { _rcptOcrUpdateBtn(); })
      .observe(attachBtn, { childList: true, characterData: true, subtree: true });
  }
}

function _rcptOcrUpdateBtn() {
  var btn = $('rcpt-ocr-btn');
  if (btn) btn.style.display = _pendingReceiptFile ? '' : 'none';
}

// --- 2. Trigger OCR scan — upload file, call Edge Function ---
async function _rcptOcrScan() {
  if (!_pendingReceiptFile) { toast('\u05D0\u05D9\u05DF \u05E7\u05D5\u05D1\u05E5 \u05DC\u05E1\u05E8\u05D9\u05E7\u05D4', 'e'); return; }
  var jwt = sessionStorage.getItem('jwt_token');
  if (!jwt) { toast('\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9', 'e'); return; }

  var supplierName = ($('rcpt-supplier') || {}).value || '';
  var supplierId = supplierName ? (supplierCache[supplierName] || null) : null;

  showLoading('\u05DE\u05E2\u05DC\u05D4 \u05E7\u05D5\u05D1\u05E5 \u05D5\u05E1\u05D5\u05E8\u05E7...');
  try {
    var uploadResult = await uploadSupplierFile(_pendingReceiptFile, supplierId || 'ocr-pending');
    if (!uploadResult || !uploadResult.url) {
      hideLoading(); toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05EA \u05E7\u05D5\u05D1\u05E5', 'e'); return;
    }
    var fileUrl = uploadResult.url;
    _pendingReceiptFileUrl = fileUrl; // track for cleanup if user removes file
    var rcptType = ($('rcpt-type') || {}).value || null;

    var res = await fetch(SUPABASE_URL + '/functions/v1/ocr-extract', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_url: fileUrl, supplier_id: supplierId,
        document_type_hint: rcptType, tenant_id: getTenantId() })
    });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05E8\u05D9\u05E7\u05D4');
    }
    var result = await res.json();
    hideLoading();
    if (result.success && result.extracted_data) {
      await _applyOCRToReceipt(result, fileUrl);
    } else {
      toast(result.error || '\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05E7\u05E8\u05D5\u05D0 \u05D0\u05EA \u05D4\u05DE\u05E1\u05DE\u05DA', 'e');
    }
  } catch (e) {
    hideLoading(); console.error('_rcptOcrScan error:', e);
    toast(e.message || '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05E8\u05D9\u05E7\u05D4', 'e');
  }
}

// --- 3. Apply OCR results to receipt form ---
async function _applyOCRToReceipt(result, fileUrl) {
  var ext = result.extracted_data || {};
  var conf = result.confidence_score || 0;
  var supMatch = result.supplier_match;
  // Phase 5e: store for learning on confirm
  _rcptOcrResult = { extracted_data: ext, supplier_match: supMatch, extraction_id: result.extraction_id };
  var fv = function(f) {
    var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v;
  };
  var matchedCount = 0, totalItems = 0;

  // Auto-fill supplier
  if (supMatch && supMatch.id) {
    var supName = supplierCacheRev[supMatch.id];
    if (supName) {
      var sel = $('rcpt-supplier');
      if (sel) { sel.value = supName; sel.dispatchEvent(new Event('change')); }
      await new Promise(function(r) { setTimeout(r, 300); });
    }
  } else if (fv('supplier_name')) {
    var aiName = (fv('supplier_name') || '').trim().toLowerCase();
    var bestMatch = null;
    for (var sn in supplierCache) {
      if (sn.toLowerCase() === aiName || sn.toLowerCase().includes(aiName) || aiName.includes(sn.toLowerCase())) {
        bestMatch = sn; break;
      }
    }
    if (bestMatch) {
      var sel = $('rcpt-supplier');
      if (sel) { sel.value = bestMatch; sel.dispatchEvent(new Event('change')); }
      await new Promise(function(r) { setTimeout(r, 300); });
    }
  }

  // Auto-fill document number, date, type
  var docNum = fv('document_number');
  if (docNum) { var numEl = $('rcpt-number'); if (numEl && !numEl.value) numEl.value = docNum; }
  var docDate = fv('document_date');
  if (docDate) { var dateEl = $('rcpt-date'); if (dateEl && !dateEl.value) dateEl.value = docDate; }
  var docType = fv('document_type');
  if (docType) {
    var typeEl = $('rcpt-type');
    var typeMap = { invoice: 'invoice', tax_invoice: 'tax_invoice', delivery_note: 'delivery_note' };
    if (typeEl && typeMap[docType]) typeEl.value = typeMap[docType];
  }

  // Process items
  var items = fv('items') || [];
  if (Array.isArray(items) && items.length > 0) {
    totalItems = items.length;
    var supplierId = supplierCache[($('rcpt-supplier') || {}).value] || null;
    for (var i = 0; i < items.length; i++) {
      var ocrItem = items[i];
      var desc = ocrItem.description || ocrItem.model || '';
      var qty = parseInt(ocrItem.quantity) || 1;
      var unitPrice = parseFloat(ocrItem.unit_price) || null;
      var invMatch = await _rcptOcrMatchInventory(desc, supplierId);
      if (invMatch) {
        matchedCount++;
        addReceiptItemRow({
          barcode: invMatch.barcode || '', brand: brandCacheRev[invMatch.brand_id] || '',
          model: invMatch.model || '', color: invMatch.color || '', size: invMatch.size || '',
          quantity: qty, unit_cost: unitPrice || invMatch.cost_price || '',
          sell_price: invMatch.sell_price || '', is_new_item: false, inventory_id: invMatch.id
        });
        _rcptOcrHighlightRow('matched');
      } else {
        var newBarcode = await generateNextBarcode();
        addReceiptItemRow({
          barcode: newBarcode, brand: '', model: desc, color: '', size: '',
          quantity: qty, unit_cost: unitPrice || '', sell_price: '', is_new_item: true
        });
        _rcptOcrHighlightRow('unmatched');
      }
    }
    updateReceiptItemsStats();
  }

  // Validate OCR data and append warnings to banner
  var _ocrValidation = [];
  if (typeof validateOCRData === 'function') {
    _ocrValidation = validateOCRData(Object.assign({}, ext, { supplier_match: supMatch }));
  }
  _rcptOcrShowBanner(conf, matchedCount, totalItems, fileUrl, _ocrValidation);
  if (totalItems > 0) {
    toast('\u05D6\u05D5\u05D4\u05D5 ' + matchedCount + ' \u05DE\u05EA\u05D5\u05DA ' + totalItems + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD', 's');
  } else {
    toast('\u05D4\u05DE\u05E1\u05DE\u05DA \u05E0\u05E1\u05E8\u05E7 \u2014 \u05DC\u05D0 \u05D6\u05D5\u05D4\u05D5 \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD', 'w');
  }
}

// --- 4. Match OCR item to existing inventory ---
async function _rcptOcrMatchInventory(description, supplierId) {
  if (!description || description.length < 2) return null;
  try {
    var query = sb.from('inventory')
      .select('id, barcode, brand_id, supplier_id, model, color, size, cost_price, sell_price')
      .eq('tenant_id', getTenantId()).eq('is_deleted', false)
      .ilike('model', '%' + description.replace(/[%_]/g, '') + '%');
    if (supplierId) query = query.eq('supplier_id', supplierId);
    var { data, error } = await query.limit(5);
    if (error) { console.warn('OCR inventory match error:', error); return null; }
    return (data && data.length > 0) ? data[0] : null;
  } catch (e) {
    console.warn('_rcptOcrMatchInventory error:', e);
    return null;
  }
}

// --- 5. Highlight last added receipt row ---
function _rcptOcrHighlightRow(type) {
  var tbody = $('rcpt-items-body'); if (!tbody) return;
  var lastRow = tbody.lastElementChild; if (!lastRow) return;
  if (type === 'unmatched') {
    lastRow.style.backgroundColor = '#fff9c4';
    lastRow.title = '\u05DC\u05D0 \u05D6\u05D5\u05D4\u05D4 \u05D1\u05DE\u05DC\u05D0\u05D9 \u2014 \u05E0\u05D3\u05E8\u05E9 \u05D1\u05D7\u05D9\u05E8\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA';
  } else {
    lastRow.style.backgroundColor = '#e8f5e9';
    setTimeout(function() { if (lastRow.parentNode) lastRow.style.backgroundColor = ''; }, 5000);
  }
}

// --- 6. Show OCR confidence banner at top of receipt form ---
function _rcptOcrShowBanner(confidence, matched, total, fileUrl, validationResults) {
  var existing = $('rcpt-ocr-banner'); if (existing) existing.remove();
  var hasErrors = validationResults && validationResults.some(function(v) { return v.level === 'error'; });
  var confPct = Math.round((confidence || 0) * 100);
  var confColor = hasErrors ? '#e74c3c' : (confPct >= 85 ? '#27ae60' : confPct >= 70 ? '#f39c12' : '#e74c3c');
  var banner = document.createElement('div');
  banner.id = 'rcpt-ocr-banner';
  banner.style.cssText = 'background:' + (hasErrors ? '#fce4ec' : '#e3f2fd') + ';border:1px solid ' + (hasErrors ? '#ef9a9a' : '#90caf9') + ';border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:.88rem';
  var text = '\uD83E\uDD16 \u05DE\u05D5\u05DC\u05D0 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DE\u05E1\u05E8\u05D9\u05E7\u05D4 \u2014 ';
  text += '\u05E8\u05DE\u05EA \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF: <span style="color:' + confColor + ';font-weight:700">' + confPct + '%</span>';
  if (total > 0) text += ' \u2014 \u05D6\u05D5\u05D4\u05D5 ' + matched + '/' + total + ' \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD';
  // Show validation warnings/errors
  if (validationResults && validationResults.length > 0) {
    text += '<br>';
    validationResults.forEach(function(v) {
      var icon = v.level === 'error' ? '\uD83D\uDD34' : '\u26A0\uFE0F';
      text += '<span style="color:' + (v.level === 'error' ? '#e74c3c' : '#f39c12') + '">' + icon + ' ' + escapeHtml(v.msg) + '</span> ';
    });
  }
  banner.innerHTML = text;
  if (fileUrl) {
    var viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-g btn-sm';
    viewBtn.style.cssText = 'margin-right:auto;font-size:.8rem';
    viewBtn.textContent = '\uD83D\uDCC4 \u05E6\u05E4\u05D4 \u05D1\u05DE\u05E7\u05D5\u05E8';
    viewBtn.onclick = function() { _rcptOcrPreviewDoc(fileUrl); };
    banner.appendChild(viewBtn);
  }
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1rem;color:var(--g600)';
  closeBtn.textContent = '\u2715';
  closeBtn.onclick = function() { banner.remove(); };
  banner.appendChild(closeBtn);
  var step2 = $('rcpt-step2');
  if (step2) step2.insertBefore(banner, step2.firstChild);
}

// --- 7. Preview source document in modal ---
async function _rcptOcrPreviewDoc(fileUrl) {
  var signedUrl = await getSupplierFileUrl(fileUrl);
  if (!signedUrl) { toast('\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4', 'e'); return; }
  var fext = (fileUrl || '').split('.').pop().toLowerCase();
  var content = fext === 'pdf'
    ? '<iframe src="' + escapeHtml(signedUrl) + '" style="width:100%;height:80vh;border:none" title="PDF"></iframe>'
    : '<img src="' + escapeHtml(signedUrl) + '" style="max-width:100%;max-height:80vh;object-fit:contain">';
  var overlay = document.createElement('div');
  overlay.id = 'rcpt-ocr-preview-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;padding:16px;max-width:90vw;max-height:90vh;overflow:auto;position:relative';
  box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
    '<strong>\uD83D\uDCC4 \u05DE\u05E1\u05DE\u05DA \u05DE\u05E7\u05D5\u05E8</strong>' +
    '<button class="btn btn-g btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">\u05E1\u05D2\u05D5\u05E8</button></div>' + content;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// --- 8. Compare OCR data to final form and update template (Phase 5e) ---
async function _rcptOcrUpdateTemplate() {
  if (!_rcptOcrResult) return;
  try {
    var ext = _rcptOcrResult.extracted_data || {};
    var fv = function(f) { var v = ext[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
    var supplierId = (_rcptOcrResult.supplier_match && _rcptOcrResult.supplier_match.id) || null;
    if (!supplierId) {
      var supName = ($('rcpt-supplier') || {}).value;
      if (supName && typeof supplierCache !== 'undefined') supplierId = supplierCache[supName] || null;
    }
    if (!supplierId) { _rcptOcrResult = null; return; }
    // Build corrections by comparing OCR original to final form values
    var corrections = {};
    var finalDocNum = (($('rcpt-number') || {}).value || '').trim();
    var ocrDocNum = fv('document_number');
    if (ocrDocNum && String(ocrDocNum) !== finalDocNum) {
      corrections.document_number = { ai: ocrDocNum, user: finalDocNum };
    }
    var finalDate = ($('rcpt-date') || {}).value || '';
    var ocrDate = fv('document_date');
    if (ocrDate && String(ocrDate) !== finalDate) {
      corrections.document_date = { ai: ocrDate, user: finalDate };
    }
    var docType = fv('document_type') || 'delivery_note';
    await updateOCRTemplate(supplierId, docType,
      Object.keys(corrections).length > 0 ? corrections : null, ext);
  } catch (e) {
    console.warn('_rcptOcrUpdateTemplate error:', e);
  }
  _rcptOcrResult = null;
}

// Patch confirmReceiptCore to call template update after successful confirm
function _patchReceiptConfirmForOCR() {
  var orig = typeof confirmReceiptCore === 'function' ? confirmReceiptCore : null;
  if (!orig) return;
  window.confirmReceiptCore = async function(receiptId, rcptNumber, poId) {
    await orig(receiptId, rcptNumber, poId);
    await _rcptOcrUpdateTemplate();
  };
}

// --- 9. Initialize on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    initReceiptOCR();
    _patchReceiptConfirmForOCR();
  }, 200);
});
