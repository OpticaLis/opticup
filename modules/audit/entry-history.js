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
    // Paginate (server may cap at 1000 rows)
    let data = [], pg = 0;
    const PG = 1000;
    while (true) {
      const { data: batch, error: bErr } = await sb.from('inventory_logs')
        .select('*, inventory:inventory_id(id, barcode, model, color, size, brand_id, quantity, status)')
        .eq('tenant_id', getTenantId())
        .in('action', ENTRY_ACTIONS)
        .gte('created_at', from + 'T00:00:00')
        .lte('created_at', to + 'T23:59:59')
        .order('created_at', { ascending: false })
        .range(pg, pg + PG - 1);
      if (bErr) throw bErr;
      if (!batch?.length) break;
      data.push(...batch);
      if (batch.length < PG) break;
      pg += PG;
    }

    hideLoading();
    renderEntryHistory(data);
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
        color: inv?.color || '',
        qty: log.qty_after || 1
      };
    });
    const exportDataAttr = escapeHtml(JSON.stringify(exportItems));

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
          <button data-export-items="${exportDataAttr}" onclick="exportDateGroupBarcodes(JSON.parse(this.dataset.exportItems))"
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
  // Repeat each barcode N times (one row per physical unit for label printing)
  const rows = [];
  items.filter(i => i.barcode).forEach(i => {
    var qty = i.qty || 1;
    for (var q = 0; q < qty; q++) {
      rows.push({ 'ברקוד': i.barcode, 'מותג': i.brand, 'דגם': i.model, 'גודל': i.size, 'צבע': i.color });
    }
  });
  if (!rows.length) { toast('אין פריטים עם ברקוד לייצוא', 'e'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ברקודים');
  XLSX.writeFile(wb, `barcodes-${new Date().toISOString().split('T')[0]}.xlsx`);
  toast(`${rows.length} ברקודים יורדים...`, 's');
}
