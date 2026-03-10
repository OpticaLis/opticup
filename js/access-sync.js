// =========================================================
// ACCESS SYNC — סנכרון Access
// =========================================================

let syncLogPage = 0;
const SYNC_LOG_PAGE_SIZE = 20;

const SOURCE_LABELS = {
  watcher: '🤖 Watcher',
  manual:  '👤 ידני',
};

// ── renderAccessSyncTab ─────────────────────────────────
function renderAccessSyncTab() {
  const c = $('access-sync-container');
  c.innerHTML = `
    <div class="card">
      <h3>&#128260; סנכרון Access</h3>

      <!-- Heartbeat -->
      <div id="as-heartbeat" style="padding:10px 14px;border-radius:8px;background:#f1f5f9;margin-bottom:16px;font-size:14px;display:inline-block">
        &#9898; סטטוס Watcher לא ידוע
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <button class="btn btn-p" id="as-btn-import" onclick="onManualImportClick()">&#128229; ייבוא ידני</button>
        <button class="btn btn-g" id="as-btn-pending" onclick="onPendingClick()">ממתינים לטיפול</button>
      </div>

      <!-- Sync Log -->
      <h4 style="margin:0 0 10px 0">&#128203; לוג סנכרונים</h4>
      <div style="max-height:55vh;overflow-y:auto">
        <table id="as-log-table">
          <thead><tr>
            <th>תאריך</th>
            <th>שם קובץ</th>
            <th>מקור</th>
            <th>סטטוס</th>
            <th>סה"כ</th>
            <th>הצליח</th>
            <th>ממתין</th>
            <th>שגיאה</th>
          </tr></thead>
          <tbody id="as-log-body">
            <tr><td colspan="8" style="text-align:center;color:#888;padding:24px">טוען...</td></tr>
          </tbody>
        </table>
      </div>
      <div id="as-log-pagination" style="display:none;margin-top:10px;text-align:center;font-size:.9rem"></div>
    </div>
  `;
  startHeartbeatRefresh();
}

// ── Heartbeat auto-refresh ──────────────────────────────
let heartbeatInterval = null;

function startHeartbeatRefresh() {
  stopHeartbeatRefresh();
  loadHeartbeat();
  heartbeatInterval = setInterval(loadHeartbeat, 60000);
}

function stopHeartbeatRefresh() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function loadHeartbeat() {
  const el = $('as-heartbeat');
  if (!el) return;
  try {
    const { data, error } = await sb.from(T.HEARTBEAT).select('last_beat, watcher_version, host').eq('id', 1).maybeSingle();
    if (error || !data || !data.last_beat) {
      el.style.background = '#f1f5f9';
      el.innerHTML = '&#9898; סטטוס Watcher לא ידוע';
      return;
    }
    const mins = Math.floor((Date.now() - new Date(data.last_beat).getTime()) / 60000);
    if (mins < 10) {
      el.style.background = '#dcfce7';
      el.innerHTML = `&#128994; Watcher פעיל — לפני ${mins} דקות`;
    } else {
      el.style.background = '#fee2e2';
      el.innerHTML = `&#128308; Watcher לא מגיב — לפני ${mins} דקות`;
    }
  } catch (e) {
    el.style.background = '#f1f5f9';
    el.innerHTML = '&#9898; סטטוס Watcher לא ידוע';
  }
}

