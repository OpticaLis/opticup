// =========================================================
// Optic Up — Reverse Sync: Export new inventory to CSV
// Queries unexported items and writes a CSV for Access import.
// =========================================================

const fs   = require('fs');
const path = require('path');

const BOM = '\uFEFF';
const CSV_HEADERS = 'barcode,supplier,brand,model,size,color,sell_price,discount_pct,quantity,product_type';

function makeExportFilename() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `export_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.csv`;
}

function escapeCsvField(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Export new (unexported) inventory items to a CSV file for Access.
 * @param {object} sb - Supabase client (service_role)
 * @param {string} tenantId - tenant UUID
 * @param {string} exportDir - directory to write CSV files to
 * @param {function} log - logging function
 */
async function exportNewInventoryToAccess(sb, tenantId, exportDir, log) {
  // 1. Query unexported items with brand and supplier joins
  const { data: items, error } = await sb
    .from('inventory')
    .select(`
      id, barcode, model, size, color, sell_price, sell_discount, quantity, product_type,
      brands ( name, brand_type ),
      suppliers ( name )
    `)
    .eq('tenant_id', tenantId)
    .eq('access_exported', false)
    .eq('is_deleted', false);

  if (error) throw new Error(`Export query failed: ${error.message}`);
  if (!items || items.length === 0) return;

  // 2. Build CSV rows
  const rows = items.map(item => {
    const brandName    = item.brands?.name || '';
    const supplierName = item.suppliers?.name || '';
    const discountPct  = item.sell_discount ? +(item.sell_discount * 100).toFixed(2) : 0;

    return [
      escapeCsvField(item.barcode),
      escapeCsvField(supplierName),
      escapeCsvField(brandName),
      escapeCsvField(item.model),
      escapeCsvField(item.size),
      escapeCsvField(item.color),
      item.sell_price || 0,
      discountPct,
      item.quantity || 0,
      escapeCsvField(item.product_type || (item.brands?.brand_type || '')),
    ].join(',');
  });

  const csvContent = BOM + CSV_HEADERS + '\n' + rows.join('\n') + '\n';

  // 3. Ensure export directory exists
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // 4. Write CSV file
  const filename = makeExportFilename();
  const filepath = path.join(exportDir, filename);
  fs.writeFileSync(filepath, csvContent, 'utf-8');

  // 5. Mark exported items by their specific IDs in batches of 100
  const ids = items.map(i => i.id);
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { error: updateErr } = await sb
      .from('inventory')
      .update({ access_exported: true })
      .in('id', batch)
      .eq('tenant_id', tenantId);
    if (updateErr) {
      log(`Warning: failed to mark batch ${Math.floor(i / 100) + 1} as exported: ${updateErr.message}`);
    }
  }

  // 6. Write sync_log entry
  try {
    const { error: logErr } = await sb.from('sync_log').insert({
      tenant_id:     tenantId,
      filename,
      source_ref:    'export',
      status:        'success',
      rows_total:    items.length,
      rows_success:  items.length,
      rows_pending:  0,
      rows_error:    0,
      processed_at:  new Date().toISOString(),
    });
    if (logErr) log(`Warning: sync_log insert failed: ${logErr.message}`);
  } catch (e) {
    log(`Warning: sync_log insert error: ${e.message}`);
  }

  log(`Exported ${items.length} new items to ${filename}`);
}

module.exports = { exportNewInventoryToAccess };
