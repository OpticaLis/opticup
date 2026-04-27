// =========================================================
// employee-list.js — Employee Management Screen
// Depends on: shared.js, auth-service.js
// =========================================================

// Color palette stays in code (visual concern). Per-role labels and
// per-tenant role list come from the DB so adding a new role doesn't
// require a code change. PERMISSIONS_PHASE2_FIX_2026_04_27.
const ROLE_COLORS = {
  ceo: '#dc3545', manager: '#e67e22', team_lead: '#2196F3',
  senior: '#3498db', worker: '#4CAF50', employee: '#27ae60', viewer: '#9e9e9e'
};
const ROLE_HIERARCHY_ORDER = [
  'ceo', 'manager', 'team_lead', 'senior', 'worker', 'employee', 'viewer'
];

let ROLE_BADGES = {};
let ROLE_HIERARCHY = [];
let _rolesLoaded = false;

async function loadRolesFromDB() {
  if (_rolesLoaded) return;
  const { data: roles } = await sb.from(AT.ROLES)
    .select('id, name_he')
    .eq('tenant_id', getTenantId());
  if (!roles) return;
  ROLE_BADGES = {};
  roles.forEach(r => {
    ROLE_BADGES[r.id] = { label: r.name_he, color: ROLE_COLORS[r.id] || '#7f8c8d' };
  });
  // Hierarchy: known order first, then any unknown roles appended
  const known = ROLE_HIERARCHY_ORDER.filter(id => ROLE_BADGES[id]);
  const unknown = roles.map(r => r.id).filter(id => !known.includes(id));
  ROLE_HIERARCHY = [...known, ...unknown];
  _rolesLoaded = true;
}

let empEditId = null; // null = new, uuid = editing

// =========================================================
// 1. loadEmployeesTab()
// =========================================================
async function loadEmployeesTab() {
  requirePermission('employees.view');
  const container = $('employees-container');
  container.textContent = 'טוען...';

  await loadRolesFromDB();

  const { data: employees, error } = await sb.from(T.EMPLOYEES)
    .select('id, name, branch_id, last_login, is_active, role')
    .eq('tenant_id', getTenantId())
    .eq('is_active', true)
    .order('name');
  if (error) { toast('שגיאה בטעינת עובדים', 'e'); return; }

  // Fetch role assignments
  const { data: empRoles } = await sb.from(AT.EMP_ROLES).select('employee_id, role_id').eq('tenant_id', getTenantId());
  const roleMap = {};
  (empRoles || []).forEach(r => { roleMap[r.employee_id] = r.role_id; });

  // Resolve role per employee (new system or legacy fallback)
  employees.forEach(e => {
    e.resolvedRole = roleMap[e.id] || LEGACY_ROLE_MAP[e.role] || 'viewer';
  });

  // Summary cards
  const counts = {};
  employees.forEach(e => { counts[e.resolvedRole] = (counts[e.resolvedRole] || 0) + 1; });

  let html = '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">';
  html += empSummaryCard('סה״כ עובדים', employees.length, '#1a2744');
  for (const [roleId, badge] of Object.entries(ROLE_BADGES)) {
    if (counts[roleId]) html += empSummaryCard(badge.label, counts[roleId], badge.color);
  }
  html += '</div>';

  // Add button
  if (hasPermission('employees.create')) {
    html += '<div style="margin-bottom:14px"><button class="btn btn-p" onclick="openAddEmployee()">&#10010; הוסף עובד</button></div>';
  }

  html += '<div id="emp-table-wrap"></div>';

  // Permission matrix section
  if (hasPermission('settings.view')) {
    html += '<div style="margin-top:32px"><h3>\uD83D\uDD10 \u05DE\u05D8\u05E8\u05D9\u05E6\u05EA \u05D4\u05E8\u05E9\u05D0\u05D5\u05EA</h3><div id="perm-matrix-wrap">\u05D8\u05D5\u05E2\u05DF...</div></div>';
  }

  container.innerHTML = html;
  renderEmployeeTable(employees);
  if (hasPermission('settings.view')) renderPermissionMatrix('perm-matrix-wrap');
}

function empSummaryCard(label, value, color) {
  return `<div style="flex:1;min-width:120px;background:white;border-radius:10px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="font-size:1.8rem;font-weight:700;color:${escapeHtml(color)}">${value}</div>
    <div style="font-size:.82rem;color:#666;margin-top:4px">${escapeHtml(label)}</div></div>`;
}

