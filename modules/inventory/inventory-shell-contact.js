// inventory-shell-contact.js — contact-lens tab registry + lazy partial/script loader.
// Sealed by M1_CONTACT_LENSES_ACCESSORIES SPEC §2 Part C + DG-5.A (2026-05-16).
// Mirror of inventory-shell-lens.js with contact-* paths and prefixes.
//
// Owns: contact-lens tab metadata (perm key, partial URL, script load order),
// fetching the partial HTML on first activation, sequential script injection,
// and clear-and-reinject of sibling contact-tab-sections so DOM IDs don't collide.
//
// Public API exported as window.InvShellContact:
//   - tabs: ordered list of tab names
//   - meta: full registry
//   - setActive(tabName): activates a section, lazy-loads on first call
//   - getActive(): current tab name (sessionStorage backed)

(function () {
  'use strict';

  var SS_TAB_KEY = 'invShellContactTab';
  var DEFAULT_TAB = 'inventory';

  // 6-tab registry per SPEC §2 Part C (no pos-list — folded into purchase-order).
  // Each tab uses a single module JS at modules/contact-lens-<sub>/contact-lens-<sub>.js
  // (single-file MV pattern; richer multi-file structure can be added per-tab in
  // follow-up SPECs without changing this registry's contract).
  var TABS = {
    inventory: {
      perm: 'contact_lens.inventory.view',
      label: 'מלאי',
      icon: '👁',
      partialUrl: 'modules/contact-lens-inventory/contact-lens-inventory-partial.html',
      bootstrapGlobal: 'ContactLensInv.bootstrap',
      scripts: ['modules/contact-lens-inventory/contact-lens-inventory.js']
    },
    'active-designs': {
      perm: 'contact_lens.designs.manage',
      label: 'דגמים פעילים',
      icon: '✨',
      partialUrl: 'modules/contact-lens-active-designs/contact-lens-active-designs-partial.html',
      bootstrapGlobal: 'ContactLensAD.bootstrap',
      scripts: ['modules/contact-lens-active-designs/contact-lens-active-designs.js']
    },
    pricing: {
      perm: 'contact_lens.pricing.manage',
      label: 'מחירים',
      icon: '💲',
      partialUrl: 'modules/contact-lens-pricing/contact-lens-pricing-partial.html',
      bootstrapGlobal: 'ContactLensPricing.bootstrap',
      scripts: ['modules/contact-lens-pricing/contact-lens-pricing.js']
    },
    'purchase-order': {
      perm: 'contact_lens.po.manage',
      label: 'הזמנת רכש',
      icon: '📝',
      partialUrl: 'modules/contact-lens-purchase-order/contact-lens-purchase-order-partial.html',
      bootstrapGlobal: 'ContactLensPO.bootstrap',
      scripts: ['modules/contact-lens-purchase-order/contact-lens-purchase-order.js']
    },
    'goods-receipt': {
      perm: 'contact_lens.receipt.manage',
      label: 'קבלת סחורה',
      icon: '📦',
      partialUrl: 'modules/contact-lens-goods-receipt/contact-lens-goods-receipt-partial.html',
      bootstrapGlobal: 'ContactLensGR.bootstrap',
      scripts: ['modules/contact-lens-goods-receipt/contact-lens-goods-receipt.js']
    },
    'catalog-admin': {
      perm: 'contact_lens.catalog.admin',
      label: 'קטלוג מערכת',
      icon: '🔧',
      partialUrl: 'modules/contact-lens-catalog-admin/contact-lens-catalog-admin-partial.html',
      bootstrapGlobal: 'ContactLensCatalogAdmin.bootstrap',
      scripts: ['modules/contact-lens-catalog-admin/contact-lens-catalog-admin.js']
    },
    'private-catalog': {
      perm: 'contact_lens.catalog.private.manage|contact_lens.catalog.global.view',
      label: 'הקטלוג שלי',
      icon: '📚',
      partialUrl: null,
      scripts: ['shared/js/catalog-private-admin.js'],
      bootstrapGlobal: 'ContactLensPrivateCatalog.bootstrap'
    }
  };

  // Bootstrap wrapper for the shared CatalogPrivateAdmin component (contact_lens).
  // Sealed by M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED.
  window.ContactLensPrivateCatalog = {
    bootstrap: function () {
      var mount = document.querySelector('section.contact-tab-section[data-tab="private-catalog"]');
      if (!mount || !window.CatalogPrivateAdmin) return;
      mount.innerHTML = '';
      window.CatalogPrivateAdmin.init({
        mountEl: mount,
        productType: 'contact_lens',
        sb: window.sb,
        getTenantId: function () { return typeof getTenantId === 'function' ? getTenantId() : null; },
        hasPermission: function (k) { return typeof hasPermission === 'function' ? hasPermission(k) : false; }
      });
    }
  };

  var TAB_ORDER = ['inventory', 'active-designs', 'pricing', 'purchase-order',
                   'goods-receipt', 'catalog-admin', 'private-catalog'];

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
  function loadScript(url) {
    if (loadedScripts[url]) return loadedScripts[url];
    loadedScripts[url] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = function () { resolve(url); };
      s.onerror = function () { reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
    return loadedScripts[url];
  }

  function loadScriptsSequential(urls) {
    return urls.reduce(function (p, u) {
      return p.then(function () { return loadScript(u); });
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

  // Per DG-5.A: clear-and-reinject within contact-tab-section ONLY (don't touch
  // lens or accessory sections — those have their own loaders).
  function clearOtherSections(activeTab) {
    $$('section.contact-tab-section').forEach(function (s) {
      if (s.dataset.tab !== activeTab) {
        s.innerHTML = '';
        delete s.dataset.populated;
      }
    });
  }

  var tabBooted = {};
  function ensureLoaded(tabName) {
    var spec = TABS[tabName];
    if (!spec) return Promise.reject(new Error('Unknown contact tab: ' + tabName));
    var section = document.querySelector(
      'section.contact-tab-section[data-tab="' + tabName + '"]'
    );
    if (!section) return Promise.reject(new Error('Missing section shell for: ' + tabName));

    // partialUrl: null = component renders its own DOM (e.g. private-catalog).
    var partialP = spec.partialUrl ? fetchPartial(spec.partialUrl) : Promise.resolve(null);
    return partialP.then(function (text) {
      clearOtherSections(tabName);
      if (text != null) {
        section.innerHTML = text;
        section.dataset.populated = '1';
      }

      if (!tabBooted[tabName]) {
        var p = (spec.scripts && spec.scripts.length)
          ? loadScriptsSequential(spec.scripts)
          : Promise.resolve();
        return p.then(function () {
          tabBooted[tabName] = true;
          // Optional explicit bootstrap dispatch (for modules whose IIFE
          // auto-bootstrap couldn't fire). All contact modules are non-module
          // scripts that auto-bootstrap via document.readyState check, so this
          // is a safety net.
          if (spec.bootstrapGlobal) {
            var fn = resolveGlobal(spec.bootstrapGlobal);
            if (fn) {
              try { fn(); }
              catch (e) { console.error('[contactShell] bootstrap dispatch failed: ' + tabName, e); }
            }
          }
        });
      }
      // Re-activation: scripts loaded, partial DOM fresh. Re-dispatch.
      if (spec.bootstrapGlobal) {
        var fn = resolveGlobal(spec.bootstrapGlobal);
        if (fn) {
          try { fn(); }
          catch (e) { console.error('[contactShell] bootstrap re-dispatch failed: ' + tabName, e); }
        }
      }
      return null;
    });
  }

  function setActive(tabName) {
    if (!TABS[tabName]) tabName = DEFAULT_TAB;
    sessionStorage.setItem(SS_TAB_KEY, tabName);
    document.querySelectorAll('#contactNav button[data-contact-tab]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.contactTab === tabName);
    });
    $$('section.contact-tab-section').forEach(function (s) { s.classList.remove('active'); });
    var section = document.querySelector(
      'section.contact-tab-section[data-tab="' + tabName + '"]'
    );
    if (section) section.classList.add('active');
    ensureLoaded(tabName).catch(function (err) {
      console.error('[contactShell] tab load failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה בטעינת מסך עדשות מגע: ' + (err.message || err));
      }
    });
  }

  function getActive() {
    return sessionStorage.getItem(SS_TAB_KEY) || DEFAULT_TAB;
  }

  window.InvShellContact = {
    tabs: TAB_ORDER,
    meta: TABS,
    setActive: setActive,
    getActive: getActive,
    DEFAULT_TAB: DEFAULT_TAB
  };
})();
