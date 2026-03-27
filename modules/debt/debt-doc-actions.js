// debt-doc-actions.js — Document action toolbar, file attach, soft delete (split from debt-doc-edit.js)
// Load before: debt-doc-edit.js (editDocument calls _buildDocActionToolbar)

// Attach more files from edit modal — with OCR scan option
async function _editDocAttachMore(docId, supplierId) {
  pickAndUploadFiles(supplierId, function(results) {
    // Show choice: upload only vs upload + OCR scan
    _showAttachChoiceModal(docId, supplierId, results);
  });
}

// Choice modal: save only or save + OCR
function _showAttachChoiceModal(docId, supplierId, uploadResults) {
  var names = uploadResults.map(function(r) { return r.fileName; }).join(', ');
  var old = $('attach-choice-modal'); if (old) old.remove();
  var html =
    '<div class="modal-overlay" id="attach-choice-modal" style="display:flex;z-index:10005" ' +
      'onclick="if(event.target===this)closeAndRemoveModal(\'attach-choice-modal\')">' +
    '<div class="modal" style="max-width:400px;text-align:center">' +
      '<h3 style="margin:0 0 10px">\u05DE\u05D4 \u05DC\u05E2\u05E9\u05D5\u05EA \u05E2\u05DD \u05D4\u05E7\u05D1\u05E6\u05D9\u05DD?</h3>' +
      '<div style="font-size:.85rem;color:var(--g500);margin-bottom:14px">' + escapeHtml(names) + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn" style="background:#059669;color:#fff;width:100%" ' +
          'onclick="_doAttachFiles(\'' + docId + '\',\'' + supplierId + '\',false)">' +
          '\uD83D\uDCCE \u05E9\u05DE\u05D5\u05E8 \u05D1\u05DC\u05D1\u05D3</button>' +
        '<button class="btn" style="background:#7c3aed;color:#fff;width:100%" ' +
          'onclick="_doAttachFiles(\'' + docId + '\',\'' + supplierId + '\',true)">' +
          '\uD83E\uDD16 \u05E9\u05DE\u05D5\u05E8 \u05D5\u05E1\u05E8\u05D5\u05E7 \u05E2\u05DD AI</button>' +
      '</div>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  // Store results for the action handler
  window._pendingAttachResults = uploadResults;
}

// Execute the attach action (save files + optional OCR)
async function _doAttachFiles(docId, supplierId, withOCR) {
  var results = window._pendingAttachResults || [];
  window._pendingAttachResults = null;
  closeAndRemoveModal('attach-choice-modal');
  if (!results.length) return;

  try {
    // Save files to DB
    var existingFiles = await fetchDocFiles(docId);
    var maxSort = existingFiles.reduce(function(m, f) { return Math.max(m, f.sort_order || 0); }, -1);
    for (var i = 0; i < results.length; i++) {
      await saveDocFile(docId, results[i].url, results[i].fileName, maxSort + 1 + i);
    }
    // Update primary file_url if first file
    var doc = _docData.find(function(d) { return d.id === docId; });
    if (doc && !doc.file_url) {
      await batchUpdate(T.SUP_DOCS, [{ id: docId, file_url: results[0].url, file_name: results[0].fileName }]);
      doc.file_url = results[0].url;
      doc.file_name = results[0].fileName;
    }
    toast(results.length + ' \u05E7\u05D1\u05E6\u05D9\u05DD \u05E6\u05D5\u05E8\u05E4\u05D5');

    if (withOCR && typeof triggerOCR === 'function') {
      // Trigger OCR on the first uploaded file
      closeAndRemoveModal('edit-doc-modal');
      triggerOCR(results[0].url, supplierId, null, docId);
    } else {
      // Refresh edit modal
      closeAndRemoveModal('edit-doc-modal');
      editDocument(docId);
    }
  } catch (e) {
    console.error('_doAttachFiles error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E6\u05D9\u05E8\u05D5\u05E3: ' + (e.message || ''), 'e');
  }
}