// =========================================================
// 2. renderEmployeeTable(employees)
// =========================================================
function renderEmployeeTable(employees) {
  const wrap = $('emp-table-wrap');
  if (!wrap) return;
  const myRole = sessionStorage.getItem(SK.ROLE) || 'viewer';
  const myIdx = ROLE_HIERARCHY.indexOf(myRole);

  let t = '<table style="width:100%;border-collapse:collapse;font-size:.85rem"><thead><tr style="background:var(--primary);color:white;text-align:right">';
  t += '<th style="padding:10px">שם</th><th style="padding:10px">תפקיד</th><th style="padding:10px">סניף</th><th style="padding:10px">כניסה אחרונה</th><th style="padding:10px">פעולות</th>';
  t += '</tr></thead><tbody>';

  employees.forEach(e => {
    const badge = ROLE_BADGES[e.resolvedRole] || ROLE_BADGES.viewer;
    const lastLogin = e.last_login ? new Date(e.last_login).toLocaleString('he-IL') : '—';
    const empIdx = ROLE_HIERARCHY.indexOf(e.resolvedRole);
    const canEdit = hasPermission('employees.edit') && empIdx > myIdx;
    const canDeactivate = hasPermission('employees.delete') && empIdx > myIdx;

    t += '<tr style="border-bottom:1px solid #eee">';
    t += `<td style="padding:10px;font-weight:600">${escapeHtml(e.name)}</td>`;
    t += `<td style="padding:10px"><span style="background:${badge.color};color:white;padding:2px 10px;border-radius:12px;font-size:.78rem">${escapeHtml(badge.label)}</span></td>`;
    t += `<td style="padding:10px">${escapeHtml(e.branch_id || '00')}</td>`;
    t += `<td style="padding:10px;font-size:.8rem;color:#888">${lastLogin}</td>`;
    t += '<td style="padding:10px;display:flex;gap:6px">';
    if (canEdit) t += `<button class="btn btn-g btn-sm" onclick="openEditEmployee('${e.id}')">&#9998; עריכה</button>`;
    if (canDeactivate) t += `<button class="btn btn-d btn-sm" onclick="confirmDeactivateEmployee('${e.id}','${escapeHtml(e.name)}')">&#128683; השבתה</button>`;
    if (!canEdit && !canDeactivate) t += '<span style="color:#bbb;font-size:.78rem">—</span>';
    t += '</td></tr>';
  });

  t += '</tbody></table>';
  wrap.innerHTML = t;
}

// =========================================================
// 3. openAddEmployee()
// =========================================================
function openAddEmployee() {
  requirePermission('employees.create');
  empEditId = null;
  showEmployeeModal({ name: '', pin: '', role: 'worker', branch_id: '00' });
}

// =========================================================
// 4. openEditEmployee(id)
// =========================================================
async function openEditEmployee(id) {
  requirePermission('employees.edit');
  const { data: emp } = await sb.from(T.EMPLOYEES)
    .select('id, name, branch_id, role')
    .eq('tenant_id', getTenantId())
    .eq('id', id).maybeSingle();
  if (!emp) { toast('עובד לא נמצא', 'e'); return; }

  const { data: empRole } = await sb.from(AT.EMP_ROLES)
    .select('role_id').eq('tenant_id', getTenantId()).eq('employee_id', id).maybeSingle();
  const roleId = empRole?.role_id || LEGACY_ROLE_MAP[emp.role] || 'viewer';

  empEditId = id;
  showEmployeeModal({ name: emp.name, pin: '', role: roleId, branch_id: emp.branch_id || '00' });
}

