// =========================================================
// auth-service.js — Core Authentication & Authorization Engine
// Load order: SECOND (after shared.js, before all other modules)
// =========================================================

// Auth table names (will be added to T when index.html is updated)
const AT = {
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  ROLE_PERMS: 'role_permissions',
  EMP_ROLES: 'employee_roles',
  SESSIONS: 'auth_sessions'
};

// SessionStorage keys
const SK = {
  TOKEN: 'prizma_auth_token',
  EMPLOYEE: 'prizma_employee',
  PERMS: 'prizma_permissions',
  ROLE: 'prizma_role'
};

// Map legacy employees.role → new role system
const LEGACY_ROLE_MAP = { admin: 'ceo', manager: 'manager', employee: 'worker' };

// =========================================================
// 1. verifyEmployeePIN(pin) — calls Edge Function
// =========================================================
async function verifyEmployeePIN(pin) {
  const EDGE_URL = SUPABASE_URL + '/functions/v1/pin-auth';
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: String(pin), slug: 'prizma' })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'PIN שגוי');
  }
  const { token, employee } = await res.json();
  return { token, employee };
}

// Lightweight wrapper: verifies PIN via Edge Function, returns employee or null
async function verifyPinOnly(pin) {
  try {
    const { employee } = await verifyEmployeePIN(pin);
    return employee;
  } catch {
    return null;
  }
}

// Standalone helper: increment failed_attempts for a known employee (called by login screen)
async function incrementFailedAttempts(employeeId) {
  const { data: emp } = await sb.from(T.EMPLOYEES)
    .select('failed_attempts')
    .eq('id', employeeId)
    .maybeSingle();
  if (!emp) return;
  const attempts = (emp.failed_attempts || 0) + 1;
  const update = { failed_attempts: attempts };
  if (attempts >= 5) {
    update.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
  await sb.from(T.EMPLOYEES).update(update).eq('id', employeeId);
}

// =========================================================
// 2. getEffectivePermissions(employeeId)
// =========================================================
async function getEffectivePermissions(employeeId) {
  // Try new employee_roles table first
  const { data: roles } = await sb.from(AT.EMP_ROLES)
    .select('role_id')
    .eq('employee_id', employeeId);

  let roleIds = (roles || []).map(r => r.role_id);

  // Fallback: if employee_roles empty, use legacy employees.role column
  if (roleIds.length === 0) {
    const { data: emp } = await sb.from(T.EMPLOYEES)
      .select('role')
      .eq('id', employeeId)
      .maybeSingle();
    const mapped = LEGACY_ROLE_MAP[emp?.role] || 'viewer';
    roleIds = [mapped];
  }

  const { data: perms } = await sb.from(AT.ROLE_PERMS)
    .select('permission_id')
    .in('role_id', roleIds)
    .eq('granted', true);

  if (!perms) return [];
  return [...new Set(perms.map(p => p.permission_id))];
}

// =========================================================
// 3. initSecureSession(employee)
// =========================================================
async function initSecureSession(employee, jwtToken) {
  // Store JWT and recreate sb client with Authorization header
  if (jwtToken) {
    sessionStorage.setItem('jwt_token', jwtToken);
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: 'Bearer ' + jwtToken } }
    });
    sb = window.sb;
  }

  // Generate 32-char hex token for internal session tracking
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');

  // Fetch permissions
  const permKeys = await getEffectivePermissions(employee.id);
  const permSnapshot = {};
  permKeys.forEach(k => { permSnapshot[k] = true; });

  // Resolve role (new system or legacy fallback)
  const { data: empRole } = await sb.from(AT.EMP_ROLES)
    .select('role_id')
    .eq('employee_id', employee.id)
    .limit(1)
    .maybeSingle();
  const roleId = empRole?.role_id || LEGACY_ROLE_MAP[employee.role] || 'viewer';

  // Expiry: 8 hours from now
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  // Insert session row
  await sb.from(AT.SESSIONS).insert({
    employee_id: employee.id,
    token,
    permissions: permSnapshot,
    role_id: roleId,
    branch_id: employee.branch_id || '00',
    expires_at: expiresAt,
    tenant_id: employee.tenant_id
  });

  // Persist to sessionStorage
  sessionStorage.setItem(SK.TOKEN, token);
  sessionStorage.setItem('tenant_id', employee.tenant_id);
  sessionStorage.setItem(SK.EMPLOYEE, JSON.stringify(employee));
  sessionStorage.setItem(SK.PERMS, JSON.stringify(permSnapshot));
  sessionStorage.setItem(SK.ROLE, roleId);

  return { token, employee, permissions: permSnapshot, role: roleId, expires_at: expiresAt };
}

