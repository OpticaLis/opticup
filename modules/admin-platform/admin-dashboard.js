// === admin-dashboard.js ===
// Tenant list table, filters, search for admin dashboard
// Depends on: AdminDB (admin-db.js), adminSb (admin-auth.js), TableBuilder (shared), Toast, openTenantPanel (admin-app.js)

let allTenants = [];
let _tenantsTable = null;
let _dashboardInited = false;

const STATUS_LABELS = { active: 'פעיל', trial: 'trial', suspended: 'מושהה' };
const STATUS_BADGE = { active: 'badge-success', trial: 'badge-info', suspended: 'badge-danger' };

// ─── Init ──────────────────────────────────────────────────

async function initDashboard() {
  if (_dashboardInited) { loadTenants(); return; }
  _dashboardInited = true;
  await populatePlanFilter();
  await loadTenants();
}

// ─── Load Tenants ──────────────────────────────────────────

async function loadTenants() {
  try {
    _ensureTable();
    _tenantsTable.setLoading(true);
    const data = await AdminDB.rpc('get_all_tenants_overview');
    allTenants = Array.isArray(data) ? data : [];
    filterTenants();
  } catch (err) {
    if (_tenantsTable) _tenantsTable.setData([]);
    Toast.error('שגיאה בטעינת חנויות: ' + err.message);
  }
}

// ─── Filter ────────────────────────────────────────────────

function filterTenants() {
  const searchEl = document.getElementById('search-tenants');
  const statusEl = document.getElementById('filter-status');
  const planEl = document.getElementById('filter-plan');

  const search = (searchEl ? searchEl.value.trim().toLowerCase() : '');
  const status = (statusEl ? statusEl.value : '');
  const planId = (planEl ? planEl.value : '');

  let filtered = allTenants;

  if (search) {
    filtered = filtered.filter(t =>
      (t.name || '').toLowerCase().includes(search) ||
      (t.slug || '').toLowerCase().includes(search)
    );
  }
  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }
  if (planId) {
    filtered = filtered.filter(t => t.plan_id === planId);
  }

  renderTenantsTable(filtered);
}

// ─── Render Table ──────────────────────────────────────────

function _ensureTable() {
  if (_tenantsTable) return;
  _tenantsTable = TableBuilder.create({
    containerId: 'tenants-table-container',
    rowId: 'id',
    columns: [
      { key: 'name', label: 'שם חנות', sortable: true, render: (v, row) =>
        '<span class="tenant-name-link">' + _esc(v) + '</span>'
      },
      { key: 'slug', label: 'קוד', sortable: true, render: (v) =>
        '<code style="font-size:0.8125rem;color:var(--color-gray-600)">' + _esc(v) + '</code>'
      },
      { key: 'plan_name', label: 'תוכנית', sortable: true, render: (v) =>
        '<span class="badge badge-neutral">' + _esc(v || '—') + '</span>'
      },
      { key: 'status', label: 'סטטוס', sortable: true, render: (v) => {
        const cls = STATUS_BADGE[v] || 'badge-neutral';
        const label = STATUS_LABELS[v] || v || '—';
        return '<span class="badge ' + cls + '">' + _esc(label) + '</span>';
      }},
      { key: 'employees_count', label: 'עובדים', type: 'number', sortable: true },
      { key: 'inventory_count', label: 'מלאי', sortable: true, render: (v) =>
        v != null ? Number(v).toLocaleString('he-IL') : '0'
      },
      { key: 'last_active', label: 'פעילות אחרונה', sortable: true, render: (v) =>
        '<span style="color:var(--color-gray-500);font-size:0.8125rem">' + _esc(formatRelativeTime(v)) + '</span>'
      }
    ],
    emptyState: { icon: '🏪', text: 'אין חנויות להצגה' },
    onSort: handleSort,
    onRowClick: (row) => openTenantPanel(row.id)
  });
}

function renderTenantsTable(tenants) {
  _ensureTable();
  _tenantsTable.setData(tenants);
}

// ─── Sort ──────────────────────────────────────────────────

function handleSort(key, dir) {
  const searchEl = document.getElementById('search-tenants');
  const statusEl = document.getElementById('filter-status');
  const planEl = document.getElementById('filter-plan');

  const search = (searchEl ? searchEl.value.trim().toLowerCase() : '');
  const status = (statusEl ? statusEl.value : '');
  const planId = (planEl ? planEl.value : '');

  let filtered = allTenants;
  if (search) {
    filtered = filtered.filter(t =>
      (t.name || '').toLowerCase().includes(search) ||
      (t.slug || '').toLowerCase().includes(search)
    );
  }
  if (status) filtered = filtered.filter(t => t.status === status);
  if (planId) filtered = filtered.filter(t => t.plan_id === planId);

  filtered = filtered.slice().sort((a, b) => {
    let va = a[key], vb = b[key];
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (typeof va === 'number' && typeof vb === 'number') {
      return dir === 'asc' ? va - vb : vb - va;
    }
    const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
    return dir === 'asc' ? sa.localeCompare(sb, 'he') : sb.localeCompare(sa, 'he');
  });

  _tenantsTable.setData(filtered);
}

// ─── Helpers ───────────────────────────────────────────────

function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date)) return '—';
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return 'לפני ' + minutes + ' דקות';
  if (hours < 24) return 'לפני ' + hours + ' שעות';
  if (days < 7) return 'לפני ' + days + ' ימים';

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return dd + '/' + mm + '/' + date.getFullYear();
}

function _esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Plan Filter Population ────────────────────────────────

async function populatePlanFilter() {
  const el = document.getElementById('filter-plan');
  if (!el) return;
  try {
    const { data } = await adminSb.from('plans')
      .select('id, display_name')
      .eq('is_active', true)
      .order('sort_order');
    if (data) {
      data.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.display_name;
        el.appendChild(opt);
      });
    }
  } catch (_) { /* silent — filter just won't have plan options */ }
}

// ─── Expose globals ────────────────────────────────────────

window.loadTenants = loadTenants;
window.filterTenants = filterTenants;
window.initDashboard = initDashboard;
