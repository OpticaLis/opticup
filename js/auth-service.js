// auth-service.js — Core Authentication & Authorization Engine

// Auth table names
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

// --- 1. verifyEmployeePIN ---
async function verifyEmployeePIN(pin) {
  const EDGE_URL = SUPABASE_URL + '/functions/v1/pin-auth';
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: String(pin), slug: TENANT_SLUG })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'PIN שגוי');
  }
  const { token, employee } = await res.json();
  return { token, employee };
}

// verifyPinOnly: returns employee or null
async function verifyPinOnly(pin) {
  try {
    const { employee } = await verifyEmployeePIN(pin);
    return employee;
  } catch {
    return null;
  }
}

// Increment failed_attempts for a known employee
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

// --- 2. getEffectivePermissions ---
async function getEffectivePermissions(employeeId) {
  const { data: roles } = await sb.from(AT.EMP_ROLES)
    .select('role_id')
    .eq('employee_id', employeeId);

  let roleIds = (roles || []).map(r => r.role_id);
  if (roleIds.length === 0) {
    const { data: emp } = await sb.from(T.EMPLOYEES)
      .select('role')
      .eq('id', employeeId)
      .maybeSingle();
    const mapped = LEGACY_ROLE_MAP[emp?.role] || 'viewer';
    roleIds = [mapped];
  }
  let permQ = sb.from(AT.ROLE_PERMS)
    .select('permission_id')
    .in('role_id', roleIds)
    .eq('granted', true);
  const tid = getTenantId();
  if (tid) permQ = permQ.eq('tenant_id', tid);
  const { data: perms } = await permQ;

  if (!perms) return [];
  return [...new Set(perms.map(p => p.permission_id))];
}

// --- 3. initSecureSession ---
async function initSecureSession(employee, jwtToken) {
  if (jwtToken) {
    sessionStorage.setItem('jwt_token', jwtToken);
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: 'Bearer ' + jwtToken } }
    });
    sb = window.sb;
  }
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  const permKeys = await getEffectivePermissions(employee.id);
  const permSnapshot = {};
  permKeys.forEach(k => { permSnapshot[k] = true; });
  const { data: empRole } = await sb.from(AT.EMP_ROLES)
    .select('role_id')
    .eq('employee_id', employee.id)
    .limit(1)
    .maybeSingle();
  const roleId = empRole?.role_id || LEGACY_ROLE_MAP[employee.role] || 'viewer';
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await sb.from(AT.SESSIONS).insert({
    employee_id: employee.id,
    token,
    permissions: permSnapshot,
    role_id: roleId,
    branch_id: employee.branch_id || '00',
    expires_at: expiresAt,
    tenant_id: employee.tenant_id
  });
  sessionStorage.setItem(SK.TOKEN, token);
  sessionStorage.setItem('tenant_id', employee.tenant_id);
  sessionStorage.setItem(SK.EMPLOYEE, JSON.stringify(employee));
  sessionStorage.setItem(SK.PERMS, JSON.stringify(permSnapshot));
  sessionStorage.setItem(SK.ROLE, roleId);
  _startJwtCheck();
  try {
    const { data: tenantRow } = await sb.from('tenants')
      .select('name,vat_rate,withholding_tax_default,payment_terms_days,default_currency,rows_per_page,date_format,theme,business_name,logo_url')
      .eq('id', employee.tenant_id)
      .single();
    if (tenantRow) {
      sessionStorage.setItem('tenant_config', JSON.stringify(tenantRow));
      if (tenantRow.name) sessionStorage.setItem('tenant_name_cache', tenantRow.name);
    }
  } catch (e) { console.warn('Failed to load tenant config:', e); }

  return { token, employee, permissions: permSnapshot, role: roleId, expires_at: expiresAt };
}

