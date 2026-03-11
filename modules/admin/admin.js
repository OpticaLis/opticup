// =========================================================
// ADMIN MODE (permission-based — replaces legacy password flow)
// =========================================================
function activateAdmin() {
  isAdmin = hasPermission('settings.edit');
  if (!isAdmin) return;
  document.body.classList.add('admin-mode');
  $('adminBtn').classList.add('unlocked');
  $('adminBtn').innerHTML = '&#128275; מנהל (פעיל)';
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
function resumeAppInit() {
  if (hasPermission('settings.edit')) activateAdmin();
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
    showLoginModal();
    return;
  }
  applyUIPermissions();
  resumeAppInit();
});
