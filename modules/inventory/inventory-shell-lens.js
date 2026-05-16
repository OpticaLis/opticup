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
    }
  };

  var LENS_TAB_ORDER = ['inventory', 'active-designs', 'pricing', 'purchase-order',
                       'pos-list', 'goods-receipt', 'catalog-admin'];

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

    return fetchPartial(spec.partialUrl).then(function (text) {
      clearOtherSections(tabName);
      // Always (re-)inject the partial so re-activation gets a fresh DOM.
      section.innerHTML = text;
      section.dataset.populated = '1';

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
          // already fired by the time the module evaluates).
          if (spec.moduleScript && spec.bootstrapGlobal) {
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

  window.InvShellLens = {
    tabs: LENS_TAB_ORDER,
    meta: LENS_TABS,
    setActive: setActive,
    getActive: getActive,
    DEFAULT_TAB: DEFAULT_LENS_TAB
  };
})();
