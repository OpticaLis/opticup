/* lens-price-resolver.js — Shared sell-price resolver for Optic Up lens module.
   ============================================================================
   Thin wrapper over the existing `effective_price(p_offering_id, p_tenant_id,
   p_as_of_ts)` SECURITY DEFINER RPC. Centralizes the resolution so multiple
   consumers (lens-pricing screen + lens-inventory lots-table + future M9/M11
   surfaces) share the same code path. Resolves F-5 from SPEC 4a per
   M1_LENS_PRICING_REBUILD (2026-05-17).

   API:
     LensPriceResolver.resolve(offeringId, tenantId, asOfTs)
       → Promise<number | null>  (null = error or no overlay)

     LensPriceResolver.resolveMany(offeringIds, tenantId, asOfTs)
       → Promise<Map<offeringId, number | null>>
       Parallel via Promise.all. asOfTs defaults to now() if omitted.

   Behavior notes:
   - The RPC carries the JWT-tenant guard (raises 42501 if JWT tenant_id !=
     p_tenant_id arg). Caller MUST pass the current tenant.
   - The RPC returns NUMERIC (VAT-inclusive per project pricing contract).
   - On error the wrapper logs to console + returns null for that offering;
     the consumer must handle null (e.g., show '—' placeholder).
   - Soft dep on `sb` (Supabase client global) — caller's responsibility.

   Authored 2026-05-17 by M1_LENS_PRICING_REBUILD. No DDL; no schema changes.
   ============================================================================ */

(function () {
  'use strict';

  function _nowIso() {
    return new Date().toISOString();
  }

  async function resolve(offeringId, tenantId, asOfTs) {
    if (!offeringId || !tenantId) return null;
    if (typeof sb === 'undefined' || !sb || typeof sb.rpc !== 'function') {
      console.warn('[LensPriceResolver] sb client unavailable');
      return null;
    }
    try {
      const { data, error } = await sb.rpc('effective_price', {
        p_offering_id: offeringId,
        p_tenant_id:   tenantId,
        p_as_of_ts:    asOfTs || _nowIso()
      });
      if (error) {
        console.warn('[LensPriceResolver] resolve failed for offering ' + offeringId + ': ' + error.message);
        return null;
      }
      return data == null ? null : Number(data);
    } catch (e) {
      console.warn('[LensPriceResolver] resolve exception for offering ' + offeringId + ': ' + (e.message || e));
      return null;
    }
  }

  async function resolveMany(offeringIds, tenantId, asOfTs) {
    const ids = Array.isArray(offeringIds) ? offeringIds.filter(Boolean) : [];
    if (!ids.length) return new Map();
    const ts = asOfTs || _nowIso();
    // Parallel via Promise.all. RPC is single-row + fast.
    const results = await Promise.all(ids.map(function (id) {
      return resolve(id, tenantId, ts).then(function (price) { return [id, price]; });
    }));
    return new Map(results);
  }

  window.LensPriceResolver = { resolve: resolve, resolveMany: resolveMany };
})();
