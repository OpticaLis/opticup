// lens-active-designs-toggle.js — toggle handler calling toggle_active_offering RPC
// Single write per click. Atomic UPSERT semantics.

(function () {
  'use strict';

  async function toggleOffering(offeringId, makeActive) {
    const tenantId = getTenantId();
    if (!tenantId) {
      if (window.Toast) Toast.error('שגיאה: tenant_id חסר');
      return;
    }

    try {
      const { data, error } = await sb.rpc('toggle_active_offering', {
        p_tenant_id: tenantId,
        p_offering_id: offeringId,
        p_is_active: makeActive,
        p_location_id: null,
      });
      if (error) throw error;
      if (window.Toast && typeof Toast.success === 'function') {
        Toast.success(makeActive ? 'הדגם הופעל בהצלחה' : 'הדגם בוטל בהצלחה');
      }
      // Re-render the list to reflect new state
      await window.LensADTree.refreshDesignsList();
      return data;
    } catch (err) {
      console.error('[lens-active-designs] toggle failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה: ' + (err.message || err));
      }
    }
  }

  window.LensADToggle = { toggleOffering };
})();
