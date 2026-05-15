# FINDINGS.md — M1_LENS_PHASE_1B_FOUNDATION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/FINDINGS.md`
> **Written by:** opticup-executor (Full-Auto Pipeline single chat)
> **Written on:** 2026-05-15

Findings discovered DURING execution that were NOT in the SPEC scope. Each carries severity, location, description, and suggested disposition for the Foreman.

---

## F-1 — `tenant_active_offerings_unique` is INDEX not CONSTRAINT (Block 2 v1 fix)

**Severity:** LOW (resolved in-pipeline via SPEC §0 D11 pre-authorization).

**Location:** `public.tenant_active_offerings` partial unique index; affects any SPEC that wants to UPSERT against it with `ON CONFLICT ON CONSTRAINT <name>`.

**Description:** The schema has `CREATE UNIQUE INDEX tenant_active_offerings_unique ON public.tenant_active_offerings USING btree (tenant_id, offering_id, location_id) NULLS NOT DISTINCT WHERE (is_deleted = false)`. The name `tenant_active_offerings_unique` is a unique INDEX, not a UNIQUE CONSTRAINT. PostgreSQL's `ON CONFLICT ON CONSTRAINT <name>` only works for named UNIQUE/PRIMARY KEY constraints, NOT for unique indexes (even though they enforce uniqueness). Block 2 v1 of `toggle_active_offering` used `ON CONFLICT ON CONSTRAINT` syntax and failed at smoke time with `42704: constraint does not exist`.

**Resolution in this Pipeline:** Block 2 was CREATE OR REPLACE'd as v2 (migration `m1_lens_1b_foundation_block2_toggle_active_offering_v2_index_inference`) using `ON CONFLICT (tenant_id, offering_id, location_id) WHERE (is_deleted = false)` index-inference. Smoke #2 re-ran cleanly. SPEC §0 D11 explicitly pre-authorized this fallback ("if Postgres rejects `ON CONFLICT (cols) WHERE pred` ... executor falls back to `ON CONFLICT ON CONSTRAINT` — pre-authorized M1B0 precedent" — the REVERSE direction was equally pre-authorized).

**Suggested disposition:** **DISMISS** — resolved in-pipeline via pre-authorized SPEC fallback. Promote to **Executor Proposal #1 in EXECUTION_REPORT** as a "Index-vs-Constraint distinguisher" Step 1.5 sub-step, so the next SPEC writes the right syntax on first try (5 minutes saved).

---

## F-2 — Iron Rule 7 specialized-join carve-out: 10 `sb.from()` hits on globally-readable catalog tables

**Severity:** INFO (SPEC author-side imprecision; conforms to Iron Rule 7 + Phase 1A precedent).

**Location:** `modules/lens-inventory/lens-inventory-filters.js` (3 calls), `modules/lens-active-designs/lens-active-designs-tree.js` (3 calls), `modules/lens-pricing/lens-pricing-filters.js` (3 calls); + 1 comment match in `lens-inventory-main.js:4`.

**Description:** SPEC §3 criterion 16 says "All DB reads through `fetchAll`/`sb.rpc` (Iron Rule 7 — D5 adaptation) — zero `sb.from(` matches in the 3 new JS folders". The 3 new JS folders contain 10 `sb.from()` calls — all on `lens_brand`, `lens_design`, `lens_variant`. These tables are globally-readable platform catalog (they use `owner_tenant_id` NOT `tenant_id`). `fetchAll` auto-injects `eq('tenant_id', tid)` which returns 0 rows on these tables. Iron Rule 7 itself says "Never call `sb.from()` directly except for specialized joins impossible through helpers" — these reads ARE specialized (globally-readable, no tenant_id filter applicable). Phase 1A `modules/lens-catalog-admin/*` uses the same pattern.

**Suggested disposition:** **REFINE SPEC §3 CRITERION 16** for future SPECs to say "zero `sb.from(` matches on TENANT-SCOPED tables" — the original wording was overly strict. Add a Foreman-side note that for SPECs touching the `lens_*` catalog hierarchy, the carve-out is automatic. Acceptable as-is for this SPEC (Reviewer adjudicates). **No follow-up SPEC needed.**

---

## F-3 — Demo `supplier_catalog_offering.vat_rate_id` is NULL, not the IL active VAT rate

**Severity:** LOW (smoke-scenario authoring imprecision).

