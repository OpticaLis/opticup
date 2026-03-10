// ---- Item History ----
let historyCache = [];

const ACTION_MAP = {
  entry_manual:     { icon: '📥', label: 'כניסה ידנית',        color: '#4CAF50' },
  entry_po:         { icon: '📦', label: 'כניסה מהזמנת רכש',   color: '#4CAF50' },
  entry_excel:      { icon: '📊', label: 'כניסה מקובץ Excel',  color: '#4CAF50' },
  transfer_in:      { icon: '🔽', label: 'העברה נכנסת',        color: '#4CAF50' },
  sale:             { icon: '💰', label: 'מכירה',              color: '#f44336' },
  credit_return:    { icon: '↩️', label: 'החזרת זיכוי',        color: '#f44336' },
  manual_remove:    { icon: '➖', label: 'הוצאה ידנית',        color: '#f44336' },
  transfer_out:     { icon: '🔼', label: 'העברה יוצאת',        color: '#f44336' },
  edit_qty:         { icon: '✏️', label: 'עריכת כמות',         color: '#2196F3' },
  edit_price:       { icon: '💲', label: 'עריכת מחיר',         color: '#2196F3' },
  edit_details:     { icon: '📝', label: 'עריכת פרטים',        color: '#2196F3' },
  edit_barcode:     { icon: '🔖', label: 'עריכת ברקוד',        color: '#2196F3' },
  soft_delete:      { icon: '🗑️', label: 'מחיקה',             color: '#9E9E9E' },
  restore:          { icon: '♻️', label: 'שחזור',              color: '#92400e' },
  permanent_delete: { icon: '❌', label: 'מחיקה לצמיתות',      color: '#9E9E9E' },
  test:             { icon: '🧪', label: 'בדיקה',              color: '#9E9E9E' },
  entry_receipt:    { icon: '📦', label: 'קבלת סחורה',          color: '#4CAF50' },
  po_created:       { icon: '📋', label: 'הזמנת רכש',            color: '#2196F3' },
  reduce_qty:       { icon: '📉', label: 'הפחתת כמות',           color: 'orange' },
  return_qty:       { icon: '↩️', label: 'החזרת כמות',           color: 'blue' },
  pending_ignored:  { icon: '🚫', label: 'ממתין - בוטל',         color: 'gray' }
};

