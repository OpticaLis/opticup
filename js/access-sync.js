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
        <td style="direction:ltr;text-align:right">${escapeHtml(r.filename) || ''}</td>
        <td>${escapeHtml(src)}</td>
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
// onManualImportClick — stub, button removed until feature is implemented

function onPendingClick() {
  renderPendingPanel();
}
