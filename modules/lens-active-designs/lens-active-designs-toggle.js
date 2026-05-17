// lens-active-designs-toggle.js — toggle handler calling toggle_active_offering RPC.
// M1_LENS_DESIGNS_SELECTION_REBUILD (2026-05-17): added toggleOfferingSilent
// for batch use by the table-level toggle + bulk activate/deactivate in the
// side panel. The single-design path now defers refresh to LensAD.refreshAll()
// so the orchestrator runs ONE re-render after a batch.

(function () {
  'use strict';

  // Single-offering toggle WITH per-call Toast + refresh.
  // Used when a user clicks a single toggle interactively without batching.
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
      if (window.LensAD && typeof window.LensAD.refreshAll === 'function') {
        await window.LensAD.refreshAll();
      }
      return data;
    } catch (err) {
      console.error('[lens-active-designs] toggle failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה: ' + (err.message || err));
      }
      throw err;
    }
  }

  // Silent variant — no per-call Toast, no refresh. Caller (table, bulk action)
  // batches multiple calls and triggers ONE refresh + ONE Toast at the end.
  async function toggleOfferingSilent(offeringId, makeActive) {
    const tenantId = getTenantId();
    if (!tenantId) throw new Error('tenant_id missing');
    const { data, error } = await sb.rpc('toggle_active_offering', {
      p_tenant_id: tenantId,
      p_offering_id: offeringId,
      p_is_active: makeActive,
      p_location_id: null,
    });
    if (error) throw error;
    return data;
  }

  // Batch helper: toggle N offerings (typically all offerings of one design,
  // or all designs of one brand for activate-all/deactivate-all in side panel).
  async function toggleMany(offeringIds, makeActive) {
    if (!Array.isArray(offeringIds) || offeringIds.length === 0) return [];
    return Promise.all(offeringIds.map(id => toggleOfferingSilent(id, makeActive)));
  }

  window.LensADToggle = { toggleOffering, toggleOfferingSilent, toggleMany };
})();
