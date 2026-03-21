// ============================================================
// stock-count-view.js — Read-only view of completed stock counts
// Phase 7 Step 4
// Depends on: stock-count-list.js (loadStockCountTab), supabase-ops.js (fetchAll)
// ============================================================

// ── Open completed count view ───────────────────────────────
async function openCompletedCountView(countId) {
  try {
    showLoading('טוען ספירה...');

    // Fetch count header
    const { data: countRow, error: cErr } = await sb.from(T.STOCK_COUNTS)
      .select('*').eq('id', countId).single();
    if (cErr) throw cErr;

    // Fetch all items for this count
    const allItems = await fetchAll(T.STOCK_COUNT_ITEMS, [['count_id', 'eq', countId]]);

    _renderCompletedView(countRow, allItems);
  } catch (err) {
    toast('שגיאה בטעינת ספירה: ' + err.message, 'e');
  } finally { hideLoading(); }
}

// ── Render the read-only view ────────────────────────────────
function _renderCompletedView(countRow, allItems) {
  const countNumber = countRow.count_number || '—';
  const date = countRow.count_date
    ? new Date(countRow.count_date).toLocaleDateString('he-IL')
    : (countRow.completed_at ? new Date(countRow.completed_at).toLocaleDateString('he-IL') : '—');
  const performer = countRow.counted_by || '—';
  const statusLabel = SC_STATUS[countRow.status]?.text || countRow.status;
  const statusColor = SC_STATUS[countRow.status]?.color || '#888';

  // Classify items
  const counted = allItems.filter(i => i.status === 'counted');
  const matched = counted.filter(i => i.actual_qty === i.expected_qty);
  const shortages = counted.filter(i => i.actual_qty < i.expected_qty);
  const surpluses = counted.filter(i => i.actual_qty > i.expected_qty);
  const skipped = allItems.filter(i => i.status === 'skipped');
  const unknowns = allItems.filter(i => i.status === 'unknown');
  const totalDiff = counted.reduce((s, i) => s + Math.abs(i.actual_qty - i.expected_qty), 0);

  const tab = document.getElementById('tab-stock-count');
  tab._scViewAllItems = allItems;
  tab._scViewCountRow = countRow;

  tab.innerHTML = `
    <div style="padding:8px 12px;max-width:960px;margin:0 auto">
      <h2 style="text-align:center;color:var(--primary);margin-bottom:4px">
        &#128203; ספירה #${escapeHtml(countNumber)}</h2>
      <div style="text-align:center;font-size:.84rem;color:var(--g500);margin-bottom:4px">
        ${escapeHtml(date)} &nbsp;|&nbsp;
        <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:.78rem;font-weight:600;color:white;background:${statusColor}">${escapeHtml(statusLabel)}</span>
        &nbsp;|&nbsp; אושרה ע"י: ${escapeHtml(performer)}
      </div>

      <div class="sc-summary-bar" style="margin:12px 0">
        <div class="sc-stat"><strong>${counted.length}</strong>
          <span style="font-size:.78rem;color:var(--g500)">נספרו</span></div>
        <div class="sc-stat"><strong style="color:#4CAF50">${matched.length}</strong>
          <span style="font-size:.78rem;color:var(--g500)">התאמות</span></div>
        <div class="sc-stat"><strong style="color:var(--error)">${shortages.length}</strong>
          <span style="font-size:.78rem;color:var(--g500)">חוסרים</span></div>
        <div class="sc-stat"><strong style="color:#2196F3">${surpluses.length}</strong>
          <span style="font-size:.78rem;color:var(--g500)">עודפים</span></div>
        <div class="sc-stat"><strong style="color:#9e9e9e">${skipped.length}</strong>
          <span style="font-size:.78rem;color:var(--g500)">נדלגו</span></div>
        ${unknowns.length ? `<div class="sc-stat"><strong style="color:#d97706">${unknowns.length}</strong>
          <span style="font-size:.78rem;color:var(--g500)">לא ידועים</span></div>` : ''}
        <div class="sc-stat"><strong>${totalDiff}</strong>
          <span style="font-size:.78rem;color:var(--g500)">סה"כ פערים</span></div>
      </div>

      <div style="display:flex;gap:6px;justify-content:center;margin-bottom:10px;flex-wrap:wrap" id="sc-view-filters">
        <button class="btn btn-p btn-sm sc-vf-btn" data-filter="all" onclick="_scViewFilter('all')">הכל (${allItems.filter(i => i.status !== 'pending').length})</button>
        <button class="btn btn-g btn-sm sc-vf-btn" data-filter="matched" onclick="_scViewFilter('matched')">התאמות (${matched.length})</button>
        <button class="btn btn-g btn-sm sc-vf-btn" data-filter="shortages" onclick="_scViewFilter('shortages')">חוסרים (${shortages.length})</button>
        <button class="btn btn-g btn-sm sc-vf-btn" data-filter="surpluses" onclick="_scViewFilter('surpluses')">עודפים (${surpluses.length})</button>
        <button class="btn btn-g btn-sm sc-vf-btn" data-filter="skipped" onclick="_scViewFilter('skipped')">נדלגו (${skipped.length})</button>
        ${unknowns.length ? `<button class="btn btn-g btn-sm sc-vf-btn" data-filter="unknown" onclick="_scViewFilter('unknown')" style="border-color:#d97706;color:#d97706">לא ידועים (${unknowns.length})</button>` : ''}
      </div>

      <div style="overflow-x:auto;border:1px solid var(--g200);border-radius:8px;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="background:var(--primary);color:white;text-align:right">
            <th style="padding:8px">ברקוד</th><th style="padding:8px">מותג</th><th style="padding:8px">דגם</th>
            <th style="padding:8px;text-align:center">צפוי (התחלה)</th>
            <th style="padding:8px;text-align:center">נוכחי (אישור)</th>
            <th style="padding:8px;text-align:center">נספר</th>
            <th style="padding:8px;text-align:center">פער</th>
            <th style="padding:8px">סיבה</th>
            <th style="padding:8px">סטטוס</th>
          </tr></thead>
          <tbody id="sc-view-tbody"></tbody>
          <tfoot id="sc-view-tfoot"></tfoot>
        </table>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding-bottom:20px">
        <button class="btn btn-s" style="min-height:44px;font-size:14px"
                onclick="_scViewExportExcel()">&#128229; ייצוא Excel</button>
        <button class="btn btn-g" style="min-height:44px;font-size:14px"
                onclick="loadStockCountTab()">&#8617;&#65039; חזרה לרשימה</button>
      </div>
    </div>`;

  // Initial render — show all
  _scViewFilter('all');
}

