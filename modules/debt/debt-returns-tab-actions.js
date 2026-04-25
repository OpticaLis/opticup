// =========================================================
// debt-returns-tab-actions.js — Credit marking + Excel export
// Load after: debt-returns-tab.js, debt-returns.js
// Provides: markDebtCredited(), bulkMarkCredited(),
//   _createCreditNoteForReturn(), exportDebtReturnsExcel()
// =========================================================

// =========================================================
// Mark single item as credited (PIN required)
// =========================================================
async function markDebtCredited(returnId, itemId) {
  // Step 1: Require credit note file upload
  var item = window._debtReturnsData.find(function(d) { return d.id === itemId; });
  var ret = item ? item.return : null;
  var supplierId = ret ? ret.supplier_id : null;
  if (!supplierId) { toast('לא נמצא ספק לזיכוי', 'e'); return; }

  var uploadResult = await _promptCreditFileUpload(supplierId);
  if (!uploadResult) return; // user cancelled

  // Step 2: PIN verification
  promptPin('סימון כזוכה — אימות עובד', async function(pin, emp) {
    try {
      await updateReturnStatus(returnId, 'credited');
      await writeLog('return_credited', null, {
        return_id: returnId, item_id: itemId,
        barcode: item ? item.barcode : '', source_ref: 'debt_module'
      });
      // Auto-create credit note document WITH the uploaded file
      if (ret) {
        var creditDoc = await _createCreditNoteForReturn(ret, returnId, emp.id, uploadResult);
        if (creditDoc) {
          toast('זוכה + מסמך זיכוי נוצר: ' + creditDoc.docNumber, 's');
        } else {
          toast('פריט סומן כזוכה (מסמך זיכוי לא נוצר)', 'w');
        }
      } else {
        toast('פריט סומן כזוכה', 's');
      }
      applyDebtReturnsFilters();
    } catch (e) {
      console.error('markDebtCredited error:', e);
      toast('שגיאה: ' + (e.message || ''), 'e');
    }
  });
}

// Prompt user to upload credit note file before marking as credited
function _promptCreditFileUpload(supplierId) {
  return new Promise(function(resolve) {
    var modalId = 'credit-file-modal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var html =
      '<div class="modal-overlay" id="' + modalId + '" style="display:flex" onclick="if(event.target===this){this.remove()}">' +
        '<div class="modal" style="max-width:420px;text-align:right">' +
          '<h3 style="margin:0 0 12px">\u05E6\u05E8\u05E3 \u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D9\u05DB\u05D5\u05D9 \u05DE\u05D4\u05E1\u05E4\u05E7</h3>' +
          '<p style="font-size:.88rem;color:var(--g600,#4b5563);margin:0 0 12px">' +
            '\u05DC\u05E1\u05D9\u05DE\u05D5\u05DF \u05DB\u05D6\u05D5\u05DB\u05D4 \u05D9\u05E9 \u05DC\u05E6\u05E8\u05E3 \u05D0\u05EA \u05EA\u05E2\u05D5\u05D3\u05EA \u05D4\u05D6\u05D9\u05DB\u05D5\u05D9 \u05DE\u05D4\u05E1\u05E4\u05E7</p>' +
          '<div id="credit-file-dropzone" style="border:2px dashed var(--g300,#d1d5db);border-radius:8px;padding:20px 12px;text-align:center;cursor:pointer;margin-bottom:10px">' +
            '<div style="font-size:1.2rem;margin-bottom:2px">&#128196;</div>' +
            '<div style="font-size:.84rem;color:var(--g500,#6b7280)">\u05D2\u05E8\u05D5\u05E8 \u05E7\u05D5\u05D1\u05E5 \u05DC\u05DB\u05D0\u05DF \u05D0\u05D5 \u05DC\u05D7\u05E5 \u05DC\u05D1\u05D7\u05D9\u05E8\u05D4</div>' +
            '<div style="font-size:.74rem;color:var(--g400);margin-top:2px">PDF, JPG, PNG</div>' +
          '</div>' +
          '<div id="credit-file-preview" style="display:none;align-items:center;gap:8px;padding:8px 10px;background:var(--g100,#f3f4f6);border-radius:6px;margin-bottom:10px"></div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn btn-p" id="credit-file-ok" style="flex:1" disabled>\u05D4\u05DE\u05E9\u05DA \u05DC\u05D0\u05D9\u05DE\u05D5\u05EA</button>' +
            '<button class="btn btn-g" id="credit-file-cancel" style="flex:1">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    var _creditFile = null;
    var zone = document.getElementById('credit-file-dropzone');
    var preview = document.getElementById('credit-file-preview');
    var okBtn = document.getElementById('credit-file-ok');

    function stageFile(file) {
      var allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type)) { toast('\u05E1\u05D5\u05D2 \u05E7\u05D5\u05D1\u05E5 \u05DC\u05D0 \u05E0\u05EA\u05DE\u05DA', 'e'); return; }
      if (file.size > 10 * 1024 * 1024) { toast('\u05E7\u05D5\u05D1\u05E5 \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9', 'e'); return; }
      _creditFile = file;
      zone.style.display = 'none';
      var ext = (file.name || '').split('.').pop().toLowerCase();
      var icon = ext === 'pdf' ? '\uD83D\uDCC4' : '\uD83D\uDDBC\uFE0F';
      preview.style.display = 'flex';
      preview.innerHTML =
        '<span style="font-size:1.2rem">' + icon + '</span>' +
        '<span style="flex:1;font-size:.85rem">' + escapeHtml(file.name) + '</span>' +
        '<button class="btn-sm" style="background:#ef4444;color:#fff" id="credit-file-clear">\u2715</button>';
      document.getElementById('credit-file-clear').onclick = function() {
        _creditFile = null;
        preview.style.display = 'none';
        zone.style.display = '';
        okBtn.disabled = true;
      };
      okBtn.disabled = false;
    }

    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.borderColor = 'var(--primary,#1a73e8)'; });
    zone.addEventListener('dragleave', function() { zone.style.borderColor = 'var(--g300,#d1d5db)'; });
    zone.addEventListener('drop', function(e) { e.preventDefault(); zone.style.borderColor = 'var(--g300,#d1d5db)'; if (e.dataTransfer.files[0]) stageFile(e.dataTransfer.files[0]); });
    zone.addEventListener('click', function() {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png';
      inp.onchange = function() { if (inp.files[0]) stageFile(inp.files[0]); }; inp.click();
    });

    function cleanup() { var m = document.getElementById(modalId); if (m) m.remove(); }

    okBtn.onclick = async function() {
      if (!_creditFile) return;
      showLoading('\u05DE\u05E2\u05DC\u05D4 \u05E7\u05D5\u05D1\u05E5...');
      var result = await uploadSupplierFile(_creditFile, supplierId);
      hideLoading();
      if (!result) { toast('\u05D4\u05E2\u05DC\u05D0\u05EA \u05E7\u05D5\u05D1\u05E5 \u05E0\u05DB\u05E9\u05DC\u05D4', 'e'); return; }
      cleanup();
      resolve(result);
    };
    document.getElementById('credit-file-cancel').onclick = function() { cleanup(); resolve(null); };
  });
}

