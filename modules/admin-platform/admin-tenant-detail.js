// === admin-tenant-detail.js ===
// Slide-in panel: tenant info, edit, usage stats, actions, provisioning log, audit log
// Depends on: AdminDB, adminSb, getCurrentAdmin, Modal, Toast, openTenantPanel, closeTenantPanel

let _currentTenant = null;
let _currentStats = null;
let _plansMap = null; // id → { display_name, limits, features }

function _esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const _STATUS = { active: 'פעיל', trial: 'trial', suspended: 'מושהה' };
const _STATUS_CLS = { active: 'badge-success', trial: 'badge-info', suspended: 'badge-danger' };

// ─── Init & Load ───────────────────────────────────────────

async function _ensurePlans() {
  if (_plansMap) return;
  try {
    const { data } = await adminSb.from('plans').select('id, name, display_name, limits, features').eq('is_active', true);
    _plansMap = {};
    (data || []).forEach(p => { _plansMap[p.id] = p; });
  } catch (_) { _plansMap = {}; }
}

async function loadTenantDetail(tenantId) {
  await _ensurePlans();
  // Get tenant from cached dashboard data or fetch stats
  _currentTenant = (window.allTenants || []).find(t => t.id === tenantId) || null;
  try {
    _currentStats = await AdminDB.rpc('get_tenant_stats', { p_tenant_id: tenantId });
  } catch (e) { _currentStats = {}; }
  _renderPanelHeader();
  renderPanelTab('info');
}

// ─── Panel Header ──────────────────────────────────────────

function _renderPanelHeader() {
  const t = _currentTenant; if (!t) return;
  const el = document.getElementById('panel-tenant-name');
  if (el) el.textContent = t.name || '';
  const slugEl = document.getElementById('panel-tenant-slug');
  if (slugEl) slugEl.textContent = t.slug || '';
  const planEl = document.getElementById('panel-tenant-plan');
  if (planEl) { planEl.textContent = t.plan_name || '—'; planEl.className = 'badge badge-neutral'; }
  const statusEl = document.getElementById('panel-tenant-status');
  if (statusEl) {
    statusEl.textContent = _STATUS[t.status] || t.status;
    statusEl.className = 'badge ' + (_STATUS_CLS[t.status] || 'badge-neutral');
  }
  const urlEl = document.getElementById('panel-tenant-url');
  if (urlEl) {
    urlEl.textContent = 'app.opticalis.co.il/?t=' + (t.slug || '');
    urlEl.href = 'https://app.opticalis.co.il/?t=' + encodeURIComponent(t.slug || '');
  }
}

// ─── Tab Routing ───────────────────────────────────────────

function renderPanelTab(tabName) {
  const content = document.getElementById('panel-content');
  const actions = document.getElementById('panel-actions');
  if (!content) return;
  actions.innerHTML = '';

  if (tabName === 'info') _renderDetailsTab(content, actions);
  else if (tabName === 'activity') _renderActivityTab(content);
  else if (tabName === 'provisioning') _renderProvisioningTab(content);
  else if (tabName === 'audit') _renderTenantAuditTab(content);
}

// ─── Tab 1: Details ────────────────────────────────────────