// =========================================================
// Action toolbar for View modal (buttons moved from table rows)
// =========================================================
function _buildDocActionToolbar(doc, type, docFiles) {
  var docId = doc.id;
  var suppId = doc.supplier_id;
  var balance = (Number(doc.total_amount) || 0) - (Number(doc.paid_amount) || 0);
  var isOpen = doc.status === 'open' || doc.status === 'partially_paid';
  var isInvoice = type.code === 'invoice' || type.code === 'tax_invoice';
  var hasFiles = docFiles && docFiles.length > 0;
  var hasPrepaid = typeof _docPrepaidSet !== 'undefined' && !!_docPrepaidSet[suppId];

  var btns = [];
  // Group 1: Files
  btns.push('<button class="btn btn-sm" style="background:var(--primary,#1a73e8);color:#fff" ' +
    'onclick="_editDocAttachMore(\'' + docId + '\',\'' + suppId + '\')">\uD83D\uDCCE \u05E6\u05E8\u05E3 \u05E7\u05D1\u05E6\u05D9\u05DD</button>');
  if (hasFiles && typeof triggerOCR === 'function' && !doc.goods_receipt_id) {
    // Use multi-file scan if document has multiple files, otherwise single scan
    var ocrFn = docFiles && docFiles.length > 1 && typeof scanDocumentAllFiles === 'function'
      ? 'closeAndRemoveModal(\'edit-doc-modal\');scanDocumentAllFiles(\'' + docId + '\',\'' + suppId + '\',null)'
      : 'closeAndRemoveModal(\'edit-doc-modal\');triggerOCR(\'' + escapeHtml(doc.file_url || '') + '\',\'' + suppId + '\',null,\'' + docId + '\')';
    var ocrLabel = docFiles && docFiles.length > 1
      ? '\uD83E\uDD16 \u05E1\u05E8\u05D5\u05E7 ' + docFiles.length + ' \u05E2\u05DE\u05D5\u05D3\u05D9\u05DD'
      : '\uD83E\uDD16 \u05E1\u05E8\u05D5\u05E7 \u05E2\u05DD AI';
    btns.push('<button class="btn btn-sm" style="background:#7c3aed;color:#fff" onclick="' + ocrFn + '">' + ocrLabel + '</button>');
  }
  // Group 2: Linking + Prepaid
  if (isInvoice && isOpen && typeof openLinkDeliveryNotesModal === 'function') {
    btns.push('<button class="btn btn-sm" style="background:#3b82f6;color:#fff" ' +
      'onclick="closeAndRemoveModal(\'edit-doc-modal\');openLinkDeliveryNotesModal(\'' + docId + '\')">' +
      '\u05E7\u05E9\u05E8 \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA</button>');
  }
  if (hasPrepaid && balance > 0 && isOpen && typeof openPrepaidDeductModal === 'function') {
    btns.push('<button class="btn btn-sm" style="background:#f59e0b;color:#fff" ' +
      'onclick="closeAndRemoveModal(\'edit-doc-modal\');openPrepaidDeductModal(\'' + docId + '\')">' +
      '\u05E7\u05D6\u05D6 \u05DE\u05E2\u05E1\u05E7\u05D4</button>');
  }
  // Group 3: Assign to folder (for general invoices without supplier)
  if (!doc.supplier_id && typeof getExpenseFolders === 'function') {
    btns.push('<button class="btn btn-sm" style="background:#8b5cf6;color:#fff" ' +
      'onclick="assignToFolder(\'' + docId + '\')">\uD83D\uDCC1 \u05E9\u05D9\u05D9\u05DA \u05DC\u05EA\u05D9\u05E7\u05D9\u05D4</button>');
  }
  // Group 4: Change type (requires debt.edit permission)
  if (doc.status !== 'paid' && doc.status !== 'cancelled') {
    btns.push('<button class="btn btn-sm" style="background:#6366f1;color:#fff" ' +
      'onclick="changeDocumentType(\'' + docId + '\')">\uD83D\uDD00 \u05E9\u05E0\u05D4 \u05E1\u05D5\u05D2</button>');
  }
  // Group 4: Review toggle
  if (doc.status !== 'pending_review' && doc.status !== 'paid' && doc.status !== 'cancelled') {
    btns.push('<button class="btn btn-sm" style="background:#f59e0b;color:#fff" ' +
      'onclick="_togglePendingReview(\'' + docId + '\',true)">\u2753 \u05E1\u05DE\u05DF \u05DC\u05D1\u05D9\u05E8\u05D5\u05E8</button>');
  }
  if (doc.status === 'pending_review') {
    btns.push('<button class="btn btn-sm" style="background:#059669;color:#fff" ' +
      'onclick="_togglePendingReview(\'' + docId + '\',false)">\u2705 \u05D4\u05E1\u05E8 \u05E1\u05D9\u05DE\u05D5\u05DF</button>');
  }
  // Group 4: Delete (cancelled only, soft delete)
  if (doc.status === 'cancelled') {
    btns.push('<button class="btn btn-sm" style="background:#ef4444;color:#fff" ' +
      'onclick="_softDeleteDocument(\'' + docId + '\')">\u05DE\u05D7\u05E7</button>');
  }

  if (!btns.length) return '';
  return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid var(--g200)">' +
    btns.join('') + '</div>';
}

