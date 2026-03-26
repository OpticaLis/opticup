// === admin-audit.js ===
// Audit log helper + platform audit log viewer (top-level Audit Log tab)
// Depends on: AdminDB, adminSb, getCurrentAdmin, Toast

// ─── Audit Logger (Phase 1 — do not modify) ────────────────

async function logAdminAction(action, targetTenantId = null, details = {}) {
  const admin = getCurrentAdmin();
  if (!admin) return;

  try {
    await AdminDB.insert('platform_audit_log', {
      admin_id: admin.id,
      action: action,
      target_tenant_id: targetTenantId,
      details: details,
      ip_address: null
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// ─── Platform Audit Log Viewer (Phase 3i) ──────────────────

const ACTION_LABELS = {
  'tenant.create': 'יצירת חנות',
  'tenant.update': 'עדכון פרטים',
  'tenant.suspend': 'השהיית חנות',
  'tenant.activate': 'הפעלת חנות',
  'tenant.delete': 'מחיקת חנות',
  'tenant.reset_pin': 'איפוס PIN',
  'admin.login': 'כניסת מנהל',
  'admin.logout': 'יציאת מנהל'
};

let _auditAllEntries = [];
let _auditFilterAction = '';

function _escAudit(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function loadPlatformAuditLog() {
  const container = document.getElementById('audit-log-container');
  if (!container) return;

  const admin = getCurrentAdmin();
  if (!admin || admin.role !== 'super_admin') {
    container.innerHTML = '<div style="color:var(--color-gray-400);padding:2rem;text-align:center">אין הרשאה לצפייה ב-Audit Log</div>';
    return;
  }

  container.innerHTML = '<div style="color:var(--color-gray-400);padding:1rem">טוען...</div>';

  try {
    const { data, error } = await adminSb.from('platform_audit_log')
      .select('*, platform_admins(display_name), tenants(name, slug)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    _auditAllEntries = data || [];
    _auditFilterAction = '';
    _renderAuditLog(container);
  } catch (e) {
    container.innerHTML = '<div style="color:var(--color-error);padding:1rem">שגיאה: ' + _escAudit(e.message) + '</div>';
  }
}

function _renderAuditLog(container) {
  const filtered = _auditFilterAction
    ? _auditAllEntries.filter(e => e.action === _auditFilterAction)
    : _auditAllEntries;

  // Filter row
  const actionOpts = Object.entries(ACTION_LABELS).map(([k, v]) =>
    `<option value="${_escAudit(k)}" ${_auditFilterAction === k ? 'selected' : ''}>${_escAudit(v)}</option>`
  ).join('');

  let html = `<div style="margin-bottom:0.75rem">
    <select id="_audit-filter" style="padding:0.4rem 0.75rem;border:1px solid var(--color-gray-300);border-radius:8px;font-size:0.875rem">
      <option value="">פעולה: הכל</option>${actionOpts}
    </select>
  </div>`;

  if (!filtered.length) {
    html += '<div style="color:var(--color-gray-400);padding:1rem;text-align:center">אין רשומות</div>';
  } else {
    html += '<table style="width:100%;font-size:0.8125rem;border-collapse:collapse">';
    html += '<tr style="border-bottom:1px solid var(--color-gray-200)"><th style="text-align:start;padding:0.5rem">Admin</th><th style="text-align:start;padding:0.5rem">פעולה</th><th style="text-align:start;padding:0.5rem">חנות</th><th style="text-align:start;padding:0.5rem">פרטים</th><th style="text-align:start;padding:0.5rem">תאריך</th></tr>';
    filtered.forEach(r => {
      const adminName = r.platform_admins ? r.platform_admins.display_name : '—';
      const actionLabel = ACTION_LABELS[r.action] || r.action;
      const tenant = r.tenants ? r.tenants.name + ' (' + r.tenants.slug + ')' : '—';
      const details = _auditDetails(r.details);
      const dt = _auditDate(r.created_at);
      html += `<tr style="border-bottom:1px solid var(--color-gray-100)">
        <td style="padding:0.5rem">${_escAudit(adminName)}</td>
        <td style="padding:0.5rem">${_escAudit(actionLabel)}</td>
        <td style="padding:0.5rem">${_escAudit(tenant)}</td>
        <td style="padding:0.5rem;color:var(--color-gray-500);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_escAudit(details)}</td>
        <td style="padding:0.5rem;white-space:nowrap">${_escAudit(dt)}</td>
      </tr>`;
    });
    html += '</table>';
  }

  container.innerHTML = html;

  const filterEl = document.getElementById('_audit-filter');
  if (filterEl) filterEl.addEventListener('change', () => {
    _auditFilterAction = filterEl.value;
    _renderAuditLog(container);
  });
}

function _auditDetails(details) {
  if (!details || typeof details !== 'object') return '';
  const keys = Object.keys(details).slice(0, 3);
  if (!keys.length) return '';
  return keys.map(k => {
    let v = details[k];
    if (v != null && typeof v === 'object') v = JSON.stringify(v);
    if (v != null && String(v).length > 40) v = String(v).substring(0, 37) + '...';
    return k + ': ' + (v ?? '');
  }).join(', ');
}

function _auditDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return dd + '/' + mm + '/' + d.getFullYear() + ' ' + hh + ':' + mi;
}

// ─── Expose ────────────────────────────────────────────────

window.loadPlatformAuditLog = loadPlatformAuditLog;