function _renderDetailsTab(container, actionsEl) {
  const t = _currentTenant; if (!t) { container.innerHTML = ''; return; }
  const s = _currentStats || {};
  const plan = _plansMap && t.plan_id ? _plansMap[t.plan_id] : null;
  const limits = plan ? (plan.limits || {}) : {};
  const admin = getCurrentAdmin();
  const isSuperAdmin = admin && admin.role === 'super_admin';
  const isSupport = admin && (admin.role === 'super_admin' || admin.role === 'support');

  const created = t.created_at ? new Date(t.created_at) : null;
  const createdStr = created ? (String(created.getDate()).padStart(2,'0') + '/' + String(created.getMonth()+1).padStart(2,'0') + '/' + created.getFullYear()) : '—';

  container.innerHTML = `
    <div style="margin-bottom:1.25rem">
      <h4 style="font-size:0.9375rem;font-weight:600;color:var(--color-gray-700);margin:0 0 0.5rem">פרטי חנות</h4>
      <div class="detail-row"><span class="detail-label">שם:</span> <span>${_esc(t.name)}</span></div>
      <div class="detail-row"><span class="detail-label">קוד:</span> <code>${_esc(t.slug)}</code></div>
      <div class="detail-row"><span class="detail-label">נוצרה:</span> <span>${_esc(createdStr)}</span></div>
    </div>
    <div style="margin-bottom:1.25rem">
      <h4 style="font-size:0.9375rem;font-weight:600;color:var(--color-gray-700);margin:0 0 0.5rem">פרטי בעלים</h4>
      <div class="detail-row"><span class="detail-label">שם:</span> <span>${_esc(t.owner_name || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">אימייל:</span> <span>${_esc(t.owner_email || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">טלפון:</span> <span>${_esc(t.owner_phone || '—')}</span></div>
    </div>
    <div style="margin-bottom:1.25rem">
      <h4 style="font-size:0.9375rem;font-weight:600;color:var(--color-gray-700);margin:0 0 0.5rem">תוכנית</h4>
      <div class="detail-row"><span class="detail-label">תוכנית:</span> <span class="badge badge-neutral">${_esc(t.plan_name || '—')}</span></div>
    </div>
    <div style="margin-bottom:1.25rem">
      <h4 style="font-size:0.9375rem;font-weight:600;color:var(--color-gray-700);margin:0 0 0.5rem">שימוש</h4>
      ${_usageRow('עובדים', s.employees_count, limits.max_employees)}
      ${_usageRow('מלאי', s.inventory_count, limits.max_inventory)}
      ${_usageRow('ספקים', s.suppliers_count, limits.max_suppliers)}
      ${_usageRow('מסמכים', s.documents_count, limits.max_documents_per_month)}
      ${_usageRow('מותגים', s.brands_count, null)}
    </div>
    <div id="feature-overrides-section"></div>
    ${isSuperAdmin ? '<button class="btn btn-ghost" style="font-size:0.8125rem" id="_btn-edit">✏️ ערוך</button>' : ''}
  `;

  if (typeof window.renderFeatureOverrides === 'function') {
    const ovEl = container.querySelector('#feature-overrides-section');
    if (ovEl) window.renderFeatureOverrides(t.id, t.plan_id, ovEl);
  }

  const editBtn = container.querySelector('#_btn-edit');
  if (editBtn) editBtn.addEventListener('click', () => _enterEditMode());

  // Actions
  let actionsHtml = '';
  if (isSuperAdmin && t.status === 'active') actionsHtml += '<button class="btn btn-danger btn-sm" id="_act-suspend">השהה חנות</button> ';
  if (isSuperAdmin && (t.status === 'suspended' || t.status === 'trial')) actionsHtml += '<button class="btn btn-primary btn-sm" id="_act-activate">הפעל חנות</button> ';
  if (isSupport) actionsHtml += '<button class="btn btn-secondary btn-sm" id="_act-reset-pin">אפס PIN עובד</button> ';
  if (isSuperAdmin && t.status !== 'deleted') actionsHtml += '<button class="btn btn-ghost btn-sm" style="color:var(--color-error)" id="_act-delete">מחק חנות</button>';
  actionsEl.innerHTML = actionsHtml;

  const suspBtn = actionsEl.querySelector('#_act-suspend');
  if (suspBtn) suspBtn.addEventListener('click', _suspendTenant);
  const actBtn = actionsEl.querySelector('#_act-activate');
  if (actBtn) actBtn.addEventListener('click', _activateTenant);
  const delBtn = actionsEl.querySelector('#_act-delete');
  if (delBtn) delBtn.addEventListener('click', _deleteTenant);
  const pinBtn = actionsEl.querySelector('#_act-reset-pin');
  if (pinBtn) pinBtn.addEventListener('click', _resetEmployeePin);
}

