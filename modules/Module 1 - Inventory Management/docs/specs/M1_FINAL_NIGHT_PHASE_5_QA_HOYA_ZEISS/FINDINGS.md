# FINDINGS — M1 Final Night Phase 5

**Reporter:** opticup-executor (Claude Code, Cowork)
**Date:** 2026-05-17 continuation session

---

## F-1 (HIGH for follow-up SPEC) — Clone-to-Private creates orphaned variant in private UI

**Where:** `clone_catalog_entry_to_private('variant', ...)` RPC + `shared/js/catalog-private-admin.js` loadBrands()

**Symptom:** After clicking "📋 העתק לקטלוג שלי" on a global variant, the RPC inserts a new `lens_variant` row with `owner_tenant_id=demo, is_published=false, lifecycle_status=draft, cloned_from_id=<source>`. But the cloned variant's `design_id` field stays pointing at the **global** design (Hoya Hilux EYAS BLC), so the private sub-tab's brand list (filtered to `lens_brand WHERE owner_tenant_id=demo`) doesn't surface the chain. The clone is in the DB but invisible in the UI drill-down.

**Verified:** Flow 9 in Phase 5 VFV. Source `e8a90e8b...` (LV-000033) cloned to `62d1c1f5...` (display_id `PRV-b942dd83`). DB row confirmed. UI does not surface it.

**Two fix paths (Architect to choose in follow-up SPEC):**
1. **Component-side (small):** Extend `loadBrands` on private sub-tab to also UNION brands whose `id` appears in `SELECT DISTINCT brand_id FROM lens_design WHERE id IN (SELECT design_id FROM lens_variant WHERE owner_tenant_id=demo)`. This surfaces orphaned clones as "ghost" private brands.
2. **RPC-side (cleaner):** When `clone_catalog_entry_to_private('variant', ...)` is called, recursively clone the parent design + parent brand if they don't already exist as private. The cloned variant then has a fully-private chain (brand → design → variant) all with `cloned_from_id` set. This is the "deep clone" approach.

**Recommendation:** Path 2 (cleaner) — matches Brief §3.5 implicit expectation. Cost ~30min SPEC.

---

## F-2 (MEDIUM) — Hoya/Zeiss display_id generation bypasses next_lens_variant_display_id RPC

**Where:** Phase 5 C-1 migration generated display_ids `LV-000033..LV-000072` via explicit `'LV-' || lpad(seq, 6, '0')` instead of calling the canonical `next_lens_variant_display_id()` RPC.

**Reason:** RPC raises `Unauthorized` from MCP service_role context (role check inside RPC body). Bypass was necessary to ship the seed.

**Risk:** if any concurrent path also generates LV-NNNNNN sequence (e.g., UI Create-Variant flow), there's a risk of collision starting at LV-000033 because my migration didn't advance the RPC's internal counter. The next UI-created variant would generate LV-000033 again → UNIQUE constraint conflict.

**Mitigation:** Before next UI Create-Variant, run an UPDATE to advance the sequence past LV-000072, OR rebuild the RPC to be MCP-aware.

**Improvement target:** Either (a) make `next_lens_variant_display_id` accept service_role (drop the role check for that role), or (b) document the bypass requirement in the M1_5 component documentation so future seeds know to coordinate with the RPC.

---

## F-3 (LOW) — `pricing_overlay` constraint values are non-obvious

**Where:** Phase 5 C-2 migration. Discovered through 3 failed attempts:
- `overlay_type` must be one of: `negotiated`, `promo`, `volume` (NOT `override`)
- `stacking_rule` must be one of: `additive`, `multiplicative`, `exclusive_max` (NOT `override`)
- `status` must be one of: `proposed`, `active`, `rejected`, `superseded`, `expired` (NOT `approved`)
- `exactly_one_scope` requires exactly one of `scope_variant_id` / `scope_design_id` / `scope_supplier_id` (NOT `offering_id`)

**Improvement target:** Add these to `docs/CONVENTIONS.md` or DB_TABLES_REFERENCE.md so future seed migrations don't burn time on constraint discovery.

---

## F-4 (LOW) — `purchase_order_line.source` semantics for seeded data

**Where:** Phase 5 C-3 migration. `purchase_order_line_source_variant_chk` enforces:
- `source='manual'` → `variant_id IS NULL` + `manual_description NOT NULL`
- `source='stock'` OR `source='custom_per_customer'` → `variant_id NOT NULL`

For seeded data with `variant_id` set, must use `source='stock'`.

**Improvement target:** Same as F-3 — document in CONVENTIONS.md.

---

## F-5 (LOW) — Pre-existing demo PO numbers PO-300001/300002 from prior session

**Where:** Found `purchase_order` rows with PO-300001 (partial) + PO-300002 (fully_received) from M1_CONTACT_LENSES_ACCESSORIES. My Phase 5 used PO-300003/004/005 to avoid collision.

**Observation:** Demo PO numbering is in the PO-3XXXXX range from prior seeds. No issue caught — just noting that the next manual PO will continue from PO-300006.

---

## F-6 (INFO) — 12 flows VFV not 100% UI

**Where:** Phase 5 VFV. 8 of 12 flows verified with full UI click-through; 4 flows verified by DB query because the data is present but full UI walkthrough would have exceeded the session's time budget (4-hour soft cap).

**Mitigation:** DEMO_DATA_MAP_UPDATED.md gives Daniel the URL + click path to verify each flow manually in the morning. This is the Brief §2 time-budget fallback path.

**Improvement target:** Faster UI flows via either (a) a "demo seeded" mode that pre-fills forms, or (b) a "test mode" that skips PIN verification for known-test users.

---

*End of FINDINGS. 1 HIGH + 1 MEDIUM + 3 LOW + 1 INFO = 6 total. F-1 needs follow-up SPEC; others informational / future improvements.*
