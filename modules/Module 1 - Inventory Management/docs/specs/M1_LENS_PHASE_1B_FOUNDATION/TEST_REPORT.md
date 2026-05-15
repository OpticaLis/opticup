# TEST_REPORT.md — M1_LENS_PHASE_1B_FOUNDATION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/TEST_REPORT.md`
> **Written by:** opticup-executor (Full-Auto Pipeline single chat)
> **Written on:** 2026-05-15
> **Tenant under test:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
> **Scope:** 9 functional smoke cases per SPEC §14.

---

## Summary

**9/9 PASS** (verdict 🟢 at executor scope).

The mandatory functional smoke discipline (M1A precedent) caught one real bug
mid-run: Block 2's v1 RPC used `ON CONFLICT ON CONSTRAINT
tenant_active_offerings_unique`, but that name resolves to a UNIQUE **INDEX**
(not constraint) — `ON CONFLICT ON CONSTRAINT` only works for constraints.
The SPEC §0 D11 explicitly pre-authorized switching between `ON CONFLICT
(cols) WHERE pred` and `ON CONFLICT ON CONSTRAINT name` based on what
Postgres accepts at smoke time. Block 2 was CREATE OR REPLACE'd with the
correct inference syntax (v2 migration) and Smoke #2 re-ran cleanly. No
escalation needed.

Live-browser console verification (Smoke #9) was performed at the JS-syntax
level (`node --check` passed on all 13 files); full DOM-interaction
verification on Demo is deferred to Daniel manual QA per the Brief's
post-close handoff plan.

---

## Smoke results table

| # | Case | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Inventory display fixtures | 🟢 PASS | `lens_brand`=1, `lens_design`=1, `lens_variant`=1, `tenant_lens_stock` (demo)=3, `stock_lot` (demo)=7. Counts match D4-adapted scenario in SPEC §14. |
| 2 | `toggle_active_offering` INSERT-then-UPDATE round-trip | 🟢 PASS | INSERT path returned new row id; UPDATE path on second call set `is_active=false`. Final state: `count(*)=1, is_active=false` for `(demo, offering=afbc1b20-..., location_id=NULL)`. **Note:** v1 of Block 2 failed at this case with `42704: constraint "tenant_active_offerings_unique" does not exist` — fixed by v2 migration switching to index-inference (`ON CONFLICT (cols) WHERE pred`). SPEC §0 D11 pre-authorized this fallback. |
| 3 | `effective_price` for demo offering | 🟢 PASS | RPC returned `100.00` (catalog `100.0000` × no overlay × no VAT — demo offering has `vat_rate_id=NULL`). Matches expected for a no-overlay/no-VAT-link state. |
| 4 | `upsert_pricing_overlay` inline edit 10% | 🟢 PASS | INSERT path returned overlay row id; `effective_price` re-call returned `90.00` (= 100 × (1 - 10/100)). Final state: 1 active overlay row with `discount_pct=10, application_order=100`. |
| 5 | `bulk_apply_pricing_overlay` bulk 5% on 1 variant | 🟢 PASS | RPC returned `1` (rows inserted). Empty array call returned `0`. Final state: 2 active overlay rows (the inline #4 10% + the bulk #5 5%, distinct `application_order`). |
| 6 | Anon-reject for all 3 RPCs | 🟢 PASS | Test set JWT to `{"role":"anon"}` (no tenant_id). DO block called all 3 RPCs in `BEGIN…EXCEPTION WHEN insufficient_privilege` blocks; counter reached 3/3 catches (block completed without external error → all 3 raised 42501). Pre-fix attempt with execute_sql (no JWT at all) also caught 42501 on Block 2 — independent evidence that Block A 3-role guard catches both `anon` role and no-claims-at-all scenarios. |
| 7 | Cross-tenant reject (demo JWT → prizma tenant_id) for all 3 RPCs | 🟢 PASS | Test set JWT to demo tenant_id, called all 3 RPCs with `p_tenant_id = prizma`. DO block reached 3/3 catches. Prizma data verified untouched: `tenant_active_offerings` (prizma)=0, `pricing_overlay` (prizma)=0. |
| 8 | Permission gate code path | 🟢 PASS | grep confirms 3 main JS files each call `hasPermission('lens.<area>.<verb>')` with the correct key per screen: `lens.inventory.view` (line 38), `lens.designs.manage` (line 26), `lens.pricing.manage` (line 28). All 3 screens render `#access-gate` div + hide `#app` if missing. End-to-end UI verification deferred to Daniel manual QA. |
| 9 | JS syntax / browser-render | 🟢 PASS (syntax) — Browser-render deferred | All 13 new JS files pass `node --check` syntax validation. HTML load order mirrors `inventory.html` pattern; all globals reference existing project APIs (`hasPermission`, `fetchAll`, `sb`, `Modal`, `Toast`, `escapeHtml`, `getTenantId`). Live console-error verification on Demo requires running app — Daniel manual QA per Brief's post-close handoff. |

---

## Fixture state at end of smoke (demo)

| Table | Rows after smoke | Notes |
|---|---|---|
| `permissions` (id LIKE 'lens.%') | 6 | 3 keys × 2 tenants (demo + prizma) |
| `tenant_active_offerings` (demo) | 1 | created by Smoke #2; `is_active=false` after toggle |
| `pricing_overlay` (demo) | 2 | created by Smoke #4 (10%) + Smoke #5 (5%); both `status=active` |
| Prizma data | 0 changes | criterion 25 satisfied |
| Pre-existing M1A+M1B0 fixtures | preserved | M1A-DEBT-04 lineage extended (per SPEC §6 rollback decision) |

---

## Advisors snapshot

`scripts/audit/advisors-for-objects.mjs` against the 3 new RPCs:

```
advisors-for-objects: 0 HIGH matches across 3 named objects (117 advisor entries scanned).
```

Criterion 23 satisfied. No new HIGH/ERROR security or performance lints.

---

## What was NOT tested at executor scope

- **Live browser interaction.** Click filters, change cascade dropdowns, drill into lots, click ➕➖ stubs, see toasts, see Modal dialog — all require running app. Daniel manual QA per Brief's plan.
- **Console error capture.** Same as above.
- **Performance.** Single-variant demo doesn't stress-test page-load or RPC throughput.
- **RTL/UI polish.** Mockups are sealed (out of scope per Brief §3); the screens implement minimum interaction surfaces, not pixel-matched mockups. UI polish is a sibling SPEC concern.

These are honest scope limits, not bugs.

---

*End of TEST_REPORT.md. 9/9 PASS at executor scope; live-browser final-mile deferred to Daniel manual QA.*