function _usageRow(label, current, limit) {
  const c = current != null ? Number(current) : 0;
  const lim = (limit == null || limit === -1) ? '∞' : Number(limit);
  const over = lim !== '∞' && c >= lim;
  const style = over ? 'color:var(--color-error);font-weight:600' : '';
  return `<div class="detail-row"><span class="detail-label">${_esc(label)}:</span> <span style="${style}">${c.toLocaleString('he-IL')} / ${lim === '∞' ? '∞' : lim.toLocaleString('he-IL')}</span></div>`;
}

// ─── Edit Mode ─────────────────────────────────────────────

function _enterEditMode() {
  const t = _currentTenant; if (!t) return;
  const container = document.getElementById('panel-content');
  const actionsEl = document.getElementById('panel-actions');
  if (!container || !actionsEl) return;
  const planOptions = Object.values(_plansMap || {}).map(p =>
    `<option value="${_esc(p.id)}" ${p.id === t.plan_id ? 'selected' : ''}>${_esc(p.display_name)}</option>`
  ).join('');

  container.innerHTML = `
    <div class="edit-form" style="display:flex;flex-direction:column;gap:0.75rem">
      <label>שם חנות<input type="text" id="_e-name" class="input" value="${_esc(t.name || '')}"></label>
      <label>שם בעלים<input type="text" id="_e-owner" class="input" value="${_esc(t.owner_name || '')}"></label>
      <label>אימייל<input type="email" id="_e-email" class="input" value="${_esc(t.owner_email || '')}" dir="ltr"></label>
      <label>טלפון<input type="tel" id="_e-phone" class="input" value="${_esc(t.owner_phone || '')}" dir="ltr"></label>
      <label>תוכנית<select id="_e-plan" class="input">${planOptions}</select></label>
    </div>
  `;
  actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" id="_btn-save">שמור</button> <button class="btn btn-secondary btn-sm" id="_btn-cancel">ביטול</button>';
  actionsEl.querySelector('#_btn-save').addEventListener('click', _saveChanges);
  actionsEl.querySelector('#_btn-cancel').addEventListener('click', () => renderPanelTab('info'));
}

async function _saveChanges() {
  const t = _currentTenant; if (!t) return;
  const updates = {};
  const name = document.getElementById('_e-name').value.trim();
  const owner = document.getElementById('_e-owner').value.trim();
  const email = document.getElementById('_e-email').value.trim();
  const phone = document.getElementById('_e-phone').value.trim();
  const planId = document.getElementById('_e-plan').value;

  if (name && name !== t.name) updates.name = name;
  if (owner !== (t.owner_name || '')) updates.owner_name = owner;
  if (email !== (t.owner_email || '')) updates.owner_email = email;
  if (phone !== (t.owner_phone || '')) updates.owner_phone = phone;
  if (planId && planId !== t.plan_id) updates.plan_id = planId;

  if (!Object.keys(updates).length) { Toast.info('אין שינויים'); return; }

  try {
    const admin = getCurrentAdmin();
    await AdminDB.rpc('update_tenant', { p_tenant_id: t.id, p_updates: updates, p_admin_id: admin.id });
    Toast.success('פרטים עודכנו');
    await _refreshAfterAction(t.id);
  } catch (e) { Toast.error('שגיאה: ' + e.message); }
}

// ─── Actions ───────────────────────────────────────────────

function _suspendTenant() {
  const t = _currentTenant; if (!t) return;
  const modal = Modal.show({
    title: 'השהיית חנות',
    content: `<p>להשהות את <strong>${_esc(t.name)}</strong>?</p><textarea id="_suspend-reason" rows="3" class="input" placeholder="סיבת השהייה..." style="width:100%;margin-top:0.5rem"></textarea>`,
    size: 'sm',
    footer: '<button class="btn btn-danger" id="_confirm-suspend">השהה</button> <button class="btn btn-secondary" id="_cancel-suspend">ביטול</button>'
  });
  const confirmBtn = modal.el.querySelector('#_confirm-suspend');
  const cancelBtn = modal.el.querySelector('#_cancel-suspend');
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.close());
  if (confirmBtn) confirmBtn.addEventListener('click', async () => {
    const reason = modal.el.querySelector('#_suspend-reason')?.value?.trim() || '';
    modal.close();
    try {
      const admin = getCurrentAdmin();
      await AdminDB.rpc('suspend_tenant', { p_tenant_id: t.id, p_reason: reason, p_admin_id: admin.id });
      Toast.success('החנות הושהתה');
      await _refreshAfterAction(t.id);
    } catch (e) { Toast.error('שגיאה: ' + e.message); }
  });
}

