// ============================================================
// stock-count-report.js — Diff report, approval, cancel, Excel export
// Phase 7 Step 3: checkbox per item, reason field, partial approval
// ============================================================

// ── Show diff report ─────────────────────────────────────────
async function showDiffReport(countId) {
  try {
    showLoading('מכין דוח פערים...');
    const { data: countRow } = await sb.from(T.STOCK_COUNTS)
      .select('*').eq('id', countId).single();
    scCountNumber = countRow?.count_number || '';
    const allItems = await fetchAll(T.STOCK_COUNT_ITEMS, [['count_id', 'eq', countId]]);

    // Fetch current DB quantities for counted items
    const countedWithInv = allItems.filter(i => i.status === 'counted' && i.inventory_id);
    if (countedWithInv.length) {
      const invIds = countedWithInv.map(i => i.inventory_id);
      const { data: invRows } = await sb.from(T.INV).select('id, quantity').in('id', invIds);
      const qtyMap = {};
      (invRows || []).forEach(r => { qtyMap[r.id] = r.quantity; });
      allItems.forEach(i => {
        if (i.inventory_id && qtyMap[i.inventory_id] !== undefined) {
          i._current_qty = qtyMap[i.inventory_id];
        }
      });
    }

    const diffItems = allItems.filter(i => i.status === 'counted' && i.actual_qty !== i.expected_qty);
    const pendingItems = allItems.filter(i => i.status === 'pending');
    const unknownItems = allItems.filter(i => i.status === 'unknown');
    const displayItems = [...diffItems, ...pendingItems];
    const nothingScanned = !allItems.some(i => i.status === 'counted' || i.status === 'unknown');
    renderReportScreen(countId, diffItems, allItems, displayItems, nothingScanned, unknownItems);
    if (nothingScanned) toast('לא נסרק אף פריט — לא ניתן לאשר ספירה ריקה', 'w');
  } catch (err) {
    toast('שגיאה בהכנת דוח: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Render report screen ─────────────────────────────────────
function renderReportScreen(countId, diffItems, allItems, displayItems, nothingScanned, unknownItems) {
  unknownItems = unknownItems || [];
  const shortages = diffItems.filter(i => (i.actual_qty - i.expected_qty) < 0);
  const surpluses = diffItems.filter(i => (i.actual_qty - i.expected_qty) > 0);
  const uncounted = allItems.filter(i => i.status !== 'counted').length;
  const totalShortage = shortages.reduce((s, i) => s + (i.actual_qty - i.expected_qty), 0);
  const totalSurplus = surpluses.reduce((s, i) => s + (i.actual_qty - i.expected_qty), 0);
  const hasQtyChanges = displayItems.some(it => it._current_qty !== undefined && it._current_qty !== it.expected_qty);

  const rows = displayItems.length === 0
    ? '<tr><td colspan="10" style="text-align:center;padding:24px;color:#999">אין פערים — הכל תקין!</td></tr>'
    : displayItems.map(it => {
        if (it.status === 'pending') {
          return `<tr class="sc-row-pending">
            <td></td>
            <td style="font-weight:600;font-size:.85rem">${escapeHtml(it.barcode || '—')}</td>
            <td>${escapeHtml(it.brand || '—')}</td>
            <td>${escapeHtml(it.model || '—')}</td>
            <td style="text-align:center">${it.expected_qty}</td>
            <td style="text-align:center">${it._current_qty !== undefined ? it._current_qty : '—'}</td>
            <td style="text-align:center;font-weight:700">—</td>
            <td style="text-align:center;font-weight:700;color:var(--g400)">?</td>
            <td>לא נספר</td>
            <td></td>
          </tr>`;
        }
        const diff = it.actual_qty - it.expected_qty;
        const cls = diff < 0 ? 'sc-row-diff' : (diff > 0 ? 'sc-row-warn' : '');
        const changed = it._current_qty !== undefined && it._current_qty !== it.expected_qty;
        const curCell = it._current_qty !== undefined ? it._current_qty : '—';
        const hasDiff = diff !== 0;
        return `<tr class="${cls}">
          <td style="text-align:center"><input type="checkbox" class="sc-approve-cb" data-item-id="${it.id}" checked></td>
          <td style="font-weight:600;font-size:.85rem">${escapeHtml(it.barcode || '—')}</td>
          <td>${escapeHtml(it.brand || '—')}</td>
          <td>${escapeHtml(it.model || '—')}</td>
          <td style="text-align:center">${it.expected_qty}</td>
          <td style="text-align:center${changed ? ';color:#d97706;font-weight:600' : ''}">${curCell}${changed ? ' ⚠️' : ''}</td>
          <td style="text-align:center;font-weight:700">${it.actual_qty}</td>
          <td style="text-align:center;font-weight:700;color:${diff < 0 ? 'var(--error)' : diff > 0 ? '#2196F3' : 'inherit'}">${diff > 0 ? '+' : ''}${diff}</td>
          <td>${escapeHtml(it.notes || '')}</td>
          <td>${hasDiff ? '<input type="text" class="sc-reason-input" data-item-id="' + it.id + '" placeholder="סיבה (אופציונלי)" style="width:100%;min-width:80px;padding:4px 6px;border:1px solid var(--g300);border-radius:4px;font-size:.8rem">' : ''}</td>
        </tr>`;
      }).join('');

  // Bulk selection toolbar
  const bulkToolbar = displayItems.some(it => it.status === 'counted') ? `
    <div style="display:flex;gap:6px;justify-content:flex-end;margin-bottom:6px;font-size:.78rem">
      <button class="btn btn-g" style="padding:3px 8px;font-size:.76rem" onclick="scReportCheckAll()">סמן הכל</button>
      <button class="btn btn-g" style="padding:3px 8px;font-size:.76rem" onclick="scReportUncheckAll()">בטל סימון</button>
      <button class="btn btn-g" style="padding:3px 8px;font-size:.76rem" onclick="scReportCheckDiffsOnly()">סמן רק פערים</button>
    </div>` : '';

  const tab = document.getElementById('tab-stock-count');
  tab.innerHTML = `
    <div style="padding:8px 12px;max-width:960px;margin:0 auto">
      <h2 style="text-align:center;color:var(--primary);margin-bottom:8px">
        &#128203; דוח פערים — ${escapeHtml(scCountNumber)}</h2>
      ${window._scActiveFilterDesc ? '<div style="text-align:center;font-size:.82rem;color:var(--g500);margin-bottom:12px">' + escapeHtml(window._scActiveFilterDesc) + '</div>' : ''}

      <div class="sc-summary-bar" style="margin-bottom:16px">
        <div class="sc-stat"><strong style="color:var(--error)">${totalShortage}</strong>
          <span style="font-size:.78rem;color:var(--g500)">חוסרים (${shortages.length} פריטים)</span></div>
        <div class="sc-stat"><strong style="color:#2196F3">+${totalSurplus}</strong>
          <span style="font-size:.78rem;color:var(--g500)">עודפים (${surpluses.length} פריטים)</span></div>
        <div class="sc-stat"><strong style="color:var(--g400)">${uncounted}</strong>
          <span style="font-size:.78rem;color:var(--g500)">לא נספרו</span></div>
      </div>

      ${hasQtyChanges ? '<div style="background:#fef3c7;border:1px solid #d97706;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:.84rem;color:#92400e;text-align:center">⚠️ שינויים בזמן הספירה — כמויות במערכת השתנו מאז תחילת הספירה. עמודת "נוכחי" מציגה את הכמות הנוכחית ב-DB.</div>' : ''}

      <div id="sc-report-pin-area"></div>
      ${bulkToolbar}
      <div style="overflow-x:auto;border:1px solid var(--g200);border-radius:8px;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="background:var(--primary);color:white;text-align:right">
            <th style="padding:8px;text-align:center;width:40px">אשר</th>
            <th style="padding:8px">ברקוד</th><th style="padding:8px">מותג</th><th style="padding:8px">דגם</th>
            <th style="padding:8px;text-align:center">צפוי</th><th style="padding:8px;text-align:center">נוכחי</th>
            <th style="padding:8px;text-align:center">נספר</th>
            <th style="padding:8px;text-align:center">פער</th><th style="padding:8px">הערה</th>
            <th style="padding:8px;min-width:100px">סיבה</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      ${unknownItems.length > 0 ? renderUnknownSection(unknownItems, countId) : ''}

      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding-bottom:20px">
        ${nothingScanned ? '' : `<button class="btn btn-p" style="min-height:48px;font-size:15px"
                onclick="showConfirmPinForCount('${escapeHtml(countId)}')">&#9989; אשר ועדכן מלאי</button>`}
        <button class="btn btn-g" style="min-height:48px;font-size:15px"
                onclick="openCountSession('${escapeHtml(countId)}')">&#8617;&#65039; חזור לספירה</button>
        <button class="btn btn-s" style="min-height:48px;font-size:15px"
                onclick="exportCountExcel('${escapeHtml(countId)}')">&#128229; ייצוא Excel</button>
        <button class="btn btn-d" style="min-height:48px;font-size:15px"
                onclick="cancelCount('${escapeHtml(countId)}')">&#10060; בטל ספירה</button>
      </div>
    </div>`;

  tab._scReportDiffItems = diffItems;
  tab._scReportAllItems = allItems;
  tab._scReportUnknownItems = unknownItems;
}

// ── Manager PIN for approval ─────────────────────────────────
function showConfirmPinForCount(countId) {
  promptPin('קוד מנהל לאישור ספירה', function (pin, emp) {
    _doConfirmCount(countId, emp);
  });
}

// ── Confirm count — after PIN verified ────────────────────────
async function _doConfirmCount(countId, emp) {
  if (!hasPermission('stock_count.approve')) {
    toast('אין הרשאה לאישור ספירה', 'e');
    return;
  }
  sessionStorage.setItem('prizma_user', emp.name);

  const tab = document.getElementById('tab-stock-count');
  const allItems = tab._scReportAllItems || [];

  // BUG 2 fix: warn about unhandled unknown items
  const unknownItems = tab._scReportUnknownItems || [];
  if (unknownItems.length > 0) {
    const yes = await confirmDialog(
      'פריטים לא ידועים',
      'יש ' + unknownItems.length + ' פריטים לא ידועים שלא טופלו. להמשיך?'
    );
    if (!yes) return;
  }
  const { approved, skipped, reasons } = _scCollectApprovalState(allItems);
  const approvedDiffs = approved.filter(i => i.actual_qty !== i.expected_qty);

  try {
    showLoading('מעדכן מלאי...');
    const logPromises = [];
    let errorCount = 0;

    // Apply approved items via atomic RPC
    for (const item of approved) {
      try {
        const { data: result, error: rpcErr } = await sb.rpc('apply_stock_count_delta', {
          p_inventory_id: item.inventory_id,
          p_counted_qty: item.actual_qty,
          p_tenant_id: getTenantId(),
          p_user_id: activeWorker?.id || emp.id || null,
          p_count_id: countId
        });
        if (rpcErr) throw rpcErr;
        const r = result || {};
        logPromises.push(writeLog('stock_count.apply', item.inventory_id, {
          count_id: countId,
          barcode: item.barcode, brand: item.brand, model: item.model,
          previous_qty: r.previous_qty, counted_qty: r.counted_qty,
          delta: r.delta, new_qty: r.new_qty,
          expected_at_start: item.expected_qty,
          reason: reasons[item.id] || 'ספירת מלאי',
          source_ref: scCountNumber
        }));
      } catch (itemErr) {
        console.warn('apply_stock_count_delta failed for', item.barcode, itemErr);
        errorCount++;
      }
    }

    // Mark skipped items
    if (skipped.length) {
      const skipIds = skipped.map(i => i.id);
      await sb.from(T.STOCK_COUNT_ITEMS).update({ status: 'skipped' }).in('id', skipIds);
    }

    // Save reasons for all items that have one
    const reasonUpdates = Object.entries(reasons).map(([itemId, reason]) =>
      sb.from(T.STOCK_COUNT_ITEMS).update({ reason }).eq('id', itemId)
    );
    await Promise.all([...logPromises, ...reasonUpdates]);

    // Update count header — include matched unknowns in total
    const worker = activeWorker || JSON.parse(sessionStorage.getItem('activeWorker') || '{}');
    const matchedCount = allItems.filter(i => i.status === 'matched').length;
    const { error } = await sb.from(T.STOCK_COUNTS).update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_items: approved.length + matchedCount,
      total_diffs: approvedDiffs.length,
      counted_by: worker.name || emp.name
    }).eq('id', countId);
    if (error) throw error;

    if (errorCount > 0) {
      toast('ספירה הושלמה עם ' + errorCount + ' שגיאות — בדוק לוג', 'w');
    } else {
      toast('ספירה ' + scCountNumber + ' הושלמה. עודכנו ' + approved.length + ', נדלגו ' + skipped.length + '.', 's');
    }
    loadStockCountTab();
  } catch (err) {
    toast('שגיאה באישור ספירה: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Cancel count ─────────────────────────────────────────────
async function cancelCount(countId) {
  const yes = await confirmDialog('ביטול ספירה', 'האם לבטל את הספירה? הכמויות במלאי לא ישתנו. פעולה זו לא ניתנת לביטול.');
  if (!yes) return;
  try {
    showLoading('מבטל ספירה...');
    const { error } = await sb.from(T.STOCK_COUNTS).update({
      status: 'cancelled'
    }).eq('id', countId);
    if (error) throw error;
    toast('הספירה בוטלה', 's');
    loadStockCountTab();
  } catch (err) {
    toast('שגיאה בביטול: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Export Excel ──────────────────────────────────────────────
async function exportCountExcel(countId) {
  const tab = document.getElementById('tab-stock-count');
  let allItems = tab._scReportAllItems;
  if (!allItems || !allItems.length) {
    try {
      allItems = await fetchAll(T.STOCK_COUNT_ITEMS, [['count_id', 'eq', countId]]);
    } catch (err) { toast('שגיאה בטעינת נתונים: ' + err.message, 'e'); return; }
  }
  const countedItems = allItems.filter(i => i.status === 'counted' || i.status === 'skipped');
  if (!countedItems.length) { toast('אין פריטים שנספרו לייצוא', 'w'); return; }

  const rows = countedItems.map(it => ({
    'ברקוד': it.barcode || '',
    'מותג': it.brand || '',
    'דגם': it.model || '',
    'צבע': it.color || '',
    'גודל': it.size || '',
    'צפוי (התחלה)': it.expected_qty,
    'נוכחי (DB)': it._current_qty !== undefined ? it._current_qty : it.expected_qty,
    'נספר': it.actual_qty,
    'פער': it.actual_qty - it.expected_qty,
    'סיבה': it.reason || '',
    'הערה': it.notes || '',
    'נסרק ע"י': it.scanned_by || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ספירת מלאי');
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
                 { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 20 }, { wch: 14 }];
  const filename = 'ספירת_מלאי_' + (scCountNumber || 'export') + '.xlsx';
  XLSX.writeFile(wb, filename);
  toast('קובץ Excel יוצא: ' + filename, 's');
}