// ── loadSyncLog ─────────────────────────────────────────
async function loadSyncLog(page = 0) {
  syncLogPage = page;
  const body = $('as-log-body');
  const paginationDiv = $('as-log-pagination');
  if (!body) return;
  try {
    const from = page * SYNC_LOG_PAGE_SIZE;
    const to = from + SYNC_LOG_PAGE_SIZE - 1;
    const { data, error, count } = await sb.from(T.SYNC_LOG)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) {
      body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:24px">אין סנכרונים עדיין</td></tr>';
      if (paginationDiv) paginationDiv.style.display = 'none';
      return;
    }
    body.innerHTML = data.map(r => {
      const date = new Date(r.created_at).toLocaleString('he-IL');
      const src = SOURCE_LABELS[r.source_ref] ?? r.source_ref;
      let statusBadge = '';
      if (r.status === 'success') statusBadge = '<span style="color:#16a34a;font-weight:600">&#10004; הצליח</span>';
      else if (r.status === 'partial') statusBadge = '<span style="color:#d97706;font-weight:600">&#9888; חלקי</span>';
      else statusBadge = '<span style="color:#dc2626;font-weight:600">&#10008; שגיאה</span>';
      return `<tr>
        <td>${date}</td>
        <td style="direction:ltr;text-align:right">${r.filename || ''}</td>
        <td>${src}</td>
        <td>${statusBadge}</td>
        <td>${r.rows_total || 0}</td>
        <td>${r.rows_success || 0}</td>
        <td>${r.rows_pending || 0}</td>
        <td>${r.rows_error || 0}</td>
      </tr>`;
    }).join('');
    // Pagination controls
    if (paginationDiv && count > SYNC_LOG_PAGE_SIZE) {
      const totalPages = Math.ceil(count / SYNC_LOG_PAGE_SIZE);
      const currentPage = page + 1;
      paginationDiv.style.display = 'block';
      paginationDiv.innerHTML = `
        <button class="btn btn-g btn-sm" ${page === 0 ? 'disabled' : ''} onclick="loadSyncLog(${page - 1})">הקודם</button>
        <span style="margin:0 12px">עמוד ${currentPage} מתוך ${totalPages}</span>
        <button class="btn btn-g btn-sm" ${currentPage >= totalPages ? 'disabled' : ''} onclick="loadSyncLog(${page + 1})">הבא</button>
      `;
    } else if (paginationDiv) {
      paginationDiv.style.display = 'none';
    }
  } catch (e) {
    body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#dc2626;padding:24px">שגיאה בטעינת לוג</td></tr>';
  }
}