// --- 4. loadSession ---
async function loadSession() {
  const token = sessionStorage.getItem(SK.TOKEN);
  if (!token) return null;
  const storedSlug = sessionStorage.getItem('tenant_slug');
  if (typeof TENANT_SLUG !== 'undefined' && storedSlug && storedSlug !== TENANT_SLUG) {
    clearSessionLocal();
    return null;
  }
  const jwt = sessionStorage.getItem('jwt_token');
  if (jwt) {
    try {
      var parts = jwt.split('.');
      if (parts.length === 3) {
        var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        var jwtTid = payload.tenant_id;
        var storedTid = getTenantId();
        if (jwtTid && storedTid && jwtTid !== storedTid) {
          console.warn('tenant_id mismatch: JWT=' + jwtTid + ' session=' + storedTid);
          clearSessionLocal();
          return null;
        }
      }
    } catch (e) { console.warn('JWT decode failed:', e); }

    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: 'Bearer ' + jwt } }
    });
    sb = window.sb;
  }
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
    .then(() => {});
  if (!sessionStorage.getItem(SK.EMPLOYEE)) {
    const { data: emp } = await sb.from(T.EMPLOYEES)
      .select('id, name, role, branch_id')
      .eq('id', session.employee_id)
      .maybeSingle();
    if (emp) sessionStorage.setItem(SK.EMPLOYEE, JSON.stringify(emp));
  }
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

// --- 5. clearSession ---
function clearSessionLocal() {
  _stopJwtCheck();
  sessionStorage.removeItem(SK.TOKEN);
  sessionStorage.removeItem(SK.EMPLOYEE);
  sessionStorage.removeItem(SK.PERMS);
  sessionStorage.removeItem(SK.ROLE);
  sessionStorage.removeItem('jwt_token');
  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  sb = window.sb;
}

// Periodic JWT validity check (30 min)
function _startJwtCheck() {
  _stopJwtCheck();
  window._jwtCheckInterval = setInterval(async function() {
    var s = await loadSession();
    if (!s) { window.location.href = '/'; }
  }, 30 * 60 * 1000);
}
function _stopJwtCheck() {
  if (window._jwtCheckInterval) {
    clearInterval(window._jwtCheckInterval);
    window._jwtCheckInterval = null;
  }
}

async function clearSession() {
  const token = sessionStorage.getItem(SK.TOKEN);
  if (token) {
    await sb.from(AT.SESSIONS).update({ is_active: false }).eq('token', token);
  }
  const slug = sessionStorage.getItem('tenant_slug') || TENANT_SLUG;
  clearSessionLocal();
  window.location.href = slug ? '/?t=' + encodeURIComponent(slug) : '/';
}

// --- 6. hasPermission ---
function hasPermission(permissionKey) {
  const perms = JSON.parse(sessionStorage.getItem(SK.PERMS) || '{}');
  return perms[permissionKey] === true;
}

// --- 7. requirePermission ---
function requirePermission(permissionKey) {
  if (!hasPermission(permissionKey)) {
    toast('אין הרשאה לביצוע פעולה זו', 'e');
    throw new Error('unauthorized');
  }
}

// --- 8. checkBranchAccess ---
function checkBranchAccess(branchId) {
  const role = sessionStorage.getItem(SK.ROLE);
  if (role === 'ceo' || role === 'manager') return true;
  const emp = JSON.parse(sessionStorage.getItem(SK.EMPLOYEE) || '{}');
  return emp.branch_id === branchId;
}

// --- 9. applyUIPermissions ---
function applyUIPermissions() {
  if (typeof PermissionUI !== 'undefined') PermissionUI.apply();
  document.querySelectorAll('[data-permission]').forEach(el => {
    el.style.display = hasPermission(el.getAttribute('data-permission')) ? '' : 'none';
  });
  document.querySelectorAll('[data-tab-permission]').forEach(el => {
    el.style.display = hasPermission(el.getAttribute('data-tab-permission')) ? '' : 'none';
  });
}

// --- 10. getCurrentEmployee ---
function getCurrentEmployee() {
  return JSON.parse(sessionStorage.getItem(SK.EMPLOYEE) || 'null');
}

// --- 11. assignRoleToEmployee ---
async function assignRoleToEmployee(employeeId, roleId) {
  requirePermission('employees.assign_role');
  const me = getCurrentEmployee();
  await sb.from(AT.EMP_ROLES)
    .upsert({ employee_id: employeeId, role_id: roleId, granted_by: me?.id, granted_at: new Date().toISOString(), tenant_id: getTenantId() },
      { onConflict: 'employee_id,role_id' });
  writeLog('role_assigned', null, { employeeId, roleId, assignedBy: me?.id });
  toast('תפקיד עודכן', 's');
}

// --- 12. forceLogout ---
async function forceLogout(employeeId) {
  requirePermission('employees.delete');
  await sb.from(AT.SESSIONS)
    .update({ is_active: false })
    .eq('employee_id', employeeId);
  toast('העובד נותק בהצלחה', 's');
}