// =========================================================
// Auto-create credit note document for a credited return
// =========================================================
async function _createCreditNoteForReturn(ret, returnId, empId, uploadedFile) {
  try {
    // Find credit_note document type
    var types = await fetchAll(T.DOC_TYPES, [['code', 'eq', 'credit_note'], ['is_active', 'eq', true]]);
    if (!types.length) {
      console.warn('credit_note document type not found — skipping credit note creation');
      return null;
    }
    var typeId = types[0].id;

    // Calculate total from return items
    var items = window._debtReturnsData.filter(function(d) { return d.return_id === returnId; });
    var subtotal = items.reduce(function(sum, it) {
      return sum + (Number(it.cost_price) || 0) * (it.quantity || 1);
    }, 0);
    if (subtotal <= 0) subtotal = 0.01; // avoid zero

    var vatRate = getVatRate();
    var vatAmount = Math.round(subtotal * vatRate) / 100;
    var totalAmount = subtotal + vatAmount;

    var docNumber = 'CRD-' + (ret.return_number || returnId.slice(0, 8));
    var internalNumber = await generateDocInternalNumber();

    var docRow = {
      tenant_id: getTenantId(),
      supplier_id: ret.supplier_id,
      document_type_id: typeId,
      document_number: docNumber,
      document_date: new Date().toISOString().slice(0, 10),
      subtotal: subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      currency: 'ILS',
      status: 'open',
      paid_amount: 0,
      notes: 'זיכוי אוטומטי עבור ' + (ret.return_number || ''),
      internal_number: internalNumber,
      created_by: empId
    };
    // Attach file if uploaded
    if (uploadedFile && uploadedFile.url) {
      docRow.file_url = uploadedFile.url;
      docRow.file_name = uploadedFile.fileName || null;
    }
    var created = await batchCreate(T.SUP_DOCS, [docRow]);
    var newDoc = created[0];

    // Save file record to supplier_document_files
    if (newDoc && uploadedFile && uploadedFile.url && typeof saveDocFile === 'function') {
      await saveDocFile(newDoc.id, uploadedFile.url, uploadedFile.fileName || null, 0);
    }

    // Link credit document to return
    if (newDoc) {
      await sb.from(T.SUP_RETURNS).update({ credit_document_id: newDoc.id })
        .eq('id', returnId).eq('tenant_id', getTenantId());
    }

    await writeLog('credit_note_auto', null, {
      return_id: returnId, return_number: ret.return_number || '',
      document_number: docNumber, total_amount: totalAmount
    });

    return { docNumber: docNumber };
  } catch (e) {
    console.error('_createCreditNoteForReturn error:', e);
    return null;
  }
}

