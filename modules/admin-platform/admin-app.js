// === admin-app.js ===
// Admin panel initialization — login/logout flow, tab routing, panel open/close
// Depends on: admin-auth.js, admin-db.js, admin-audit.js, Toast

let _loginListenersBound = false;
let _panelListenersBound = false;
let currentTab = 'tenants';
let selectedTenantId = null;
let _searchDebounceTimer = null;

// ─── Bootstrap ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await getAdminSession();
  if (admin) {
    showAdminPanel(admin);
  } else {
    showLoginScreen();
  }
});

// ─── Login / Logout ────────────────────────────────────────

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

async function handleLogout() {
  closeTenantPanel();
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

// ─── Admin Panel Init ──────────────────────────────────────

function showAdminPanel(admin) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';

  document.getElementById('admin-name').textContent = admin.display_name;
  document.getElementById('admin-role').textContent = getRoleDisplayName(admin.role);
  const welcomeEl = document.getElementById('welcome-name');
  if (welcomeEl) welcomeEl.textContent = admin.display_name;

  if (!_panelListenersBound) {
    // Logout + provisioning
    document.getElementById('admin-logout-btn').addEventListener('click', handleLogout);
    document.getElementById('btn-new-tenant').addEventListener('click', initProvisioningWizard);

    // Nav tabs
    document.querySelectorAll('.admin-tab:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Panel close
    const overlay = document.getElementById('tenant-detail-overlay');
    if (overlay) overlay.addEventListener('click', closeTenantPanel);
    const closeBtn = document.getElementById('panel-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeTenantPanel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && selectedTenantId != null) closeTenantPanel();
    });

    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(btn => {
      btn.addEventListener('click', () => switchPanelTab(btn.dataset.panelTab));
    });

    // Search + filter listeners (actual filtering in admin-dashboard.js)
    const searchInput = document.getElementById('search-tenants');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(_searchDebounceTimer);
        _searchDebounceTimer = setTimeout(() => {
          if (typeof window.filterTenants === 'function') window.filterTenants();
        }, 300);
      });
    }
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) filterStatus.addEventListener('change', () => {
      if (typeof window.filterTenants === 'function') window.filterTenants();
    });
    const filterPlan = document.getElementById('filter-plan');
    if (filterPlan) filterPlan.addEventListener('change', () => {
      if (typeof window.filterTenants === 'function') window.filterTenants();
    });

    _panelListenersBound = true;
  }

  // Default tab
  switchTab('tenants');
}

// ─── Tab Routing ───────────────────────────────────────────

function switchTab(tabName) {
  const tabs = ['tenants', 'audit', 'settings'];
  if (!tabs.includes(tabName)) return;

  // Hide all content areas, show selected
  tabs.forEach(t => {
    const el = document.getElementById('content-' + t);
    if (el) el.style.display = (t === tabName) ? '' : 'none';
  });

  // Update active class on nav buttons
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  currentTab = tabName;

  // Trigger data load for the switched-to tab
  if (tabName === 'tenants' && typeof window.loadTenants === 'function') {
    window.loadTenants();
  } else if (tabName === 'audit' && typeof window.loadPlatformAuditLog === 'function') {
    window.loadPlatformAuditLog();
  }
}

// ─── Slide-in Panel ────────────────────────────────────────

function openTenantPanel(tenantId) {
  selectedTenantId = tenantId;
  const overlay = document.getElementById('tenant-detail-overlay');
  const panel = document.getElementById('tenant-detail-panel');
  if (overlay) overlay.style.display = 'block';
  if (panel) {
    panel.style.display = 'block';
    // Force reflow before adding .open so CSS transition triggers
    panel.offsetHeight;
    panel.classList.add('open');
  }
  // Load tenant detail if handler exists (admin-tenant-detail.js Phase 3g)
  if (typeof window.loadTenantDetail === 'function') {
    window.loadTenantDetail(tenantId);
  }
}

function closeTenantPanel() {
  const overlay = document.getElementById('tenant-detail-overlay');
  const panel = document.getElementById('tenant-detail-panel');
  if (panel) {
    panel.classList.remove('open');
    // Hide after transition
    setTimeout(() => {
      if (!panel.classList.contains('open')) {
        panel.style.display = 'none';
      }
    }, 300);
  }
  if (overlay) overlay.style.display = 'none';
  selectedTenantId = null;
}

// ─── Panel Tabs ────────────────────────────────────────────

function switchPanelTab(tabName) {
  // Update active class on panel tab buttons
  document.querySelectorAll('.panel-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.panelTab === tabName);
  });
  // Delegate content rendering to admin-tenant-detail.js
  if (typeof window.renderPanelTab === 'function') {
    window.renderPanelTab(tabName);
  }
}

// ─── Expose globals ────────────────────────────────────────

window.switchTab = switchTab;
window.openTenantPanel = openTenantPanel;
window.closeTenantPanel = closeTenantPanel;
window.switchPanelTab = switchPanelTab;
Object.defineProperty(window, 'selectedTenantId', {
  get: () => selectedTenantId,
  enumerable: true
});
