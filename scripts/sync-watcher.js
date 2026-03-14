#!/usr/bin/env node
// =========================================================
// Optic Up — InventorySync Folder Watcher
// Watches for Excel/CSV sales files and processes them into Supabase.
// =========================================================

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const chokidar = require('chokidar');
const XLSX     = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPPORTED_EXT = ['.csv', '.xlsx'];

// ── Configuration ───────────────────────────────────────────
// SECURITY: sync-watcher uses service_role key (bypasses RLS).
// This is safe because:
// 1. The watcher runs on the store's local machine as a Windows Service
// 2. tenant_id is explicitly set on every insert (defense-in-depth)
// 3. The service_role key is loaded from environment variable, never committed
//
// Setup: set OPTICUP_SERVICE_ROLE_KEY environment variable before running
// Get the key from: Supabase Dashboard → Settings → API → service_role
const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SUPABASE_KEY = process.env.OPTICUP_SERVICE_ROLE_KEY || 'PLACEHOLDER_REPLACE_BEFORE_DEPLOY';

if (SUPABASE_KEY.includes('PLACEHOLDER')) {
  console.error('ERROR: Set OPTICUP_SERVICE_ROLE_KEY environment variable');
  console.error('Get the key from: Supabase Dashboard → Settings → API → service_role');
  process.exit(1);
}

const WATCH_DIR = process.env.OPTICUP_WATCH_DIR || 'C:\\Users\\User\\Dropbox\\InventorySync\\sales';
const BASE_DIR = path.dirname(WATCH_DIR);
const CONFIG = {
  watchDir:      WATCH_DIR,
  processedDir:  path.join(BASE_DIR, 'processed'),
  failedDir:     path.join(BASE_DIR, 'failed'),
};

const TENANT_ID = process.env.OPTICUP_TENANT_ID || '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

// ── Init Supabase ───────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// ── Parse CSV file (Access exports UTF-8 CSV with BOM) ──────
function parseCSVFile(filepath) {
  let text = fs.readFileSync(filepath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV file has no data rows');
  const headers = lines[0].split(',').map(h => h.trim()).filter(h => h);
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, j) => row[h] = (vals[j] || '').trim());
    return row;
  });
}

// ── Upload failed file to Supabase Storage ──────────────────
async function uploadFailedFile(filepath, filename) {
  try {
    const buffer = fs.readFileSync(filepath);
    const storagePath = `${makeTimestamp()}_${filename}`;
    const { error } = await sb.storage
      .from('failed-sync-files')
      .upload(storagePath, buffer, { contentType: filename.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    if (error) { log(`  Warning: storage upload failed: ${error.message}`); return null; }
    log(`  Uploaded to storage: ${storagePath}`);
    return storagePath;
  } catch (e) {
    log(`  Warning: storage upload error: ${e.message}`);
    return null;
  }
}

// ── Idempotency guards (prevent duplicate rows from transport retries) ──
async function isDuplicateLog(inventoryId, sourceRef) {
  const since = new Date(Date.now() - 5000).toISOString();
  const { data } = await sb.from('inventory_logs')
    .select('id')
    .eq('inventory_id', inventoryId)
    .eq('source_ref', sourceRef)
    .gte('created_at', since)
    .limit(1);
  return data && data.length > 0;
}

async function isDuplicateSyncLog(filename) {
  const since = new Date(Date.now() - 5000).toISOString();
  const { data } = await sb.from('sync_log')
    .select('id')
    .eq('filename', filename)
    .gte('created_at', since)
    .limit(1);
  return data && data.length > 0;
}

// ── Process a single sales file (CSV or XLSX) ────────────────
async function processFile(filepath, filename) {
  const ext = path.extname(filename).toLowerCase();
  let dataRows;

  if (ext === '.csv') {
    // CSV from Access — header + data rows, no metadata to skip
    dataRows = parseCSVFile(filepath);
  } else {
    // XLSX — legacy format with sales_template sheet + 2 metadata rows
    let wb;
    try { wb = XLSX.readFile(filepath); } catch (e) { throw new Error(`Not a valid Excel file: ${e.message}`); }
    if (!wb.SheetNames.includes('sales_template')) throw new Error('Sheet "sales_template" not found');
    const ws = wb.Sheets['sales_template'];
    dataRows = XLSX.utils.sheet_to_json(ws, { defval: '', range: 0 }).slice(2);
  }

  dataRows = dataRows.filter(r => String(r.barcode || '').trim());
  if (!dataRows.length) throw new Error('No data rows found in file');

  // 4. Process each row
  let successCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const rowNum = ext === '.csv' ? i + 2 : i + 4; // CSV: header+data; XLSX: header+2 meta+data

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
        // Barcode not found → create pending_sales row for manual resolution
        const lensRawP = String(r.lens_included || '').trim().toLowerCase();
        const { error: pendErr } = await sb.from('pending_sales').insert({
          source_ref: 'watcher',
          filename,
          barcode_received: barcode,
          quantity,
          action_type: actionType,
          transaction_date: transactionDate,
          order_number: String(r.order_number || '').trim() || null,
          employee_id: String(r.employee_id || '').trim() || null,
          sale_amount: parseFloat(r.sale_amount) || null,
          final_amount: parseFloat(r.final_amount) || null,
          reason: 'ברקוד לא נמצא במלאי',
          discount: parseFloat(r.discount) || null,
          discount_1: parseFloat(r.discount_1) || null,
          discount_2: parseFloat(r.discount_2) || null,
          coupon_code: String(r.coupon_code || '').trim() || null,
          campaign: String(r.campaign || '').trim() || null,
          lens_included: ['yes', 'true', '1'].includes(lensRawP),
          lens_category: String(r.lens_category || '').trim() || null,
          brand: String(r.brand || '').trim() || null,
          model: String(r.model || '').trim() || null,
          size: String(r.size || '').trim() || null,
          color: String(r.color || '').trim() || null,
          // TODO: sync_log_id unavailable — watcher has no sync_log row at this point
          sync_log_id: null,
          status: 'pending',
          tenant_id: TENANT_ID
        });
        if (pendErr) {
          errors.push(`Row ${rowNum}: pending_sales insert failed: ${pendErr.message}`);
          failedCount++;
        } else {
          log(`  Barcode ${barcode} not found — added to pending_sales`);
          pendingCount++;
        }
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

      // Idempotency: skip if already logged for this item+file within 5s
      if (await isDuplicateLog(inv.id, filename)) {
        log(`  Skipping duplicate inventory_log for ${barcode}`);
      } else {
        const logAction = actionType === 'return' ? 'credit_return' : 'sale';
        const { error: logErr } = await sb.from('inventory_logs').insert({
          action:         logAction,
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
          tenant_id:      TENANT_ID,
        });
        if (logErr) log(`  Warning: audit log insert failed row ${rowNum}: ${logErr.message}`);
      }

      successCount++;
    } catch (e) {
      errors.push(`Row ${rowNum}: ${e.message}`);
      failedCount++;
    }
  }

  // 8. Determine status + upload failed files to storage
  const status = (failedCount === 0 && pendingCount === 0) ? 'success'
    : (successCount === 0 && pendingCount === 0) ? 'error'
    : 'partial';
  let storagePath = null;
  const destDir = status === 'error' ? CONFIG.failedDir : CONFIG.processedDir;

  if (status === 'error' || status === 'partial') {
    storagePath = await uploadFailedFile(filepath, filename);
  }

  // 9. Write to sync_log table (with idempotency check)
  if (await isDuplicateSyncLog(filename)) {
    log(`  Skipping duplicate sync_log for ${filename}`);
  } else {
    const logRow = {
      filename,
      source_ref:    'watcher',
      status,
      rows_total:    dataRows.length,
      rows_success:  successCount,
      rows_pending:  pendingCount,
      rows_error:    failedCount,
      errors:        errors.length ? errors : null,
      processed_at:  new Date().toISOString(),
      tenant_id:     TENANT_ID,
    };
    if (storagePath) logRow.storage_path = storagePath;
    const { error: slErr } = await sb.from('sync_log').insert(logRow);
    if (slErr) log(`  Warning: sync_log insert failed: ${slErr.message}`);
  }

  // 10. Console summary
  log(`${filename} | total: ${dataRows.length} | success: ${successCount} | failed: ${failedCount}`);
  if (errors.length) errors.forEach(e => log(`  ${e}`));

  // 11. Move file
  moveFile(filepath, destDir, filename);
  log(`Moved to ${status === 'error' ? 'failed' : 'processed'}: ${filename}`);
}