// Soft delete a cancelled document (from View modal)
async function _softDeleteDocument(docId) {
  var ok = await confirmDialog('\u05DE\u05D7\u05D9\u05E7\u05EA \u05DE\u05E1\u05DE\u05DA', '\u05D4\u05D0\u05DD \u05DC\u05DE\u05D7\u05D5\u05E7 \u05DE\u05E1\u05DE\u05DA \u05D6\u05D4? \u05D4\u05DE\u05E1\u05DE\u05DA \u05DC\u05D0 \u05D9\u05D5\u05E6\u05D2 \u05D1\u05E8\u05E9\u05D9\u05DE\u05D5\u05EA.');
  if (!ok) return;
  promptPin('\u05DE\u05D7\u05D9\u05E7\u05EA \u05DE\u05E1\u05DE\u05DA \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
    showLoading('\u05DE\u05D5\u05D7\u05E7...');
    try {
      await batchUpdate(T.SUP_DOCS, [{ id: docId, is_deleted: true, updated_at: new Date().toISOString() }]);
      // TODO: pg_cron job to permanently delete after 30 days
      await writeLog('doc_soft_delete', null, { document_id: docId, deleted_by: emp.id });
      closeAndRemoveModal('edit-doc-modal');
      toast('\u05DE\u05E1\u05DE\u05DA \u05E0\u05DE\u05D7\u05E7');
      if (typeof _detailSupplierId !== 'undefined' && _detailSupplierId) {
        await openSupplierDetail(_detailSupplierId);
        _switchDetailTab('docs');
      } else {
        await loadDocumentsTab();
      }
    } catch (e) {
      console.error('_softDeleteDocument error:', e);
      toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
    } finally { hideLoading(); }
  });
}

// ── Assign document to expense folder ────────────────────────
async function assignToFolder(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;
  var folders = typeof getExpenseFolders === 'function' ? getExpenseFolders() : [];
  var opts = '<option value="">\u05DC\u05DC\u05D0 \u05EA\u05D9\u05E7\u05D9\u05D4</option>' +
    folders.map(function(f) {
      var sel = doc.expense_folder_id === f.id ? ' selected' : '';
      return '<option value="' + f.id + '"' + sel + '>' + escapeHtml((f.icon || '') + ' ' + f.name) + '</option>';
    }).join('');
  Modal.form({
    title: '\u05E9\u05D9\u05D9\u05DA \u05DC\u05EA\u05D9\u05E7\u05D9\u05D4',
    size: 'sm', submitText: '\u05E9\u05DE\u05D5\u05E8', cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    content: '<label style="display:block;font-size:.9rem">\u05EA\u05D9\u05E7\u05D9\u05D4:<select id="atf-folder" class="nd-field">' + opts + '</select></label>',
    onSubmit: async function() {
      var folderId = document.getElementById('atf-folder').value || null;
      try {
        await batchUpdate(T.SUP_DOCS, [{ id: docId, expense_folder_id: folderId }]);
        await writeLog('doc_folder_assigned', null, { document_id: docId, folder_id: folderId });
        Toast.success(folderId ? '\u05DE\u05E1\u05DE\u05DA \u05E9\u05D5\u05D9\u05DA \u05DC\u05EA\u05D9\u05E7\u05D9\u05D4' : '\u05DE\u05E1\u05DE\u05DA \u05D4\u05D5\u05E1\u05E8 \u05DE\u05EA\u05D9\u05E7\u05D9\u05D4');
        Modal.close(); closeAndRemoveModal('edit-doc-modal');
        if (typeof _detailSupplierId !== 'undefined' && _detailSupplierId) {
          await openSupplierDetail(_detailSupplierId); _switchDetailTab('docs');
        } else { await loadDocumentsTab(); }
      } catch (e) { Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || '')); }
    }
  });
}

