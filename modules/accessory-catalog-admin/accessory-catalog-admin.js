// accessory-catalog-admin.js — MV placeholder gate + bootstrap (M1_CONTACT_LENSES_ACCESSORIES SPEC §2 Part C)

(function () {
  'use strict';

  window.AccessoryCatalogAdmin = window.AccessoryCatalogAdmin || {};

  async function gateOrRedirect() {
    var tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(function (r) { setTimeout(r, 100); });
      tries++;
    }
    if (typeof hasPermission !== 'function') return true;
    if (!hasPermission('accessory.catalog.admin')) {
      var g = document.getElementById('ac-catalog-admin-gate');
      var a = document.getElementById('ac-catalog-admin-app');
      if (g) g.style.display = 'block';
      if (a) a.style.display = 'none';
      return false;
    }
    var g2 = document.getElementById('ac-catalog-admin-gate');
    var a2 = document.getElementById('ac-catalog-admin-app');
    if (g2) g2.style.display = 'none';
    if (a2) a2.style.display = 'block';
    return true;
  }

  async function bootstrap() {
    await gateOrRedirect();
    // MV placeholder — full UI in follow-up SPEC.
  }

  window.AccessoryCatalogAdmin.bootstrap = bootstrap;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