async function openItemHistory(id, barcode, brand, model) {
  const title = [barcode, brand, model].filter(Boolean).join(' | ');
  $('history-title').textContent = 'היסטוריית פריט — ' + (title || id.slice(0,8));

  $('history-timeline').innerHTML = '<p style="text-align:center;padding:24px">טוען...</p>';
  $('history-export-btn').style.display = 'none';
  $('history-modal').style.display = 'flex';

  try {
    const { data: logs, error } = await sb
      .from('inventory_logs')
      .select('*')
      .eq('inventory_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    historyCache = logs || [];

    if (!historyCache.length) {
      $('history-timeline').innerHTML = '<p style="text-align:center;padding:24px;color:var(--g500)">אין היסטוריה לפריט זה</p>';
      return;
    }

    $('history-export-btn').style.display = '';

    const html = historyCache.map(log => {
      const info = ACTION_MAP[log.action] || { icon: '❓', label: log.action, color: '#9E9E9E' };
      const dt = new Date(log.created_at);
      const dateStr = dt.toLocaleDateString('he-IL');
      const timeStr = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

      let details = [];
      if (log.qty_before != null && log.qty_after != null) {
        details.push(`כמות: ${log.qty_before} → ${log.qty_after}`);
      }
      if (log.price_before != null && log.price_after != null) {
        details.push(`מחיר: ${log.price_before} → ${log.price_after}`);
      }
      if (log.reason) details.push(`סיבה: ${escapeHtml(log.reason)}`);
      if (log.source_ref) details.push(`מקור: ${escapeHtml(log.source_ref)}`);
      if (log.performed_by && log.performed_by !== 'system') details.push(`ע"י: ${escapeHtml(log.performed_by)}`);

      return `<div style="display:flex;gap:12px;align-items:flex-start;padding:8px 4px;border-right:3px solid ${info.color};margin-bottom:8px;border-radius:0 6px 6px 0;background:rgba(255,255,255,0.02)">
        <div style="font-size:1.4rem;min-width:32px;text-align:center">${info.icon}</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <strong style="color:${info.color}">${info.label}</strong>
            <span style="font-size:0.8rem;color:var(--g500)">${dateStr} ${timeStr}</span>
          </div>
          ${details.length ? `<div style="font-size:0.85rem;color:var(--g400)">${details.join(' · ')}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    $('history-timeline').innerHTML = html;
  } catch (e) {
    $('history-timeline').innerHTML = `<p style="text-align:center;color:var(--error);padding:24px">שגיאה: ${escapeHtml(e.message)}</p>`;
  }
}

function exportHistoryExcel() {
  if (!historyCache.length) { toast('אין היסטוריה לייצוא', 'w'); return; }

  const headers = ['תאריך', 'שעה', 'פעולה', 'ברקוד', 'מותג', 'דגם', 'כמות לפני', 'כמות אחרי', 'מחיר לפני', 'מחיר אחרי', 'סיבה', 'מקור', 'בוצע ע"י'];
  const rows = historyCache.map(log => {
    const dt = new Date(log.created_at);
    const info = ACTION_MAP[log.action] || { label: log.action };
    return [
      dt.toLocaleDateString('he-IL'),
      dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      info.label,
      log.barcode || '',
      log.brand || '',
      log.model || '',
      log.qty_before ?? '',
      log.qty_after ?? '',
      log.price_before ?? '',
      log.price_after ?? '',
      log.reason || '',
      log.source_ref || '',
      log.performed_by || ''
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = headers.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'היסטוריה');
  const bc = historyCache[0]?.barcode || 'item';
  XLSX.writeFile(wb, `history_${bc}_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('✅ קובץ היסטוריה נשמר', 's');
}

// ---- Entry History ----
const ENTRY_ACTIONS = ['entry_manual', 'entry_excel', 'entry_po', 'entry_receipt'];

async function openEntryHistory() {
  // Create modal dynamically if not present
  if (!$('entry-history-modal')) {
    const div = document.createElement('div');
    div.id = 'entry-history-modal';
    div.className = 'modal-overlay';
    div.style.display = 'none';
    div.innerHTML = `
      <div class="modal" style="max-width:900px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin:0">&#128197; היסטוריית הכנסות</h2>
          <button class="btn btn-g btn-sm" onclick="closeEntryHistory()" style="font-size:18px">&#10006;</button>
        </div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
          <label>מתאריך:</label>
          <input type="date" id="entry-hist-from">
          <label>עד:</label>
          <input type="date" id="entry-hist-to">
          <button class="btn btn-p" onclick="loadEntryHistory()">&#128269; חפש</button>
        </div>
        <div id="entry-hist-results" style="color:var(--g500);text-align:center;padding:20px">בחר תאריך ולחץ חפש</div>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', function(e) { if (e.target === this) closeEntryHistory(); });
  }
  // Default dates to today
  const today = new Date().toISOString().slice(0, 10);
  $('entry-hist-from').value = today;
  $('entry-hist-to').value = today;
  $('entry-hist-results').innerHTML = '<p style="text-align:center;color:var(--g500);padding:20px">בחר תאריך ולחץ חפש</p>';
  $('entry-history-modal').style.display = 'flex';
}

function closeEntryHistory() {
  const m = $('entry-history-modal');
  if (m) m.style.display = 'none';
}

async function loadEntryHistory() {
  const from = $('entry-hist-from')?.value;
  const to = $('entry-hist-to')?.value;
  if (!from || !to) { toast('יש לבחור תאריכים', 'e'); return; }

  showLoading('טוען היסטוריית הכנסות...');
  try {
    const { data, error } = await sb.from('inventory_logs')
      .select('*, inventory:inventory_id(id, barcode, model, color, size, brand_id, quantity, status)')
      .in('action', ENTRY_ACTIONS)
      .gte('created_at', from + 'T00:00:00')
      .lte('created_at', to + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (error) throw error;
    hideLoading();
    renderEntryHistory(data || []);
  } catch (err) {
    hideLoading();
    toast('שגיאה: ' + (err.message || ''), 'e');
  }
}

function renderEntryHistory(logs) {
  const container = $('entry-hist-results');
  if (!logs.length) {
    container.innerHTML = '<p style="text-align:center;color:#888;padding:20px">לא נמצאו הכנסות בתאריכים אלו</p>';
    return;
  }

  // Resolve brand names
  const brandRevMap = {};
  for (const [name, uid] of Object.entries(brandCache)) brandRevMap[uid] = name;

  // Group by date
  const groups = {};
  for (const log of logs) {
    const dateKey = new Date(log.created_at).toLocaleDateString('he-IL');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(log);
  }

  const actionLabels = {
    entry_manual: 'הכנסה ידנית',
    entry_excel: 'הכנסה מאקסל',
    entry_po: 'הכנסת רכש',
    entry_receipt: 'קבלת סחורה'
  };

  let html = '<div id="entry-hist-accordion">';
  for (const [date, items] of Object.entries(groups)) {
    // Build export data for this group
    const exportItems = items.map(log => {
      const inv = log.inventory;
      const brandName = inv?.brand_id ? (brandRevMap[inv.brand_id] || log.brand || '') : (log.brand || '');
      return {
        barcode: inv?.barcode || log.barcode || '',
        brand: brandName,
        model: inv?.model || log.model || '',
        size: inv?.size || '',
        color: inv?.color || ''
      };
    });
    const exportJson = JSON.stringify(exportItems).replace(/'/g, '&#39;').replace(/"/g, '&quot;');

    // Build table rows
    let rowsHtml = '';
    for (const log of items) {
      const inv = log.inventory;
      const brandName = inv?.brand_id ? (brandRevMap[inv.brand_id] || log.brand || '') : (log.brand || '');
      const barcode = inv?.barcode || log.barcode || '';
      const dt = new Date(log.created_at);
      const timeStr = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const noBarcode = !barcode;

      rowsHtml += `<tr${noBarcode ? ' style="background:#fff9c4"' : ''}>
        <td style="padding:6px 8px;font-family:monospace;font-weight:600">${escapeHtml(barcode) || '—'}</td>
        <td style="padding:6px 8px">${escapeHtml(brandName)}</td>
        <td style="padding:6px 8px">${escapeHtml(inv?.model || log.model) || ''}</td>
        <td style="padding:6px 8px">${escapeHtml(inv?.size) || ''}</td>
        <td style="padding:6px 8px">${escapeHtml(inv?.color) || ''}</td>
        <td style="padding:6px 8px">${log.qty_after ?? 1}</td>
        <td style="padding:6px 8px">${actionLabels[log.action] || log.action}</td>
        <td style="padding:6px 8px">${timeStr}</td>
        <td style="padding:6px 8px">${escapeHtml(log.performed_by) || ''}</td>
      </tr>`;
    }

    html += `<div class="hist-group" style="margin-bottom:8px">
      <button onclick="toggleHistGroup(this)"
              style="width:100%;text-align:right;padding:12px 16px;
                     background:#1a2744;color:white;border:none;
                     border-radius:8px;cursor:pointer;font-size:14px;
                     display:flex;justify-content:space-between;align-items:center">
        <span>&#128197; ${date} — ${items.length} פריטים</span>
        <span class="hist-arrow" style="font-size:12px;transition:transform 0.2s">&#9660;</span>
      </button>
      <div class="hist-content" style="display:none;border:1px solid #ddd;
                                        border-top:none;border-radius:0 0 8px 8px;
                                        overflow:hidden">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f5f5f5;text-align:right">
              <th style="padding:8px">ברקוד</th><th style="padding:8px">מותג</th><th style="padding:8px">דגם</th>
              <th style="padding:8px">גודל</th><th style="padding:8px">צבע</th><th style="padding:8px">כמות</th>
              <th style="padding:8px">סוג הכנסה</th><th style="padding:8px">שעה</th><th style="padding:8px">מבצע</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div style="padding:10px">
          <button onclick='exportDateGroupBarcodes(${exportJson})'
                  style="width:100%;padding:10px;background:#FF9800;color:white;
                         border:none;border-radius:6px;cursor:pointer;font-size:14px">
            &#128424;&#65039; הורד ברקודים לתאריך זה
          </button>
        </div>
      </div>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;

  // Auto-expand the most recent date group (first one)
  const firstBtn = container.querySelector('.hist-group button');
  if (firstBtn) toggleHistGroup(firstBtn);
}

function toggleHistGroup(btn) {
  const group = btn.closest('.hist-group');
  const content = group.querySelector('.hist-content');
  const arrow = group.querySelector('.hist-arrow');
  const accordion = document.getElementById('entry-hist-accordion');

  // Close all other open groups
  accordion.querySelectorAll('.hist-content').forEach(c => {
    if (c !== content) {
      c.style.display = 'none';
      c.closest('.hist-group').querySelector('.hist-arrow').style.transform = '';
    }
  });

  // Toggle this group
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function exportDateGroupBarcodes(items) {
  if (!items?.length) { toast('אין פריטים לייצוא', 'e'); return; }
  const rows = items.filter(i => i.barcode).map(i => ({
    'ברקוד': i.barcode, 'מותג': i.brand, 'דגם': i.model, 'גודל': i.size, 'צבע': i.color
  }));
  if (!rows.length) { toast('אין פריטים עם ברקוד לייצוא', 'e'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ברקודים');
  XLSX.writeFile(wb, `barcodes-${new Date().toISOString().split('T')[0]}.xlsx`);
  toast(`${rows.length} ברקודים יורדים...`, 's');
}
