// ai-alerts.js — Event-driven alerts, auto-dismiss, duplicate check (Phase 5f-2)
// Load after: ai-ocr.js, debt-documents.js, debt-doc-link.js, debt-payment-alloc.js
// Used on: suppliers-debt.html only
// Shared helpers (createAlert, alertPriceAnomaly) live in supabase-ops.js

// =========================================================
// 1. DUPLICATE DOCUMENT CHECK
// =========================================================
async function checkDuplicateDocument(supplierId, docNumber, tenantId) {
  if (!supplierId || !docNumber) return null;
  try {
    var tid = tenantId || getTenantId();
    var { data, error } = await sb.from(T.SUP_DOCS)
      .select('id, document_number, internal_number, total_amount, document_date')
      .eq('tenant_id', tid)
      .eq('supplier_id', supplierId)
      .eq('document_number', docNumber)
      .eq('is_deleted', false)
      .limit(1);
    if (error || !data || !data.length) return null;
    return data[0];
  } catch (e) {
    console.warn('checkDuplicateDocument error:', e);
    return null;
  }
}

// =========================================================
// 2. ALERT CREATORS — event-specific
// =========================================================
async function alertDuplicateDocument(supplierName, docType, docNumber, existingDocId) {
  var title = 'מסמך כפול? ' + (docType || '') + ' ' + (docNumber || '') + ' מ-' + (supplierName || '');
  return createAlert('duplicate_document', 'warning', title, 'supplier_document', existingDocId,
    { supplier_name: supplierName, doc_type: docType, doc_number: docNumber });
}

async function alertAmountMismatch(invoiceNum, invoiceTotal, notesTotal, invoiceDocId) {
  var title = 'אי-התאמת סכום — חשבונית ' + (invoiceNum || '') +
    ': ₪' + invoiceTotal + ' ≠ תעודות ₪' + notesTotal;
  return createAlert('amount_mismatch', 'warning', title, 'supplier_document', invoiceDocId,
    { invoice_total: invoiceTotal, notes_total: notesTotal });
}

async function alertOCRLowConfidence(fileName, extractionId, confidence) {
  var title = 'סריקה דורשת בדיקה — ' + (fileName || '');
  var expires = new Date();
  expires.setDate(expires.getDate() + 7);
  return createAlert('ocr_low_confidence', 'info', title, 'ocr_extraction', extractionId,
    { file_name: fileName, confidence: confidence }, expires.toISOString());
}

// --- Phase 8: Prepaid deal notification on new supplier document ---
async function alertPrepaidNewDocument(supplierId, documentId, tenantId, supplierName, docNumber) {
  try {
    await sb.from(T.ALERTS).insert({
      tenant_id: tenantId || getTenantId(),
      alert_type: 'prepaid_new_document',
      severity: 'info',
      title: '\u05DE\u05E1\u05DE\u05DA \u05D7\u05D3\u05E9 \u05DE-' + (supplierName || '') + ' \u2014 \u05D9\u05E9 \u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4 \u05E4\u05E2\u05D9\u05DC\u05D4',
      message: '\u05DE\u05E1\u05DE\u05DA \u05E1\u05E4\u05E7 #' + (docNumber || '') + ' \u05E0\u05D5\u05E6\u05E8. \u05DC\u05E1\u05E4\u05E7 \u05D6\u05D4 \u05D9\u05E9 \u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4 \u05E4\u05E2\u05D9\u05DC\u05D4. \u05D9\u05E9 \u05DC\u05D1\u05D3\u05D5\u05E7 \u05D0\u05DD \u05DC\u05E7\u05D6\u05D6.',
      data: { supplier_id: supplierId, document_id: documentId },
      status: 'unread',
      entity_type: 'supplier_document',
      entity_id: documentId
    });
    if (typeof refreshAlertsBadge === 'function') refreshAlertsBadge();
  } catch (e) {
    console.warn('alertPrepaidNewDocument error:', e);
  }
}

// =========================================================
// 3. AUTO-DISMISS — resolve related alerts
// =========================================================
async function autoDismissAlerts(entityType, entityId, alertTypes) {
  if (!entityType || !entityId || !alertTypes || !alertTypes.length) return;
  try {
    var tid = getTenantId();
    if (!tid) return;
    var { error } = await sb.from(T.ALERTS)
      .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
      .eq('tenant_id', tid)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .in('alert_type', alertTypes)
      .in('status', ['unread', 'read']);
    if (error) console.warn('autoDismissAlerts error:', error.message);
    else if (typeof refreshAlertsBadge === 'function') refreshAlertsBadge();
  } catch (e) {
    console.warn('autoDismissAlerts failed:', e);
  }
}

// =========================================================
// 4. HOOKS — patch existing functions on DOMContentLoaded
// =========================================================
document.addEventListener('DOMContentLoaded', function() {
  // Wait for other scripts to define their globals
  setTimeout(_patchAlertHooks, 800);
});

function _patchAlertHooks() {
  _patchDocumentSave();
  _patchDocLinking();
  _patchOCRSave();
  _patchPaymentSave();
}

