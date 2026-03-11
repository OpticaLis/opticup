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
  const emp = getCurrentEmployee();
  const btn = $('adminBtn');
  if (emp && btn) {
    btn.textContent = emp.name + ' \u{1F464}';
    btn.style.display = '';
  }
}

function resumeAppInit() {
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

  // Auth: check for existing session
  const session = await loadSession();
  if (!session) {
    $('adminBtn').style.display = 'none';
    showLoginModal();
    return;
  }
  applyUIPermissions();
  resumeAppInit();
});