function _activateTenant() {
  const t = _currentTenant; if (!t) return;
  Modal.confirm({
    title: 'הפעלת חנות',
    message: 'להפעיל את ' + t.name + '?',
    confirmText: 'הפעל',
    onConfirm: async () => {
      try {
        const admin = getCurrentAdmin();
        await AdminDB.rpc('activate_tenant', { p_tenant_id: t.id, p_admin_id: admin.id });
        Toast.success('החנות הופעלה');
        await _refreshAfterAction(t.id);
      } catch (e) { Toast.error('שגיאה: ' + e.message); }
    }
  });
}

function _deleteTenant() {
  const t = _currentTenant; if (!t) return;
  Modal.danger({
    title: 'מחיקת חנות',
    message: 'הקלד את קוד החנות (' + t.slug + ') לאישור:',
    confirmWord: t.slug,
    confirmText: 'מחק לצמיתות',
    onConfirm: async () => {
      try {
        const admin = getCurrentAdmin();
        await AdminDB.rpc('delete_tenant', { p_tenant_id: t.id, p_deleted_by: admin.id });
        Toast.success('החנות נמחקה');
        closeTenantPanel();
        if (typeof window.loadTenants === 'function') window.loadTenants();
      } catch (e) { Toast.error('שגיאה: ' + e.message); }
    }
  });
}

function _resetEmployeePin() {
  const t = _currentTenant; if (!t) return;
  AdminDB.rpc('get_tenant_employees', { p_tenant_id: t.id }).then(employees => {
    const emps = Array.isArray(employees) ? employees : [];
    const opts = emps.map(e => `<option value="${_esc(e.id)}">${_esc(e.name)}</option>`).join('');
    Modal.form({
      title: 'איפוס PIN עובד',
      content: `
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          <label>עובד<select id="_pin-emp" class="input">${opts || '<option disabled>אין עובדים</option>'}</select></label>
          <label>PIN חדש<input type="text" id="_pin-val" class="input" value="12345" maxlength="5" dir="ltr"></label>
          <label style="display:flex;align-items:center;gap:0.5rem"><input type="checkbox" id="_pin-must" checked> חייב להחליף PIN</label>
        </div>`,
      submitText: 'אפס PIN',
      onSubmit: async () => {
        const empId = document.getElementById('_pin-emp')?.value;
        const pin = document.getElementById('_pin-val')?.value?.trim();
        const must = document.getElementById('_pin-must')?.checked ?? true;
        if (!empId || !pin) { Toast.error('יש למלא את כל השדות'); return; }
        try {
          const admin = getCurrentAdmin();
          await AdminDB.rpc('reset_employee_pin', { p_tenant_id: t.id, p_employee_id: empId, p_new_pin: pin, p_must_change: must, p_admin_id: admin.id });
          Toast.success('PIN אופס בהצלחה');
        } catch (e) { Toast.error('שגיאה: ' + e.message); }
      }
    });
  }).catch(e => Toast.error('שגיאה: ' + e.message));
}

// ─── Tab 3: Provisioning Log ───────────────────────────────

