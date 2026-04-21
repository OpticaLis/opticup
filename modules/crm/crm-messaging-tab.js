/* =============================================================================
   crm-messaging-tab.js — Messaging Hub tab (orchestrator + sub-tab nav)
   Depends on: shared.js, CrmHelpers, crm-init.js
   Sub-tab renderers (registered by sibling files):
     window.renderMessagingTemplates(host)
     window.renderMessagingRules(host)
     window.renderMessagingBroadcast(host)
     window.renderMessagingLog(host)
   Exports:
     window.loadCrmMessagingTab() — entry point called by showCrmTab('messaging')
     window.showMessagingSub(key) — switch active sub-tab
     window.getMessagingSubTab() — current sub-tab key
   ============================================================================= */
(function () {
  'use strict';

  var SUB_TABS = [
    { key: 'templates',  label: '\uD83D\uDCDD \u05EA\u05D1\u05E0\u05D9\u05D5\u05EA' },          // תבניות
    { key: 'rules',      label: '\u26A1 \u05DB\u05DC\u05DC\u05D9 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05D4' }, // כללי אוטומטיה
    { key: 'broadcast',  label: '\uD83D\uDCE2 \u05E9\u05DC\u05D9\u05D7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA' }, // שליחה ידנית
    { key: 'log',        label: '\uD83D\uDCDC \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4' }  // היסטוריה
  ];

  var _state = { subTab: 'templates', layoutReady: false };
  window.getMessagingSubTab = function () { return _state.subTab; };

  async function loadCrmMessagingTab() {
    var panel = document.getElementById('tab-messaging');
    if (!panel) return;

    if (_state.layoutReady) {
      renderActiveSubTab();
      return;
    }

    panel.innerHTML = '<div class="crm-card"><div class="crm-detail-empty" style="padding:20px">\u05D8\u05D5\u05E2\u05DF \u05DE\u05E8\u05DB\u05D6 \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA...</div></div>';

    try {
      await ensureCrmStatusCache();
      renderLayout(panel);
      _state.layoutReady = true;
      renderActiveSubTab();
    } catch (e) {
      console.error('messaging hub load failed:', e);
      panel.innerHTML = '<div class="crm-card"><div class="crm-detail-empty" style="padding:20px;color:#ef4444">\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05D4: ' +
        escapeHtml(e.message || String(e)) + '</div></div>';
    }
  }
  window.loadCrmMessagingTab = loadCrmMessagingTab;

  function renderLayout(panel) {
    var subTabHtml = SUB_TABS.map(function (t) {
      var cls = 'crm-messaging-subtab' + (_state.subTab === t.key ? ' active' : '');
      return '<button type="button" class="' + cls + '" data-subtab="' + t.key + '">' + t.label + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="crm-messaging-subtabs">' + subTabHtml + '</div>' +
      '<div class="card crm-messaging-body" id="crm-messaging-body"></div>';

    panel.querySelectorAll('.crm-messaging-subtab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-subtab');
        if (!key || key === _state.subTab) return;
        showMessagingSub(key);
      });
    });
  }

  function showMessagingSub(key) {
    if (!key) return;
    _state.subTab = key;
    var panel = document.getElementById('tab-messaging');
    if (!panel) return;
    panel.querySelectorAll('.crm-messaging-subtab').forEach(function (b) {
      var k = b.getAttribute('data-subtab');
      b.classList.toggle('active', k === key);
    });
    renderActiveSubTab();
  }
  window.showMessagingSub = showMessagingSub;

  function renderActiveSubTab() {
    var host = document.getElementById('crm-messaging-body');
    if (!host) return;
    var renderer = null;
    if (_state.subTab === 'templates') renderer = window.renderMessagingTemplates;
    else if (_state.subTab === 'rules') renderer = window.renderMessagingRules;
    else if (_state.subTab === 'broadcast') renderer = window.renderMessagingBroadcast;
    else if (_state.subTab === 'log') renderer = window.renderMessagingLog;

    if (typeof renderer === 'function') {
      try {
        renderer(host);
      } catch (e) {
        console.error('sub-tab render failed:', e);
        host.innerHTML = '<div class="crm-detail-empty" style="padding:20px;color:#ef4444">' +
          '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05EA\u05EA-\u05DC\u05E9\u05D5\u05E0\u05D9\u05EA: ' +
          escapeHtml(e.message || String(e)) + '</div>';
      }
    } else {
      host.innerHTML = '<div class="crm-detail-empty" style="padding:20px">' +
        '\u05E8\u05DB\u05D9\u05D1 \u05D4\u05EA\u05EA-\u05DC\u05E9\u05D5\u05E0\u05D9\u05EA \u05DC\u05D0 \u05E0\u05D8\u05E2\u05DF.</div>';
    }
  }
  window.renderMessagingActiveSub = renderActiveSubTab;
})();
