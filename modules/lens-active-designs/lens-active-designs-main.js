// lens-active-designs-main.js — entry + permission gate
// Per SPEC M1_LENS_PHASE_1B_FOUNDATION Screen #2 (הקמה, מנהל סניף).

(function () {
  'use strict';

  window.LensAD = {
    productionFilter: 'stock',
    brandId: null,
    designs: [],            // all designs for current brand+production filter
    offerings: [],          // supplier_catalog_offering rows for displayed designs
    activeOfferings: [],    // tenant_active_offerings rows
    brands: [],
  };

  async function gateOrRedirect() {
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('hasPermission not available — gating disabled');
      return true;
    }
    if (!hasPermission('lens.designs.manage')) {
      document.getElementById('access-gate').style.display = 'block';
      document.getElementById('app').style.display = 'none';
      return false;
    }
    document.getElementById('access-gate').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    return true;
  }

  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;
    try {
      await window.LensADTree.loadBrands();
      window.LensADTree.attachHandlers();
      await window.LensADTree.refreshDesignsList();
    } catch (err) {
      console.error('[lens-active-designs] bootstrap failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה: ' + (err.message || err));
      }
    }
  }

  window.LensAD.bootstrap = bootstrap;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