// ── loadPendingBadge ────────────────────────────────────
async function loadPendingBadge() {
  const btn = $('as-btn-pending');
  if (!btn) return;
  try {
    const { count, error } = await sb.from(T.PENDING_SALES).select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const n = (!error && count) ? count : 0;
    if (n > 0) {
      btn.textContent = `\u26A0\uFE0F ממתינים לטיפול (${n})`;
      btn.style.background = '#fee2e2';
      btn.style.borderColor = '#dc2626';
      btn.style.color = '#dc2626';
    } else {
      btn.textContent = 'ממתינים לטיפול';
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  } catch (e) {
    // silent
  }
}

// ── Button handlers ─────────────────────────────────────
function onManualImportClick() {
  toast('בקרוב — ייבוא ידני', 'w');
}

function onPendingClick() {
  renderPendingPanel();
}

// =========================================================
// PENDING SALES PANEL
// =========================================================

let pendingSearchTimers = {};

async function renderPendingPanel() {
  showLoading('טוען ממתינים...');
  try {
    const { data, error } = await sb.from(T.PENDING_SALES)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    hideLoading();

    // Build overlay
    let overlay = $('pending-panel-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pending-panel-overlay';
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '1001';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';

    const count = data ? data.length : 0;
    overlay.innerHTML = `
      <div class="modal" style="max-width:800px;width:95%">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0">&#9888;&#65039; ממתינים לטיפול (${count})</h3>
          <button class="btn btn-g btn-sm" onclick="closePendingPanel()" style="min-width:auto;padding:4px 12px;font-size:1.1rem">&times;</button>
        </div>
        <div id="pending-cards-container">
          ${count === 0
            ? '<p style="text-align:center;color:#888;padding:32px 0">אין פריטים ממתינים</p>'
            : data.map(r => pendingCardHtml(r)).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    hideLoading();
    toast('שגיאה בטעינת ממתינים', 'e');
  }
}

function closePendingPanel() {
  const overlay = $('pending-panel-overlay');
  if (overlay) overlay.style.display = 'none';
}

function pendingCardHtml(r) {
  const date = new Date(r.transaction_date).toLocaleDateString('he-IL');
  const typeLabel = r.action_type === 'return' ? 'החזרה' : 'מכירה';
  return `
    <div class="card" id="pcard-${r.id}" style="margin-bottom:12px;border:1px solid #e2e8f0;padding:14px">
      <div style="display:flex;flex-wrap:wrap;gap:8px 24px;margin-bottom:6px;font-size:.9rem">
        <span><b>ברקוד:</b> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${r.barcode_received}</code></span>
        <span><b>כמות:</b> ${r.quantity}</span>
        <span><b>הזמנה:</b> ${r.order_number}</span>
        <span><b>סוג:</b> ${typeLabel}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px 24px;margin-bottom:10px;font-size:.85rem;color:#64748b">
        <span><b>סיבה:</b> ${r.reason}</span>
        <span><b>תאריך:</b> ${date}</span>
        <span><b>קובץ:</b> ${r.filename}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-p btn-sm" data-action="suggestions" data-pending-id="${r.id}" data-barcode="${r.barcode_received}">&#128161; המלצות</button>
        <button class="btn btn-g btn-sm" data-action="free-search" data-pending-id="${r.id}">&#128269; חיפוש חופשי</button>
        <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5" data-action="ignore" data-pending-id="${r.id}" data-barcode="${r.barcode_received}" data-source-ref="${r.source_ref}">&#10006; לא קיים במלאי</button>
      </div>
      <div id="pcard-suggestions-${r.id}" style="display:none;margin-top:10px"></div>
      <div id="pcard-search-${r.id}" style="display:none;margin-top:10px"></div>
    </div>
  `;
}

// ── Suggestions ─────────────────────────────────────────
async function loadSuggestions(pendingId, barcode) {
  const container = $('pcard-suggestions-' + pendingId);
  if (!container) return;
  container.style.display = 'block';
  container.innerHTML = '<p style="color:#888;font-size:.85rem">מחפש התאמות...</p>';

  try {
    // Try partial barcode matches and similar barcodes
    const patterns = [];
    if (barcode.length >= 5) {
      patterns.push(barcode.slice(-5)); // last 5 digits
    }
    let results = [];
    // Exact barcode match first
    const { data: exact } = await sb.from(T.INV)
      .select('id, barcode, brand_id, model, color, size, quantity')
      .eq('is_deleted', false)
      .gt('quantity', 0)
      .eq('barcode', barcode)
      .limit(1);
    if (exact && exact.length) results.push(...exact);

    // Partial matches on barcode suffix
    if (results.length < 5 && patterns[0]) {
      const { data: partial } = await sb.from(T.INV)
        .select('id, barcode, brand_id, model, color, size, quantity')
        .eq('is_deleted', false)
        .gt('quantity', 0)
        .ilike('barcode', '%' + patterns[0])
        .limit(5);
      if (partial) {
        for (const p of partial) {
          if (!results.find(r => r.id === p.id)) results.push(p);
        }
      }
    }

    // Deduplicate and limit
    results = results.slice(0, 5);

    if (results.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:.85rem">לא נמצאו התאמות</p>';
      return;
    }

    // Resolve brand names
    const brandIds = [...new Set(results.map(r => r.brand_id).filter(Boolean))];
    let brandMap = {};
    if (brandIds.length) {
      const { data: br } = await sb.from(T.BRANDS).select('id, name').in('id', brandIds);
      if (br) br.forEach(b => brandMap[b.id] = b.name);
    }

    container.innerHTML = '<p style="font-size:.82rem;color:#64748b;margin-bottom:6px"><b>התאמות אפשריות:</b></p>' +
      results.map(r => {
        const brand = brandMap[r.brand_id] || '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:4px;font-size:.85rem;background:#fafafa">
          <span>${brand} ${r.model || ''} | ${r.color || ''} ${r.size || ''} | <code>${r.barcode || '—'}</code> | כמות: ${r.quantity}</span>
          <button class="btn btn-p btn-sm" style="padding:2px 10px;font-size:.8rem" data-action="resolve" data-pending-id="${pendingId}" data-inventory-id="${r.id}">זה הפריט</button>
        </div>`;
      }).join('');
  } catch (e) {
    container.innerHTML = '<p style="color:#dc2626;font-size:.85rem">שגיאה בחיפוש</p>';
  }
}

