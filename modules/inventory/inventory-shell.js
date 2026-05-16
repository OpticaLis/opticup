// inventory-shell.js — sidebar shell state machine for inventory.html.
// Sealed by M1_INVENTORY_REDESIGN SPEC §2.1, 2026-05-16.
//
// Owns: which category is active in the right-side sidebar.
//   - "frames" / "lenses" / placeholders → product categories
//   - "suppliers" / "incoming-invoices" / "unified-log" / "access-sync" → cross-category items
//
// "lenses" performs a full-page navigation to lens-inventory.html (per DG-2
// Branch B in the SPEC). The other cross-category items hide the frames
// tab strip (<nav id="mainNav">) and show only the matching <section> block.
//
// Persists last frames-tab + last category to sessionStorage so a page
// reload returns the user to the same screen.

(function () {
  'use strict';

  // ===== Constants =====
  var SS_CAT_KEY     = 'invShellCategory';
  var SS_FR_TAB_KEY  = 'invShellFramesTab';
  var DEFAULT_CAT    = 'frames';
  var DEFAULT_FR_TAB = 'entry';

  // ===== Helpers =====
  function $(id) { return document.getElementById(id); }
  function $$(sel) { return document.querySelectorAll(sel); }

  // Hash-aware tenant param (matches index.html + lens-nav-strip.js pattern).
  function urlWithTenant(u) {
    var slug = (typeof TENANT_SLUG !== 'undefined') ? TENANT_SLUG : '';
    if (!slug) return u;
    var t = encodeURIComponent(slug);
    var i = u.indexOf('#');
    return i < 0 ? u + '?t=' + t : u.slice(0, i) + '?t=' + t + u.slice(i);
  }

  function showMainNav(show) {
    var nav = $('mainNav');
    if (!nav) return;
    nav.style.display = show ? '' : 'none';
  }

  function showOnlySection(sectionId) {
    $$('.tab').forEach(function (s) { s.classList.remove('active'); });
    var sec = $(sectionId);
    if (sec) sec.classList.add('active');
  }

  // ===== Category handlers =====
  var CATEGORIES = {
    frames: {
      type: 'in-page',
      onSelect: function () {
        showMainNav(true);
        var tab = sessionStorage.getItem(SS_FR_TAB_KEY) || DEFAULT_FR_TAB;
        if (typeof showTab === 'function') showTab(tab);
      }
    },
    lenses: {
      type: 'navigate',
      onSelect: function () {
        window.location.href = urlWithTenant('lens-inventory.html');
      }
    },
    'contact-lenses': {
      type: 'disabled',
      onSelect: function () { /* placeholder, no-op */ }
    },
    accessories: {
      type: 'disabled',
      onSelect: function () { /* placeholder, no-op */ }
    },
    suppliers: {
      type: 'in-page',
      sectionId: 'tab-suppliers',
      onSelect: function () {
        showMainNav(false);
        showOnlySection('tab-suppliers');
        if (typeof loadSuppliersTab === 'function') loadSuppliersTab();
      }
    },
    'incoming-invoices': {
      type: 'in-page',
      sectionId: 'tab-incoming-invoices',
      onSelect: function () {
        showMainNav(false);
        showOnlySection('tab-incoming-invoices');
        if (typeof loadIncomingInvoicesTab === 'function') loadIncomingInvoicesTab();
      }
    },
    'unified-log': {
      type: 'in-page',
      sectionId: 'tab-unified-log',
      onSelect: function () {
        showMainNav(false);
        // tab-unified-log is added by C6 (M1_INVENTORY_REDESIGN). Until then,
        // fall back to the legacy tab-systemlog so this sidebar entry is
        // not dead during the Pipeline's commit-by-commit roll-out.
        var target = $('tab-unified-log') ? 'tab-unified-log' : 'tab-systemlog';
        showOnlySection(target);
        if (target === 'tab-unified-log' && typeof loadUnifiedLog === 'function') {
          loadUnifiedLog();
        } else if (target === 'tab-systemlog' && typeof loadSystemLog === 'function') {
          loadSystemLog();
        }
      }
    },
    'access-sync': {
      type: 'in-page',
      sectionId: 'tab-access-sync',
      onSelect: function () {
        showMainNav(false);
        showOnlySection('tab-access-sync');
        if (typeof renderAccessSyncTab === 'function') renderAccessSyncTab();
      }
    }
  };

  // ===== Public API =====
  function setActiveCategory(cat) {
    var spec = CATEGORIES[cat];
    if (!spec) return;
    if (spec.type === 'disabled') return;
    var sidebar = $('inv-sidebar');
    if (sidebar) {
      sidebar.querySelectorAll('.inv-cat-item').forEach(function (el) {
        el.classList.remove('active');
      });
      var target = sidebar.querySelector('[data-category="' + cat + '"]');
      if (target) target.classList.add('active');
    }
    spec.onSelect();
    // Don't persist a navigate-out category — the next page is a fresh context.
    if (spec.type !== 'navigate') sessionStorage.setItem(SS_CAT_KEY, cat);
  }

  function rememberFramesTab(tabName) {
    if (!tabName) return;
    sessionStorage.setItem(SS_FR_TAB_KEY, tabName);
  }

  // ===== Init =====
  function bindSidebarClicks() {
    var sidebar = $('inv-sidebar');
    if (!sidebar) return;
    sidebar.addEventListener('click', function (e) {
      var item = e.target.closest('.inv-cat-item');
      if (!item || item.classList.contains('disabled')) return;
      var cat = item.dataset.category;
      if (cat) setActiveCategory(cat);
    });
  }

  function wrapShowTabForFramesMemory() {
    // shared-ui.js defines window.showTab. Wrap it so we remember the last
    // frames-category tab the user picked. Idempotent.
    if (typeof window.showTab !== 'function' || window.__invShellShowTabWrapped) return;
    var original = window.showTab;
    window.showTab = function (tab) {
      rememberFramesTab(tab);
      return original.apply(this, arguments);
    };
    window.__invShellShowTabWrapped = true;
  }

  function init() {
    bindSidebarClicks();
    wrapShowTabForFramesMemory();
    var saved = sessionStorage.getItem(SS_CAT_KEY) || DEFAULT_CAT;
    // Defensive: if the saved category isn't valid, fall back to frames.
    if (!CATEGORIES[saved]) saved = DEFAULT_CAT;
    setActiveCategory(saved);
  }

  // Wait for shared-ui (showTab) + shared.js (TENANT_SLUG) to be ready.
  function deferredInit() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var ready = (typeof window.showTab === 'function') && (typeof TENANT_SLUG !== 'undefined');
      if (ready || tries > 50) {
        clearInterval(t);
        init();
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', deferredInit);
  } else {
    deferredInit();
  }

  // Expose tiny public API for debug + future feature wiring.
  window.InvShell = {
    setActiveCategory: setActiveCategory,
    getCategory: function () { return sessionStorage.getItem(SS_CAT_KEY) || DEFAULT_CAT; },
    categories: Object.keys(CATEGORIES)
  };
})();
