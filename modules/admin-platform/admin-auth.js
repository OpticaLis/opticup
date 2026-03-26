// === admin-auth.js ===
// Supabase client + auth for Platform Admin (no tenant context)

const ADMIN_SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const ADMIN_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';

const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON);

let _currentAdmin = null;

// --- Role Hierarchy ---

const ROLE_LEVELS = { viewer: 1, support: 2, super_admin: 3 };

// --- Auth Functions ---

async function adminLogin(email, password) {
  const { data, error } = await adminSb.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error('אימייל או סיסמה שגויים');
  }

  const admin = await _fetchAdmin(data.session.user.id);
  if (!admin) {
    await adminSb.auth.signOut();
    throw new Error('אין הרשאה — המשתמש אינו מנהל פלטפורמה');
  }

  // Update last_login
  await adminSb
    .from('platform_admins')
    .update({ last_login: new Date().toISOString() })
    .eq('id', admin.id);

  _currentAdmin = admin;
  return admin;
}

async function adminLogout() {
  _currentAdmin = null;
  await adminSb.auth.signOut();

  const loginScreen = document.getElementById('login-screen');
  const adminPanel = document.getElementById('admin-panel');
  if (loginScreen) loginScreen.style.display = 'flex';
  if (adminPanel) adminPanel.style.display = 'none';
}

async function getAdminSession() {
  const { data: { session } } = await adminSb.auth.getSession();
  if (!session) return null;

  const admin = await _fetchAdmin(session.user.id);
  if (!admin) {
    await adminSb.auth.signOut();
    return null;
  }

  _currentAdmin = admin;
  return admin;
}

function getCurrentAdmin() {
  return _currentAdmin;
}

function requireAdmin(minRole = 'viewer') {
  if (!_currentAdmin) {
    throw new Error('אין הרשאה — לא מחובר');
  }
  const currentLevel = ROLE_LEVELS[_currentAdmin.role] || 0;
  const requiredLevel = ROLE_LEVELS[minRole] || 0;
  if (currentLevel < requiredLevel) {
    throw new Error('אין הרשאה — דרושה רמת גישה גבוהה יותר');
  }
  return _currentAdmin;
}

// --- Role Check ---

function hasAdminPermission(requiredRole) {
  if (!_currentAdmin) return false;
  return (ROLE_LEVELS[_currentAdmin.role] || 0) >= (ROLE_LEVELS[requiredRole] || 0);
}

// --- Internal Helpers ---

async function _fetchAdmin(authUserId) {
  const { data, error } = await adminSb
    .from('platform_admins')
    .select('id, email, display_name, role')
    .eq('auth_user_id', authUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch platform admin:', error.message);
    return null;
  }
  return data;
}

// --- Expose globals ---
window.getCurrentAdmin = getCurrentAdmin;
window.hasAdminPermission = hasAdminPermission;
