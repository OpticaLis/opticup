// ============================================================
// stock-count-report.js — Diff report, approval, cancel, Excel export
// ============================================================

// ── Show diff report ─────────────────────────────────────────
async function showDiffReport(countId) {
  try {
    showLoading('מכין דוח פערים...');
    // Fetch count header for count_number
    const { data: countRow } = await sb.from(T.STOCK_COUNTS)
      .select('*').eq('id', countId).single();
    scCountNumber = countRow?.count_number || '';
    // Fetch all items
    const allItems = await fetchAll(T.STOCK_COUNT_ITEMS, [['count_id', 'eq', countId]]);
    const diffItems = allItems.filter(i => i.status === 'counted' && i.actual_qty !== i.expected_qty);
    const pendingItems = allItems.filter(i => i.status === 'pending');
    const displayItems = [...diffItems, ...pendingItems];
    renderReportScreen(countId, diffItems, allItems, displayItems);
  } catch (err) {
    toast('שגיאה בהכנת דוח: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Render report screen ─────────────────────────────────────
function renderReportScreen(countId, diffItems, allItems, displayItems) {
  const shortages = diffItems.filter(i => (i.actual_qty - i.expected_qty) < 0);
  const surpluses = diffItems.filter(i => (i.actual_qty - i.expected_qty) > 0);
  const uncounted = allItems.filter(i => i.status !== 'counted').length;
  const totalShortage = shortages.reduce((s, i) => s + (i.actual_qty - i.expected_qty), 0);
  const totalSurplus = surpluses.reduce((s, i) => s + (i.actual_qty - i.expected_qty), 0);

  const rows = displayItems.length === 0
    ? '<tr><td colspan="7" style="text-align:center;padding:24px;color:#999">אין פערים — הכל תקין!</td></tr>'
    : displayItems.map(it => {
        if (it.status === 'pending') {
          return `<tr class="sc-row-pending">
            <td style="font-weight:600;font-size:.85rem">${escapeHtml(it.barcode || '—')}</td>
            <td>${escapeHtml(it.brand || '—')}</td>
            <td>${escapeHtml(it.model || '—')}</td>
            <td style="text-align:center">${it.expected_qty}</td>
            <td style="text-align:center;font-weight:700">—</td>
            <td style="text-align:center;font-weight:700;color:var(--g400)">?</td>
            <td>לא נספר</td>
          </tr>`;
        }
        const diff = it.actual_qty - it.expected_qty;
        const cls = diff < 0 ? 'sc-row-diff' : 'sc-row-warn';
        return `<tr class="${cls}">
          <td style="font-weight:600;font-size:.85rem">${escapeHtml(it.barcode || '—')}</td>
          <td>${escapeHtml(it.brand || '—')}</td>
          <td>${escapeHtml(it.model || '—')}</td>
          <td style="text-align:center">${it.expected_qty}</td>
          <td style="text-align:center;font-weight:700">${it.actual_qty}</td>
          <td style="text-align:center;font-weight:700;color:${diff < 0 ? 'var(--error)' : '#2196F3'}">${diff > 0 ? '+' : ''}${diff}</td>
          <td>${escapeHtml(it.notes || '')}</td>
        </tr>`;
      }).join('');

  const tab = document.getElementById('tab-stock-count');
  tab.innerHTML = `
    <div style="padding:8px 12px;max-width:900px;margin:0 auto">
      <h2 style="text-align:center;color:var(--primary);margin-bottom:16px">
        &#128203; דוח פערים — ${escapeHtml(scCountNumber)}</h2>

      <div class="sc-summary-bar" style="margin-bottom:16px">
        <div class="sc-stat"><strong style="color:var(--error)">${totalShortage}</strong>
          <span style="font-size:.78rem;color:var(--g500)">חוסרים (${shortages.length} פריטים)</span></div>
        <div class="sc-stat"><strong style="color:#2196F3">+${totalSurplus}</strong>
          <span style="font-size:.78rem;color:var(--g500)">עודפים (${surpluses.length} פריטים)</span></div>
        <div class="sc-stat"><strong style="color:var(--g400)">${uncounted}</strong>
          <span style="font-size:.78rem;color:var(--g500)">לא נספרו</span></div>
      </div>

      <div id="sc-report-pin-area"></div>

      <div style="overflow-x:auto;border:1px solid var(--g200);border-radius:8px;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="background:var(--primary);color:white;text-align:right">
            <th style="padding:8px">ברקוד</th><th style="padding:8px">מותג</th><th style="padding:8px">דגם</th>
            <th style="padding:8px;text-align:center">צפוי</th><th style="padding:8px;text-align:center">בפועל</th>
            <th style="padding:8px;text-align:center">פער</th><th style="padding:8px">הערה</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding-bottom:20px">
        <button class="btn btn-p" style="min-height:48px;font-size:15px"
                onclick="showConfirmPinForCount('${escapeHtml(countId)}')">&#9989; אשר ועדכן מלאי</button>
        <button class="btn btn-g" style="min-height:48px;font-size:15px"
                onclick="openCountSession('${escapeHtml(countId)}')">&#8617;&#65039; חזור לספירה</button>
        <button class="btn btn-s" style="min-height:48px;font-size:15px"
                onclick="exportCountExcel('${escapeHtml(countId)}')">&#128229; ייצוא Excel</button>
        <button class="btn btn-d" style="min-height:48px;font-size:15px"
                onclick="cancelCount('${escapeHtml(countId)}')">&#10060; בטל ספירה</button>
      </div>
    </div>`;

  // Store for later use in confirm/export
  tab._scReportDiffItems = diffItems;
  tab._scReportAllItems = allItems;
}

// ── Manager PIN for approval ─────────────────────────────────
function showConfirmPinForCount(countId) {
  const area = $('sc-report-pin-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:var(--white);border:2px solid var(--accent);border-radius:var(--radius);
                padding:20px;margin-bottom:16px;text-align:center;box-shadow:var(--shadow)">
      <div style="font-size:1.1rem;font-weight:700;color:var(--primary);margin-bottom:12px">&#128274; קוד מנהל לאישור</div>
      <input id="sc-mgr-pin" type="password" inputmode="numeric" maxlength="5"
             placeholder="PIN מנהל" autocomplete="off"
             style="width:200px;min-height:48px;font-size:20px;text-align:center;border:2px solid var(--g300);
                    border-radius:8px;padding:10px;letter-spacing:6px;margin-bottom:10px">
      <div id="sc-mgr-pin-error" style="color:var(--error);font-size:.85rem;margin-bottom:10px;min-height:18px"></div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-p" style="min-height:48px;font-size:15px"
                onclick="confirmCount('${escapeHtml(countId)}')">&#9989; אשר</button>
        <button class="btn btn-g" style="min-height:48px;font-size:15px"
                onclick="$('sc-report-pin-area').innerHTML=''">ביטול</button>
      </div>
    </div>`;
  setTimeout(() => { const inp = $('sc-mgr-pin'); if (inp) inp.focus(); }, 100);
  $('sc-mgr-pin')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmCount(countId); });
}

// ── Confirm count — PIN + inventory update ───────────────────
async function confirmCount(countId) {
  const pin = ($('sc-mgr-pin')?.value || '').trim();
  if (!pin) { $('sc-mgr-pin-error').textContent = 'יש להזין PIN'; return; }

  // Verify manager/admin PIN
  const { data: emp } = await sb.from(T.EMPLOYEES).select('id, name, role')
    .eq('pin', pin).eq('is_active', true).in('role', ['admin', 'manager']).maybeSingle();
  if (!emp) {
    $('sc-mgr-pin-error').textContent = 'PIN שגוי או אין הרשאת מנהל';
    $('sc-mgr-pin').value = '';
    $('sc-mgr-pin').focus();
    return;
  }
  sessionStorage.setItem('prizma_user', emp.name);

  const tab = document.getElementById('tab-stock-count');
  const diffItems = tab._scReportDiffItems || [];
  const allItems = tab._scReportAllItems || [];

  try {
    showLoading('מעדכן מלאי...');
    // Update inventory quantities + writeLogs in parallel
    const logPromises = [];
    for (const item of diffItems) {
      await sb.rpc('set_inventory_qty', { inv_id: item.inventory_id, new_qty: item.actual_qty });
      logPromises.push(writeLog('edit_qty', item.inventory_id, {
        barcode: item.barcode, brand: item.brand, model: item.model,
        qty_before: item.expected_qty, qty_after: item.actual_qty,
        reason: 'ספירת מלאי', source_ref: scCountNumber
      }));
    }
    // writeLogs fire in parallel (non-blocking pattern)
    await Promise.all(logPromises);

    // Update count header
    const worker = activeWorker || JSON.parse(sessionStorage.getItem('activeWorker') || '{}');
    const { error } = await sb.from(T.STOCK_COUNTS).update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_items: allItems.filter(i => i.status === 'counted').length,
      total_diffs: diffItems.length,
      counted_by: worker.name || emp.name
    }).eq('id', countId);
    if (error) throw error;

    toast('ספירה ' + scCountNumber + ' הושלמה. עודכנו ' + diffItems.length + ' פריטים.', 's');
    loadStockCountTab();
  } catch (err) {
    toast('שגיאה באישור ספירה: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Cancel count ─────────────────────────────────────────────
async function cancelCount(countId) {
  const yes = await confirmDialog('האם לבטל את הספירה? הכמויות לא ישתנו.');
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
  // If called from elsewhere (no cached items), fetch fresh
  if (!allItems || !allItems.length) {
    try {
      allItems = await fetchAll(T.STOCK_COUNT_ITEMS, [['count_id', 'eq', countId]]);
    } catch (err) { toast('שגיאה בטעינת נתונים: ' + err.message, 'e'); return; }
  }
  const countedItems = allItems.filter(i => i.status === 'counted');
  if (!countedItems.length) { toast('אין פריטים שנספרו לייצוא', 'w'); return; }

  const rows = countedItems.map(it => ({
    'ברקוד': it.barcode || '',
    'מותג': it.brand || '',
    'דגם': it.model || '',
    'צבע': it.color || '',
    'גודל': it.size || '',
    'צפוי': it.expected_qty,
    'בפועל': it.actual_qty,
    'פער': it.actual_qty - it.expected_qty,
    'הערה': it.notes || '',
    'נסרק ע"י': it.scanned_by || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ספירת מלאי');
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
                 { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 14 }];
  const filename = 'ספירת_מלאי_' + (scCountNumber || 'export') + '.xlsx';
  XLSX.writeFile(wb, filename);
  toast('קובץ Excel יוצא: ' + filename, 's');
}