**Location:** demo tenant's only `supplier_catalog_offering` row (`afbc1b20-4b9c-4d4e-90f0-d2802ad0e3da`).

**Description:** SPEC §14 Smoke #3 expected `final price = catalog × 1 + VAT 18%` (≈ 118). Reality: the offering row has `vat_rate_id=NULL` and `is_vat_inclusive=false`, so `effective_price`'s VAT branch (`IF NOT v_offering.is_vat_inclusive AND v_offering.vat_rate_id IS NOT NULL`) does NOT fire — final is 100. The SPEC §0 Smoke-touched schema audit verified columns existed but didn't enumerate the actual values of the demo row.

**Suggested disposition:** **PROMOTE TO AUTHOR PROPOSAL #2 in EXECUTION_REPORT** as a "Fixture content audit" sub-step to A2 Smoke-touched schema audit — pin actual row values for smoke-asserting rows, not just column shapes. Promotion candidate for next M1 Pipeline. **For THIS SPEC:** TEST_REPORT documents the actual behavior (no VAT link → final=100); no fixture mutation needed. Sibling SPEC may seed a VAT-linked offering to enable richer pricing scenarios.

---

## F-4 — Sparse demo lens catalog fixtures (1 brand / 1 design / 1 variant)

**Severity:** LOW (already tracked as M1A-DEBT-04; SPEC §0 D4 anticipated; smoke scenarios adapted at author time).

**Location:** demo tenant catalog state (`lens_brand`=1, `lens_design`=1, `lens_variant`=1, `supplier_catalog_offering`=1).

**Description:** Brief §2 Smoke #1 hoped for "7+ brands display, drill into Hoya → Stellify". Actual demo state has only 1 brand/design/variant (M1A seed). SPEC §0 D4 captured this and adapted Smoke #1 to "1+ brand display". The screens render correctly with sparse data; Smoke #5 bulk operation runs on 1 variant (function returns count=1 instead of expected 3). All smoke #5 assertions adapted accordingly.

**Suggested disposition:** **TECH_DEBT** — extend `M1A-DEBT-04` lineage in MASTER_ROADMAP §5. Recommended action: a follow-up fixture-seed SPEC (or sibling `M1_LENS_PHASE_1B_PROCUREMENT` can include richer fixtures as part of its Goods Receipt + PO smoke). Not blocking Phase 1B foundation close.

---

## F-5 — `effective_price` has 2-line JWT guard, not 3-role Block A (pre-existing, not introduced by this SPEC)

**Severity:** INFO (pre-existing Phase 1A pattern; out of scope for this SPEC).

**Location:** `public.effective_price(p_offering_id, p_tenant_id, p_as_of_ts)` body, lines for `v_jwt_tenant := nullif(...) ; IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN RAISE EXCEPTION ...`.

**Description:** The Phase 1A `effective_price` RPC uses a 2-line JWT guard without the `service_role` bypass branch that Block A canonical header provides. This means service_role callers (Edge Functions) cannot invoke `effective_price` without setting a fake tenant_id claim. The 3 new RPCs in THIS SPEC use the canonical 3-role-aware Block A header; `effective_price` does not. This is a pre-existing M1A inconsistency.

**Suggested disposition:** **DISMISS for THIS SPEC** (out of scope — Iron Rule 7's "one concern per task"). **Flag for project-wide SECURITY DEFINER hardening SPEC** (already mentioned in M1A FOREMAN_REVIEW F-7's project-wide hardening note). When that SPEC ships, it will normalize all 10+ M1 SECDEF functions to Block A.

---

## Summary

5 findings logged. Disposition distribution:

- **In-pipeline resolved:** 1 (F-1 via SPEC §0 D11 pre-authorization)
- **SPEC refinement (Foreman):** 1 (F-2 — refine criterion wording for future SPECs)
- **Promoted to EXECUTION_REPORT proposal:** 2 (F-1 → Executor Proposal #1; F-3 → Author Proposal #2)
- **TECH_DEBT extension:** 1 (F-4 — extend M1A-DEBT-04 lineage)
- **Dismiss / future SPEC:** 1 (F-5 — pre-existing inconsistency, batched into future hardening SPEC)

No HIGH or CRITICAL findings. No findings blocked smoke close. No findings forced an escalation to Daniel.

---

*End of FINDINGS.md. opticup-executor, Full-Auto Pipeline single chat, 2026-05-15.*