function showEmployeeModal(data) {
  const isEdit = !!empEditId;
  const title = isEdit ? 'עריכת עובד' : 'הוספת עובד חדש';
  const pinPlaceholder = isEdit ? '●●●●● (השאר ריק אם אין שינוי)' : '5 ספרות';
  const myRole = sessionStorage.getItem(SK.ROLE) || 'viewer';
  const myIdx = ROLE_HIERARCHY.indexOf(myRole);

  let roleOpts = '';
  for (const [id, badge] of Object.entries(ROLE_BADGES)) {
    const idx = ROLE_HIERARCHY.indexOf(id);
    if (idx <= myIdx) continue; // cannot assign same or higher role
    const sel = id === data.role ? ' selected' : '';
    roleOpts += `<option value="${id}"${sel}>${escapeHtml(badge.label)}</option>`;
  }

  const html = `<div class="modal-overlay" id="emp-modal" style="display:flex">
    <div class="modal" style="max-width:420px">
      <h3>${escapeHtml(title)}</h3>
      <div class="form-group" style="margin-bottom:10px"><label>שם עובד <span style="color:var(--error)">*</span></label>
        <input type="text" id="emp-modal-name" value="${escapeHtml(data.name)}" placeholder="שם מלא"></div>
      <div class="form-group" style="margin-bottom:10px"><label>קוד PIN <span style="color:var(--error)">*</span></label>
        <input type="password" id="emp-modal-pin" inputmode="numeric" maxlength="5" placeholder="${pinPlaceholder}"></div>
      <div class="form-group" style="margin-bottom:10px"><label>תפקיד</label>
        <select id="emp-modal-role">${roleOpts}</select></div>
      <div class="form-group" style="margin-bottom:14px"><label>סניף</label>
        <input type="text" id="emp-modal-branch" value="${escapeHtml(data.branch_id)}" placeholder="00" maxlength="2"></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-s" onclick="saveEmployee()">&#10004; שמור</button>
        <button class="btn btn-g" onclick="closeModal('emp-modal')">ביטול</button>
      </div>
    </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  $('emp-modal-name').focus();
}

// =========================================================
// 5. saveEmployee()
// =========================================================
async function saveEmployee() {
  const name = $('emp-modal-name').value.trim();
  const pin = $('emp-modal-pin').value.trim();
  const roleId = $('emp-modal-role').value;
  const branchId = $('emp-modal-branch').value.trim() || '00';

  if (!name) { toast('שם עובד חובה', 'e'); return; }

  if (empEditId) {
    // Edit mode
    const update = { name, branch_id: branchId };
    if (pin) {
      if (!/^\d{5}$/.test(pin)) { toast('PIN חייב להכיל 5 ספרות בדיוק', 'e'); return; }
      update.pin = pin;
    }
    await sb.from(T.EMPLOYEES).update(update).eq('id', empEditId);
    // Update role
    await sb.from(AT.EMP_ROLES).delete().eq('employee_id', empEditId);
    await sb.from(AT.EMP_ROLES).insert({ employee_id: empEditId, role_id: roleId, granted_by: getCurrentEmployee()?.id, tenant_id: getTenantId() });
    writeLog('employee_edit', null, { employee_id: empEditId, name, role: roleId });
    toast('עובד עודכן בהצלחה', 's');
  } else {
    // New employee
    if (!/^\d{5}$/.test(pin)) { toast('PIN חייב להכיל 5 ספרות בדיוק', 'e'); return; }
    const { data: existing } = await sb.from(T.EMPLOYEES).select('id').eq('tenant_id', getTenantId()).eq('pin', pin).eq('is_active', true).maybeSingle();
    if (existing) { toast('PIN כבר בשימוש על ידי עובד אחר', 'e'); return; }
    const limit = await checkPlanLimit('employees');
    if (!limit.allowed) { Toast.warning(limit.message || 'הגעת למגבלה'); return; }
    const { data: newEmp, error } = await sb.from(T.EMPLOYEES)
      .insert({ name, pin, branch_id: branchId, is_active: true, created_by: getCurrentEmployee()?.id, tenant_id: getTenantId() })
      .select('id').single();
    if (error || !newEmp) { toast('שגיאה ביצירת עובד', 'e'); return; }
    await sb.from(AT.EMP_ROLES).insert({ employee_id: newEmp.id, role_id: roleId, granted_by: getCurrentEmployee()?.id, tenant_id: getTenantId() });
    writeLog('employee_create', null, { employee_id: newEmp.id, name, role: roleId });
    toast('עובד נוצר בהצלחה', 's');
  }
  closeModal('emp-modal');
  $('emp-modal')?.remove();
  loadEmployeesTab();
}

// =========================================================
// 6. confirmDeactivateEmployee(id, name)
// =========================================================
async function confirmDeactivateEmployee(id, name) {
  requirePermission('employees.delete');
  const ok = await confirmDialog('השבתת עובד', `האם לבטל גישה לעובד "${name}"?`);
  if (!ok) return;
  await sb.from(T.EMPLOYEES).update({ is_active: false }).eq('id', id);
  await sb.from(AT.SESSIONS).update({ is_active: false }).eq('employee_id', id);
  writeLog('employee_deactivate', null, { employee_id: id, name });
  toast('עובד הושבת', 's');
  loadEmployeesTab();
}

// Permission matrix UI extracted to modules/permissions/permission-matrix.js
// (PERMISSIONS_PHASE2_FIX_2026_04_27 — file-size compliance).