// --- 4a. Duplicate check on document save ---
function _patchDocumentSave() {
  if (typeof saveNewDocument !== 'function') return;
  var _origSaveDoc = saveNewDocument;
  window.saveNewDocument = async function() {
    // Check for duplicate before proceeding
    var supplierId = ($('nd-supplier') || {}).value;
    var docNumber = (($('nd-number') || {}).value || '').trim();
    if (supplierId && docNumber) {
      var existing = await checkDuplicateDocument(supplierId, docNumber);
      if (existing) {
        // Find supplier name for alert
        var supName = '';
        if (_docSuppliers) {
          var s = _docSuppliers.find(function(x) { return x.id === supplierId; });
          if (s) supName = s.name;
        }
        alertDuplicateDocument(supName, '', docNumber, existing.id);
        var proceed = await confirmDialog('מסמך כפול?',
          'מסמך עם מספר ' + docNumber + ' כבר קיים לספק זה (מתאריך ' +
          (existing.document_date || '') + ', סכום ' + formatILS(existing.total_amount) +
          '). להמשיך בכל זאת?');
        if (!proceed) return;
      }
    }
    return _origSaveDoc.apply(this, arguments);
  };
}

// --- 4b. Amount mismatch on invoice linking ---
function _patchDocLinking() {
  if (typeof linkDeliveryToInvoice !== 'function') return;
  var _origLink = linkDeliveryToInvoice;
  window.linkDeliveryToInvoice = async function(deliveryNoteId) {
    // Capture invoice ID before original closes modal
    var invoiceId = ($('link-invoice-id') || {}).value;
    // Call original (closes modal, reloads tab)
    await _origLink.apply(this, arguments);
    // After linking, check mismatch on the invoice
    try {
      if (!invoiceId) return;
      // Re-fetch docs since _docData was reloaded by loadDocumentsTab
      var invoice = _docData.find(function(d) { return d.id === invoiceId; });
      if (!invoice) return;
      // Get all linked delivery notes for this invoice
      var links = await fetchAll(T.DOC_LINKS, [['parent_document_id', 'eq', invoiceId]]);
      if (!links.length) return;
      var childIds = links.map(function(l) { return l.child_document_id; });
      var notesTotal = 0;
      _docData.forEach(function(d) {
        if (childIds.indexOf(d.id) >= 0) notesTotal += Number(d.total_amount) || 0;
      });
      var invTotal = Number(invoice.total_amount) || 0;
      if (Math.abs(invTotal - notesTotal) > 1) {
        alertAmountMismatch(invoice.document_number, invTotal, notesTotal, invoiceId);
      }
    } catch (e) {
      console.warn('amount mismatch check error:', e);
    }
  };
}

// --- 4c. OCR low confidence + auto-dismiss on accept ---
function _patchOCRSave() {
  if (typeof _ocrSave !== 'function') return;
  var _origOcrSave = _ocrSave;
  window._ocrSave = async function(mode) {
    // Capture extraction ID and confidence before save
    var extId = _ocrExtractionId;
    await _origOcrSave.apply(this, arguments);
    // After save, check conditions
    try {
      if (!extId) return;
      // Auto-dismiss OCR low confidence alert on accept/correct
      autoDismissAlerts('ocr_extraction', extId, ['ocr_low_confidence']);
    } catch (e) {
      console.warn('OCR alert post-save error:', e);
    }
  };
}

// --- 4d. Auto-dismiss on payment save ---
function _patchPaymentSave() {
  if (typeof _wizSavePayment !== 'function') return;
  var _origWizSave = _wizSavePayment;
  window._wizSavePayment = async function() {
    // Capture allocation doc IDs before save
    var docIds = (_wizState.allocations || []).map(function(a) { return a.document_id; });
    await _origWizSave.apply(this, arguments);
    // After successful payment, dismiss payment alerts for paid docs
    try {
      for (var i = 0; i < docIds.length; i++) {
        autoDismissAlerts('supplier_document', docIds[i], ['payment_due', 'payment_overdue']);
      }
    } catch (e) {
      console.warn('payment alert dismiss error:', e);
    }
  };
}

// =========================================================
// 5. OCR CONFIDENCE CHECK — hook into triggerOCR result
// =========================================================
(function() {
  if (typeof triggerOCR !== 'function') return;
  var _origTrigger = triggerOCR;
  window.triggerOCR = async function(fileUrl, supplierId, documentTypeHint) {
    // Wrap to intercept the result and check confidence
    var origShow = typeof showOCRReview === 'function' ? showOCRReview : null;
    if (origShow) {
      window.showOCRReview = async function(result, fUrl) {
        // Check confidence threshold
        try {
          var conf = result.confidence_score || 0;
          var tid = getTenantId();
          var cfgRows = await sb.from(T.AI_CONFIG).select('confidence_threshold').eq('tenant_id', tid).limit(1);
          var cfg = (cfgRows.data && cfgRows.data[0]) || {};
          var threshold = cfg.confidence_threshold || 0.7;
          if (conf < threshold && result.extraction_id) {
            var fn = (fUrl || '').split('/').pop() || 'מסמך';
            alertOCRLowConfidence(fn, result.extraction_id, conf);
          }
        } catch (e) {
          console.warn('OCR confidence check error:', e);
        }
        // Restore and call original
        window.showOCRReview = origShow;
        return origShow.call(this, result, fUrl);
      };
    }
    return _origTrigger.apply(this, arguments);
  };
})();
