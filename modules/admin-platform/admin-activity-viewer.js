// === admin-activity-viewer.js ===
// Activity log viewer per tenant — filters + pagination (Tab 2 of slide-in panel)
// Depends on: AdminDB (admin-db.js), Toast

let _actTenantId = null;
let _actPage = 0;
let _actFilters = { level: null, entityType: null, dateFrom: null, dateTo: null };

const _LEVEL_CLS = { info: 'badge-info', warning: 'badge-warning', error: 'badge-danger' };
const _PAGE_SIZE = 50;

function _escAV(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Init ──────────────────────────────────────────────────

function loadTenantActivityLog(tenantId) {
  _actTenantId = tenantId;
  _actPage = 0;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  _actFilters = {
    level: null, entityType: null,
    dateFrom: _isoDate(weekAgo),
    dateTo: _isoDate(now)
  };
  _renderAll();
}

function _isoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ─── Render ────────────────────────────────────────────────

function _renderAll() {
  const container = document.getElementById('panel-content');
  if (!container) return;

  container.innerHTML = `
    <div class="act-filters" style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;align-items:center;font-size:0.8125rem">
      <label style="display:flex;align-items:center;gap:0.25rem">מ-<input type="date" id="_act-from" value="${_escAV(_actFilters.dateFrom)}" style="padding:0.3rem;border:1px solid var(--color-gray-300);border-radius:6px;font-size:0.8125rem"></label>
      <label style="display:flex;align-items:center;gap:0.25rem">עד<input type="date" id="_act-to" value="${_escAV(_actFilters.dateTo)}" style="padding:0.3rem;border:1px solid var(--color-gray-300);border-radius:6px;font-size:0.8125rem"></label>
      <select id="_act-entity" style="padding:0.3rem;border:1px solid var(--color-gray-300);border-radius:6px;font-size:0.8125rem">
        <option value="">סוג: הכל</option>
        <option value="inventory">inventory</option>
        <option value="purchasing">purchasing</option>
        <option value="receipts">receipts</option>
        <option value="debt">debt</option>
        <option value="shipments">shipments</option>
        <option value="stock_count">stock_count</option>
        <option value="employees">employees</option>
        <option value="settings">settings</option>
      </select>
      <select id="_act-level" style="padding:0.3rem;border:1px solid var(--color-gray-300);border-radius:6px;font-size:0.8125rem">
        <option value="">רמה: הכל</option>
        <option value="info">info</option>
        <option value="warning">warning</option>
        <option value="error">error</option>
      </select>
    </div>
    <div id="_act-entries" style="color:var(--color-gray-400);padding:0.5rem">טוען...</div>
  `;

  // Wire filter events
  const fromEl = document.getElementById('_act-from');
  const toEl = document.getElementById('_act-to');
  const entityEl = document.getElementById('_act-entity');
  const levelEl = document.getElementById('_act-level');

  const onFilter = () => {
    _actFilters.dateFrom = fromEl.value || null;
    _actFilters.dateTo = toEl.value || null;
    _actFilters.entityType = entityEl.value || null;
    _actFilters.level = levelEl.value || null;
    _actPage = 0;
    _fetchAndRender();
  };
  fromEl.addEventListener('change', onFilter);
  toEl.addEventListener('change', onFilter);
  entityEl.addEventListener('change', onFilter);
  levelEl.addEventListener('change', onFilter);

  _fetchAndRender();
}

// ─── Fetch ─────────────────────────────────────────────────

async function _fetchAndRender() {
  const el = document.getElementById('_act-entries');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--color-gray-400)">טוען...</div>';

  try {
    const params = {
      p_tenant_id: _actTenantId,
      p_limit: _PAGE_SIZE,
      p_offset: _actPage * _PAGE_SIZE,
      p_level: _actFilters.level || null,
      p_entity_type: _actFilters.entityType || null,
      p_date_from: _actFilters.dateFrom ? _actFilters.dateFrom + 'T00:00:00' : null,
      p_date_to: _actFilters.dateTo ? _actFilters.dateTo + 'T23:59:59' : null
    };
    const result = await AdminDB.rpc('get_tenant_activity_log', params);
    const total = result?.total || 0;
    const entries = result?.entries || [];
    _renderEntries(el, entries, total);
  } catch (e) {
    el.innerHTML = '<div style="color:var(--color-error)">שגיאה: ' + _escAV(e.message) + '</div>';
  }
}

// ─── Render Entries ────────────────────────────────────────

function _renderEntries(container, entries, total) {
  if (!entries.length) {
    container.innerHTML = '<div style="color:var(--color-gray-400);padding:1rem;text-align:center">אין רשומות להצגה</div>';
    return;
  }

  const from = _actPage * _PAGE_SIZE + 1;
  const to = Math.min(from + entries.length - 1, total);

  let html = '';
  entries.forEach(e => {
    const dt = _formatTimestamp(e.created_at);
    const lvlCls = _LEVEL_CLS[e.level] || 'badge-neutral';
    const details = _formatDetails(e.details);
    html += `<div style="border-bottom:1px solid var(--color-gray-100);padding:0.5rem 0;font-size:0.8125rem">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">
        <span style="color:var(--color-gray-400)">${_escAV(dt)}</span>
        <span class="badge ${lvlCls}" style="font-size:0.6875rem">${_escAV(e.level)}</span>
      </div>
      <div style="font-weight:500;color:var(--color-gray-800)">${_escAV(e.action)}</div>
      ${details ? '<div style="color:var(--color-gray-500);font-size:0.75rem;margin-top:0.125rem">' + _escAV(details) + '</div>' : ''}
    </div>`;
  });

  // Pagination
  const hasPrev = _actPage > 0;
  const hasNext = to < total;
  html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;font-size:0.8125rem;color:var(--color-gray-500)">
    <span>מציג ${from}-${to} מתוך ${total}</span>
    <div style="display:flex;gap:0.5rem">
      <button class="btn btn-ghost btn-sm" id="_act-prev" ${hasPrev ? '' : 'disabled'}>◄ הקודם</button>
      <button class="btn btn-ghost btn-sm" id="_act-next" ${hasNext ? '' : 'disabled'}>הבא ►</button>
    </div>
  </div>`;

  container.innerHTML = html;

  const prevBtn = document.getElementById('_act-prev');
  const nextBtn = document.getElementById('_act-next');
  if (prevBtn) prevBtn.addEventListener('click', () => { _actPage--; _fetchAndRender(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { _actPage++; _fetchAndRender(); });
}

// ─── Helpers ───────────────────────────────────────────────

function _formatTimestamp(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const daysDiff = (Date.now() - d.getTime()) / 86400000;
  if (daysDiff > 7) return dd + '/' + mm + '/' + d.getFullYear() + ' ' + hh + ':' + mi;
  return dd + '/' + mm + ' ' + hh + ':' + mi;
}

function _formatDetails(details) {
  if (!details || typeof details !== 'object') return '';
  const keys = Object.keys(details).slice(0, 3);
  if (!keys.length) return '';
  return keys.map(k => {
    let v = details[k];
    if (v != null && typeof v === 'object') v = JSON.stringify(v);
    if (v != null && String(v).length > 60) v = String(v).substring(0, 57) + '...';
    return k + ': ' + (v ?? '');
  }).join(', ');
}

// ─── Expose ────────────────────────────────────────────────

window.loadTenantActivityLog = loadTenantActivityLog;
