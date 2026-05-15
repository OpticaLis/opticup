// lens-pricing-inline-edit.js — inline discount edit handler
// Calls upsert_pricing_overlay RPC.

(function () {
  'use strict';

  async function saveInlineDiscount(offeringId, variantId, discountPct) {
    const tenantId = getTenantId();
    if (!tenantId) {
      if (window.Toast) Toast.error('שגיאה: tenant_id חסר');
      return;
    }
    try {
      const { data, error } = await sb.rpc('upsert_pricing_overlay', {
        p_tenant_id: tenantId,
        p_overlay_data: {
          scope_variant_id: variantId,
          offering_id: offeringId,
          overlay_type: 'negotiated',
          discount_pct: discountPct,
          stacking_rule: 'additive',
          application_order: 100,
          status: 'active',
          notes: 'inline-edit via lens-pricing.html ' + new Date().toISOString().substring(0, 10),
        },
      });
      if (error) throw error;
      if (window.Toast && typeof Toast.success === 'function') {
        Toast.success('הנחה נשמרה בהצלחה');
      }
      await window.LensPricingFilters.refreshPricingList();
      return data;
    } catch (err) {
      console.error('[lens-pricing] inline save failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה בשמירה: ' + (err.message || err));
      }
    }
  }

  window.LensPricingInline = { saveInlineDiscount };
})();