// =========================================================
// Bulk mark as credited
// =========================================================
async function bulkMarkCredited() {
  // Block bulk credit — each return requires its own credit note file upload
  toast('\u05DC\u05E1\u05D9\u05DE\u05D5\u05DF \u05D6\u05D9\u05DB\u05D5\u05D9 \u05D9\u05E9 \u05DC\u05D1\u05E6\u05E2 \u05E4\u05E2\u05D5\u05DC\u05D4 \u05E2\u05DC \u05DB\u05DC \u05E4\u05E8\u05D9\u05D8 \u05D1\u05E0\u05E4\u05E8\u05D3 \u2014 \u05E0\u05D3\u05E8\u05E9 \u05E6\u05D9\u05E8\u05D5\u05E3 \u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D9\u05DB\u05D5\u05D9', 'e');
  return;
  /* Original bulk logic disabled — credit requires file per item
  var cbs = document.querySelectorAll('.dret-cb:checked');
  if (!cbs.length) { toast('לא נבחרו פריטים', 'w'); return; }

  var selected = [];
  cbs.forEach(function(cb) {
    var st = cb.getAttribute('data-status');
    if (st === 'shipped' || st === 'agent_picked') {
      selected.push({ returnId: cb.getAttribute('data-return-id'), itemId: cb.getAttribute('data-item-id') });
    }
  });
  if (!selected.length) { toast('לא נבחרו פריטים ממתינים', 'w'); return; }

  promptPin('סימון ' + selected.length + ' פריטים כזוכו', async function(pin, emp) {
    try {
      var byReturn = {};
      selected.forEach(function(s) {
        if (!byReturn[s.returnId]) byReturn[s.returnId] = [];
        byReturn[s.returnId].push(s.itemId);
      });

      var creditCount = 0;
      for (var rid in byReturn) {
        await updateReturnStatus(rid, 'credited');
        for (var j = 0; j < byReturn[rid].length; j++) {
          var iid = byReturn[rid][j];
          var item = window._debtReturnsData.find(function(d) { return d.id === iid; });
          await writeLog('return_credited', null, {
            return_id: rid, item_id: iid,
            barcode: item ? item.barcode : '', source_ref: 'debt_module_bulk'
          });
        }
        var firstItem = window._debtReturnsData.find(function(d) { return d.return_id === rid; });
        var ret = firstItem ? firstItem.return : null;
        if (ret) {
          var doc = await _createCreditNoteForReturn(ret, rid, emp.id);
          if (doc) creditCount++;
        }
      }

      var msg = selected.length + ' פריטים סומנו כזוכו';
      if (creditCount) msg += ', ' + creditCount + ' מסמכי זיכוי נוצרו';
      toast(msg, 's');
      applyDebtReturnsFilters();
    } catch (e) {
      console.error('bulkMarkCredited error:', e);
      toast('שגיאה: ' + (e.message || ''), 'e');
    }
  });
  */
}

// =========================================================
// Export to Excel
// =========================================================
function exportDebtReturnsExcel() {
  var data = window._debtReturnsData;
  if (!data.length) { toast('אין נתונים לייצוא', 'w'); return; }

  var rows = data.map(function(it) {
    var ret = it.return || {};
    var st = RETURN_STATUS_MAP[ret.status] || { he: ret.status || '' };
    var supName = ret.supplier ? ret.supplier.name : '';
    return {
      'ברקוד': it.barcode || '',
      'מותג': it.brand_name || '',
      'דגם': it.model || '',
      'ספק': supName,
      'מספר זיכוי': ret.return_number || '',
      'סטטוס': st.he,
      'תאריך שליחה': (ret.shipped_at || ret.agent_picked_at || ret.created_at || '').slice(0, 10),
      'תאריך זיכוי': ret.credited_at ? ret.credited_at.slice(0, 10) : '',
      'עלות': Number(it.cost_price) || 0
    };
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'זיכויים');
  var dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'returns_credit_' + dateStr + '.xlsx');
  toast('קובץ Excel הורד', 's');
}