// ── Free search ─────────────────────────────────────────
function toggleFreeSearch(pendingId) {
  const container = $('pcard-search-' + pendingId);
  if (!container) return;
  if (container.style.display === 'block') {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  container.innerHTML = `
    <input type="text" id="psearch-input-${pendingId}" placeholder="חפש ברקוד / מותג / דגם..."
      style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:.9rem;margin-bottom:6px"
      data-pending-search="${pendingId}">
    <div id="psearch-results-${pendingId}"></div>
  `;
  container.querySelector('input').focus();
}

function debouncePendingSearch(pendingId, query) {
  if (pendingSearchTimers[pendingId]) clearTimeout(pendingSearchTimers[pendingId]);
  pendingSearchTimers[pendingId] = setTimeout(() => runPendingSearch(pendingId, query), 300);
}

async function runPendingSearch(pendingId, query) {
  const resultsDiv = $('psearch-results-' + pendingId);
  if (!resultsDiv) return;
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    return;
  }
  resultsDiv.innerHTML = '<p style="color:#888;font-size:.82rem">מחפש...</p>';

  try {
    const q = query.trim();
    // Search by barcode, model, or brand name
    let items = [];

    // Barcode exact or partial
    const { data: byBarcode } = await sb.from(T.INV)
      .select('id, barcode, brand_id, model, color, size, quantity')
      .eq('is_deleted', false)
      .gt('quantity', 0)
      .ilike('barcode', '%' + q + '%')
      .limit(5);
    if (byBarcode) items.push(...byBarcode);

    // Model search
    if (items.length < 5) {
      const { data: byModel } = await sb.from(T.INV)
        .select('id, barcode, brand_id, model, color, size, quantity')
        .eq('is_deleted', false)
        .gt('quantity', 0)
        .ilike('model', '%' + q + '%')
        .limit(5);
      if (byModel) {
        for (const m of byModel) {
          if (!items.find(r => r.id === m.id)) items.push(m);
        }
      }
    }

    items = items.slice(0, 8);

    if (items.length === 0) {
      resultsDiv.innerHTML = '<p style="color:#888;font-size:.82rem">לא נמצאו תוצאות</p>';
      return;
    }

    // Resolve brand names
    const brandIds = [...new Set(items.map(r => r.brand_id).filter(Boolean))];
    let brandMap = {};
    if (brandIds.length) {
      const { data: br } = await sb.from(T.BRANDS).select('id, name').in('id', brandIds);
      if (br) br.forEach(b => brandMap[b.id] = b.name);
    }

    resultsDiv.innerHTML = items.map(r => {
      const brand = brandMap[r.brand_id] || '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:4px;font-size:.85rem;background:#fafafa;cursor:pointer" data-action="resolve" data-pending-id="${pendingId}" data-inventory-id="${r.id}">
        <span>${brand} ${r.model || ''} | ${r.color || ''} ${r.size || ''} | <code>${r.barcode || '—'}</code> | כמות: ${r.quantity}</span>
        <span style="color:var(--accent);font-size:.8rem">&#10004; בחר</span>
      </div>`;
    }).join('');
  } catch (e) {
    resultsDiv.innerHTML = '<p style="color:#dc2626;font-size:.82rem">שגיאה בחיפוש</p>';
  }
}

// ── Ignore pending ──────────────────────────────────────
async function ignorePending(pendingId, barcode, sourceRef) {
  const ok = await confirmDialog('סימון כלא קיים', 'לסמן שמסגרת זו אינה קיימת במלאי?');
  if (!ok) return;
  try {
    const { error } = await sb.from(T.PENDING_SALES).update({
      status: 'ignored',
      resolved_at: new Date().toISOString(),
      resolution_note: 'לא קיים במלאי'
    }).eq('id', pendingId);
    if (error) throw error;

    writeLog('pending_ignored', null, {
      barcode: barcode,
      reason: 'לא קיים במלאי',
      source_ref: sourceRef
    });

    // Remove card from panel
    const card = $('pcard-' + pendingId);
    if (card) card.remove();
    updatePendingPanelCount();
    loadPendingBadge();
    toast('פריט סומן כלא קיים', 's');
  } catch (e) {
    toast('שגיאה בעדכון', 'e');
  }
}

// ── Resolve pending ─────────────────────────────────────
async function resolvePending(pendingId, inventoryId) {
  try {
    // 1. Read the pending row (needed for confirm message)
    const { data: row, error: rErr } = await sb.from(T.PENDING_SALES)
      .select('*').eq('id', pendingId).maybeSingle();
    if (rErr || !row) throw rErr || new Error('row not found');

    // Gate 1 — confirm dialog
    const confirmed = await confirmDialog(`לאשר שינוי כמות במלאי עבור ברקוד ${row.barcode_received}?`);
    if (!confirmed) return;

    // Gate 2 — PIN verification
    const pin = prompt('הזן סיסמת עובד:');
    if (!pin) return;
    const { data: emp } = await sb.from('employees').select('id, name').eq('pin', pin.trim()).eq('is_active', true).maybeSingle();
    if (!emp) { toast('סיסמת עובד שגויה', 'e'); return; }
    sessionStorage.setItem('prizma_user', emp.name);

    // 2. Optimistic lock — only resolve if still pending
    const { data: lockResult } = await sb.from(T.PENDING_SALES).update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_inventory_id: inventoryId,
      resolution_note: `הותאם ידנית על ידי ${emp.name}`
    }).eq('id', pendingId).eq('status', 'pending').select('id');
    if (!lockResult || lockResult.length === 0) {
      toast('הפריט כבר טופל על ידי משתמש אחר', 'e');
      renderPendingPanel();
      return;
    }

    // 3. Read current inventory
    const { data: inv, error: iErr } = await sb.from(T.INV)
      .select('id, quantity, barcode, brand_id, model').eq('id', inventoryId).maybeSingle();
    if (iErr || !inv) throw iErr || new Error('inventory not found');

    // 4. Calculate new quantity
    const qtyBefore = inv.quantity;
    let qtyAfter;
    if (row.action_type === 'sale') {
      qtyAfter = Math.max(0, qtyBefore - row.quantity);
    } else {
      qtyAfter = qtyBefore + row.quantity;
    }

    // 5. Update inventory
    const { error: uErr } = await sb.from(T.INV)
      .update({ quantity: qtyAfter }).eq('id', inventoryId);
    if (uErr) throw uErr;

    // 6. Resolve brand name for log
    let brandName = '';
    if (inv.brand_id) {
      brandName = brandCacheRev[inv.brand_id] || '';
    }

    // 7. writeLog
    writeLog(row.action_type === 'sale' ? 'sale' : 'credit_return', inventoryId, {
      barcode: inv.barcode,
      brand: brandName,
      model: inv.model,
      qty_before: qtyBefore,
      qty_after: qtyAfter,
      reason: 'סנכרון Access — התאמה ידנית',
      source_ref: row.source_ref + ':' + row.filename,
      performed_by: emp.name
    });

    // 8. Remove card, update badge
    const card = $('pcard-' + pendingId);
    if (card) card.remove();
    updatePendingPanelCount();
    loadPendingBadge();
    toast('פריט טופל בהצלחה', 's');
  } catch (e) {
    toast('שגיאה בטיפול בפריט: ' + (e.message || e), 'e');
  }
}

// ── Update panel header count ───────────────────────────
function updatePendingPanelCount() {
  const container = $('pending-cards-container');
  if (!container) return;
  const remaining = container.querySelectorAll('[id^="pcard-"]').length;
  const overlay = $('pending-panel-overlay');
  if (overlay) {
    const h3 = overlay.querySelector('h3');
    if (h3) h3.innerHTML = `&#9888;&#65039; ממתינים לטיפול (${remaining})`;
  }
  if (remaining === 0) {
    container.innerHTML = '<p style="text-align:center;color:#888;padding:32px 0">אין פריטים ממתינים</p>';
  }
}

// ── Event delegation for pending panel ──────────────────
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const pendingId = btn.dataset.pendingId;
  if (!pendingId) return;
  if (action === 'suggestions') {
    loadSuggestions(pendingId, btn.dataset.barcode);
  } else if (action === 'free-search') {
    toggleFreeSearch(pendingId);
  } else if (action === 'ignore') {
    ignorePending(pendingId, btn.dataset.barcode, btn.dataset.sourceRef);
  } else if (action === 'resolve') {
    resolvePending(pendingId, btn.dataset.inventoryId);
  }
});

document.addEventListener('input', function(e) {
  const input = e.target;
  if (input.dataset.pendingSearch) {
    debouncePendingSearch(input.dataset.pendingSearch, input.value);
  }
});
