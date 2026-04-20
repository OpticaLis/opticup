/* =============================================================================
   crm-init.js — CRM page bootstrap + tab orchestration
   Depends on: shared.js, shared-ui.js, auth-service.js, crm-helpers.js
   ============================================================================= */
(function () {
  'use strict';

  // --- Local tab switcher (mirrors showTab() behavior from js/shared-ui.js
  // but routes to CRM-specific loaders instead of modifying shared-ui.js). ---
  function showCrmTab(name) {
    document.querySelectorAll('#crm-main .tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('#crmNav button[data-tab]').forEach(function (b) { b.classList.remove('active'); });
    var panel = document.getElementById('tab-' + name);
    if (panel) panel.classList.add('active');
    var btn = document.querySelector('#crmNav button[data-tab="' + name + '"]');
    if (btn) btn.classList.add('active');

    if (name === 'dashboard' && typeof loadCrmDashboard === 'function') loadCrmDashboard();
    if (name === 'leads' && typeof loadCrmLeadsTab === 'function') loadCrmLeadsTab();
    if (name === 'events' && typeof loadCrmEventsTab === 'function') loadCrmEventsTab();
    if (name === 'event-day' && typeof loadCrmEventDay === 'function') loadCrmEventDay();
  }
  window.showCrmTab = showCrmTab;

  // --- Status-cache loader gate (shared across all tabs) ---
  var _statusPromise = null;
  function ensureStatusCache() {
    if (!_statusPromise) _statusPromise = CrmHelpers.loadStatusCache().catch(function (e) {
      console.error('CRM status cache load failed:', e);
      _statusPromise = null;
      throw e;
    });
    return _statusPromise;
  }
  window.ensureCrmStatusCache = ensureStatusCache;

  // --- Error banner helper (user-visible on load failures) ---
  function showCrmError(panelId, msg) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var box = document.createElement('div');
    box.className = 'card';
    box.style.borderInlineStart = '4px solid #ef4444';
    box.textContent = msg;
    panel.prepend(box);
  }
  window.showCrmError = showCrmError;

  // --- Page init: resolve tenant + session, load status cache, open default tab ---
  async function initCrmPage() {
    try {
      var tenant = await resolveTenant();
      if (!tenant) return;
      var session = await loadSession();
      if (!session || !session.employee) {
        window.location.href = 'index.html' + (TENANT_SLUG ? '?t=' + encodeURIComponent(TENANT_SLUG) : '');
        return;
      }
      if (typeof applyUIPermissions === 'function') applyUIPermissions();
      await ensureStatusCache();
      showCrmTab('dashboard');

      // Audit trail — page open (fire-and-forget; schema expects action+entity_type)
      if (window.ActivityLog && typeof ActivityLog.write === 'function') {
        try { ActivityLog.write({ action: 'crm.page.open', entity_type: 'crm', severity: 'info' }); } catch (_) {}
      }
    } catch (e) {
      console.error('CRM init failed:', e);
      showCrmError('tab-dashboard', 'טעינת המסך נכשלה: ' + (e.message || e));
    }
  }

  document.addEventListener('DOMContentLoaded', initCrmPage);
})();