// ── Handle new file detection ───────────────────────────────
async function handleNewFile(filepath) {
  if (!SUPPORTED_EXT.includes(path.extname(filepath).toLowerCase())) return;

  const filename = path.basename(filepath);
  if (processing.has(filename)) {
    log(`Skipping duplicate event: ${filename}`);
    return;
  }
  processing.add(filename);

  log(`New file detected: ${filename}`);

  try {
    await processFile(filepath, filename);
  } catch (err) {
    log(`Error processing ${filename}: ${err.message}`);
    // Upload failed file to Supabase Storage
    let storagePath = null;
    try { storagePath = await uploadFailedFile(filepath, filename); } catch (_) {}
    // Write sync_log entry for file-level failure (with idempotency check)
    if (!await isDuplicateSyncLog(filename)) {
      const logRow = {
        filename, source_ref: 'watcher', status: 'error',
        rows_total: 0, rows_success: 0, rows_pending: 0, rows_error: 0,
        errors: [err.message],
        processed_at: new Date().toISOString(),
        tenant_id: TENANT_ID,
      };
      if (storagePath) logRow.storage_path = storagePath;
      const { error: slErr } = await sb.from('sync_log').insert(logRow);
      if (slErr) log(`  Warning: sync_log insert failed: ${slErr.message}`);
    }
    try {
      moveFile(filepath, CONFIG.failedDir, filename);
      log(`Moved to failed: ${filename}`);
    } catch (moveErr) {
      log(`Could not move to failed: ${moveErr.message}`);
    }
  } finally {
    // Keep filename locked for 30s cooldown to prevent delayed duplicate events
    setTimeout(() => processing.delete(filename), 30000);
  }
}

// ── Heartbeat ───────────────────────────────────────────────
async function sendHeartbeat() {
  try {
    await sb.from('watcher_heartbeat').upsert({
      id: 1,
      tenant_id: TENANT_ID,
      last_beat: new Date().toISOString(),
      watcher_version: '2.0.0',
      host: os.hostname()
    }, { onConflict: 'id' });
  } catch (err) {
    console.error('Heartbeat failed:', err.message);
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

// Send heartbeat on startup + every 60s
sendHeartbeat();
setInterval(sendHeartbeat, 60 * 1000);

// Process any existing files (arrived while watcher was offline)
const existing = fs.readdirSync(CONFIG.watchDir).filter(f => SUPPORTED_EXT.includes(path.extname(f).toLowerCase()));
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
