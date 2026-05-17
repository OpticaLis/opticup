# FINDINGS — M1_LENS_DESIGNS_SELECTION_REBUILD

> **Written by:** opticup-executor
> **Written on:** 2026-05-17

3 findings logged; none absorbed into SPEC scope.

---

## F-1 — `toggle_active_offering` RPC creates parallel "all-locations" row instead of flipping per-location actuals (MEDIUM)

**Severity:** MEDIUM (UX promise vs data effect mismatch; bulk-action data flow broken)
**Location:** `toggle_active_offering(p_tenant_id, p_offering_id, p_is_active, p_location_id)` RPC body (verified live 2026-05-17). The RPC's `INSERT ... ON CONFLICT (tenant_id, offering_id, location_id) WHERE (is_deleted=false)` resolves `null` location_id as a DISTINCT key from per-location actuals.

**Description:** When the side-panel's "deactivate-all variants" button fires, my code calls the RPC N times with `p_location_id=null` (one per offering for the design). Expected behavior: all per-location `tenant_active_offerings` rows for that design flip to `is_active=false`. Actual behavior: 5 NEW rows inserted with `location_id=null, is_active=false`; the existing per-location rows (with `location_id=e6f26ba3-...`) remain `is_active=true`. The UI shows "all-locations" record at is_active=false, but my `recomputeStats()` still counts the design as active (any active `tenant_active_offerings` row → design counts as active).

**Reproduced live during Tier C smoke:** Hoya Eyenavi Wild Life (`e7dfedc8-d821-4a81-b227-b7c7ccf64bf1`), 5 offerings × 1 location each → 5 new all-locations rows created on click of deactivate-all. Cleaned up post-smoke (5 rows soft-deleted per Iron Rule 3).

**Why this isn't a SPEC 4 absorption:**
1. The RPC is pre-existing (Phase 1B-foundation seed); same call pattern as the OLD pre-rebuild single-toggle.
2. The OLD UI's `toggleOffering(offeringId, null)` had the same semantics — bug masked because OLD `renderDesignsTable` only checked first matching offering's active state via Map lookup (whatever ordering happened).
3. SPEC 4 explicit "Forbidden": "Any DDL would be needed → STOP (out of scope)". A real fix requires either a 5-arg RPC overload that takes `p_location_ids uuid[]` OR client-side enumeration of locations + N×L RPC calls. Both are bigger than SPEC 4's mockup-rebuild scope.

**Suggested next action:** Author follow-up SPEC `M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS` (~2-3h). Two options:
- **(a)** New 5-arg RPC `toggle_active_offering_bulk(p_tenant_id, p_offering_ids uuid[], p_location_ids uuid[], p_is_active)` that loops server-side with proper conflict resolution. Atomic single-transaction guarantee.
- **(b)** Client-side enumeration: query `tenant_location` for the current tenant, then call existing RPC once per (offering, location) pair. Simpler but N×L calls.

The Foreman should decide (a) vs (b) based on tenant-count expectations. For now, single-design toggle still works correctly when the user clicks the per-row table toggle (which legitimately means "any-location"); only the bulk side-panel action is misleading.

---

## F-2 — Bulk activate-all uses Promise.all (N RPC calls) instead of single-transaction batch (INFO)

**Severity:** INFO
**Location:** `modules/lens-active-designs/lens-active-designs-toggle.js` `toggleMany()` function
**Description:** The `toggleMany([offeringId1, ..., offeringIdN], makeActive)` helper executes via `Promise.all` parallel RPC calls. Each call is server-atomic; the outer Promise.all is NOT atomic — if call 3 of 5 fails, calls 1+2 already committed.

**Why this isn't a SPEC 4 absorption:** SPEC §5 explicitly authorizes "use existing RPCs" — a single-transaction batch RPC would require DDL (out of scope). Promise.all is the available pattern.

**Suggested next action:** Bundle with F-1's follow-up SPEC. If option (a) is chosen (`toggle_active_offering_bulk` array RPC), this finding is auto-resolved.

---

## F-3 — `inventory-shell-lens.js` over Iron Rule 12 300-line soft target (INFO)

**Severity:** INFO (pre-existing — this SPEC added 4 lines)
**Location:** `modules/inventory/inventory-shell-lens.js` — 348 lines (was 344 before SPEC 4 added 4 manifest entries for stats/filters/table/detail scripts)
**Description:** File was already over 300 line target before this SPEC (manifest object literal naturally grows with each new lens tab + sub-modules). Pre-commit hook warned but didn't block (350 hard max).

**Suggested next action:** Bundle into the next M1 maintenance SPEC (alongside the existing `#M1_UNIFIED_*` items in TECH_DEBT.md). Trivial extraction — move the `LENS_TABS` config object to a separate `lens-tabs-manifest.json` / `.js` file (~30 min).

---

*End of FINDINGS. 3 entries: 1 MEDIUM (F-1 RPC semantics — recommended new SPEC), 2 INFO. No SPEC absorptions.*
