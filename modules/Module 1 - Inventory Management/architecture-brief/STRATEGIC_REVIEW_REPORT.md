# Strategic Review Report — M1 Lens Inventory Phase 1A

**Reviewer:** opticup-strategic (fresh independent session, 2026-05-15)
**Reviewed:** Brief, handoff, decisions/M1.md (D-M1-01..16), 7 mockups, M1↔M9 overlap report, Phase 1A SPEC + EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW, sibling SPECs (`M1A_CURRENCIES_GLOBAL_HOTFIX`, `M1A_DEBT_SWEEP`), Phase 1B stub, live Supabase (read-only SELECTs).
**Verdict:** 🔴 **RE-OPEN** (downgrade from Foreman's 🟡).
**Phase 1B readiness:** **BLOCKED** — three CRITICAL latent bugs in the operations RPCs + the PO/PO-line/supplier_debt schema is absent.

**Rationale.** Phase 1A's 22 criteria were satisfied as DDL artifacts — 17 tables, RLS on, 9 RPCs, K5 view, K3 trigger, EF ACTIVE, admin screen loads. But the smoke test (criterion 22) was a single `INSERT INTO lens_brand` + cross-tenant-read attempt + `DELETE`. **No operations-layer RPC was exercised end-to-end.** Live inspection shows `m1_create_receipt_from_box`, `record_transfer`, and `record_adjustment_found` all funnel through `record_stock_movement` in a way that violates a `CHECK` on the first call — the schema was sealed and shipped but never run. The Foreman's 🟡 capped on a single deferred doc; real exposure is larger. Phase 1B would start on top of dead RPCs.

---

## 1. Axis-by-axis findings

### Axis A — Decision coherence (D-M1-01 .. D-M1-16)

**A-01 — CRITICAL — K5 View `v_suppliers_for_m9` granted to `anon`.**
The SPEC §3 #11 said `GRANT SELECT TO authenticated, service_role. NOT GRANT TO anon`. Live: `information_schema.role_table_grants` shows `anon:SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER` on `v_suppliers_for_m9`. Migration 5/5 lines 383 GRANTs to `authenticated, service_role` but never `REVOKE`s the default `anon` grants that Postgres assigns when a view is created in the `public` schema. With `security_invoker=on` and the JWT-claim RLS on `suppliers`, anon queries return 0 rows in practice — but the GRANT itself is the Iron Rule 13 contract violation, and a future RLS regression on `suppliers` (or any unintended `WHERE` change in the view definition) would leak supplier identity to the public web. **Action:** new SPEC stub `M1A_K5_VIEW_ANON_REVOKE` — one-liner `REVOKE ALL ON v_suppliers_for_m9 FROM anon, PUBLIC;`. Evidence: `migrations/20260514180400_*.sql:383`; live `role_table_grants` query.

**A-02 — HIGH — D-M1-11 (supplier_debt at receipt time) is not implementable.**
The decision says debt rows are created at goods-receipt time, not PO time. Live: `to_regclass('public.supplier_debt') IS NULL` — there is **no `supplier_debt` table in the database at all**, and no `*debt*` table either. Mockup #7 §"💰 חוב שייווצר" (lines 572–595) renders a debt panel that has nothing to write to. The K2 RPC body (`m1_create_receipt_from_box`, migration 5/5 lines 305–356) contains zero INSERTs into a debt table. Phase 1B's GR screen cannot satisfy D-M1-11 without first shipping the supplier_debt schema. The Brief implied this would land in Phase 1A; it didn't. Evidence: live `to_regclass`; migration 5/5 body.

**A-03 — MEDIUM — K3 trigger lacks defense-in-depth on `NEW.tenant_id`.**
`m9_lens_received_for_sale_order_trg_fn` (migration 5/5 lines 359–370) is `SECURITY DEFINER` and stamps `NEW.tenant_id` into `pending_lens_advancement_queue`. RLS on the queue is canonical, and the JWT check inside `record_stock_movement` upstream catches cross-tenant attempts — but a future service-role caller INSERTing directly to `stock_movement` would bypass that guard. Add `IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;` at minimum.

**SaaS litmus (Axis A).** Tenant 2 catalog/pricing reads work post-D-M1-16 (currencies global). The receipt path is broken regardless of tenant — correctness, not SaaS, is the bottleneck.

---

### Axis B — End-to-end flow walkthrough

**Scenario 1 (happy path — custom-per-customer lens):** 🔴 **GAP — broken at receipt-write step.**

**B-01 — CRITICAL — `record_stock_movement` double-adds `qty_remaining` on creation movements.**
Migration 5/5 lines 146–147 unconditionally do `UPDATE stock_lot SET qty_remaining = qty_remaining + p_qty_delta`. Correct for *consuming* movements (sale, transfer_out, adjustment_lost) where the lot pre-exists. **Wrong** for *creation* movements (receipt, transfer_in, adjustment_found), where the caller has just INSERTed the lot with `qty_received = qty_remaining = X` and then calls with `qty_delta=+X` — the UPDATE makes `qty_remaining = 2X`, violating `stock_lot_check CHECK ((qty_remaining >= 0) AND (qty_remaining <= qty_received))` (live `pg_constraint` confirmed). The transaction aborts on the first line. **All three orchestrators (`m1_create_receipt_from_box`, `record_transfer`, `record_adjustment_found`) chain through this and fail.** No automated test catches it — Phase 1A smoke was `lens_brand`-only. Fix: branch on `movement_type`, UPDATE only for consuming movements. Evidence: migration 5/5 lines 146–147, 192–204, 232–245, 327–352.

**B-02 — CRITICAL — `tenant_lens_stock` has no UNIQUE for the `ON CONFLICT` clause.**
`record_stock_movement` lines 148–153 do `INSERT INTO tenant_lens_stock(...) ON CONFLICT (tenant_id, variant_id, location_id, sph, cyl, add_value) DO UPDATE …`. Live `pg_constraint` query against `tenant_lens_stock` returns **zero** rows of `contype='u'` — there is no UNIQUE constraint and no UNIQUE index on those six columns. Postgres will raise `there is no unique or exclusion constraint matching the ON CONFLICT specification`. The first ever insertion into `tenant_lens_stock` will error out. Same caveat as B-01 — never exercised. Fix: `CREATE UNIQUE INDEX … ON tenant_lens_stock(tenant_id, variant_id, location_id, sph, COALESCE(cyl, -999), COALESCE(add_value, -999))` (nullable columns need `COALESCE` or `NULLS NOT DISTINCT` in the index). Evidence: live `pg_constraint` query (Audit 6); migration 5/5 line 151.

**Scenario 2 (returned/defective):** 🟡 **PARTIAL.** `stock_movement.customer_return_id` exists, `stock_lot.origin_type='customer_return'` is a valid enum value, but `to_regclass('public.customer_return') IS NULL`. Brief §3 deferred this. For Phase 1B, deduction-at-receipt is handled by `purchase_receipt_line.discrepancy_qty/reason/status` (verified present); deduction-after-receipt is K4/M9 lab-loss scope.

**Scenario 3 (1:N supplier, one-shot PO to B):** 🟢 **COVERED at schema layer.** Partial UNIQUE `(tenant_id, brand_id) WHERE status='active'` (live `pg_indexes`) — drop the partial for 1:N as promised. `pricing_overlay`'s exactly-one-scope CHECK means each supplier's offer carries its own overlay. The UI gap is the PO screen (Phase 1B, blocked by C-01).

---

### Axis C — Cross-module contracts (M1 ↔ M9, M1 ↔ M7, M1 ↔ M5/M6)

**C-01 — CRITICAL — `purchase_order` + `purchase_order_line` tables not shipped.**
Live `to_regclass('public.purchase_order') IS NULL`, but `purchase_orders` (plural, legacy frames era) exists. The Phase 1A SPEC resolved Open Question #1 with option (c) divergence for `goods_receipts` / `purchase_receipt` — but **never declared the corresponding resolution for `purchase_orders` / `purchase_order`**. Consequence: `stock_lot.purchase_order_id UUID` exists as a column with no FK clause (verified), waiting for a table that doesn't exist. D-M1-10's reconciliation back-pointer is dangling. M7's custom-per-customer PO line — `purchase_order_line.sale_order_id NULL` — has nowhere to be written. Phase 1B's PO screen (#4) and Active POs List (#6) have no schema. This was a Phase 1A scope omission, not a deferred phase split.

**C-02 — MEDIUM — K3 queue consumer is undeclared.**
`pending_lens_advancement_queue` (9 columns including `processed_at`) is correctly enqueued by the K3 trigger, but the M9 SPEC has not yet declared the cron/listener that drains it. For Phase 1A this is fine — M9 is downstream — but Phase 1B's Goods Receipt screen should not display "M9 lab_job יתקדם" in the side panel (mockup #7 line 564 wording) until the drain mechanism is wired. Action: defer mockup wording change to Phase 1B SPEC and ensure the Phase 1B GR screen renders the queue-entry without claiming downstream effect.

**C-03 — LOW — M5/M6 contract surface is clean.** `prescription_id` and `customer_id` are not on any lens table (D-M1 ruling held); the FK chain for the Phase 1B PO line goes via `purchase_order_line.sale_order_id` → M7 `sale_order.customer_id` → M5 `customers.id` → M6 `prescriptions.sale_order_id`. M6 ownership of AXIS is honored.

**K1-K5 status.** K1 (M9 scope) — clean, no M1 dep. K2 (`m1_create_receipt_from_box`) — deployed, **broken by B-01/B-02**. K3 (trigger + queue) — deployed, M9 consumer pending. K4 (`m1_record_lens_loss`) — out-of-scope. K5 (`v_suppliers_for_m9`) — `security_invoker=on`, **broken by A-01 anon GRANT**.

---

### Axis D — Phase 1B readiness gate

Phase 1B's 6 screens map to schema availability as follows:

| Screen | Tables it reads/writes | RPCs it calls | Status |
|---|---|---|---|
| 1 Lens Inventory Mgmt | `tenant_lens_stock`, `stock_lot`, `stock_movement` | `record_stock_movement`, `record_adjustment_found` | 🔴 RPCs broken (B-01/02) |
| 2 Active Designs Selection | `tenant_active_offerings`, `supplier_catalog_offering`, `lens_design` | none direct | 🟢 schema present |
| 3 Catalog & Pricing | `supplier_catalog_offering`, `pricing_overlay`, `vat_rates` | `effective_price` | 🟡 effective_price untested + FX missing (E-01) |
| 4 Purchase Order | **`purchase_order` (missing)**, `purchase_order_line` (missing), `tenant_lens_stock` (reorder) | new RPC needed | 🔴 schema absent (C-01) |
| 6 Active POs List | `purchase_order` (missing) | none | 🔴 schema absent (C-01) |
| 7 Goods Receipt | `purchase_receipt`, `purchase_receipt_line`, `stock_lot`, `supplier_debt` (missing) | `m1_create_receipt_from_box` | 🔴 RPC broken + supplier_debt missing (A-02, B-01) |

**Three of six screens are hard-blocked. One more is soft-blocked.** The Phase 1B stub (this folder's sibling) is correct that it cannot execute until 1A's RPC math works.

---

### Axis E — Currency + VAT

**E-01 — HIGH — `effective_price` has no FX-conversion step.**
The handoff §"Critical RPCs" promised an orchestrator `_active_overlays → _apply_stacking → _convert_currency → _apply_vat`. Live body (migration 5/5 lines 251–302) executes overlays → VAT, **skipping FX**. `supplier_catalog_offering.currency_code` is `TEXT`, the tenant's base is `tenants.default_currency` — but `effective_price` returns the price in the offering's currency, never converting. The Phase 1B Pricing screen will render mixed-currency rows un-converted; a 3-currency mixed PO cart cannot total correctly. Israeli VAT tax filings would also be wrong if any offering is EUR/USD denominated. Fix in Phase 1B's pricing layer or as a separate hotfix: add `fx_rates` (or extend `vat_rates` semantics) plus a `_convert_currency(amount, from_code, to_code, as_of)` helper.

**E-02 — MEDIUM — VAT rounded at total, not line.**
`effective_price` line 300 `ROUND(v_running_price, 2)` rounds after the VAT multiply. Israeli tax law is line-level — `ROUND(line_amount × (1+vat/100), 2)` per line, then sum. For single-item retrieval this is identical; in PO totals across multiple lines, the totals can differ by ₪0.01–0.05. Defer to invoicing module (M7/M8) — but document the convention.

**E-03 — LOW — `currency_code` is TEXT, not FK.**
`supplier_catalog_offering.currency_code` and `pricing_overlay.currency_code` are `text` (verified). Promoting `currencies` to global (hotfix D-M1-16) made the FK feasible; not adding it leaves typo risk. Phase 1B housekeeping.

**Three-tenant scenarios:**
- ILS+18% — works today (`currencies` has ILS, `vat_rates` has 1 Israel row).
- EUR+21% (Germany) — currency present, **VAT row absent**; tenant-2 onboarding inserts a `vat_rates(country_code='DE', rate_pct=21, ...)`. `vat_rates` is platform-owned with `owner_tenant_id NULL/owner` columns — confirm seeding path before tenant-2.
- GBP+20% (UK) — both `currencies` (GBP) absent and `vat_rates` absent; need both. Each new tenant should seed via the Platform Catalog Admin (currently the admin screen has no UI for VAT or currencies).

---

### Axis F — Bulk-import / Platform Catalog Admin

**F-01 — MEDIUM — No public xlsx schema doc.**
The EF (`supabase/functions/lens-catalog-import/index.ts` lines 14–17) accepts a JSON `rows[]` payload; the browser-side admin screen (`modules/lens-catalog-admin/catalog-import.js` line 30) parses xlsx via SheetJS in the browser, then POSTs JSON. The column contract is in TypeScript at `validate.ts`. **There is no Markdown spec for vendors who feed us catalogs.** Vendors today are Optic Up staff, so the urgency is low — but a `supabase/functions/lens-catalog-import/README.md` documenting the 16-column expected shape (`brand_name, design_name, variant_index, …`) is a 30-minute lift and removes implicit knowledge from a TypeScript file. Defer to a 1.5-housekeeping SPEC.

**F-02 — LOW — Cascade behavior on rename/delete is implicit.**
`lens_design.brand_id` is `ON DELETE RESTRICT` and `lens_variant.design_id` is `ON DELETE RESTRICT` (verified). Good — you cannot delete a brand that has designs. But the catalog screen uses `window.prompt()` for Add/Edit per executor decision D12; the rename UX is not specified in any mockup, and there is no published cascade policy ("renaming Hoya to HOYA — does anything break?"). Defer to Phase 2+ when the supplier portal opens.

**F-03 — LOW — Lens Catalog Admin uses `window.prompt()` for Add flows (executor D12).**
Stated explicit as time-boxed to Phase 1A. Verify Phase 1B has a follow-up to replace with `Modal.*` dialogs (mockup #5 implies modals, not prompts).

---

### Axis G — Reviewer of the Foreman's own role (covered in §2 below).

### Axis H — Hidden risks for Phase 1B (covered in §3 below).

---

## 2. Concurrence with FOREMAN_REVIEW

The Foreman wrote 2 Author and 2 Executor proposals (not 6+2 — the Brief miscounted). I treat the 4 individually and add 4 of my own that the Foreman missed.

**Author Proposal 1 (live-state DB probes at SPEC author time).** 🟢 AGREE. Already applied in `M1A_CURRENCIES_GLOBAL_HOTFIX/SPEC.md §0`. Should have caught A-02 (`supplier_debt` doesn't exist) and C-01 (`purchase_order` doesn't exist) at author time. The lesson is real but **insufficient in scope**: probes today cover existence of named columns; they do not cover *whether downstream RPC bodies actually work against those tables*. See my own Proposal #5 below.

**Author Proposal 2 (verify-script compatibility scan).** 🟢 AGREE. Already applied. Caught zero issues in this audit — the hooks are loose enough that they don't surface the runtime bugs (B-01, B-02).

**Executor Proposal 1 (pre-edit file-scan probe).** 🟢 AGREE. The `db-schema.sql` defer was forced by 48 legacy violations; the new step would have surfaced this upfront. Already codified in skill improvement #1 (the M1A_DEBT_SWEEP commit chain).

**Executor Proposal 2 (staged-set sanity check).** 🟢 AGREE. The `f1789c7` cross-pollination commit was 100% avoidable.

**Foreman verdict 🟡 — I disagree, downgrade to 🔴.** The doc-deferral is a 🟡 issue; the three CRITICAL latent RPC bugs + the missing PO schema are 🔴. The spot-check verification in §5 of FOREMAN_REVIEW.md checked existence (17 tables, 9 RPCs, EF version) but never *invoked* any RPC with realistic inputs. A 30-second `SELECT m1_create_receipt_from_box(...)` test on demo with a valid offering would have surfaced both B-01 and B-02 before SPEC closure.

**Four proposals the Foreman missed (my additions):**
1. **Functional smoke before SPEC close, not just existential smoke.** If the SPEC ships an RPC, the smoke must call it at least once on demo with realistic inputs. Add to opticup-strategic Step 1.6.1.
2. **Mandatory `REVOKE … FROM anon, PUBLIC` clause in every new View migration.** Postgres' default `public` schema grant pattern leaked through Phase 1A's K5 view. Add to opticup-executor's RLS playbook.
3. **Cross-Authority-Matrix audit when SPEC resolves an Open Question with "divergence".** Phase 1A's Q1 resolution chose option (c) divergence for `goods_receipts` but never decided the same for `purchase_orders` — and both terms appear in the Brief. Authorship discipline: when option (c) is chosen for any noun, enumerate every related noun in the same schema namespace.
4. **`tenants.default_currency` literal-value reuse over duplicate columns** (A-02-style). The SPEC asked for `tenants.base_currency_code`; live had `default_currency`. Reuse was the right call but should be the *first* check in §1.5, not a post-hoc adaptation logged in FINDINGS.

---

## 3. Top 5 risks for Phase 1B (ranked)

1. **B-01 + B-02 must be fixed before Goods Receipt or Inventory screens land.** Mitigation: hotfix SPEC `M1A_OPERATIONS_RPCS_FIX` — patch `record_stock_movement` to branch on `movement_type`, add the missing `tenant_lens_stock` UNIQUE index, add a functional smoke that calls `m1_create_receipt_from_box` end-to-end on demo.
2. **C-01 (no `purchase_order` table) blocks 2 of 6 screens.** Mitigation: extend Phase 1B SPEC scope to include the PO/PO-line schema, OR split Phase 1B into 1B-a (Inventory + Designs + Pricing — 3 screens, schema present) and 1B-b (PO + POs List + Goods Receipt — 3 screens, needs PO schema first).
3. **A-02 (supplier_debt missing) breaks D-M1-11.** Mitigation: add `supplier_debt` schema to Phase 1B SPEC scope alongside the GR screen, or carve out a `M1B0_SUPPLIER_DEBT_SCHEMA` micro-SPEC.
4. **E-01 (no FX conversion in effective_price).** Mitigation: defer multi-currency cart math to a tenant-2 onboarding SPEC; restrict Phase 1B Pricing screen to single-currency display per offering ("₪ — בעלות ספק") and surface the FX gap as a tooltip.
5. **Phase 1B velocity assumption.** Six customer-facing screens in one SPEC is the largest single scope this module has attempted. Phase 1A shipped in 12 commits + 1 hotfix + 1 debt-sweep = effectively 3 SPECs. Force the split (see risk 2's mitigation).

---

## 4. Pre-Phase-1B questions for Daniel

**Q1. Order of remediation: hotfix the broken RPCs (B-01/B-02) before any Phase 1B screen, or roll the fix into the first Phase 1B SPEC?**
Recommendation: **dedicated `M1A_OPERATIONS_RPCS_FIX` hotfix first**. The bugs touch all three orchestrator RPCs; fixing them inside Phase 1B mingles UI work with infrastructure work and re-opens the "what shipped, what didn't" question for the reviewer.

**Q2. Where does `purchase_order` schema land — in a Phase 1A2 micro-SPEC, in Phase 1B, or split Phase 1B?**
Recommendation: **split Phase 1B into 1B-a (3 screens: Inventory + Designs + Pricing, schema-ready today) and 1B-b (PO + POs List + Goods Receipt, needs `purchase_order` + `purchase_order_line` + `supplier_debt` schema first)**. 1B-a unblocks daily-use screens while 1B-b's schema half is being designed. Aligns with the Architect's original 2-sub-phase preference.

**Q3. Multi-currency for tenant-2 — is FX a Phase 1B blocker or a tenant-2-onboarding blocker?**
Recommendation: **tenant-2-onboarding blocker, not Phase 1B**. Israel-only Day-1 means ILS-only, so `effective_price` returning the offering's native currency is fine when every offering is ILS. Document the FX gap explicitly in the Phase 1B Pricing screen and tie its closure to the tenant-2 readiness checklist.

---

## 5. Final verdict + Phase 1B gate

**Verdict: 🔴 RE-OPEN.** The schema is sealed and correct as a static artifact; the operations-layer RPCs are broken end-to-end and were never functionally smoked. The Foreman's 🟡 verdict reflected what was on disk; this review reflects what runs.

**Phase 1B gate (must all pass before Phase 1B SPEC dispatches):**
1. `record_stock_movement` patched to branch on `movement_type` for `qty_remaining` UPDATE — verified by `INSERT INTO stock_lot(qty_received=5, qty_remaining=5)` + `record_stock_movement(qty_delta=+5)` + post-check `qty_remaining = 5`.
2. UNIQUE index on `tenant_lens_stock(tenant_id, variant_id, location_id, sph, COALESCE(cyl,…), COALESCE(add_value,…))` created — verified by `m1_create_receipt_from_box` end-to-end on demo with one custom-per-customer line + one stock line.
3. `REVOKE ALL ON v_suppliers_for_m9 FROM anon, PUBLIC;` applied — verified by `role_table_grants` query returning no `anon` row.
4. `purchase_order` + `purchase_order_line` + `supplier_debt` schema decision documented (D-M1-17?) and either shipped or explicitly scoped into 1B-b.
5. Functional smoke added to demo tenant covering: 1 receipt with 2 lines (1 custom-per-customer + 1 stock), 1 transfer, 1 adjustment_found, 1 price resolution via `effective_price`. Recorded in the Phase 1A hotfix SPEC's TEST_REPORT.

Until all five clear, Phase 1B remains **BLOCKED**.

---

*End of Strategic Review Report. Read-only audit, evidence-backed, no follow-up SPECs authored — Daniel + Architect decide which findings become SPECs.*
