// ---- Soft Delete ----
let softDelTarget = null;

function deleteInvRow(recId) {
  const rec = invData.find(r => r.id === recId);
  if (!rec) return;
  softDelTarget = rec;
  const bc = rec.fields['ברקוד'] || 'ללא ברקוד';
  const brand = rec.fields['חברה / מותג'] || '';
  const model = rec.fields['דגם'] || '';
  $('softdel-title').textContent = '🗑️ מחיקת פריט — ' + bc;
  $('softdel-desc').textContent = brand + ' ' + model;
  $('softdel-reason').value = '';
  $('softdel-note').value = '';
  $('softdel-pin').value = '';
  $('softdel-error').textContent = '';
  $('softdel-confirm').disabled = true;
  $('softdel-modal').style.display = 'flex';
  // Enable confirm when reason + pin filled
  const check = () => { $('softdel-confirm').disabled = !$('softdel-reason').value || !$('softdel-pin').value; };
  $('softdel-reason').onchange = check;
  $('softdel-pin').oninput = check;
}

async function confirmSoftDelete() {
  if (!softDelTarget) return;
  const pin = $('softdel-pin').value.trim();
  const reason = $('softdel-reason').value;
  const note = $('softdel-note').value.trim();
  if (!reason || !pin) return;

  // Verify PIN
  const { data: emp } = await sb.from('employees').select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle();
  if (!emp) {
    $('softdel-error').textContent = '❌ סיסמת עובד שגויה';
    return;
  }

  const id = softDelTarget.id;
  const f = softDelTarget.fields;
  const fullReason = note ? reason + ' — ' + note : reason;

  try {
    const { error } = await sb.from('inventory').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: emp.name,
      deleted_reason: fullReason
    }).eq('id', id);
    if (error) throw new Error(error.message);

    writeLog('soft_delete', id, {
      barcode:    f['ברקוד'],
      brand:      f['חברה / מותג'],
      model:      f['דגם'],
      reason:     reason,
      source_ref: 'נמחק ע"י: ' + emp.name
    });

    invData = invData.filter(r => r.id !== id);
    $('inv-count').textContent = invData.length;
    filterInventoryTable();
    closeModal('softdel-modal');
    toast('הפריט הועבר לסל המחזור 🗑️', 's');
  } catch (e) {
    $('softdel-error').textContent = 'שגיאה: ' + (e.message || '');
  }
  softDelTarget = null;
}

// ---- Recycle Bin ----
async function openRecycleBin() {
  $('recycle-content').innerHTML = '<p style="text-align:center">טוען...</p>';
  $('recycle-modal').style.display = 'flex';
  try {
    const { data: deleted, error } = await sb.from('inventory')
      .select('id, barcode, brand_id, model, deleted_by, deleted_at, deleted_reason')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });
    if (error) throw new Error(error.message);

    if (!deleted?.length) {
      $('recycle-content').innerHTML = '<p style="text-align:center;padding:24px;color:var(--g500)">סל המחזור ריק ♻️</p>';
      return;
    }

    // Resolve brand names
    const brandRevMap = {};
    for (const [name, uid] of Object.entries(brandCache)) brandRevMap[uid] = name;

    const rows = deleted.map(r => {
      const brand = brandRevMap[r.brand_id] || '';
      const dt = r.deleted_at ? new Date(r.deleted_at).toLocaleString('he-IL') : '';
      return `<tr data-id="${r.id}" data-barcode="${r.barcode||''}" data-brand="${brand}" data-model="${r.model||''}">
        <td>${r.barcode||'—'}</td>
        <td>${brand}</td>
        <td>${r.model||''}</td>
        <td>${r.deleted_by||''}</td>
        <td style="font-size:.8rem">${dt}</td>
        <td style="font-size:.85rem">${r.deleted_reason||''}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-s btn-sm" onclick="restoreItem('${r.id}')">↩️ שחזר</button>
          <button class="btn btn-d btn-sm" onclick="permanentDelete('${r.id}')">❌ מחק לצמיתות</button>
        </td>
      </tr>`;
    }).join('');

    $('recycle-content').innerHTML = `
      <div class="table-wrap" style="max-height:50vh;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th>ברקוד</th><th>מותג</th><th>דגם</th><th>נמחק ע"י</th><th>תאריך מחיקה</th><th>סיבה</th><th>פעולות</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch (e) {
    $('recycle-content').innerHTML = '<p style="color:var(--error)">שגיאה: ' + (e.message||'') + '</p>';
  }
}

async function restoreItem(id) {
  const row = document.querySelector(`#recycle-modal tr[data-id="${id}"]`);
  const barcode = row?.dataset.barcode || '';
  const brand = row?.dataset.brand || '';
  const model = row?.dataset.model || '';

  try {
    const { error } = await sb.from('inventory').update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      deleted_reason: null
    }).eq('id', id);
    if (error) throw new Error(error.message);

    writeLog('restore', id, { barcode, brand, model, reason: 'שוחזר מסל מחזור' });
    row?.remove();
    // If table empty, show empty message
    if (!document.querySelectorAll('#recycle-modal tbody tr').length) {
      $('recycle-content').innerHTML = '<p style="text-align:center;padding:24px;color:var(--g500)">סל המחזור ריק ♻️</p>';
    }
    toast('הפריט שוחזר למלאי ✅', 's');
  } catch (e) {
    toast('שגיאה: ' + (e.message||''), 'e');
  }
}

