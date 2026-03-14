// =========================================================
// ACCESS SYNC — סנכרון Access (main tab)
// =========================================================

let syncLogPage = 0;
const SYNC_LOG_PAGE_SIZE = 20;

const SOURCE_LABELS = {
  watcher: '\uD83E\uDD16 Watcher',
  manual:  '\uD83D\uDC64 ידני',
};

const STATUS_BADGES = {
  success: { icon: '\u2705', text: 'הצליח',  cls: 'sync-badge-success' },
  partial: { icon: '\u26A0\uFE0F', text: 'חלקי',   cls: 'sync-badge-partial' },
  error:   { icon: '\u274C', text: 'שגיאה',  cls: 'sync-badge-error'   },
};

// ── calcTimeSince ───────────────────────────────────────────
function calcTimeSince(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1) return '\u05DC\u05E4\u05E0\u05D9 פחות מדקה';
  if (mins < 60) return `\u05DC\u05E4\u05E0\u05D9 ${mins} דקות`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `\u05DC\u05E4\u05E0\u05D9 ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `\u05DC\u05E4\u05E0\u05D9 ${days} ימים`;
}

// ── loadWatcherStatus ───────────────────────────────────────
async function loadWatcherStatus() {
  const el = $('watcher-status');
  if (!el) return;
  try {
    const { data, error } = await sb.from(T.HEARTBEAT)
      .select('last_beat, watcher_version, host')
      .eq('tenant_id', getTenantId())
      .limit(1)
      .single();
    if (error || !data) {
      el.innerHTML = '\u26AA ה-Watcher לא הופעל';
      el.style.color = '#9ca3af';
      return;
    }
    const diffMs = Date.now() - new Date(data.last_beat).getTime();
    const diffMin = diffMs / 60000;
    if (diffMin < 2) {
      el.style.color = '#16a34a';
      el.innerHTML = `\uD83D\uDFE2 Watcher פעיל <span style="font-size:12px;color:#64748b">${escapeHtml(data.host || '')} v${escapeHtml(data.watcher_version || '')}</span>`;
    } else if (diffMin < 10) {
      el.style.color = '#ca8a04';
      el.innerHTML = `\uD83D\uDFE1 Watcher לא מגיב <span style="font-size:12px;color:#64748b">נראה לאחרונה: ${calcTimeSince(data.last_beat)}</span>`;
    } else {
      el.style.color = '#dc2626';
      el.innerHTML = `\uD83D\uDD34 Watcher לא פעיל <span style="font-size:12px;color:#64748b">נראה לאחרונה: ${calcTimeSince(data.last_beat)}</span>`;
    }
  } catch (_) {
    el.innerHTML = '\u26AA ה-Watcher לא הופעל';
    el.style.color = '#9ca3af';
  }
}

// ── renderAccessSyncTab ─────────────────────────────────────
function renderAccessSyncTab() {
  const c = $('access-sync-container');
  c.innerHTML = `
    <div class="card">
      <!-- Watcher status -->
      <div id="watcher-status" style="font-size:14px;margin-bottom:12px;padding:8px 12px;background:#f1f5f9;border-radius:8px"></div>

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        <h3 style="margin:0">\uD83D\uDD04 סנכרון Access</h3>
        <span id="as-last-activity" style="font-size:13px;color:#64748b"></span>
      </div>

      <!-- Summary cards -->
      <div id="as-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px">
        ${summaryCard('as-card-syncs',  '\uD83D\uDD04', 'סנכרונים היום',     '...', '#3b82f6')}
        ${summaryCard('as-card-items',  '\u2705',       'פריטים שעודכנו היום', '...', '#16a34a')}
        ${summaryCard('as-card-errors', '\u274C',       'שגיאות היום',        '...', '#dc2626')}
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <button class="btn btn-g" id="as-btn-pending" onclick="onPendingClick()">ממתינים לטיפול</button>
      </div>

      <!-- Sync Log -->
      <h4 style="margin:0 0 10px 0">\uD83D\uDCCB לוג סנכרונים</h4>
      <div style="max-height:55vh;overflow-y:auto">
        <table id="as-log-table">
          <thead><tr>
            <th>תאריך</th>
            <th>שם קובץ</th>
            <th>מקור</th>
            <th>סה"כ</th>
            <th>הצליח</th>
            <th>ממתין</th>
            <th>שגיאה</th>
            <th>סטטוס</th>
            <th>פעולות</th>
          </tr></thead>
          <tbody id="as-log-body">
            <tr><td colspan="9" style="text-align:center;color:#888;padding:24px">טוען...</td></tr>
          </tbody>
        </table>
      </div>
      <div id="as-log-pagination" style="display:none;margin-top:10px;text-align:center;font-size:.9rem"></div>
    </div>
  `;
}

function summaryCard(id, icon, label, value, color) {
  return `<div id="${id}" style="background:#f8fafc;border-radius:10px;padding:14px 18px;border-right:4px solid ${color}">
    <div style="font-size:13px;color:#64748b;margin-bottom:4px">${icon} ${label}</div>
    <div style="font-size:24px;font-weight:700;color:${color}" data-val>${value}</div>
  </div>`;
}

// ── loadSyncSummary ─────────────────────────────────────────
async function loadSyncSummary() {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data, error } = await sb.from(T.SYNC_LOG)
      .select('rows_success, rows_error, created_at')
      .eq('tenant_id', getTenantId())
      .gte('created_at', todayStart.toISOString());
    if (error) throw error;
    const syncs  = data ? data.length : 0;
    const items  = data ? data.reduce((s, r) => s + (r.rows_success || 0), 0) : 0;
    const errors = data ? data.reduce((s, r) => s + (r.rows_error   || 0), 0) : 0;
    const setVal = (id, v) => { const el = $(id); if (el) el.querySelector('[data-val]').textContent = v; };
    setVal('as-card-syncs',  syncs);
    setVal('as-card-items',  items);
    setVal('as-card-errors', errors);
  } catch (_) {}
}

// ── loadLastActivity ────────────────────────────────────────
async function loadLastActivity() {
  try {
    const { data } = await sb.from(T.SYNC_LOG)
      .select('created_at')
      .eq('tenant_id', getTenantId())
      .order('created_at', { ascending: false })
      .limit(1);
    const el = $('as-last-activity');
    if (el && data && data.length) {
      el.textContent = `פעם אחרונה: ${calcTimeSince(data[0].created_at)}`;
    }
  } catch (_) {}
}

// ── loadSyncLog ─────────────────────────────────────────────
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
      .eq('tenant_id', getTenantId())
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) {
      body.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888;padding:24px">אין סנכרונים עדיין</td></tr>';
      if (paginationDiv) paginationDiv.style.display = 'none';
      return;
    }
    body.innerHTML = data.map(r => renderSyncLogRow(r)).join('');
    // Pagination
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
    body.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#dc2626;padding:24px">שגיאה בטעינת לוג</td></tr>';
  }
}

// ── renderSyncLogRow ────────────────────────────────────────
function renderSyncLogRow(r) {
  const date = new Date(r.created_at).toLocaleString('he-IL');
  const src = SOURCE_LABELS[r.source_ref] ?? escapeHtml(r.source_ref);
  const badge = STATUS_BADGES[r.status] || STATUS_BADGES.error;

  let actions = `<button class="btn btn-g btn-sm" onclick="openSyncDetails('${r.id}')" title="פרטים">\uD83D\uDC41 פרטים</button>`;
  if (r.status === 'error' || r.status === 'partial') {
    actions += ` <button class="btn btn-g btn-sm" onclick="toast('פיצ\\'ר בפיתוח','w')" title="נסה שוב">\uD83D\uDD04 נסה שוב</button>`;
  }
  if (r.storage_path && (r.status === 'error' || r.status === 'partial')) {
    actions += ` <button class="btn btn-g btn-sm" onclick="downloadFailedFile('${r.id}')" title="הורד קובץ">\u2B07\uFE0F הורד קובץ</button>`;
  }

  return `<tr>
    <td>${date}</td>
    <td style="direction:ltr;text-align:right">${escapeHtml(r.filename) || ''}</td>
    <td>${src}</td>
    <td>${r.rows_total || 0}</td>
    <td>${r.rows_success || 0}</td>
    <td>${r.rows_pending || 0}</td>
    <td style="color:${(r.rows_error || 0) > 0 ? '#dc2626' : 'inherit'};font-weight:${(r.rows_error || 0) > 0 ? '600' : 'normal'}">${r.rows_error || 0}</td>
    <td><span class="${badge.cls}">${badge.icon} ${badge.text}</span></td>
    <td style="white-space:nowrap">${actions}</td>
  </tr>`;
}

// ── loadPendingBadge ────────────────────────────────────────
async function loadPendingBadge() {
  const btn = $('as-btn-pending');
  if (!btn) return;
  try {
    const { count, error } = await sb.from(T.PENDING_SALES).select('*', { count: 'exact', head: true }).eq('tenant_id', getTenantId()).eq('status', 'pending');
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

// ── Button handlers ─────────────────────────────────────────
function onPendingClick() {
  renderPendingPanel();
}
