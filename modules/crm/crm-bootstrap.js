/* =============================================================================
   crm-bootstrap.js — page header updater, theme switcher, role toggle, view toggle
   Extracted from crm.html inline script to satisfy Iron Rule 12 (≤350 lines).
   Load LAST — depends on crm-init.js (window.showCrmTab) and all tab loaders.
   ============================================================================= */
(function () {
  'use strict';

  // --- Header titles per tab ---
  var TAB_META = {
    'dashboard': { title: 'דשבורד', subtitle: 'סקירה כללית של ביצועי הקמפיינים' },
    'leads':     { title: 'לידים', subtitle: 'ניהול לידים וסגמנטים' },
    'events':    { title: 'אירועים', subtitle: 'ניהול אירועים ומשתתפים' },
    'messaging': { title: 'מרכז הודעות', subtitle: 'תבניות, אוטומציה ושליחה ידנית' },
    'event-day': { title: 'יום אירוע', subtitle: 'צ׳ק-אין, נוכחות וניהול' }
  };

  // --- Wrap original showCrmTab to also update header + sidebar ---
  window.showCrmTab = function (name) {
    document.querySelectorAll('#crmNav .crm-nav-item').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });
    document.querySelectorAll('#crm-main .crm-tab').forEach(function (t) {
      t.classList.toggle('active', t.id === 'tab-' + name);
    });

    var meta = TAB_META[name] || {};
    var titleEl = document.getElementById('crm-page-title');
    var subEl = document.getElementById('crm-page-subtitle');
    if (titleEl) titleEl.textContent = meta.title || name;
    if (subEl) subEl.textContent = meta.subtitle || '';

    var actionsEl = document.getElementById('crm-header-actions');
    if (actionsEl) actionsEl.innerHTML = '';

    if (name === 'dashboard' && typeof loadCrmDashboard === 'function') loadCrmDashboard();
    if (name === 'incoming' && typeof loadCrmIncomingTab === 'function') loadCrmIncomingTab();
    if (name === 'leads' && typeof loadCrmLeadsTab === 'function') loadCrmLeadsTab();
    if (name === 'events' && typeof loadCrmEventsTab === 'function') loadCrmEventsTab();
    if (name === 'event-day' && typeof loadCrmEventDay === 'function') loadCrmEventDay();
    if (name === 'messaging' && typeof loadCrmMessagingTab === 'function') loadCrmMessagingTab();
  };

  // --- Theme switcher ---
  document.querySelectorAll('.crm-theme-dot').forEach(function (dot) {
    dot.addEventListener('click', function () {
      var theme = this.getAttribute('data-theme');
      document.documentElement.setAttribute('data-crm-theme', theme);
      document.querySelectorAll('.crm-theme-dot').forEach(function (d) {
        d.classList.toggle('active', d.getAttribute('data-theme') === theme);
      });
      try { sessionStorage.setItem('crm-theme', theme); } catch (_) {}
    });
  });

  try {
    var saved = sessionStorage.getItem('crm-theme');
    if (saved) {
      document.documentElement.setAttribute('data-crm-theme', saved);
      document.querySelectorAll('.crm-theme-dot').forEach(function (d) {
        d.classList.toggle('active', d.getAttribute('data-theme') === saved);
      });
    }
  } catch (_) {}

  // --- Role toggle (admin vs team) ---
  var _isAdmin = true;
  window.toggleCrmRole = function () {
    _isAdmin = !_isAdmin;
    var app = document.getElementById('crm-app');
    var roleText = document.getElementById('crm-role-text');
    if (_isAdmin) {
      app.classList.remove('crm-role-team');
      if (roleText) roleText.textContent = 'מנהל ראשי';
    } else {
      app.classList.add('crm-role-team');
      if (roleText) roleText.textContent = 'צוות';
    }
  };

  // --- Leads view toggle (table / kanban / cards) ---
  window.switchCrmLeadsView = function (view) {
    document.querySelectorAll('#crm-leads-view-toggle .crm-view-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });
    document.querySelectorAll('#tab-leads .crm-leads-view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'leads-view-' + view);
    });
  };

  // --- Auto-focus barcode scanner when entering event-day tab ---
  document.addEventListener('click', function (e) {
    var navBtn = e.target.closest('.crm-nav-item[data-tab="event-day"]');
    if (navBtn) {
      setTimeout(function () {
        var barcodeInput = document.getElementById('crm-eventday-barcode-input');
        if (barcodeInput) barcodeInput.focus();
      }, 100);
    }
  });

  // --- Initialize Lucide icons ---
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
})();