async function permanentDelete(id) {
  const row = document.querySelector(`#recycle-modal tr[data-id="${id}"]`);
  const barcode = row?.dataset.barcode || '';
  const brand = row?.dataset.brand || '';
  const model = row?.dataset.model || '';

  const ok = await confirmDialog('מחיקה לצמיתות', 'האם למחוק לצמיתות? פעולה זו אינה הפיכה');
  if (!ok) return;

  // Require PIN again
  const pin = prompt('הזן סיסמת עובד:');
  if (!pin) return;
  const { data: emp } = await sb.from('employees').select('id, name').eq('pin', pin.trim()).eq('is_active', true).maybeSingle();
  if (!emp) { toast('❌ סיסמת עובד שגויה', 'e'); return; }

  try {
    writeLog('permanent_delete', id, { barcode, brand, model, reason: 'מחיקה לצמיתות', source_ref: 'נמחק ע"י: ' + emp.name });
    const { error } = await sb.from('inventory').delete().eq('id', id);
    if (error) throw new Error(error.message);
    row?.remove();
    if (!document.querySelectorAll('#recycle-modal tbody tr').length) {
      $('recycle-content').innerHTML = '<p style="text-align:center;padding:24px;color:var(--g500)">סל המחזור ריק ♻️</p>';
    }
    toast('הפריט נמחק לצמיתות', 's');
  } catch (e) {
    toast('שגיאה: ' + (e.message||''), 'e');
  }
}

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
  po_created:       { icon: '📋', label: 'הזמנת רכש',            color: '#2196F3' }
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
      if (log.reason) details.push(`סיבה: ${log.reason}`);
      if (log.source_ref) details.push(`מקור: ${log.source_ref}`);
      if (log.performed_by && log.performed_by !== 'system') details.push(`ע"י: ${log.performed_by}`);

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
    $('history-timeline').innerHTML = `<p style="text-align:center;color:var(--error);padding:24px">שגיאה: ${e.message}</p>`;
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
        <td style="padding:6px 8px;font-family:monospace;font-weight:600">${barcode || '—'}</td>
        <td style="padding:6px 8px">${brandName}</td>
        <td style="padding:6px 8px">${inv?.model || log.model || ''}</td>
        <td style="padding:6px 8px">${inv?.size || ''}</td>
        <td style="padding:6px 8px">${inv?.color || ''}</td>
        <td style="padding:6px 8px">${log.qty_after ?? 1}</td>
        <td style="padding:6px 8px">${actionLabels[log.action] || log.action}</td>
        <td style="padding:6px 8px">${timeStr}</td>
        <td style="padding:6px 8px">${log.performed_by || ''}</td>
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

// ---- Quantity Add/Remove ----
const QTY_REASONS_ADD = ['קבלת סחורה', 'החזרה מלקוח', 'ספירת מלאי', 'תיקון טעות', 'אחר'];
const QTY_REASONS_REMOVE = ['מכירה', 'העברה לסניף', 'פגום/אבדן', 'ספירת מלאי', 'תיקון טעות', 'אחר'];
let qtyModalState = {};

