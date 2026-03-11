// =========================================================
// ADMIN MODE
// =========================================================
function toggleAdmin() {
  if (isAdmin) {
    isAdmin = false;
    sessionStorage.removeItem('prizma_admin');
    document.body.classList.remove('admin-mode');
    $('adminBtn').classList.remove('unlocked');
    $('adminBtn').innerHTML = '&#128274; מנהל';
    toast('יצאת ממצב מנהל', 'i');
  } else {
    if (sessionStorage.getItem('prizma_admin') === '1') {
      activateAdmin();
    } else {
      $('admin-modal').style.display = 'flex';
      $('admin-pass').value = '';
      setTimeout(() => $('admin-pass').focus(), 100);
    }
  }
}
function checkAdmin() {
  if ($('admin-pass').value === '1234') {
    closeModal('admin-modal');
    sessionStorage.setItem('prizma_admin', '1');
    activateAdmin();
  } else {
    toast('סיסמה שגויה', 'e');
    $('admin-pass').value = '';
    $('admin-pass').focus();
  }
}
function activateAdmin() {
  isAdmin = true;
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
  if (sessionStorage.getItem('prizma_admin') === '1') activateAdmin();
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
