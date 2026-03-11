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
    let query = sb.from(tableName).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
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

// --- Supabase-backed batchUpdate (upsert-based, PERF-01) ---
async function batchUpdate(tableName, records) {
  if (!records?.length) return [];
  const selectCols = tableName === 'inventory' ? '*, inventory_images(*)' : '*';

  // Group records by their column set for valid upsert batches
  const groups = new Map();
  for (const rec of records) {
    const { id, ...row } = rec;
    const key = Object.keys(row).sort().join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  }

  const allData = [];
  for (const rows of groups.values()) {
    const { data, error } = await sb.from(tableName)
      .upsert(rows, { onConflict: 'id' })
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