// =========================================================
// 4. loadSession()
// =========================================================
async function loadSession() {
  // Dev bypass — TODO: REMOVE BEFORE PRODUCTION
  if (new URLSearchParams(window.location.search).get('dev_bypass') === 'opticup2024') {
    const devSession = {
      employee: { id: 'dev', name: 'Dev', role: 'ceo', branch_id: '00' },
      permissions: { '*': true },
      role: 'ceo'
    };
    sessionStorage.setItem(SK.EMPLOYEE, JSON.stringify(devSession.employee));
    sessionStorage.setItem(SK.PERMS, JSON.stringify(devSession.permissions));
    sessionStorage.setItem(SK.ROLE, 'ceo');
    return devSession;
  }

  const token = sessionStorage.getItem(SK.TOKEN);
  if (!token) return null;

  // Restore JWT-authenticated client BEFORE querying (RLS requires tenant_id)
  const jwt = sessionStorage.getItem('jwt_token');
  if (jwt) {
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: 'Bearer ' + jwt } }
    });
    sb = window.sb;
  }

  // Validate token against DB
  const { data: session } = await sb.from(AT.SESSIONS)
    .select('id, employee_id, permissions, role_id, expires_at')
    .eq('token', token)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!session) { clearSessionLocal(); return null; }

  // Touch last_active
  sb.from(AT.SESSIONS)
    .update({ last_active: new Date().toISOString() })
    .eq('id', session.id)
    .then(() => {});  // fire-and-forget

  // Restore employee data if missing from sessionStorage
  if (!sessionStorage.getItem(SK.EMPLOYEE)) {
    const { data: emp } = await sb.from(T.EMPLOYEES)
      .select('id, name, role, branch_id')
      .eq('id', session.employee_id)
      .maybeSingle();
    if (emp) sessionStorage.setItem(SK.EMPLOYEE, JSON.stringify(emp));
  }

  // Always sync permissions and role from DB session (source of truth)
  sessionStorage.setItem(SK.PERMS, JSON.stringify(session.permissions));
  sessionStorage.setItem(SK.ROLE, session.role_id);

  return {
    token,
    employee: JSON.parse(sessionStorage.getItem(SK.EMPLOYEE)),
    permissions: session.permissions,
    role: session.role_id,
    expires_at: session.expires_at
  };
}

// =========================================================
// 5. clearSession()
// =========================================================
function clearSessionLocal() {
  sessionStorage.removeItem(SK.TOKEN);
  sessionStorage.removeItem(SK.EMPLOYEE);
  sessionStorage.removeItem(SK.PERMS);
  sessionStorage.removeItem(SK.ROLE);
  sessionStorage.removeItem('jwt_token');
  // Reset sb to anon client
  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  sb = window.sb;
}

async function clearSession() {
  const token = sessionStorage.getItem(SK.TOKEN);
  if (token) {
    await sb.from(AT.SESSIONS).update({ is_active: false }).eq('token', token);
  }
  clearSessionLocal();
  window.location.href = 'index.html';
}

// =========================================================
// 6. hasPermission(permissionKey)
// =========================================================
function hasPermission(permissionKey) {
  const perms = JSON.parse(sessionStorage.getItem(SK.PERMS) || '{}');
  if (perms['*']) return true;  // dev bypass wildcard
  return perms[permissionKey] === true;
}

// =========================================================
// 7. requirePermission(permissionKey)
// =========================================================
function requirePermission(permissionKey) {
  if (!hasPermission(permissionKey)) {
    toast('אין הרשאה לביצוע פעולה זו', 'e');
    throw new Error('unauthorized');
  }
}

// =========================================================
// 8. checkBranchAccess(branchId)
// =========================================================
function checkBranchAccess(branchId) {
  const role = sessionStorage.getItem(SK.ROLE);
  if (role === 'ceo' || role === 'manager') return true;
  const emp = JSON.parse(sessionStorage.getItem(SK.EMPLOYEE) || '{}');
  return emp.branch_id === branchId;
}

// =========================================================
// 9. applyUIPermissions()
// =========================================================
function applyUIPermissions() {
  document.querySelectorAll('[data-permission]').forEach(el => {
    el.style.display = hasPermission(el.getAttribute('data-permission')) ? '' : 'none';
  });
  document.querySelectorAll('[data-tab-permission]').forEach(el => {
    el.style.display = hasPermission(el.getAttribute('data-tab-permission')) ? '' : 'none';
  });
}

// =========================================================
// 10. getCurrentEmployee()
// =========================================================
function getCurrentEmployee() {
  return JSON.parse(sessionStorage.getItem(SK.EMPLOYEE) || 'null');
}

// =========================================================
// 11. assignRoleToEmployee(employeeId, roleId)
// =========================================================
async function assignRoleToEmployee(employeeId, roleId) {
  requirePermission('employees.assign_role');
  const me = getCurrentEmployee();
  await sb.from(AT.EMP_ROLES)
    .upsert({ employee_id: employeeId, role_id: roleId, granted_by: me?.id, granted_at: new Date().toISOString(), tenant_id: getTenantId() },
      { onConflict: 'employee_id,role_id' });
  writeLog('role_assigned', null, { employeeId, roleId, assignedBy: me?.id });
  toast('תפקיד עודכן', 's');
}

// =========================================================
// 12. forceLogout(employeeId)
// =========================================================
async function forceLogout(employeeId) {
  requirePermission('employees.delete');
  await sb.from(AT.SESSIONS)
    .update({ is_active: false })
    .eq('employee_id', employeeId);
  toast('העובד נותק בהצלחה', 's');
}
