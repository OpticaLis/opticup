// =========================================================
// TAB 2: REDUCTION — Access Sales Import
// =========================================================

async function processAccessSalesFile(workbook, filename) {
  const ws = workbook.Sheets['sales_template'];
  // Parse: row 1 = headers (consumed by sheet_to_json), rows 2-3 = metadata, row 4+ = data
  const allRows = XLSX.utils.sheet_to_json(ws, { defval: '', range: 0 });
  // Skip 2 metadata rows (rows 2-3 in Excel = indices 0-1 in array)
  const rows = allRows.slice(2).filter(r => {
    // Skip empty rows — check if barcode or order_number has any value
    return String(r.barcode || '').trim() || String(r.order_number || '').trim();
  });

  if (!rows.length) {
    toast('הקובץ לא מכיל שורות נתונים', 'e');
    return;
  }

  // B) Duplicate file check
  try {
    const { data: existing } = await sb.from(T.SYNC_LOG).select('id').ilike('filename', filename);
    if (existing && existing.length > 0) {
      const ok = await confirmDialog('הקובץ הזה כבר עובד בעבר. לייבא בכל זאת?');
      if (!ok) return;
    }
  } catch (e) {
    console.warn('Duplicate check failed:', e.message || e);
    toast('בדיקת כפילויות נכשלה — ממשיך', 'w');
  }

  showLoading('מעבד קובץ מכירות Access...');

  // C) Validate rows
  const validRows = [];
  const errorDetails = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 4; // row 4 onward in Excel
    const errs = [];

    const barcode = String(r.barcode || '').trim();
    if (!barcode) errs.push('ברקוד חסר');

    const qty = parseInt(r.quantity);
    if (isNaN(qty) || qty <= 0) errs.push('כמות לא תקינה');

    const txDateRaw = r.transaction_date;
    let txDate = null;
    if (txDateRaw) {
      // Handle Excel serial numbers and string dates
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
        barcode,
        quantity: qty,
        action_type: actionType,
        transaction_date: txDate,
        order_number: orderNum,
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

  // D) Create sync_log entry
  let syncLogId = null;
  try {
    const { data: logRow, error: logErr } = await sb.from(T.SYNC_LOG).insert({
      filename,
      source_ref: 'manual',
      status: 'partial',
      rows_total: rows.length,
      rows_success: 0,
      rows_pending: 0,
      rows_error: errorDetails.length,
      tenant_id: getTenantId()
    }).select('id').single();
    if (logErr) throw logErr;
    syncLogId = logRow.id;
  } catch (e) {
    hideLoading();
    toast('שגיאה ביצירת רשומת סנכרון: ' + e.message, 'e');
    return;
  }

  // E) Process valid rows
  let rowsSuccess = 0;
  let rowsPending = 0;
  let rowsError = errorDetails.length;

  for (const row of validRows) {
    try {
      // Look up inventory by barcode
      const { data: invRows, error: invErr } = await sb.from(T.INV)
        .select('id, quantity')
        .eq('barcode', row.barcode)
        .eq('is_deleted', false)
        .limit(1);

      if (invErr) throw invErr;

      if (invRows && invRows.length > 0) {
        // Case 1 — barcode found
        const inv = invRows[0];

        // Atomic RPC update
        if (row.action_type === 'sale') {
          const { error: rpcErr } = await sb.rpc('decrement_inventory', { inv_id: inv.id, delta: row.quantity });
          if (rpcErr) throw rpcErr;
        } else {
          const { error: rpcErr } = await sb.rpc('increment_inventory', { inv_id: inv.id, delta: row.quantity });
          if (rpcErr) throw rpcErr;
        }

        // Calculate newQty for writeLog only (not used for DB update)
        const newQty = row.action_type === 'sale'
          ? Math.max(0, inv.quantity - row.quantity)
          : inv.quantity + row.quantity;

        writeLog(
          row.action_type === 'sale' ? 'reduce_qty' : 'return_qty',
          inv.id,
          {
            reason: 'sale_from_access',
            quantity: row.quantity,
            qty_before: inv.quantity,
            qty_after: newQty,
            order_number: row.order_number,
            source_ref: 'manual',
            filename: filename,
            sale_amount: row.sale_amount,
            discount: row.discount,
            discount_1: row.discount_1,
            discount_2: row.discount_2,
            final_amount: row.final_amount,
            coupon_code: row.coupon_code,
            campaign: row.campaign,
            employee_id: row.employee_id,
            lens_included: row.lens_included,
            lens_category: row.lens_category
          }
        );
        rowsSuccess++;
      } else {
        // Case 2 — barcode not found → pending_sales
        const { error: pendErr } = await sb.from(T.PENDING_SALES).insert({
          sync_log_id: syncLogId,
          source_ref: 'manual',
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
          status: 'pending',
          tenant_id: getTenantId()
        });
        if (pendErr) throw pendErr;
        rowsPending++;
      }
    } catch (e) {
      console.warn(`Row error (${row.barcode}):`, e.message || e);
      rowsError++;
    }
  }

  // F) Update sync_log with final counts
  const finalStatus = (rowsError === 0 && rowsPending === 0) ? 'success'
    : (rowsSuccess === 0 && rowsPending === 0) ? 'error'
    : 'partial';
  try {
    await sb.from(T.SYNC_LOG).update({
      status: finalStatus,
      rows_success: rowsSuccess,
      rows_pending: rowsPending,
      rows_error: rowsError,
      processed_at: new Date().toISOString()
    }).eq('id', syncLogId);
  } catch (e) { /* silent */ }

  hideLoading();

  // G) Show results
  const rd = $('red-results');
  rd.style.display = 'block';
  rd.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card"><div class="num" style="color:var(--success)">${rowsSuccess}</div><div class="lbl">הצליחו</div></div>
      <div class="summary-card"><div class="num" style="color:var(--warn)">${rowsPending}</div><div class="lbl">ממתינים</div></div>
      <div class="summary-card"><div class="num" style="color:var(--error)">${rowsError}</div><div class="lbl">שגיאות</div></div>
    </div>
    ${errorDetails.length ? `<div class="alert alert-w" style="max-height:200px;overflow-y:auto">${errorDetails.map(e =>
      `שורה ${e.rowNum} (${escapeHtml(e.barcode) || '?'}): ${escapeHtml(e.errors.join(', '))}`
    ).join('<br>')}</div>` : ''}
  `;
  $('red-preview').style.display = 'none';

  toast(
    `יובאו ${rowsSuccess} שורות בהצלחה. ${rowsPending} ממתינות לטיפול. ${rowsError} שגיאות.`,
    rowsError > 0 ? 'w' : 's'
  );

  // H) Refresh Access sync badges
  if (typeof loadPendingBadge === 'function') loadPendingBadge();
  if (typeof loadSyncLog === 'function') loadSyncLog();
}