// inventory-shell-lens.js — lens tab registry + lazy partial/script loader.
// Sealed by M1_INVENTORY_UNIFIED_SCREEN SPEC §0.B DG-2 / DG-3 (2026-05-16).
//
// Owns: lens tab metadata (perm key, partial URL, script load order),
// fetching the partial HTML body on first activation, sequential script
// injection (helpers first, main last) so each module's auto-bootstrap
// finds its siblings registered, and explicit bootstrap dispatch for the
// one ES-module entry (catalog-admin).
//
// Public API exported as window.InvShellLens:
//   - tabs: ordered list of tab names
//   - meta: full registry
//   - setActive(tabName): activates a section, lazy-loads on first call
//   - getActive(): current tab name (sessionStorage backed)

(function () {
  'use strict';

  var SS_LENS_TAB_KEY = 'invShellLensTab';
  var DEFAULT_LENS_TAB = 'inventory';

  // Lens tab registry. scripts[]: load order matters — helpers first,
  // main LAST. Main's IIFE calls bootstrap synchronously when readyState
  // !== 'loading', which is the case after dynamic injection.
  // Each entry needs a `bootstrapGlobal` so we can re-dispatch bootstrap when
  // a tab is re-activated after its scripts already loaded. (First activation
  // auto-bootstraps via the module's IIFE else-branch.)
  var LENS_TABS = {
    inventory: {
      perm: 'lens.inventory.view',
      label: 'מלאי',
      icon: '👓',
      partialUrl: 'modules/lens-inventory/lens-inventory-partial.html',
      bootstrapGlobal: 'LensInv.bootstrap',
      scripts: [
        'modules/lens-inventory/lens-inventory-filters.js',
        'modules/lens-inventory/lens-inventory-grid.js',
        'modules/lens-inventory/lens-inventory-lot-pane.js',
        'modules/lens-inventory/lens-inventory-modals.js',
        'modules/lens-inventory/lens-inventory-modal-shows.js',
        'modules/lens-inventory/lens-inventory-main.js'
      ]
    },
    'active-designs': {
      perm: 'lens.designs.manage',
      label: 'דגמים פעילים',
      icon: '✨',
      partialUrl: 'modules/lens-active-designs/lens-active-designs-partial.html',
      bootstrapGlobal: 'LensAD.bootstrap',
      scripts: [
        'modules/lens-active-designs/lens-active-designs-tree.js',
        'modules/lens-active-designs/lens-active-designs-toggle.js',
        'modules/lens-active-designs/lens-active-designs-stats.js',
        'modules/lens-active-designs/lens-active-designs-filters.js',
        'modules/lens-active-designs/lens-active-designs-table.js',
        'modules/lens-active-designs/lens-active-designs-detail.js',
        'modules/lens-active-designs/lens-active-designs-main.js'
      ]
    },
    pricing: {
      perm: 'lens.pricing.manage',
      label: 'מחירים',
      icon: '💲',
      partialUrl: 'modules/lens-pricing/lens-pricing-partial.html',
      bootstrapGlobal: 'LensPricing.bootstrap',
      scripts: [
        'modules/lens-pricing/lens-pricing-filters.js',
        'modules/lens-pricing/lens-pricing-grid.js',
        'modules/lens-pricing/lens-pricing-inline-edit.js',
        'modules/lens-pricing/lens-pricing-bulk.js',
        'modules/lens-pricing/lens-pricing-main.js'
      ]
    },
    'purchase-order': {
      perm: 'lens.po.create',
      label: 'הזמנת רכש',
      icon: '📝',
      partialUrl: 'modules/lens-purchase-order/lens-purchase-order-partial.html',
      bootstrapGlobal: 'LensPO.bootstrap',
      scripts: [
        'modules/lens-purchase-order/lens-purchase-order-supplier.js',
        'modules/lens-purchase-order/lens-purchase-order-shortages.js',
        'modules/lens-purchase-order/lens-purchase-order-manual.js',
        'modules/lens-purchase-order/lens-purchase-order-create.js',
        'modules/lens-purchase-order/lens-purchase-order-pdf.js',
        'modules/lens-purchase-order/lens-purchase-order-main.js'
      ]
    },
    'pos-list': {
      perm: 'lens.po.view',
      label: 'הזמנות פעילות',
      icon: '📋',
      partialUrl: 'modules/lens-pos-list/lens-pos-list-partial.html',
      bootstrapGlobal: 'LensPOsList.bootstrap',
      scripts: [
        'modules/lens-pos-list/lens-pos-list-table.js',
        'modules/lens-pos-list/lens-pos-list-filters.js',
        'modules/lens-pos-list/lens-pos-list-actions.js',
        'modules/lens-pos-list/lens-pos-list-main.js'
      ]
    },
    'goods-receipt': {
      perm: 'lens.gr.create',
      label: 'קבלת סחורה',
      icon: '📦',
      partialUrl: 'modules/lens-goods-receipt/lens-goods-receipt-partial.html',
      bootstrapGlobal: 'LensGR.bootstrap',
      scripts: [
        'modules/lens-goods-receipt/lens-goods-receipt-supplier.js',
        'modules/lens-goods-receipt/lens-goods-receipt-delivery-note.js',
        'modules/lens-goods-receipt/lens-goods-receipt-lines.js',
        'modules/lens-goods-receipt/lens-goods-receipt-manual.js',
        'modules/lens-goods-receipt/lens-goods-receipt-shipping-box.js',
        'modules/lens-goods-receipt/lens-goods-receipt-pre-fill.js',
        'modules/lens-goods-receipt/lens-goods-receipt-close.js',
        'modules/lens-goods-receipt/lens-goods-receipt-main.js'
      ]
    },
    'catalog-admin': {
      perm: '__platform_admin__',
      label: 'קטלוג מערכת',
      icon: '🔧',
      partialUrl: 'modules/lens-catalog-admin/lens-catalog-admin-partial.html',
      moduleScript: 'modules/lens-catalog-admin/lens-catalog-admin.js',
      bootstrapGlobal: 'LensCatalogAdmin.bootstrap'
    },
    'private-catalog': {
      perm: 'lens.catalog.private.manage|lens.catalog.global.view',
      label: 'הקטלוג שלי',
      icon: '📚',
      partialUrl: null,  // component renders its own DOM into the section shell
      scripts: ['shared/js/catalog-private-admin.js'],
      bootstrapGlobal: 'LensPrivateCatalog.bootstrap',
      explicitBootstrap: true  // shared component IIFE doesn't auto-bootstrap; shell must dispatch
    }
  };

  // Bootstrap wrapper for the shared CatalogPrivateAdmin component (lens / glasses).
  // Sealed by M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED.
  window.LensPrivateCatalog = {
    bootstrap: function () {
      var mount = document.querySelector('section.lens-tab-section[data-tab="private-catalog"]');
      if (!mount || !window.CatalogPrivateAdmin) return;
      mount.innerHTML = '';
      window.CatalogPrivateAdmin.init({
        mountEl: mount,
        productType: 'glasses',
        sb: window.sb,
        getTenantId: function () { return typeof getTenantId === 'function' ? getTenantId() : null; },
        hasPermission: function (k) { return typeof hasPermission === 'function' ? hasPermission(k) : false; }
      });
    }
  };

  var LENS_TAB_ORDER = ['inventory', 'active-designs', 'pricing', 'purchase-order',
                       'pos-list', 'goods-receipt', 'catalog-admin', 'private-catalog'];

  function $$(sel) { return document.querySelectorAll(sel); }

  function resolveGlobal(path) {
    var parts = path.split('.');
    var ref = window;
    for (var i = 0; i < parts.length; i++) {
      if (!ref) return null;
      ref = ref[parts[i]];
    }
    return (typeof ref === 'function') ? ref : null;
  }

  var loadedScripts = {};
  function loadScript(url, asModule) {
    if (loadedScripts[url]) return loadedScripts[url];
    loadedScripts[url] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      if (asModule) s.type = 'module';
      s.src = url;
      s.onload = function () { resolve(url); };
      s.onerror = function () { reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
    return loadedScripts[url];
  }

  function loadScriptsSequential(urls) {
    return urls.reduce(function (p, u) {
      return p.then(function () { return loadScript(u, false); });
    }, Promise.resolve());
  }

  var partialCache = {};
  function fetchPartial(url) {
    if (partialCache[url] !== undefined) return Promise.resolve(partialCache[url]);
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('Failed to fetch ' + url + ' — HTTP ' + r.status);
      return r.text();
    }).then(function (text) {
      partialCache[url] = text;
      return text;
    });
  }

  // Ensure only one lens partial is rendered into DOM at a time so multiple
  // partials don't collide on shared IDs (#filter-brand, #app, etc.).
  function clearOtherSections(activeTab) {
    $$('section.lens-tab-section').forEach(function (s) {
      if (s.dataset.tab !== activeTab) {
        s.innerHTML = '';
        delete s.dataset.populated;
      }
    });
  }

  var lensTabBooted = {};
  function ensureLoaded(tabName) {
    var spec = LENS_TABS[tabName];
    if (!spec) return Promise.reject(new Error('Unknown lens tab: ' + tabName));
    var section = document.querySelector(
      'section.lens-tab-section[data-tab="' + tabName + '"]'
    );
    if (!section) return Promise.reject(new Error('Missing section shell for: ' + tabName));

    // partialUrl: null = component renders its own DOM (e.g. private-catalog).
    var partialP = spec.partialUrl ? fetchPartial(spec.partialUrl) : Promise.resolve(null);
    return partialP.then(function (text) {
      clearOtherSections(tabName);
      if (text != null) {
        // Always (re-)inject the partial so re-activation gets a fresh DOM.
        section.innerHTML = text;
        section.dataset.populated = '1';
      }

      if (!lensTabBooted[tabName]) {
        // First activation: load scripts. main.js IIFE auto-bootstraps via its
        // else-branch (document.readyState is not 'loading' by now), so we
        // don't dispatch bootstrap explicitly on the first load.
        var p;
        if (spec.scripts && spec.scripts.length) p = loadScriptsSequential(spec.scripts);
        else if (spec.moduleScript) p = loadScript(spec.moduleScript, true);
        else p = Promise.resolve();
        return p.then(function () {
          lensTabBooted[tabName] = true;
          // ES-module entry points need explicit dispatch (DOMContentLoaded
          // already fired by the time the module evaluates). Same for shared
          // components flagged with explicitBootstrap (their IIFE doesn't
          // auto-init, just registers window.* APIs).
          if ((spec.moduleScript || spec.explicitBootstrap) && spec.bootstrapGlobal) {
            var fn = resolveGlobal(spec.bootstrapGlobal);
            if (fn) {
              try { fn(); }
              catch (e) { console.error('[invShell] bootstrap dispatch failed: ' + tabName, e); }
            }
          }
        });
      }
      // Re-activation: scripts already loaded but the partial DOM is fresh.
      // Re-dispatch bootstrap so the module re-binds to the new elements.
      if (spec.bootstrapGlobal) {
        var fn = resolveGlobal(spec.bootstrapGlobal);
        if (fn) {
          try { fn(); }
          catch (e) { console.error('[invShell] bootstrap re-dispatch failed: ' + tabName, e); }
        }
      }
      return null;
    });
  }

  function setActive(tabName) {
    if (!LENS_TABS[tabName]) tabName = DEFAULT_LENS_TAB;
    sessionStorage.setItem(SS_LENS_TAB_KEY, tabName);
    document.querySelectorAll('#lensNav button[data-lens-tab]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lensTab === tabName);
    });
    $$('section.lens-tab-section').forEach(function (s) { s.classList.remove('active'); });
    var section = document.querySelector(
      'section.lens-tab-section[data-tab="' + tabName + '"]'
    );
    if (section) section.classList.add('active');
    ensureLoaded(tabName).catch(function (err) {
      console.error('[invShell] lens tab load failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה בטעינת מסך עדשות: ' + (err.message || err));
      }
    });
  }

  function getActive() {
    return sessionStorage.getItem(SS_LENS_TAB_KEY) || DEFAULT_LENS_TAB;
  }

  // Platform-admin runtime gate for the catalog-admin tab.
  // The catalog-admin partial uses a separate Supabase Auth (Google OAuth)
  // session — distinct from the PIN-based tenant auth this page uses. For
  // non-platform-admin users (everyone except the Optic Up team), the tab
  // should be hidden, matching the pre-migration lens-nav-strip.js behavior
  // (carry-over of `gate: '__platform_admin__'` from the deleted widget).
  // Restored by M1_INVENTORY_UNIFIED_SCREEN_FUNCTIONAL_HOTFIX (2026-05-16).
  function gatePlatformAdminTabs() {
    if (typeof sb === 'undefined' || !sb || typeof sb.rpc !== 'function') return;
    sb.rpc('is_platform_super_admin').then(function (r) {
      var isAdmin = !!(r && r.data === true);
      if (isAdmin) return;
      // Hide the catalog-admin button + section for non-platform-admin users.
      var btn = document.querySelector('#lensNav button[data-lens-tab="catalog-admin"]');
      if (btn) btn.style.display = 'none';
      var section = document.querySelector('section.lens-tab-section[data-tab="catalog-admin"]');
      if (section) section.dataset.platformAdminGated = '1';
      // If catalog-admin was the active tab and user is not platform admin,
      // fall back to the inventory default.
      if (getActive() === 'catalog-admin') {
        sessionStorage.setItem(SS_LENS_TAB_KEY, DEFAULT_LENS_TAB);
        if (window.InvShell && window.InvShell.getCategory() === 'lenses') {
          setActive(DEFAULT_LENS_TAB);
        }
      }
    }).catch(function () { /* anon/RPC failure → keep tab hidden by leaving the gate set */ });
  }

  // Run the gate once the global sb client is ready. shared.js wires it in
  // the standard inventory.html load chain.
  function tryGateInit() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (typeof sb !== 'undefined' && sb && typeof sb.rpc === 'function') {
        clearInterval(t);
        gatePlatformAdminTabs();
      } else if (tries > 50) {
        clearInterval(t);
      }
    }, 100);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryGateInit);
  } else {
    tryGateInit();
  }

  window.InvShellLens = {
    tabs: LENS_TAB_ORDER,
    meta: LENS_TABS,
    setActive: setActive,
    getActive: getActive,
    DEFAULT_TAB: DEFAULT_LENS_TAB,
    gatePlatformAdminTabs: gatePlatformAdminTabs
  };
})();
