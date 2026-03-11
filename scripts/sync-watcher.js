#!/usr/bin/env node
// =========================================================
// Optic Up — InventorySync Folder Watcher
// Watches for Excel sales files and processes them into Supabase.
// =========================================================

const fs   = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const XLSX     = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// ── Configuration ───────────────────────────────────────────
const CONFIG = {
  watchDir:      'C:\\Users\\User\\Dropbox\\InventorySync\\sales',
  processedDir:  'C:\\Users\\User\\Dropbox\\InventorySync\\processed',
  failedDir:     'C:\\Users\\User\\Dropbox\\InventorySync\\failed',
  supabaseUrl:   'https://tsxrrxzmdxaenlvocyit.supabase.co',
  supabaseKey:   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU',
};

// ── Init Supabase ───────────────────────────────────────────
const sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// ── State ───────────────────────────────────────────────────
const processing = new Set();

// ── Helpers ─────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function makeTimestamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function moveFile(filepath, destDir, filename) {
  const dest = path.join(destDir, `${makeTimestamp()}_${filename}`);
  try {
    fs.renameSync(filepath, dest);
  } catch {
    // renameSync may have succeeded despite throwing (Dropbox sync edge case)
    if (fs.existsSync(dest)) return;
    if (!fs.existsSync(filepath)) return;
    fs.copyFileSync(filepath, dest);
    fs.unlinkSync(filepath);
  }
}