async function _renderProvisioningTab(container) {
  const t = _currentTenant; if (!t) { container.innerHTML = ''; return; }
  container.innerHTML = '<div style="color:var(--color-gray-400);padding:1rem">טוען...</div>';
  try {
    const rows = await AdminDB.query('tenant_provisioning_log', '*', { tenant_id: t.id, _order: { column: 'created_at', ascending: false } });
    if (!rows.length) { container.innerHTML = '<div style="color:var(--color-gray-400);padding:1rem">אין רשומות</div>'; return; }
    let html = '<table style="width:100%;font-size:0.8125rem;border-collapse:collapse">';
    html += '<tr style="border-bottom:1px solid var(--color-gray-200)"><th style="text-align:start;padding:0.5rem">שלב</th><th style="text-align:start;padding:0.5rem">סטטוס</th><th style="text-align:start;padding:0.5rem">תאריך</th></tr>';
    rows.forEach(r => {
      const cls = r.status === 'completed' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-info';
      const dt = r.created_at ? new Date(r.created_at).toLocaleString('he-IL') : '';
      html += `<tr style="border-bottom:1px solid var(--color-gray-100)"><td style="padding:0.5rem">${_esc(r.step)}</td><td style="padding:0.5rem"><span class="badge ${cls}">${_esc(r.status)}</span></td><td style="padding:0.5rem">${_esc(dt)}</td></tr>`;
      if (r.error_message) html += `<tr><td colspan="3" style="padding:0.25rem 0.5rem;color:var(--color-error);font-size:0.75rem">${_esc(r.error_message)}</td></tr>`;
    });
    html += '</table>';
    container.innerHTML = html;
  } catch (e) { container.innerHTML = '<div style="color:var(--color-error);padding:1rem">שגיאה: ' + _esc(e.message) + '</div>'; }
}

// ─── Tab 4: Audit Log ──────────────────────────────────────

async function _renderTenantAuditTab(container) {
  const admin = getCurrentAdmin();
  if (!admin || admin.role !== 'super_admin') {
    container.innerHTML = '<div style="color:var(--color-gray-400);padding:1rem">אין הרשאה</div>'; return;
  }
  const t = _currentTenant; if (!t) { container.innerHTML = ''; return; }
  container.innerHTML = '<div style="color:var(--color-gray-400);padding:1rem">טוען...</div>';
  try {
    const { data } = await adminSb.from('platform_audit_log').select('*, platform_admins(display_name)').eq('target_tenant_id', t.id).order('created_at', { ascending: false }).limit(50);
    if (!data || !data.length) { container.innerHTML = '<div style="color:var(--color-gray-400);padding:1rem">אין רשומות</div>'; return; }
    let html = '<table style="width:100%;font-size:0.8125rem;border-collapse:collapse">';
    html += '<tr style="border-bottom:1px solid var(--color-gray-200)"><th style="text-align:start;padding:0.5rem">Admin</th><th style="text-align:start;padding:0.5rem">פעולה</th><th style="text-align:start;padding:0.5rem">תאריך</th></tr>';
    data.forEach(r => {
      const adminName = r.platform_admins ? r.platform_admins.display_name : '—';
      const dt = r.created_at ? new Date(r.created_at).toLocaleString('he-IL') : '';
      html += `<tr style="border-bottom:1px solid var(--color-gray-100)"><td style="padding:0.5rem">${_esc(adminName)}</td><td style="padding:0.5rem">${_esc(r.action)}</td><td style="padding:0.5rem">${_esc(dt)}</td></tr>`;
    });
    html += '</table>';
    container.innerHTML = html;
  } catch (e) { container.innerHTML = '<div style="color:var(--color-error);padding:1rem">שגיאה: ' + _esc(e.message) + '</div>'; }
}

// ─── Activity Tab placeholder ──────────────────────────────

function _renderActivityTab(container) {
  const t = _currentTenant;
  if (typeof window.loadTenantActivityLog === 'function' && t) {
    window.loadTenantActivityLog(t.id);
  } else {
    container.innerHTML = '<div style="color:var(--color-gray-400);padding:1rem">Activity Log — פאזה 3h</div>';
  }
}

// ─── Helpers ───────────────────────────────────────────────

async function _refreshAfterAction(tenantId) {
  if (typeof window.loadTenants === 'function') await window.loadTenants();
  _currentTenant = (window.allTenants || []).find(t => t.id === tenantId) || _currentTenant;
  try { _currentStats = await AdminDB.rpc('get_tenant_stats', { p_tenant_id: tenantId }); } catch (_) {}
  _renderPanelHeader();
  renderPanelTab('info');
}

// ─── Expose globals ────────────────────────────────────────

window.loadTenantDetail = loadTenantDetail;
window.renderPanelTab = renderPanelTab;
