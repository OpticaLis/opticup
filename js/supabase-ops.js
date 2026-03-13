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

async function updateOCRTemplate(supplierId, docTypeCode, corrections, extractedData, templateName) {
  if (!supplierId) return;
  var hasCorr = corrections && Object.keys(corrections).length > 0;
  var code = docTypeCode || 'general';
  try {
    var existing = await fetchAll(T.OCR_TEMPLATES, [
      ['supplier_id', 'eq', supplierId],
      ['document_type_code', 'eq', code]
    ]);
    var template = (existing && existing.length > 0) ? existing[0] : null;
    var now = new Date().toISOString();
    if (template) {
      var used = (template.times_used || 0) + 1;
      var corrected = (template.times_corrected || 0) + (hasCorr ? 1 : 0);
      var accuracy = used > 0 ? Math.round((1 - corrected / used) * 10000) / 100 : 100;
      var hints = buildHintsFromCorrections(corrections, extractedData, template.extraction_hints || {});
      await batchUpdate(T.OCR_TEMPLATES, [{
        id: template.id, times_used: used, times_corrected: corrected,
        accuracy_rate: accuracy, extraction_hints: hints,
        last_used_at: now, updated_at: now
      }]);
    } else {
      var hints = buildHintsFromCorrections(corrections || {}, extractedData, {});
      await batchCreate(T.OCR_TEMPLATES, [{
        supplier_id: supplierId, document_type_code: code,
        template_name: templateName || code, extraction_hints: hints,
        times_used: 1, times_corrected: hasCorr ? 1 : 0,
        accuracy_rate: hasCorr ? 0 : 100, last_used_at: now
      }]);
    }
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
