// =========================================================
// ADMIN MODE (permission-based — replaces legacy password flow)
// =========================================================
function activateAdmin() {
  isAdmin = hasPermission('settings.edit');
  if (!isAdmin) return;
  document.body.classList.add('admin-mode');
  toast('מצב מנהל הופעל — שדות עלות גלויים', 's');
}

// =========================================================
// HELP MODAL
// =========================================================
function openHelpModal() {
  $('help-modal').style.display = 'flex';
}
function closeHelpModal() {
  $('help-modal').style.display = 'none';
}

// =========================================================
// APP INIT (called after auth or after successful login)
// =========================================================
function showUserButton() {
  // Header is now built dynamically by header.js — no manual show needed
}

function resumeAppInit() {
  // Inject tenant name into UI (no hardcoded business names)
  var tName = getTenantConfig('name') || '';
  var loginEl = document.getElementById('login-tenant-name');
  if (loginEl) loginEl.textContent = tName;
  if (tName) document.title = tName + ' — מערכת מלאי';

  if (hasPermission('settings.edit')) activateAdmin();
  showUserButton();
  const dateEl = $('po-date');
  if (dateEl) dateEl.valueAsDate = new Date();
  const rcptDateEl = $('rcpt-date');
  if (rcptDateEl) rcptDateEl.valueAsDate = new Date();
  loadData().then(() => { addEntryRow(); refreshLowStockBanner(); });
}

// =========================================================
// INIT
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
  $('help-modal')?.addEventListener('click', function(e) { if (e.target === this) closeHelpModal(); });

  // Auth: check for existing session — redirect to home if not logged in
  const session = await loadSession();
  if (!session) {
    window.location.href = '/';
    return;
  }
  applyUIPermissions();
  applyFeatureFlags();
  resumeAppInit();
});

async function applyFeatureFlags() {
  try {
    const features = await getPlanFeatures();
    document.querySelectorAll('[data-feature]').forEach(el => {
      const feature = el.dataset.feature;
      if (features[feature] === false) {
        el.style.display = 'none';
      }
    });
  } catch (e) {
    console.warn('applyFeatureFlags: failed, showing all features (fail-safe):', e);
  }
}
