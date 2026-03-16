// =========================================================
// debt-doc-link.js — Link delivery notes to invoices (Phase 4d)
// Load after: debt-documents.js
// Provides: openLinkToInvoiceModal(), linkDeliveryToInvoice()
// =========================================================

function openLinkToInvoiceModal(docId) {
  var doc = _docData.find(function(d) { return d.id === docId; });
  if (!doc) return;

  var typeMap = {};
  _docTypes.forEach(function(t) { typeMap[t.id] = t; });
  var invoices = _docData.filter(function(d) {
    return d.supplier_id === doc.supplier_id &&
      (typeMap[d.document_type_id] || {}).code === 'invoice' &&
      d.status !== 'cancelled' && d.id !== docId;
  });

  var invOpts = invoices.map(function(inv) {
    return '<option value="' + inv.id + '">' + escapeHtml(inv.document_number) +
      ' (' + formatILS(inv.total_amount) + ')</option>';
  }).join('');

  var modal = document.createElement('div');
  modal.id = 'link-doc-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="modal" style="max-width:400px">' +
      '<h3 style="margin:0 0 14px">קשר תעודת משלוח לחשבונית</h3>' +
      '<div id="link-doc-alert"></div>' +
      '<p style="font-size:.9rem;color:var(--g600)">תעודת משלוח: <strong>' +
        escapeHtml(doc.document_number) + '</strong> — ' + formatILS(doc.total_amount) + '</p>' +
      '<label>חשבונית' +
        '<select id="link-invoice-id" style="width:100%;padding:6px">' +
          '<option value="">בחר חשבונית...</option>' + invOpts +
        '</select>' +
      '</label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn btn-g" onclick="closeAndRemoveModal(\'link-doc-modal\')">ביטול</button>' +
        '<button class="btn btn-s" onclick="linkDeliveryToInvoice(\'' + docId + '\')">קשר</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

async function linkDeliveryToInvoice(deliveryNoteId) {
  var invoiceId = ($('link-invoice-id') || {}).value;
  if (!invoiceId) { setAlert('link-doc-alert', 'יש לבחור חשבונית', 'e'); return; }

  showLoading('מקשר...');
  try {
    await batchCreate(T.DOC_LINKS, [{
      parent_document_id: invoiceId,
      child_document_id: deliveryNoteId
    }]);
    await batchUpdate(T.SUP_DOCS, [{ id: deliveryNoteId, status: 'linked' }]);
    await writeLog('doc_link', null, {
      reason: 'תעודת משלוח קושרה לחשבונית',
      source_ref: deliveryNoteId
    });

    closeAndRemoveModal('link-doc-modal');
    toast('תעודת משלוח קושרה בהצלחה');
    await loadDocumentsTab();
  } catch (e) {
    console.error('linkDeliveryToInvoice error:', e);
    setAlert('link-doc-alert', 'שגיאה: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}