// ── Filter items in the view ─────────────────────────────────
function _scViewFilter(filter) {
  const tab = document.getElementById('tab-stock-count');
  const allItems = tab._scViewAllItems || [];

  // Highlight active filter button
  document.querySelectorAll('.sc-vf-btn').forEach(btn => {
    btn.classList.remove('btn-p');
    btn.classList.add('btn-g');
  });
  const activeBtn = document.querySelector(`.sc-vf-btn[data-filter="${filter}"]`);
  if (activeBtn) { activeBtn.classList.remove('btn-g'); activeBtn.classList.add('btn-p'); }

  // Filter items
  const counted = allItems.filter(i => i.status === 'counted');
  const skipped = allItems.filter(i => i.status === 'skipped');
  const unknowns = allItems.filter(i => i.status === 'unknown');
  let items;
  switch (filter) {
    case 'matched':  items = counted.filter(i => i.actual_qty === i.expected_qty); break;
    case 'shortages': items = counted.filter(i => i.actual_qty < i.expected_qty); break;
    case 'surpluses': items = counted.filter(i => i.actual_qty > i.expected_qty); break;
    case 'skipped':  items = skipped; break;
    case 'unknown':  items = unknowns; break;
    default:         items = [...counted, ...skipped, ...unknowns]; break;
  }

  _scViewRenderRows(items);
}