function openQtyModal(inventoryId, mode) {
  const rec = invData.find(r => r.id === inventoryId);
  if (!rec) { toast('פריט לא נמצא', 'e'); return; }

  const f = rec.fields;
  const bc = f['ברקוד'] || '';
  const brand = f['חברה / מותג'] || '';
  const model = f['דגם'] || '';
  const currentQty = parseInt(f['כמות']) || 0;

  qtyModalState = { id: inventoryId, mode, currentQty, barcode: bc, brand, model };

  const isAdd = mode === 'add';
  $('qty-modal-title').textContent = isAdd ? '➕ הוספת כמות' : '➖ הוצאת כמות';
  $('qty-modal-item').textContent = [bc, brand, model].filter(Boolean).join(' | ');
  $('qty-modal-current').textContent = currentQty;
  $('qty-modal-verb').textContent = isAdd ? 'להוספה' : 'להוצאה';
  $('qty-modal-confirm').textContent = isAdd ? '✅ אשר הוספה' : '✅ אשר הוצאה';
  $('qty-modal-confirm').className = isAdd ? 'btn btn-s' : 'btn btn-d';

  // Populate reasons
  const reasons = isAdd ? QTY_REASONS_ADD : QTY_REASONS_REMOVE;
  const sel = $('qty-modal-reason');
  sel.innerHTML = '<option value="">— בחר סיבה —</option>' + reasons.map(r => `<option value="${r}">${r}</option>`).join('');

  // Reset fields
  $('qty-modal-amount').value = 1;
  $('qty-modal-note').value = '';
  $('qty-modal-pin').value = '';

  $('qty-modal').style.display = 'flex';
  $('qty-modal-amount').focus();
}

async function confirmQtyChange() {
  const { id, mode, currentQty, barcode, brand, model } = qtyModalState;
  const amount = parseInt($('qty-modal-amount').value) || 0;
  const reason = $('qty-modal-reason').value;
  const note = $('qty-modal-note').value.trim();
  const pin = $('qty-modal-pin').value.trim();

  // Validations
  if (amount < 1) { toast('כמות חייבת להיות 1 לפחות', 'w'); return; }
  if (!reason) { toast('יש לבחור סיבה', 'w'); return; }
  if (!pin) { toast('יש להזין סיסמת עובד', 'w'); return; }

  // Remove guard
  if (mode === 'remove' && amount > currentQty) {
    toast(`❌ לא ניתן להוציא יותר מהכמות הקיימת (${currentQty} יחידות)`, 'e');
    return;
  }

  // Verify PIN
  const { data: emp } = await sb.from('employees').select('id, name').eq('pin', pin).eq('is_active', true).maybeSingle();
  if (!emp) { toast('❌ סיסמת עובד שגויה', 'e'); $('qty-modal-pin').value = ''; $('qty-modal-pin').focus(); return; }

  // Store performer name
  sessionStorage.setItem('prizma_user', emp.name);

  const newQty = mode === 'add' ? currentQty + amount : currentQty - amount;
  const fullReason = note ? reason + ' — ' + note : reason;

  try {
    // Update DB
    const { error } = await sb.from('inventory').update({ quantity: newQty }).eq('id', id);
    if (error) throw new Error(error.message);

    // Write log
    const action = mode === 'remove' ? 'manual_remove' : 'edit_qty';
    await writeLog(action, id, {
      barcode, brand, model,
      qty_before: currentQty,
      qty_after: newQty,
      reason: fullReason,
      source_ref: 'שינוי כמות ידני'
    });

    // Update in-memory data + UI
    const rec = invData.find(r => r.id === id);
    if (rec) rec.fields['כמות'] = newQty;

    const qtyTd = document.querySelector(`td[data-qty-id="${id}"]`);
    if (qtyTd) {
      const qC = newQty > 0 ? 'var(--success)' : 'var(--error)';
      qtyTd.style.color = qC;
      qtyTd.innerHTML = `${newQty} <span class="qty-btns"><button class="qty-btn qty-plus" onclick="openQtyModal('${id}','add')" title="הוסף כמות">➕</button><button class="qty-btn qty-minus" onclick="openQtyModal('${id}','remove')" title="הוצא כמות">➖</button></span>`;
    }

    closeModal('qty-modal');
    toast(`✅ כמות עודכנה: ${currentQty} → ${newQty}`, 's');
  } catch (e) {
    toast('שגיאה: ' + (e.message || ''), 'e');
  }
}
