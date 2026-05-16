// inventory-shell-accessory.js — accessory tab registry + lazy partial/script loader.
// Sealed by M1_CONTACT_LENSES_ACCESSORIES SPEC §2 Part C + DG-5.A (2026-05-16).
// Mirror of inventory-shell-contact.js with accessory-* paths and prefixes.

(function () {
  'use strict';

  var SS_TAB_KEY = 'invShellAccessoryTab';
  var DEFAULT_TAB = 'inventory';

  var TABS = {
    inventory: {
      perm: 'accessory.inventory.view',
      label: 'מלאי',
      icon: '📦',
      partialUrl: 'modules/accessory-inventory/accessory-inventory-partial.html',
      bootstrapGlobal: 'AccessoryInv.bootstrap',
      scripts: ['modules/accessory-inventory/accessory-inventory.js']
    },
    'active-designs': {
      perm: 'accessory.designs.manage',
      label: 'דגמים פעילים',
      icon: '✨',
      partialUrl: 'modules/accessory-active-designs/accessory-active-designs-partial.html',
      bootstrapGlobal: 'AccessoryAD.bootstrap',
      scripts: ['modules/accessory-active-designs/accessory-active-designs.js']
    },
    pricing: {
      perm: 'accessory.pricing.manage',
      label: 'מחירים',
      icon: '💲',
      partialUrl: 'modules/accessory-pricing/accessory-pricing-partial.html',
      bootstrapGlobal: 'AccessoryPricing.bootstrap',
      scripts: ['modules/accessory-pricing/accessory-pricing.js']
    },
    'purchase-order': {
      perm: 'accessory.po.manage',
      label: 'הזמנת רכש',
      icon: '📝',
      partialUrl: 'modules/accessory-purchase-order/accessory-purchase-order-partial.html',
      bootstrapGlobal: 'AccessoryPO.bootstrap',
      scripts: ['modules/accessory-purchase-order/accessory-purchase-order.js']
    },
    'goods-receipt': {
      perm: 'accessory.receipt.manage',
      label: 'קבלת סחורה',
      icon: '📦',
      partialUrl: 'modules/accessory-goods-receipt/accessory-goods-receipt-partial.html',
      bootstrapGlobal: 'AccessoryGR.bootstrap',
      scripts: ['modules/accessory-goods-receipt/accessory-goods-receipt.js']
    },
    'catalog-admin': {
      perm: 'accessory.catalog.admin',
      label: 'קטלוג מערכת',
      icon: '🔧',
      partialUrl: 'modules/accessory-catalog-admin/accessory-catalog-admin-partial.html',
      bootstrapGlobal: 'AccessoryCatalogAdmin.bootstrap',
      scripts: ['modules/accessory-catalog-admin/accessory-catalog-admin.js']
    }
  };

  var TAB_ORDER = ['inventory', 'active-designs', 'pricing', 'purchase-order',
                   'goods-receipt', 'catalog-admin'];

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

  function clearOtherSections(activeTab) {
    $$('section.accessory-tab-section').forEach(function (s) {
      if (s.dataset.tab !== activeTab) {
        s.innerHTML = '';
        delete s.dataset.populated;
      }
    });
  }

  var tabBooted = {};
  function ensureLoaded(tabName) {
    var spec = TABS[tabName];
    if (!spec) return Promise.reject(new Error('Unknown accessory tab: ' + tabName));
    var section = document.querySelector(
      'section.accessory-tab-section[data-tab="' + tabName + '"]'
    );
    if (!section) return Promise.reject(new Error('Missing section shell for: ' + tabName));

    return fetchPartial(spec.partialUrl).then(function (text) {
      clearOtherSections(tabName);
      section.innerHTML = text;
      section.dataset.populated = '1';

      if (!tabBooted[tabName]) {
        var p = (spec.scripts && spec.scripts.length)
          ? loadScriptsSequential(spec.scripts)
          : Promise.resolve();
        return p.then(function () {
          tabBooted[tabName] = true;
          if (spec.bootstrapGlobal) {
            var fn = resolveGlobal(spec.bootstrapGlobal);
            if (fn) {
              try { fn(); }
              catch (e) { console.error('[accessoryShell] bootstrap dispatch failed: ' + tabName, e); }
            }
          }
        });
      }
      if (spec.bootstrapGlobal) {
        var fn = resolveGlobal(spec.bootstrapGlobal);
        if (fn) {
          try { fn(); }
          catch (e) { console.error('[accessoryShell] bootstrap re-dispatch failed: ' + tabName, e); }
        }
      }
      return null;
    });
  }

  function setActive(tabName) {
    if (!TABS[tabName]) tabName = DEFAULT_TAB;
    sessionStorage.setItem(SS_TAB_KEY, tabName);
    document.querySelectorAll('#accessoryNav button[data-accessory-tab]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.accessoryTab === tabName);
    });
    $$('section.accessory-tab-section').forEach(function (s) { s.classList.remove('active'); });
    var section = document.querySelector(
      'section.accessory-tab-section[data-tab="' + tabName + '"]'
    );
    if (section) section.classList.add('active');
    ensureLoaded(tabName).catch(function (err) {
      console.error('[accessoryShell] tab load failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה בטעינת מסך אביזרים: ' + (err.message || err));
      }
    });
  }

  function getActive() {
    return sessionStorage.getItem(SS_TAB_KEY) || DEFAULT_TAB;
  }

  window.InvShellAccessory = {
    tabs: TAB_ORDER,
    meta: TABS,
    setActive: setActive,
    getActive: getActive,
    DEFAULT_TAB: DEFAULT_TAB
  };
})();