// ── Render table rows ────────────────────────────────────────
function _scViewRenderRows(items) {
  const tbody = document.getElementById('sc-view-tbody');
  const tfoot = document.getElementById('sc-view-tfoot');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#999">אין פריטים</td></tr>';
    tfoot.innerHTML = '';
    return;
  }

  tbody.innerHTML = items.map(it => {
    const isSkipped = it.status === 'skipped';
    const diff = (it.actual_qty || 0) - (it.expected_qty || 0);
    const diffColor = diff < 0 ? 'var(--error)' : diff > 0 ? '#2196F3' : 'inherit';
    const diffText = diff === 0 ? '0' : (diff > 0 ? '+' + diff : String(diff));
    const rowBg = isSkipped ? 'background:#f5f5f5;' : (diff < 0 ? 'background:#fff5f5;' : (diff > 0 ? 'background:#f0f7ff;' : ''));

    const statusMap = {
      counted: { text: 'נספר', color: '#4CAF50' },
      skipped: { text: 'נדלג', color: '#9e9e9e' },
      unknown: { text: 'לא ידוע', color: '#d97706' }
    };
    const st = statusMap[it.status] || { text: it.status, color: '#888' };

    return `<tr style="${rowBg}">
      <td style="padding:6px 8px;font-weight:600;font-size:.85rem">${escapeHtml(it.barcode || '—')}</td>
      <td style="padding:6px 8px">${escapeHtml(it.brand || '—')}</td>
      <td style="padding:6px 8px">${escapeHtml(it.model || '—')}</td>
      <td style="padding:6px 8px;text-align:center">${it.expected_qty ?? '—'}</td>
      <td style="padding:6px 8px;text-align:center">${it._current_qty !== undefined ? it._current_qty : (it.expected_qty ?? '—')}</td>
      <td style="padding:6px 8px;text-align:center;font-weight:700">${it.actual_qty ?? '—'}</td>
      <td style="padding:6px 8px;text-align:center;font-weight:700;color:${diffColor}">${diffText}</td>
      <td style="padding:6px 8px;font-size:.8rem">${escapeHtml(it.reason || '')}</td>
      <td style="padding:6px 8px"><span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:.75rem;font-weight:600;color:white;background:${st.color}">${st.text}</span></td>
    </tr>`;
  }).join('');

  // Summary footer
  const totalExpected = items.reduce((s, i) => s + (i.expected_qty || 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actual_qty || 0), 0);
  const totalDiff = totalActual - totalExpected;
  tfoot.innerHTML = `<tr style="background:var(--g100);font-weight:700;font-size:.84rem">
    <td style="padding:8px" colspan="3">סה"כ (${items.length} פריטים)</td>
    <td style="padding:8px;text-align:center">${totalExpected}</td>
    <td style="padding:8px;text-align:center"></td>
    <td style="padding:8px;text-align:center">${totalActual}</td>
    <td style="padding:8px;text-align:center;color:${totalDiff < 0 ? 'var(--error)' : totalDiff > 0 ? '#2196F3' : 'inherit'}">${totalDiff > 0 ? '+' : ''}${totalDiff}</td>
    <td style="padding:8px" colspan="2"></td>
  </tr>`;
}

// ── Export viewed count to Excel ─────────────────────────────
function _scViewExportExcel() {
  const tab = document.getElementById('tab-stock-count');
  const allItems = tab._scViewAllItems || [];
  const countRow = tab._scViewCountRow || {};
  const items = allItems.filter(i => i.status === 'counted' || i.status === 'skipped');

  if (!items.length) { toast('אין פריטים לייצוא', 'w'); return; }

  const rows = items.map(it => ({
    'ברקוד': it.barcode || '',
    'מותג': it.brand || '',
    'דגם': it.model || '',
    'צבע': it.color || '',
    'גודל': it.size || '',
    'צפוי (התחלה)': it.expected_qty ?? '',
    'נוכחי (אישור)': it._current_qty !== undefined ? it._current_qty : (it.expected_qty ?? ''),
    'נספר': it.actual_qty ?? '',
    'פער': (it.actual_qty || 0) - (it.expected_qty || 0),
    'סיבה': it.reason || '',
    'סטטוס': it.status === 'skipped' ? 'נדלג' : 'נספר',
    'הערה': it.notes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ספירת מלאי');
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
                 { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 8 }, { wch: 20 }];
  const filename = 'ספירה_' + escapeHtml(countRow.count_number || 'export') + '.xlsx';
  XLSX.writeFile(wb, filename);
  toast('קובץ Excel יוצא: ' + filename, 's');
}
