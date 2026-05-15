// lens-pricing-main.js — entry + permission gate
// Per SPEC M1_LENS_PHASE_1B_FOUNDATION Screen #3.

(function () {
  'use strict';

  window.LensPricing = {
    productionFilter: 'stock',
    brandId: null,
    offerings: [],           // supplier_catalog_offering rows
    variants: [],            // lens_variant rows resolved from offerings
    designs: [],             // lens_design rows resolved from variants
    overlays: [],            // pricing_overlay rows (current tenant)
    effectivePrices: {},     // offering_id → numeric (computed via effective_price RPC)
    selectedOfferingIds: new Set(),
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
    if (!hasPermission('lens.pricing.manage')) {
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
      await window.LensPricingFilters.loadBrands();
      window.LensPricingFilters.attachHandlers();
      await window.LensPricingFilters.refreshPricingList();
    } catch (err) {
      console.error('[lens-pricing] bootstrap failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה: ' + (err.message || err));
      }
    }
  }

  window.LensPricing.bootstrap = bootstrap;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
