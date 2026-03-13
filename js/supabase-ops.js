async function loadLookupCaches() {
  const { data: sups } = await sb.from('suppliers').select('id,name,supplier_number');
  supplierCache = {}; supplierCacheRev = {}; supplierNumCache = {};
  (sups || []).forEach(s => { supplierCache[s.name] = s.id; supplierCacheRev[s.id] = s.name; supplierNumCache[s.id] = s.supplier_number; });

  const { data: brs } = await sb.from('brands').select('id,name');
  brandCache = {}; brandCacheRev = {};
  (brs || []).forEach(b => { brandCache[b.name] = b.id; brandCacheRev[b.id] = b.name; });
}

// --- Enrich Supabase row with resolved brand/supplier names ---
function enrichRow(row) {
  return {
    ...row,
    brand_name:    brandCacheRev[row.brand_id]    || '',
    supplier_name: supplierCacheRev[row.supplier_id] || '',
  };
}

// --- Supabase-backed fetchAll ---
async function fetchAll(tableName, filters) {
  const PAGE = 1000;
  let all = [], from = 0;
  while (true) {
    const tid = getTenantId();
    let query = sb.from(tableName).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
    if (tid) query = query.eq('tenant_id', tid);
    if (filters) {
      for (const [col, op, val] of filters) {
        if (op === 'eq') query = query.eq(col, val);
        else if (op === 'in') query = query.in(col, val);
        else if (op === 'ilike') query = query.ilike(col, val);
        else if (op === 'neq') query = query.neq(col, val);
        else if (op === 'gt') query = query.gt(col, val);
        else if (op === 'gte') query = query.gte(col, val);
        else if (op === 'lt') query = query.lt(col, val);
      }
    }
    query = query.range(from, from + PAGE - 1);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all.map(enrichRow);
}

// --- Supabase-backed batchCreate ---
async function batchCreate(tableName, records) {
  // Duplicate barcode check for inventory inserts
  if (tableName === T.INV) {
    const barcodes = records.map(r => r.barcode).filter(Boolean);
    if (barcodes.length) {
      // Check for duplicates within the batch itself
      const seen = new Set();
      const batchDupes = [];
      for (const bc of barcodes) {
        if (seen.has(bc)) batchDupes.push(bc);
        seen.add(bc);
      }
      if (batchDupes.length) {
        throw new Error(`ברקודים כפולים בשליחה: ${[...new Set(batchDupes)].join(', ')}`);
      }
      // Check against existing barcodes in DB
      const { data: existing } = await sb.from('inventory').select('barcode').in('barcode', barcodes);
      if (existing?.length) {
        const dupes = existing.map(r => r.barcode);
        throw new Error(`ברקודים כבר קיימים במלאי: ${dupes.join(', ')}`);
      }
    }
  }

  const tid = getTenantId();
  if (tid) records = records.map(r => ({ ...r, tenant_id: tid }));

  const created = [];
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { data, error } = await sb.from(tableName).insert(batch).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
    if (error) {
      // Friendly message for unique constraint violation
      if (error.code === '23505' && error.message.includes('barcode')) {
        throw new Error('ברקוד כפול — ברקוד זה כבר קיים במלאי');
      }
      throw new Error(error.message);
    }
    created.push(...(data || []).map(enrichRow));
  }
  return created;
}

// --- Supabase-backed batchUpdate (individual updates for RLS compat) ---
async function batchUpdate(tableName, records) {
  if (!records?.length) return [];
  const selectCols = tableName === 'inventory' ? '*, inventory_images(*)' : '*';
  const tid = getTenantId();
  const allData = [];

  for (const rec of records) {
    const { id, ...row } = rec;
    if (!id) throw new Error('batchUpdate: record missing id');
    if (tid) row.tenant_id = tid;
    const { data, error } = await sb.from(tableName)
      .update(row)
      .eq('id', id)
      .select(selectCols);
    if (error) {
      if (error.code === '23505' && error.message.includes('barcode')) {
        throw new Error('ברקוד זה כבר קיים במערכת');
      }
      throw new Error(error.message);
    }
    if (data) allData.push(...data);
  }

  return allData.map(enrichRow);
}

// =========================================================
// BARCODE GENERATION (shared helper — BBDDDDD format)
// =========================================================
async function generateNextBarcode() {
  await loadMaxBarcode();
  const prefix = branchCode.padStart(2, '0');
  maxBarcode++;
  if (maxBarcode > 99999) throw new Error('חריגה — מקסימום ברקודים');
  return prefix + String(maxBarcode).padStart(5, '0');
}

// =========================================================
// LOGGING ENGINE
// =========================================================
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
// LOGGING ENGINE
// =========================================================
async function writeLog(action, inventoryId, details = {}) {
  try {
    const emp    = getCurrentEmployee();
    const branch = emp?.branch_id || sessionStorage.getItem('prizma_branch') || '00';
    await sb.from('inventory_logs').insert({
      action,
      inventory_id:  inventoryId || null,
      barcode:       details.barcode       || null,
      brand:         details.brand         || null,
      model:         details.model         || null,
      qty_before:    details.qty_before    ?? null,
      qty_after:     details.qty_after     ?? null,
      price_before:  details.price_before  ?? null,
      price_after:   details.price_after   ?? null,
      reason:        details.reason        || null,
      source_ref:    details.source_ref    || null,
      performed_by:  emp?.name || sessionStorage.getItem('prizma_user') || 'unknown',
      branch_id:     branch,
      // Access sale fields (011)
      sale_amount:   details.sale_amount   ?? null,
      discount:      details.discount      ?? null,
      discount_1:    details.discount_1    ?? null,
      discount_2:    details.discount_2    ?? null,
      final_amount:  details.final_amount  ?? null,
      coupon_code:   details.coupon_code   ?? null,
      campaign:      details.campaign      ?? null,
      employee_id:   emp?.id || details.employee_id || null,
      tenant_id:     getTenantId(),
      lens_included: details.lens_included ?? null,
      lens_category: details.lens_category ?? null,
      order_number:  details.order_number  ?? null,
      sync_filename: details.filename      ?? null
    });
  } catch (e) {
    console.warn('writeLog failed:', e);
    toast('שגיאה: פעולה לא נרשמה ביומן', 'e');
  }
}

// --- Batch version of writeLog (single INSERT for multiple entries) ---
async function batchWriteLog(entries) {
  // entries = [{ action, inventory_id, details }, ...]
  if (!entries || entries.length === 0) return;
  const tid = getTenantId();
  const records = entries.map(e => ({
    action: e.action,
    inventory_id: e.inventory_id || null,
    details: e.details || {},
    tenant_id: tid
  }));
  await batchCreate(T.LOGS, records);
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
