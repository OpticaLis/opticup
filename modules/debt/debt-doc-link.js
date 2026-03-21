// =========================================================
// debt-doc-link.js — Link delivery notes to invoices (Phase 4d)
// Load after: debt-documents.js
// Provides: openLinkToInvoiceModal(), linkDeliveryToInvoice(),
//   _renderLinkSummary()
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
        '<select id="link-invoice-id" style="width:100%;padding:6px" onchange="_renderLinkSummary(this.value)">' +
          '<option value="">בחר חשבונית...</option>' + invOpts +
        '</select>' +
      '</label>' +
      '<div id="link-summary" style="margin-top:10px;font-size:.88rem"></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">' +
        '<button class="btn btn-g" onclick="closeAndRemoveModal(\'link-doc-modal\')">ביטול</button>' +
        '<button class="btn btn-s" onclick="linkDeliveryToInvoice(\'' + docId + '\')">קשר</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

async function _renderLinkSummary(invoiceId) {
  var el = $('link-summary');
  if (!el) return;
  if (!invoiceId) { el.innerHTML = ''; return; }
  try {
    var inv = _docData.find(function(d) { return d.id === invoiceId; });
    if (!inv) { el.innerHTML = ''; return; }
    var invTotal = Number(inv.total_amount) || 0;
    var links = await fetchAll(T.DOC_LINKS, [['parent_document_id', 'eq', invoiceId]]);
    var linkedSum = links.reduce(function(s, l) {
      var amount = Number(l.amount_on_invoice) || 0;
      if (amount > 0) return s + amount;
      // Fallback: look up child document total
      var child = _docData.find(function(d) { return d.id === l.child_document_id; });
      return s + (child ? (Number(child.total_amount) || 0) : 0);
    }, 0);
    var line = '\u05E1\u05D4"\u05DB \u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05DE\u05E7\u05D5\u05E9\u05E8\u05D5\u05EA: ' +
      formatILS(linkedSum) + ' \u05DE\u05EA\u05D5\u05DA ' + formatILS(invTotal);
    var diff = invTotal - linkedSum;
    var status = '';
    if (linkedSum > invTotal) {
      status = '<div style="color:var(--error);margin-top:4px">\u26A0\uFE0F \u05E1\u05DB\u05D5\u05DD \u05D4\u05EA\u05E2\u05D5\u05D3\u05D5\u05EA (' +
        formatILS(linkedSum) + ') \u05D2\u05D1\u05D5\u05D4 \u05DE\u05E1\u05DB\u05D5\u05DD \u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA (' + formatILS(invTotal) + ')</div>';
    } else if (Math.abs(diff) < 0.01) {
      status = '<div style="color:var(--success, #155724);margin-top:4px">\u2705 \u05E1\u05DB\u05D5\u05DD \u05EA\u05D5\u05D0\u05DD</div>';
    } else {
      status = '<div style="color:var(--g600);margin-top:4px">\uD83D\uDCCB \u05E0\u05D5\u05EA\u05E8 ' + formatILS(diff) + ' \u05DC\u05E7\u05D9\u05E9\u05D5\u05E8</div>';
    }
    el.innerHTML = '<div style="padding:8px;background:var(--g50, #f8f9fa);border-radius:6px">' + line + status + '</div>';
  } catch (e) {
    console.warn('_renderLinkSummary error:', e);
    el.innerHTML = '';
  }
}

async function linkDeliveryToInvoice(deliveryNoteId) {
  var invoiceId = ($('link-invoice-id') || {}).value;
  if (!invoiceId) { setAlert('link-doc-alert', '\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA', 'e'); return; }

  showLoading('\u05DE\u05E7\u05E9\u05E8...');
  try {
    await batchCreate(T.DOC_LINKS, [{
      parent_document_id: invoiceId,
      child_document_id: deliveryNoteId
    }]);
    await batchUpdate(T.SUP_DOCS, [{ id: deliveryNoteId, status: 'linked' }]);
    await writeLog('doc_link', null, {
      reason: '\u05EA\u05E2\u05D5\u05D3\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05E7\u05D5\u05E9\u05E8\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA',
      source_ref: deliveryNoteId
    });

    closeAndRemoveModal('link-doc-modal');
    toast('\u05EA\u05E2\u05D5\u05D3\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05E7\u05D5\u05E9\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4');
    await loadDocumentsTab();
  } catch (e) {
    console.error('linkDeliveryToInvoice error:', e);
    setAlert('link-doc-alert', '\u05E9\u05D2\u05D9\u05D0\u05D4: ' + escapeHtml(e.message), 'e');
  } finally {
    hideLoading();
  }
}
