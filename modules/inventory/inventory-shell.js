// inventory-shell.js — sidebar shell state machine for inventory.html.
// Sealed by M1_INVENTORY_REDESIGN SPEC §2.1 (2026-05-16).
// Extended by M1_INVENTORY_UNIFIED_SCREEN SPEC §0.B (2026-05-16) for in-page
// lens-tab handling. Lens loader lives in inventory-shell-lens.js.
// Extended by M1_CONTACT_LENSES_ACCESSORIES SPEC §2 Part C (2026-05-16) for
// contact-lens + accessory categories. Each has its own loader (contact /
// accessory) mirroring the lens pattern (DG-5.A parallel-prefix isolation).
//
// Owns: category state (sidebar item active), which top nav strip is visible
// (frames vs lens vs contact vs accessory), URL ?cat=&tab= param routing on
// init, sessionStorage persistence of last category + last frames tab.
// Lens-tab activation is delegated to window.InvShellLens.setActive().
// Contact-tab activation is delegated to window.InvShellContact.setActive().
// Accessory-tab activation is delegated to window.InvShellAccessory.setActive().

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

  function urlWithTenant(u) {
    var slug = (typeof TENANT_SLUG !== 'undefined') ? TENANT_SLUG : '';
    if (!slug) return u;
    var t = encodeURIComponent(slug);
    var i = u.indexOf('#');
    return i < 0 ? u + '?t=' + t : u.slice(0, i) + '?t=' + t + u.slice(i);
  }

  function showMainNav(show) {
    var nav = $('mainNav');
    if (nav) nav.style.display = show ? '' : 'none';
  }

  function showLensNav(show) {
    var nav = $('lensNav');
    if (nav) nav.style.display = show ? '' : 'none';
  }

  function showContactNav(show) {
    var nav = $('contactNav');
    if (nav) nav.style.display = show ? '' : 'none';
  }

  function showAccessoryNav(show) {
    var nav = $('accessoryNav');
    if (nav) nav.style.display = show ? '' : 'none';
  }

  function hideAllCategoryNavs() {
    showLensNav(false);
    showContactNav(false);
    showAccessoryNav(false);
  }

  function showOnlySection(sectionId) {
    $$('.tab').forEach(function (s) { s.classList.remove('active'); });
    var sec = $(sectionId);
    if (sec) sec.classList.add('active');
  }

  function hideAllLensSections() {
    $$('section.lens-tab-section').forEach(function (s) { s.classList.remove('active'); });
  }

  function hideAllContactSections() {
    $$('section.contact-tab-section').forEach(function (s) { s.classList.remove('active'); });
  }

  function hideAllAccessorySections() {
    $$('section.accessory-tab-section').forEach(function (s) { s.classList.remove('active'); });
  }

  // ===== Category handlers =====
  var CATEGORIES = {
    frames: {
      type: 'in-page',
      onSelect: function () {
        hideAllCategoryNavs();
        showMainNav(true);
        hideAllLensSections();
        hideAllContactSections();
        hideAllAccessorySections();
        var tab = sessionStorage.getItem(SS_FR_TAB_KEY) || DEFAULT_FR_TAB;
        if (typeof showTab === 'function') showTab(tab);
      }
    },
    lenses: {
      type: 'in-page',
      onSelect: function () {
        showMainNav(false);
        hideAllCategoryNavs();
        showLensNav(true);
        hideAllContactSections();
        hideAllAccessorySections();
        // Clear non-lens active sections so only the lens-tab-section shows.
        $$('.tab').forEach(function (s) {
          if (!s.classList.contains('lens-tab-section')) s.classList.remove('active');
        });
        if (window.InvShellLens && typeof window.InvShellLens.setActive === 'function') {
          window.InvShellLens.setActive(window.InvShellLens.getActive());
        }
      }
    },
    'contact-lenses': {
      type: 'in-page',
      onSelect: function () {
        showMainNav(false);
        hideAllCategoryNavs();
        showContactNav(true);
        hideAllLensSections();
        hideAllAccessorySections();
        // Clear non-contact active sections so only the contact-tab-section shows.
        $$('.tab').forEach(function (s) {
          if (!s.classList.contains('contact-tab-section')) s.classList.remove('active');
        });
        if (window.InvShellContact && typeof window.InvShellContact.setActive === 'function') {
          window.InvShellContact.setActive(window.InvShellContact.getActive());
        }
      }
    },
    accessories: {
      type: 'in-page',
      onSelect: function () {
        showMainNav(false);
        hideAllCategoryNavs();
        showAccessoryNav(true);
        hideAllLensSections();
        hideAllContactSections();
        $$('.tab').forEach(function (s) {
          if (!s.classList.contains('accessory-tab-section')) s.classList.remove('active');
        });
        if (window.InvShellAccessory && typeof window.InvShellAccessory.setActive === 'function') {
          window.InvShellAccessory.setActive(window.InvShellAccessory.getActive());
        }
      }
    },
    suppliers: {
      type: 'in-page', sectionId: 'tab-suppliers',
      onSelect: function () {
        showLensNav(false);
        showMainNav(false);
        showOnlySection('tab-suppliers');
        if (typeof loadSuppliersTab === 'function') loadSuppliersTab();
      }
    },
    'incoming-invoices': {
      type: 'in-page', sectionId: 'tab-incoming-invoices',
      onSelect: function () {
        showLensNav(false);
        showMainNav(false);
        showOnlySection('tab-incoming-invoices');
        if (typeof loadIncomingInvoicesTab === 'function') loadIncomingInvoicesTab();
      }
    },
    'unified-log': {
      type: 'in-page', sectionId: 'tab-unified-log',
      onSelect: function () {
        showLensNav(false);
        showMainNav(false);
        var target = $('tab-unified-log') ? 'tab-unified-log' : 'tab-systemlog';
        showOnlySection(target);
        if (target === 'tab-unified-log' && typeof loadUnifiedLog === 'function') loadUnifiedLog();
        else if (target === 'tab-systemlog' && typeof loadSystemLog === 'function') loadSystemLog();
      }
    },
    'access-sync': {
      type: 'in-page', sectionId: 'tab-access-sync',
      onSelect: function () {
        showLensNav(false);
        showMainNav(false);
        showOnlySection('tab-access-sync');
        if (typeof renderAccessSyncTab === 'function') renderAccessSyncTab();
      }
    }
  };

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
    sessionStorage.setItem(SS_CAT_KEY, cat);
  }

  function rememberFramesTab(tabName) {
    if (!tabName) return;
    sessionStorage.setItem(SS_FR_TAB_KEY, tabName);
  }

  // ===== URL param parsing =====
  function parseUrlState() {
    var params;
    try { params = new URLSearchParams(window.location.search); }
    catch (e) { return null; }
    var cat = params.get('cat');
    var tab = params.get('tab');
    if (!cat && !tab) return null;
    return { cat: cat, tab: tab };
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

  function bindLensNavClicks() {
    var nav = $('lensNav');
    if (!nav) return;
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-lens-tab]');
      if (!btn) return;
      if (window.InvShellLens && typeof window.InvShellLens.setActive === 'function') {
        window.InvShellLens.setActive(btn.dataset.lensTab);
      }
    });
  }

  function bindContactNavClicks() {
    var nav = $('contactNav');
    if (!nav) return;
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-contact-tab]');
      if (!btn) return;
      if (window.InvShellContact && typeof window.InvShellContact.setActive === 'function') {
        window.InvShellContact.setActive(btn.dataset.contactTab);
      }
    });
  }

  function bindAccessoryNavClicks() {
    var nav = $('accessoryNav');
    if (!nav) return;
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-accessory-tab]');
      if (!btn) return;
      if (window.InvShellAccessory && typeof window.InvShellAccessory.setActive === 'function') {
        window.InvShellAccessory.setActive(btn.dataset.accessoryTab);
      }
    });
  }

  function wrapShowTabForFramesMemory() {
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
    bindLensNavClicks();
    bindContactNavClicks();
    bindAccessoryNavClicks();
    wrapShowTabForFramesMemory();
    // URL params override sessionStorage on first paint of the page.
    var urlState = parseUrlState();
    var cat = (urlState && urlState.cat) ||
              sessionStorage.getItem(SS_CAT_KEY) || DEFAULT_CAT;
    if (cat === 'contact_lenses') cat = 'contact-lenses'; // accept both URL forms
    if (!CATEGORIES[cat]) cat = DEFAULT_CAT;
    if (urlState && urlState.tab) {
      if (cat === 'lenses' && window.InvShellLens && window.InvShellLens.meta[urlState.tab]) {
        sessionStorage.setItem('invShellLensTab', urlState.tab);
      } else if (cat === 'contact-lenses' && window.InvShellContact && window.InvShellContact.meta && window.InvShellContact.meta[urlState.tab]) {
        sessionStorage.setItem('invShellContactTab', urlState.tab);
      } else if (cat === 'accessories' && window.InvShellAccessory && window.InvShellAccessory.meta && window.InvShellAccessory.meta[urlState.tab]) {
        sessionStorage.setItem('invShellAccessoryTab', urlState.tab);
      } else if (cat === 'frames') {
        sessionStorage.setItem(SS_FR_TAB_KEY, urlState.tab);
      }
    }
    setActiveCategory(cat);
  }

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

  window.InvShell = {
    setActiveCategory: setActiveCategory,
    getCategory: function () { return sessionStorage.getItem(SS_CAT_KEY) || DEFAULT_CAT; },
    categories: Object.keys(CATEGORIES)
  };
})();
