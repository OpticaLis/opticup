// === admin-app.js ===
// Admin panel initialization — login/logout flow, event wiring
// Depends on: admin-auth.js, admin-db.js, admin-audit.js, Toast

let _loginListenersBound = false;
let _logoutListenerBound = false;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await getAdminSession();
  if (admin) {
    showAdminPanel(admin);
  } else {
    showLoginScreen();
  }
});

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-error').textContent = '';
  document.getElementById('admin-email').value = '';
  document.getElementById('admin-password').value = '';

  if (!_loginListenersBound) {
    document.getElementById('admin-login-btn').addEventListener('click', handleLogin);
    document.getElementById('admin-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    _loginListenersBound = true;
  }
}

async function handleLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('admin-login-btn');

  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'יש למלא אימייל וסיסמה';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'מתחבר...';

  try {
    const admin = await adminLogin(email, password);
    await logAdminAction('admin.login', null, { email: admin.email });
    showAdminPanel(admin);
    Toast.success('שלום ' + admin.display_name);
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'כניסה';
  }
}

function showAdminPanel(admin) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';

  document.getElementById('admin-name').textContent = admin.display_name;
  document.getElementById('admin-role').textContent = getRoleDisplayName(admin.role);
  document.getElementById('welcome-name').textContent = admin.display_name;

  if (!_logoutListenerBound) {
    document.getElementById('admin-logout-btn').addEventListener('click', handleLogout);
    _logoutListenerBound = true;
  }
}

async function handleLogout() {
  try {
    await logAdminAction('admin.logout');
    await adminLogout();
  } catch (_) { /* swallow */ }
  showLoginScreen();
  Toast.info('התנתקת בהצלחה');
}

function getRoleDisplayName(role) {
  const map = { super_admin: 'מנהל ראשי', support: 'תמיכה', viewer: 'צופה' };
  return map[role] || role;
}
