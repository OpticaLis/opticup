// lens-active-designs-toggle.js — toggle handlers for the active-designs screen.
// M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS (2026-05-18):
//   - Added toggleAcrossLocations(offeringIds, locationIds, makeActive) — uses
//     the NEW server-side array RPC toggle_active_offerings_array for atomic
//     per-(offering × location) bulk toggle. Resolves SPEC 4 F-1 MEDIUM
//     (no more "all-locations" placeholder row from p_location_id=null).
//   - Kept toggleOffering + toggleOfferingSilent + toggleMany for per-row UI
//     interactions. Per-row callers still pass p_location_id (or null) to
//     the existing single-row RPC.
//
// Iron Rule 1 (atomic via RPC). Iron Rule 7 (writes via sb.rpc). Iron Rule 22
// (tenant_id in every call).

(function () {
  'use strict';

  // Single-offering toggle WITH per-call Toast + refresh.
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

  // Silent variant — no per-call Toast, no refresh.
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

  // Per-row N-toggle helper (preserved for single-row batch loops).
  async function toggleMany(offeringIds, makeActive) {
    if (!Array.isArray(offeringIds) || offeringIds.length === 0) return [];
    return Promise.all(offeringIds.map(id => toggleOfferingSilent(id, makeActive)));
  }

  // NEW (SPEC 12): atomic per-(offering × location) bulk toggle via server-side
  // array RPC. Replaces the previous "all-locations" placeholder pattern that
  // created NULL-location_id rows.
  async function toggleAcrossLocations(offeringIds, locationIds, makeActive) {
    const tenantId = getTenantId();
    if (!tenantId) {
      if (window.Toast) Toast.error('שגיאה: tenant_id חסר');
      throw new Error('tenant_id missing');
    }
    if (!Array.isArray(offeringIds) || offeringIds.length === 0) return null;
    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      if (window.Toast) Toast.error('שגיאה: לא נמצאו סניפים');
      throw new Error('locationIds missing');
    }
    try {
      const { data, error } = await sb.rpc('toggle_active_offerings_array', {
        p_tenant_id: tenantId,
        p_offering_ids: offeringIds,
        p_location_ids: locationIds,
        p_is_active: makeActive,
      });
      if (error) throw error;
      if (window.Toast && typeof Toast.success === 'function') {
        const pairs = (data && data.pairs_processed) || 0;
        Toast.success(makeActive
          ? `הופעלו ${pairs} צמדים (${offeringIds.length} דגמים × ${locationIds.length} סניפים)`
          : `בוטלו ${pairs} צמדים`);
      }
      if (window.LensAD && typeof window.LensAD.refreshAll === 'function') {
        await window.LensAD.refreshAll();
      }
      return data;
    } catch (err) {
      console.error('[lens-active-designs] toggleAcrossLocations failed', err);
      if (window.Toast && typeof Toast.error === 'function') {
        Toast.error('שגיאה בהפעלה/ביטול לכל הסניפים: ' + (err.message || err));
      }
      throw err;
    }
  }

  window.LensADToggle = { toggleOffering, toggleOfferingSilent, toggleMany, toggleAcrossLocations };
})();
