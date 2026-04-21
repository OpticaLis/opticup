/* =============================================================================
   crm-messaging-tab.js — Messaging Hub orchestrator (B8 Tailwind — FINAL-04)
   Sub-tab nav: templates / rules / broadcast / log
   ============================================================================= */
(function () {
  'use strict';

  var SUB_TABS = [
    { key: 'templates', label: '📝 תבניות' },
    { key: 'rules',     label: '⚡ כללי אוטומטיה' },
    { key: 'broadcast', label: '📢 שליחה ידנית' },
    { key: 'log',       label: '📜 היסטוריה' }
  ];

  var CLS_SUBTAB_BAR = 'flex gap-1 border-b border-slate-200 bg-white rounded-t-xl px-3 pt-3 overflow-x-auto';
  var CLS_SUBTAB     = 'px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 border-b-2 border-transparent transition whitespace-nowrap';
  var CLS_SUBTAB_ACT = 'px-4 py-2.5 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition whitespace-nowrap';
  var CLS_BODY       = 'bg-white rounded-b-xl shadow-sm border border-t-0 border-slate-200 p-5';

  var _state = { subTab: 'templates', layoutReady: false };
  window.getMessagingSubTab = function () { return _state.subTab; };

  async function loadCrmMessagingTab() {
    var panel = document.getElementById('tab-messaging');
    if (!panel) return;

    if (_state.layoutReady) {
      renderActiveSubTab();
      return;
    }

    panel.innerHTML = '<div class="' + CLS_BODY + '"><div class="text-center text-slate-400 py-8">טוען מרכז הודעות...</div></div>';

    try {
      await ensureCrmStatusCache();
      renderLayout(panel);
      _state.layoutReady = true;
      renderActiveSubTab();
    } catch (e) {
      console.error('messaging hub load failed:', e);
      panel.innerHTML = '<div class="' + CLS_BODY + '"><div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינה: ' +
        escapeHtml(e.message || String(e)) + '</div></div>';
    }
  }
  window.loadCrmMessagingTab = loadCrmMessagingTab;

  function renderLayout(panel) {
    var subTabHtml = SUB_TABS.map(function (t) {
      var cls = (_state.subTab === t.key) ? CLS_SUBTAB_ACT : CLS_SUBTAB;
      return '<button type="button" class="' + cls + '" data-subtab="' + t.key + '">' + t.label + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="' + CLS_SUBTAB_BAR + '">' + subTabHtml + '</div>' +
      '<div class="' + CLS_BODY + '" id="crm-messaging-body"></div>';

    panel.querySelectorAll('[data-subtab]').forEach(function (btn) {
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
    panel.querySelectorAll('[data-subtab]').forEach(function (b) {
      var isActive = b.getAttribute('data-subtab') === key;
      b.className = isActive ? CLS_SUBTAB_ACT : CLS_SUBTAB;
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
        host.innerHTML = '<div class="text-center text-rose-500 py-6 font-semibold">שגיאה בטעינת התת-לשונית: ' +
          escapeHtml(e.message || String(e)) + '</div>';
      }
    } else {
      host.innerHTML = '<div class="text-center text-slate-400 py-6">רכיב התת-לשונית לא נטען.</div>';
    }
  }
  window.renderMessagingActiveSub = renderActiveSubTab;
})();