// ── Change document type (PIN required) ─────────────────────
async function changeDocumentType(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;
  var types = (_docTypes || []).filter(function(t) { return t.id !== doc.document_type_id; });
  if (!types.length) { Toast.warning('\u05D0\u05D9\u05DF \u05E1\u05D5\u05D2\u05D9 \u05DE\u05E1\u05DE\u05DA \u05D0\u05D7\u05E8\u05D9\u05DD'); return; }
  var curType = (_docTypes || []).find(function(t) { return t.id === doc.document_type_id; });
  var opts = types.map(function(t) {
    return '<option value="' + t.id + '">' + escapeHtml(t.name_he) + '</option>';
  }).join('');
  Modal.form({
    title: '\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA',
    size: 'sm',
    submitText: '\u05E9\u05E0\u05D4 \u05E1\u05D5\u05D2',
    cancelText: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    content:
      '<div style="margin-bottom:12px;font-size:.88rem">\u05E1\u05D5\u05D2 \u05E0\u05D5\u05DB\u05D7\u05D9: <strong>' +
        escapeHtml(curType ? curType.name_he : '—') + '</strong></div>' +
      '<label style="display:block;font-size:.9rem">\u05E1\u05D5\u05D2 \u05D7\u05D3\u05E9:' +
        '<select id="cdt-new-type" class="nd-field">' + opts + '</select></label>',
    onSubmit: function() {
      var newTypeId = document.getElementById('cdt-new-type').value;
      if (!newTypeId) return;
      Modal.close();
      setTimeout(function() {
      promptPin('\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA \u2014 \u05D0\u05D9\u05DE\u05D5\u05EA', async function(pin, emp) {
        showLoading('\u05DE\u05E2\u05D3\u05DB\u05DF \u05E1\u05D5\u05D2...');
        try {
          await batchUpdate(T.SUP_DOCS, [{ id: docId, document_type_id: newTypeId }]);
          var newType = types.find(function(t) { return t.id === newTypeId; });
          await writeLog('doc_type_changed', null, {
            document_id: docId, old_type: curType ? curType.name_he : '', new_type: newType ? newType.name_he : '',
            changed_by: emp.name
          });
          Toast.success('\u05E1\u05D5\u05D2 \u05DE\u05E1\u05DE\u05DA \u05E2\u05D5\u05D3\u05DB\u05DF');
          closeAndRemoveModal('edit-doc-modal');
          if (typeof _detailSupplierId !== 'undefined' && _detailSupplierId) {
            await openSupplierDetail(_detailSupplierId); _switchDetailTab('docs');
          } else { await loadDocumentsTab(); }
        } catch (e) {
          console.error('changeDocumentType error:', e);
          Toast.error('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''));
        } finally { hideLoading(); }
      });
      }, 200);
    }
  });
}

async function _togglePendingReview(docId, setReview) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;
  var newStatus = setReview ? 'pending_review' : (doc._prevStatus || 'open');
  showLoading('\u05DE\u05E2\u05D3\u05DB\u05DF...');
  try {
    var update = { id: docId, status: newStatus };
    await batchUpdate(T.SUP_DOCS, [update]);
    if (setReview) doc._prevStatus = doc.status;
    doc.status = newStatus;
    await writeLog('doc_status_change', null, { document_id: docId, new_status: newStatus, reason: setReview ? '\u05E1\u05D5\u05DE\u05DF \u05DC\u05D1\u05D9\u05E8\u05D5\u05E8' : '\u05D4\u05D5\u05E1\u05E8 \u05DE\u05D1\u05D9\u05E8\u05D5\u05E8' });
    closeAndRemoveModal('edit-doc-modal');
    toast(setReview ? '\u05DE\u05E1\u05DE\u05DA \u05E1\u05D5\u05DE\u05DF \u05DC\u05D1\u05D9\u05E8\u05D5\u05E8' : '\u05E1\u05D9\u05DE\u05D5\u05DF \u05D4\u05D5\u05E1\u05E8');
    if (typeof _detailSupplierId !== 'undefined' && _detailSupplierId) {
      await openSupplierDetail(_detailSupplierId); _switchDetailTab('docs');
    } else { await loadDocumentsTab(); }
  } catch (e) {
    console.error('_togglePendingReview error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  } finally { hideLoading(); }
}
