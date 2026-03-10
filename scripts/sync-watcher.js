#!/usr/bin/env node
// =========================================================
// Optic Up — Sync Watcher
// Watches a local folder (Dropbox-synced) for Access Excel
// sales files and processes them into Supabase.
// =========================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const chokidar = require('chokidar');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// ── Load config ─────────────────────────────────────────────
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('config.json not found at', configPath);
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const REQUIRED = ['watchFolder', 'processedFolder', 'errorFolder', 'supabaseUrl', 'supabaseKey'];
for (const key of REQUIRED) {
  if (!config[key]) {
    console.error(`Missing required config field: ${key}`);
    process.exit(1);
  }
}
if (config.supabaseKey === 'REPLACE_WITH_SERVICE_ROLE_KEY') {
  console.error('Please set supabaseKey in config.json (service role key)');
  process.exit(1);
}

// ── Ensure folders exist ────────────────────────────────────
for (const dir of [config.watchFolder, config.processedFolder, config.errorFolder]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created folder: ${dir}`);
  }
}

// ── Init Supabase ───────────────────────────────────────────
const sb = createClient(config.supabaseUrl, config.supabaseKey);

// ── State ───────────────────────────────────────────────────
const processing = new Set();
let watcher = null;

// ── Helpers ─────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function timestamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
}

function isNetworkError(err) {
  const msg = (err.message || '').toLowerCase();
  return ['fetch', 'network', 'econnrefused', 'timeout', 'enotfound'].some(k => msg.includes(k));
}

// ── F) moveToProcessed ──────────────────────────────────────
function moveToProcessed(filepath, filename) {
  const dest = path.join(config.processedFolder, `${timestamp()}_${filename}`);
  try {
    fs.renameSync(filepath, dest);
    log(`Moved to processed: ${filename}`);
  } catch (err) {
    log(`rename failed, trying copy: ${err.message}`);
    try {
      fs.copyFileSync(filepath, dest);
      fs.unlinkSync(filepath);
      log(`Copied to processed: ${filename}`);
    } catch (err2) {
      log(`❌ Could not move to processed: ${err2.message}`);
      // Don't crash — file stays in watch folder but sync_log is written
    }
  }
}

// ── G) moveToError ──────────────────────────────────────────
function moveToError(filepath, filename, errorMessage) {
  const ts = timestamp();
  const dest = path.join(config.errorFolder, `${ts}_${filename}`);
  const errFile = path.join(config.errorFolder, `${ts}_${filename}.error.txt`);
  try {
    fs.renameSync(filepath, dest);
  } catch (e) {
    log(`Warning: could not move file — ${e.message}`);
  }
  fs.writeFileSync(errFile, `Error: ${errorMessage}\nTimestamp: ${new Date().toISOString()}\nFile: ${filename}\n`, 'utf8');
  log(`❌ Moved to error: ${filename} — ${errorMessage}`);
}

// ── E) processFile ──────────────────────────────────────────
async function processFile(filepath, filename) {
  // 1. Read file
  const wb = XLSX.readFile(filepath);

  // 2. Verify sheet
  if (!wb.SheetNames.includes('sales_template')) {
    throw new Error('גיליון sales_template לא נמצא');
  }

  // 3. Duplicate check
  const { data: existing } = await sb.from('sync_log').select('id').eq('filename', filename);
  if (existing && existing.length > 0) {
    log(`כפול — מדלג: ${filename}`);
    moveToProcessed(filepath, filename);
    return;
  }

  // 4. Parse rows (row 1 = headers, rows 2-3 = metadata, row 4+ = data)
  const ws = wb.Sheets['sales_template'];
  const allRows = XLSX.utils.sheet_to_json(ws, { defval: '', range: 0 });
  const rows = allRows.slice(2).filter(r =>
    String(r.barcode || '').trim() || String(r.order_number || '').trim()
  );

  if (!rows.length) {
    throw new Error('הקובץ לא מכיל שורות נתונים');
  }

  // 5. Validate rows
  const validRows = [];
  const errorDetails = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 4;
    const errs = [];

    const barcode = String(r.barcode || '').trim();
    if (!barcode) errs.push('ברקוד חסר');

    const qty = parseInt(r.quantity);
    if (isNaN(qty) || qty <= 0) errs.push('כמות לא תקינה');

    let txDate = null;
    const txDateRaw = r.transaction_date;
    if (txDateRaw) {
      if (typeof txDateRaw === 'number') {
        const d = new Date((txDateRaw - 25569) * 86400000);
        txDate = d.toISOString().split('T')[0];
      } else {
        const d = new Date(txDateRaw);
        if (isNaN(d.getTime())) errs.push('תאריך לא תקין');
        else txDate = d.toISOString().split('T')[0];
      }
    } else {
      errs.push('תאריך לא תקין');
    }

    const orderNum = String(r.order_number || '').trim();
    if (!orderNum) errs.push('מספר הזמנה חסר');

    let actionType = String(r.action_type || 'sale').trim().toLowerCase();
    if (actionType !== 'sale' && actionType !== 'return') actionType = 'sale';

    let lensIncluded = false;
    const lensRaw = String(r.lens_included || '').trim().toLowerCase();
    if (lensRaw === 'yes' || lensRaw === 'true' || lensRaw === '1') lensIncluded = true;

    if (errs.length) {
      errorDetails.push({ rowNum, barcode, errors: errs });
    } else {
      validRows.push({
        barcode, quantity: qty, action_type: actionType,
        transaction_date: txDate, order_number: orderNum,
        employee_id: String(r.employee_id || '').trim() || null,
        sale_amount: parseFloat(r.sale_amount) || null,
        discount: parseFloat(r.discount) || 0,
        discount_1: parseFloat(r.discount_1) || 0,
        discount_2: parseFloat(r.discount_2) || 0,
        final_amount: parseFloat(r.final_amount) || null,
        coupon_code: String(r.coupon_code || '').trim() || null,
        campaign: String(r.campaign || '').trim() || null,
        lens_included: lensIncluded,
        lens_category: String(r.lens_category || '').trim() || null
      });
    }
  }

  // 6. Create sync_log entry
  const { data: logRow, error: logErr } = await sb.from('sync_log').insert({
    filename,
    source_ref: 'watcher',
    status: 'partial',
    rows_total: rows.length,
    rows_success: 0,
    rows_pending: 0,
    rows_error: errorDetails.length
  }).select('id').single();
  if (logErr) throw logErr;
  const syncLogId = logRow.id;

  // 7. Process valid rows
  let rowsSuccess = 0;
  let rowsPending = 0;
  let rowsError = errorDetails.length;

  for (const row of validRows) {
    try {
      const { data: invRows, error: invErr } = await sb.from('inventory')
        .select('id, quantity')
        .eq('barcode', row.barcode)
        .eq('is_deleted', false)
        .limit(1);
      if (invErr) throw invErr;

      if (invRows && invRows.length > 0) {
        // Barcode found — update inventory
        const inv = invRows[0];
        let newQty;
        if (row.action_type === 'sale') {
          newQty = Math.max(0, inv.quantity - row.quantity);
        } else {
          newQty = inv.quantity + row.quantity;
        }

        const { error: updErr } = await sb.from('inventory')
          .update({ quantity: newQty })
          .eq('id', inv.id);
        if (updErr) throw updErr;

        // Write audit log directly (no writeLog helper in Node)
        const { error: logInsErr } = await sb.from('inventory_logs').insert({
          action: row.action_type === 'sale' ? 'reduce_qty' : 'return_qty',
          inventory_id: inv.id,
          qty_before: inv.quantity,
          qty_after: newQty,
          reason: 'sale_from_access',
          source_ref: 'watcher',
          performed_by: 'watcher',
          branch_id: '00',
          // Access sale fields (011)
          sale_amount:   row.sale_amount   ?? null,
          discount:      row.discount      ?? null,
          discount_1:    row.discount_1    ?? null,
          discount_2:    row.discount_2    ?? null,
          final_amount:  row.final_amount  ?? null,
          coupon_code:   row.coupon_code   ?? null,
          campaign:      row.campaign      ?? null,
          employee_id:   row.employee_id   ?? null,
          lens_included: row.lens_included ?? null,
          lens_category: row.lens_category ?? null,
          order_number:  row.order_number  ?? null,
          sync_filename: filename
        });
        if (logInsErr) log(`Warning: audit log insert failed — ${logInsErr.message}`);

        rowsSuccess++;
      } else {
        // Barcode not found — insert pending_sales
        const { error: pendErr } = await sb.from('pending_sales').insert({
          sync_log_id: syncLogId,
          source_ref: 'watcher',
          filename,
          barcode_received: row.barcode,
          quantity: row.quantity,
          action_type: row.action_type,
          transaction_date: row.transaction_date,
          order_number: row.order_number,
          employee_id: row.employee_id,
          sale_amount: row.sale_amount,
          discount: row.discount,
          discount_1: row.discount_1,
          discount_2: row.discount_2,
          final_amount: row.final_amount,
          coupon_code: row.coupon_code,
          campaign: row.campaign,
          lens_included: row.lens_included,
          lens_category: row.lens_category,
          reason: 'ברקוד לא נמצא במלאי',
          status: 'pending'
        });
        if (pendErr) throw pendErr;
        rowsPending++;
      }
    } catch (e) {
      log(`  Row error (${row.barcode}): ${e.message}`);
      rowsError++;
    }
  }

  // 8. Update sync_log with final counts
  const finalStatus = (rowsError === 0 && rowsPending === 0) ? 'success'
    : (rowsSuccess === 0 && rowsPending === 0) ? 'error'
    : 'partial';
  await sb.from('sync_log').update({
    status: finalStatus,
    rows_success: rowsSuccess,
    rows_pending: rowsPending,
    rows_error: rowsError,
    processed_at: new Date().toISOString()
  }).eq('id', syncLogId);

  // 9. Move to processed
  moveToProcessed(filepath, filename);

  // 10. Log result
  log(`✅ ${filename}: ${rowsSuccess} success, ${rowsPending} pending, ${rowsError} errors`);
}

// ── D) processFileWithRetry ─────────────────────────────────
async function processFileWithRetry(filepath, filename, attempt = 1) {
  try {
    await processFile(filepath, filename);
  } catch (err) {
    log(`Error processing ${filename}: ${err.message}`);
    if (attempt < config.retryAttempts && isNetworkError(err)) {
      log(`Retry ${attempt}/${config.retryAttempts} in ${config.retryDelaySeconds}s`);
      await sleep(config.retryDelaySeconds * 1000);
      return processFileWithRetry(filepath, filename, attempt + 1);
    } else {
      await moveToError(filepath, filename, err.message);
    }
  }
}

// ── C) handleNewFile ────────────────────────────────────────
async function handleNewFile(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  if (ext !== '.xlsx' && ext !== '.xls') return;

  const filename = path.basename(filepath);
  if (processing.has(filename)) return;
  processing.add(filename);

  log(`📄 New file detected: ${filename}`);
  try {
    await processFileWithRetry(filepath, filename);
  } finally {
    processing.delete(filename);
  }
}

// ── I) Heartbeat ────────────────────────────────────────────
async function sendHeartbeat() {
  try {
    await sb.from('watcher_heartbeat').update({
      last_beat: new Date().toISOString(),
      watcher_version: config.watcherVersion || '1.0.0',
      host: os.hostname()
    }).eq('id', 1);
    log('💓 Heartbeat sent');
  } catch (e) {
    log(`Heartbeat error: ${e.message}`);
  }
}

// ── B) Start watcher ────────────────────────────────────────
log(`Watcher started — watching: ${config.watchFolder}`);

watcher = chokidar.watch(config.watchFolder, {
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 },
  ignored: /(^|[\/\\])\../
}).on('add', filepath => handleNewFile(filepath));

// Initial heartbeat + interval
sendHeartbeat();
const heartbeatMs = (config.heartbeatIntervalMinutes || 5) * 60 * 1000;
const heartbeatTimer = setInterval(sendHeartbeat, heartbeatMs);

// ── J) Graceful shutdown ────────────────────────────────────
function shutdown() {
  log('Watcher shutting down...');
  clearInterval(heartbeatTimer);
  if (watcher) watcher.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