function parseDateField(raw) {
  if (!raw) return null;
  if (typeof raw === 'number') {
    const d = new Date((raw - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

// ── Process a single Excel file ─────────────────────────────
async function processFile(filepath, filename) {
  // 1. Read Excel
  let wb;
  try {
    wb = XLSX.readFile(filepath);
  } catch (e) {
    throw new Error(`Not a valid Excel file: ${e.message}`);
  }

  // 2. Verify sheet exists
  if (!wb.SheetNames.includes('sales_template')) {
    throw new Error('Sheet "sales_template" not found');
  }

  // 3. Parse rows — first 2 rows are Hebrew headers + descriptions
  const ws = wb.Sheets['sales_template'];
  const allRows = XLSX.utils.sheet_to_json(ws, { defval: '', range: 0 });
  const dataRows = allRows.slice(2).filter(r => String(r.barcode || '').trim());

  if (!dataRows.length) {
    throw new Error('No data rows found in file');
  }

  // 4. Process each row
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const rowNum = i + 4; // Excel row (1-indexed header + 2 meta rows + data)

    try {
      // Validate required fields
      const barcode = String(r.barcode || '').trim();
      if (!barcode) { errors.push(`Row ${rowNum}: barcode missing`); failedCount++; continue; }

      const quantity = parseInt(r.quantity);
      if (isNaN(quantity) || quantity <= 0) { errors.push(`Row ${rowNum}: invalid quantity`); failedCount++; continue; }

      const transactionDate = parseDateField(r.transaction_date);
      if (!transactionDate) { errors.push(`Row ${rowNum}: transaction_date missing or invalid`); failedCount++; continue; }

      let actionType = String(r.action_type || 'sale').trim().toLowerCase();
      if (actionType !== 'sale' && actionType !== 'return') actionType = 'sale';

      // 5. Query inventory by barcode
      const { data: invRows, error: invErr } = await sb
        .from('inventory')
        .select('id, quantity')
        .eq('barcode', barcode)
        .eq('is_deleted', false)
        .limit(1);
      if (invErr) throw invErr;

      if (!invRows || invRows.length === 0) {
        errors.push(`Row ${rowNum}: barcode ${barcode} not found in inventory`);
        failedCount++;
        continue;
      }

      const inv = invRows[0];
      const qtyBefore = inv.quantity;

      // 6. Call RPC for atomic quantity update
      if (actionType === 'sale') {
        const { error: rpcErr } = await sb.rpc('decrement_inventory', { inv_id: inv.id, delta: quantity });
        if (rpcErr) throw rpcErr;
      } else {
        const { error: rpcErr } = await sb.rpc('increment_inventory', { inv_id: inv.id, delta: quantity });
        if (rpcErr) throw rpcErr;
      }

      const qtyAfter = actionType === 'sale'
        ? Math.max(0, qtyBefore - quantity)
        : qtyBefore + quantity;

      // 7. Write to inventory_logs
      const orderNumber  = String(r.order_number  || '').trim() || null;
      const employeeId   = String(r.employee_id   || '').trim() || null;
      const saleAmount   = parseFloat(r.sale_amount)   || null;
      const finalAmount  = parseFloat(r.final_amount)  || null;
      const discount     = parseFloat(r.discount)      || 0;
      const discount1    = parseFloat(r.discount_1)    || 0;
      const discount2    = parseFloat(r.discount_2)    || 0;
      const couponCode   = String(r.coupon_code || '').trim() || null;
      const campaign     = String(r.campaign    || '').trim() || null;
      const lensRaw      = String(r.lens_included || '').trim().toLowerCase();
      const lensIncluded = ['yes', 'true', '1'].includes(lensRaw);
      const lensCategory = String(r.lens_category || '').trim() || null;

      const { error: logErr } = await sb.from('inventory_logs').insert({
        action:         'sale',
        inventory_id:   inv.id,
        qty_before:     qtyBefore,
        qty_after:      qtyAfter,
        reason:         'מכירה מ-InventorySync',
        source_ref:     filename,
        performed_by:   'watcher',
        branch_id:      '00',
        order_number:   orderNumber,
        employee_id:    employeeId,
        sale_amount:    saleAmount,
        final_amount:   finalAmount,
        discount:       discount,
        discount_1:     discount1,
        discount_2:     discount2,
        coupon_code:    couponCode,
        campaign:       campaign,
        lens_included:  lensIncluded,
        lens_category:  lensCategory,
        sync_filename:  filename,
      });
      if (logErr) log(`  Warning: audit log insert failed row ${rowNum}: ${logErr.message}`);

      successCount++;
    } catch (e) {
      errors.push(`Row ${rowNum}: ${e.message}`);
      failedCount++;
    }
  }

  // 8. Write to sync_log table
  const status = failedCount === 0 ? 'success' : successCount === 0 ? 'error' : 'partial';
  await sb.from('sync_log').insert({
    filename,
    source_ref:    'watcher',
    status,
    rows_total:    dataRows.length,
    rows_success:  successCount,
    rows_pending:  0,
    rows_error:    failedCount,
    processed_at:  new Date().toISOString(),
  }).then(({ error }) => { if (error) log(`  Warning: sync_log insert failed: ${error.message}`); });

  // 9. Console summary
  log(`${filename} | total: ${dataRows.length} | success: ${successCount} | failed: ${failedCount}`);
  if (errors.length) errors.forEach(e => log(`  ${e}`));

  // 10. Move to processed
  moveFile(filepath, CONFIG.processedDir, filename);
  log(`Moved to processed: ${filename}`);
}

// ── Handle new file detection ───────────────────────────────
async function handleNewFile(filepath) {
  if (path.extname(filepath).toLowerCase() !== '.xlsx') return;

  const filename = path.basename(filepath);
  if (processing.has(filename)) return;
  processing.add(filename);

  log(`New file detected: ${filename}`);

  try {
    await processFile(filepath, filename);
  } catch (err) {
    log(`Error processing ${filename}: ${err.message}`);
    try {
      moveFile(filepath, CONFIG.failedDir, filename);
      log(`Moved to failed: ${filename}`);
    } catch (moveErr) {
      log(`Could not move to failed: ${moveErr.message}`);
    }
  } finally {
    processing.delete(filename);
  }
}

// ── Startup ─────────────────────────────────────────────────
if (!fs.existsSync(CONFIG.watchDir)) {
  console.error(`Error: watch directory does not exist: ${CONFIG.watchDir}`);
  process.exit(1);
}

for (const dir of [CONFIG.processedDir, CONFIG.failedDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

console.log(`InventorySync Watcher started. Watching: ${CONFIG.watchDir}`);

// Process any existing files (arrived while watcher was offline)
const existing = fs.readdirSync(CONFIG.watchDir).filter(f => f.toLowerCase().endsWith('.xlsx'));
if (existing.length) {
  log(`Found ${existing.length} existing file(s) — processing...`);
  (async () => {
    for (const f of existing) {
      await handleNewFile(path.join(CONFIG.watchDir, f));
    }
    log('Existing files done. Watching for new files...');
  })();
}

// Watch for new files (ignoreInitial=true since we handle existing above)
const watcher = chokidar.watch(CONFIG.watchDir, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 },
  ignored: /(^|[\/\\])\../,
}).on('add', filepath => handleNewFile(filepath));

// Graceful shutdown
function shutdown() {
  log('Shutting down...');
  watcher.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
