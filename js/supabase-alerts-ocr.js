// supabase-alerts-ocr.js — Alert creation + OCR template learning (split from supabase-ops.js)
// Load after: shared.js, supabase-ops.js
// Provides: createAlert(), alertPriceAnomaly(), alertPrepaidNewDocument(),
//   _detectDateFormat(), buildHintsFromCorrections(), updateOCRTemplate(), validateOCRData()

// =========================================================
// OCR LEARNING — Template update helpers (Phase 5e)
// =========================================================

function _detectDateFormat(dateStr) {
  if (!dateStr) return null;
  var s = String(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'YYYY-MM-DD';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return 'DD/MM/YYYY';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return 'DD.MM.YYYY';
  return null;
}

function buildHintsFromCorrections(corrections, extractedData, existingHints) {
  var hints = Object.assign({}, existingHints || {});
  var fv = function(d, f) {
    var v = (d || {})[f];
    return (v && typeof v === 'object' && 'value' in v) ? v.value : v;
  };
  // Extract base patterns from extracted data
  if (extractedData) {
    var sn = fv(extractedData, 'supplier_name');
    if (sn && !hints.supplier_name_pattern) hints.supplier_name_pattern = sn;
    var dd = fv(extractedData, 'document_date');
    if (dd && !hints.date_format) {
      var fmt = _detectDateFormat(dd);
      if (fmt) hints.date_format = fmt;
    }
    var cur = fv(extractedData, 'currency');
    if (cur) hints.currency = cur;
  }
  if (!corrections || !Object.keys(corrections).length) return hints;
  // Process field corrections
  if (corrections.document_date) {
    var fmt = _detectDateFormat(String(corrections.document_date.user || ''));
    if (fmt) hints.date_format = fmt;
  }
  if (corrections.supplier_name) hints.supplier_name_pattern = corrections.supplier_name.user;
  if (corrections.document_number) hints.document_number_example = String(corrections.document_number.user || '');
  if (corrections.total_amount || corrections.subtotal) hints.amounts_corrected = true;
  return hints;
}

async function updateOCRTemplate(supplierId, docTypeCode, corrections, extractedData, tenantId) {
  if (!supplierId) return;
  var tid = tenantId || getTenantId();
  var wasCorrected = corrections && Object.keys(corrections).length > 0;
  var hints = buildHintsFromCorrections(corrections, extractedData, {});
  try {
    var { data, error } = await sb.rpc('update_ocr_template_stats', {
      p_tenant_id: tid,
      p_supplier_id: supplierId,
      p_doc_type_code: docTypeCode || 'general',
      p_was_corrected: wasCorrected,
      p_new_hints: Object.keys(hints).length > 0 ? hints : null
    });
    if (error) console.error('Template update failed:', error);
    return data;
  } catch (e) {
    console.warn('updateOCRTemplate error:', e);
  }
}

// =========================================================
// ALERTS ENGINE — shared across all pages (Phase 5f-2)
// =========================================================
async function createAlert(alertType, severity, title, entityType, entityId, data, expiresAt) {
  try {
    var tid = getTenantId();
    if (!tid) return null;
    // Skip alerts for historical documents (Phase 5.5h-2)
    if (entityType === 'supplier_document' && entityId) {
      try {
        var { data: docRow } = await sb.from(T.SUP_DOCS).select('is_historical')
          .eq('id', entityId).eq('tenant_id', tid).single();
        if (docRow && docRow.is_historical === true) return null;
      } catch (e) { /* proceed if check fails */ }
    }
    // Check ai_agent_config flags
    var cfgRows = await sb.from(T.AI_CONFIG).select('*').eq('tenant_id', tid).limit(1);
    var cfg = (cfgRows.data && cfgRows.data[0]) || {};
    if (cfg.alerts_enabled === false) return null;
    // Per-type flag check
    var flagMap = { anomaly_alert: 'price_anomaly', overdue_alert: 'payment_overdue' };
    for (var flag in flagMap) {
      if (flagMap[flag] === alertType && cfg[flag] === false) return null;
    }
    var row = {
      tenant_id: tid, alert_type: alertType, severity: severity || 'info',
      title: title, entity_type: entityType || null, entity_id: entityId || null,
      data: data || null, status: 'unread'
    };
    if (expiresAt) row.expires_at = expiresAt;
    var { data: created, error } = await sb.from(T.ALERTS).insert(row).select().single();
    if (error) { console.warn('createAlert error:', error.message); return null; }
    if (typeof refreshAlertsBadge === 'function') refreshAlertsBadge();
    return created;
  } catch (e) {
    console.warn('createAlert failed:', e);
    return null;
  }
}

async function alertPriceAnomaly(item, poPrice, receiptPrice, supplierId, docId) {
  var title = 'פער מחיר — ' + (item || '') + ': ₪' + poPrice + ' → ₪' + receiptPrice;
  return createAlert('price_anomaly', 'warning', title, 'supplier_document', docId,
    { item: item, po_price: poPrice, receipt_price: receiptPrice, supplier_id: supplierId });
}

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
// validateOCRData — business-rule validation after OCR extraction
// Returns array of { field, level, msg }. Empty = all valid.
// =========================================================
function validateOCRData(data) {
  if (!data) return [];
  var results = [];
  var fv = function(f) { var v = data[f]; return (v && typeof v === 'object' && 'value' in v) ? v.value : v; };
  var subtotal = Number(fv('subtotal')) || 0;
  var vatAmt = Number(fv('vat_amount')) || 0;
  var total = Number(fv('total_amount')) || 0;
  var vatRate = fv('vat_rate');
  var docDate = fv('document_date');
  var dueDate = fv('due_date');
  var docType = fv('document_type') || '';
  var supMatch = data.supplier_match;

  // Amount math: subtotal + vat_amount ≠ total_amount (tolerance ₪1)
  if (subtotal > 0 && total > 0 && Math.abs((subtotal + vatAmt) - total) > 1) {
    results.push({ field: 'total_amount', level: 'error', msg: 'סכום לא תואם חישוב' });
  }
  // Future date
  var today = new Date().toISOString().slice(0, 10);
  if (docDate && docDate > today) {
    results.push({ field: 'document_date', level: 'error', msg: 'תאריך עתידי' });
  }
  // Due before issue
  if (dueDate && docDate && dueDate < docDate) {
    results.push({ field: 'due_date', level: 'warning', msg: 'תאריך פירעון לפני תאריך מסמך' });
  }
  // Negative amount (not credit note)
  if (total < 0 && docType !== 'credit_note') {
    results.push({ field: 'total_amount', level: 'error', msg: 'סכום שלילי' });
  }
  // Unusual VAT
  if (vatRate != null && Number(vatRate) !== 17 && Number(vatRate) !== 0) {
    results.push({ field: 'vat_rate', level: 'warning', msg: 'שיעור מע"מ חריג' });
  }
  // Missing supplier
  if (!supMatch || (!supMatch.id && !supMatch)) {
    results.push({ field: 'supplier', level: 'warning', msg: 'ספק לא זוהה' });
  }
  // Suspicious total
  if (total > 500000) {
    results.push({ field: 'total_amount', level: 'warning', msg: 'סכום חריג (מעל ₪500,000)' });
  }
  return results;
}
