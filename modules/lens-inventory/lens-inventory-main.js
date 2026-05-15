// lens-inventory-main.js — entry point + permission gate + state container
// Per SPEC M1_LENS_PHASE_1B_FOUNDATION Screen #1.
// Loads catalog hierarchy + tenant_lens_stock filtered by Stock/Custom production_type.
// Iron Rule 7: every DB read through fetchAll/sb.rpc. No direct sb.from().
// Iron Rule 8: escapeHtml from js/shared.js, never reimplemented.

(function () {
  'use strict';

  // ─── Module state (shared with sibling files via window.LensInv) ───
  window.LensInv = {
    productionFilter: 'stock', // 'stock' | 'custom'
    brandId: null,
    designId: null,
    variantId: null,
    brands: [],
    designs: [],
    variants: [],
    offerings: [],          // supplier_catalog_offering rows for current variant filter
    stockRows: [],          // tenant_lens_stock rows for current variant
    lots: [],               // stock_lot rows for current variant+sph/cyl
  };

  // ─── Permission gate ───
  async function gateOrRedirect() {
    // Wait for auth-service to finish loading the session + permission cache.
    // The project pattern is: auth-service.js calls loadEmployeeContext() on load.
    // Poll until window.currentEmployee is set OR a short timeout.
    let tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (typeof hasPermission !== 'function') {
      console.warn('hasPermission not available — gating disabled (early load)');
      return true;
    }
    if (!hasPermission('lens.inventory.view')) {
      document.getElementById('access-gate').style.display = 'block';
      document.getElementById('app').style.display = 'none';
      return false;
    }
    document.getElementById('access-gate').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    return true;
  }

  // ─── Bootstrap ───
  async function bootstrap() {
    const ok = await gateOrRedirect();
    if (!ok) return;

    try {
      await window.LensInvFilters.loadBrands();
      window.LensInvFilters.attachHandlers();
      console.log('[lens-inventory] bootstrap complete');
    } catch (err) {
      console.error('[lens-inventory] bootstrap failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה בטעינת המסך: ' + (err.message || err));
      }
    }
  }

  // ─── Public API for sibling files ───
  window.LensInv.bootstrap = bootstrap;

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
