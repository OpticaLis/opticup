// contact-lens-pricing.js — MV placeholder gate + bootstrap (M1_CONTACT_LENSES_ACCESSORIES SPEC §2 Part C)

(function () {
  'use strict';

  window.ContactLensPricing = window.ContactLensPricing || {};

  async function gateOrRedirect() {
    var tries = 0;
    while (typeof hasPermission !== 'function' && tries < 50) {
      await new Promise(function (r) { setTimeout(r, 100); });
      tries++;
    }
    if (typeof hasPermission !== 'function') return true;
    if (!hasPermission('contact_lens.pricing.manage')) {
      var g = document.getElementById('cl-pricing-gate');
      var a = document.getElementById('cl-pricing-app');
      if (g) g.style.display = 'block';
      if (a) a.style.display = 'none';
      return false;
    }
    var g2 = document.getElementById('cl-pricing-gate');
    var a2 = document.getElementById('cl-pricing-app');
    if (g2) g2.style.display = 'none';
    if (a2) a2.style.display = 'block';
    return true;
  }

  async function bootstrap() {
    await gateOrRedirect();
    // MV placeholder — full UI in follow-up SPEC.
  }

  window.ContactLensPricing.bootstrap = bootstrap;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
