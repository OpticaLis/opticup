# FINDINGS — M1_LENS_PRICING_REBUILD

> **Written by:** opticup-executor
> **Written on:** 2026-05-17

3 findings logged; F-3 absorbed as in-flight Tier C hotfix; F-1 and F-2 require follow-up SPECs.

---

## F-1 — `lens_variant_notes.author_id` FK targets `auth.users(id)` but project uses PIN auth → notes CRUD blocked (MEDIUM)

**Severity:** MEDIUM (UI surface ships; write path predictably fails)
**Location:**
- DB: `lens_variant_notes_author_id_fkey` FK constraint (verified via `pg_constraint` 2026-05-17) → `auth.users(id)`
- JS: `modules/lens-pricing/lens-pricing-drawer.js addNote()` calls `sb.from('lens_variant_notes').insert({ author_id: emp.id, ... })` where `emp.id` is from sessionStorage's `tenant_employee` = `employees.id` (NOT `auth.users.id`)
- Project auth: PIN-based via `pin-auth` Edge Function. `sb.auth.getUser()` returns empty `{}` — no Supabase Auth session.

**Description:** SPEC 3 (M1_LENS_DB_SCHEMA_RECEIPTS_NOTES) shipped `lens_variant_notes.author_id UUID NOT NULL REFERENCES auth.users(id)`. This was caught here at SPEC 5's first CRUD attempt: the add-note flow fires the canonical `addNote` path → INSERT → Postgres rejects with `lens_variant_notes_author_id_fkey` violation because no `auth.users` row exists for the demo `tenant_employee.id`.

The project's auth model is PIN tokens (Edge Function mints JWT with `tenant_id` claim, no `auth.users` row created). The FK target is structurally incompatible with how the project authenticates users.

**Why not absorbed into SPEC 5:**
- SPEC §"Forbidden" explicitly rules out DDL (Iron Rule 21 + scope discipline)
- The fix is a 1-line DDL: `ALTER TABLE lens_variant_notes DROP CONSTRAINT lens_variant_notes_author_id_fkey, ADD CONSTRAINT lens_variant_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES employees(id) ON DELETE SET NULL` — clean follow-up SPEC, not a SPEC 5 absorption.

**Suggested next action:** Author follow-up SPEC `M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX` (~30 min):
- DROP existing FK constraint
- ADD new FK constraint targeting `employees(id) ON DELETE SET NULL` (so deleted employees don't cascade-delete their notes)
- Verify no orphan rows currently exist (lens_variant_notes is empty on demo + Prizma per pre-flight)
- No JS change needed in SPEC 5's drawer.js after the FK pivot

Acceptable alternative: keep the auth.users FK BUT ensure every employees row has a matching auth.users row via the pin-auth EF on first login. That's a much bigger architectural pivot (PIN auth ↔ Supabase Auth bridge) — not recommended.

---

## F-2 — F-5 lot-pane wiring correct but demo data has 0 stock_lot rows with supplier_offering_id (INFO)

**Severity:** INFO (wiring proven correct via pricing screen; demo data gap blocks live cross-tab proof)
**Location:**
- `modules/lens-inventory/lens-inventory-lot-pane.js renderLots()` + `_resolveSellPrices()` (commit `cee4994`)
- `stock_lot` table on demo: 19 rows, 0 with `supplier_offering_id` populated

**Description:** SPEC 5 commit 2 (`cee4994`) wires the lots-table's `מחיר מכירה` column to `LensPriceResolver.resolveMany()`. The code collects `lot.supplier_offering_id` from rendered lots and asynchronously fills sell-price cells.

Tier C verification:
- **Resolver path proven correct** via the pricing screen — `window.LensPricing.effectivePrices.size = 41` after bootstrap, with first offering resolving to ₪85 (real price from `effective_price` RPC, not null).
- **Demo data gap:** all 19 demo stock_lot rows have `supplier_offering_id = NULL`. The lot-pane's resolver-fill loop runs but has 0 valid offering_ids → 0 cells updated → '—' placeholder remains.

When demo data eventually has stock_lot rows with `supplier_offering_id` populated (next Quick Receipt drawer flow that creates a lot from a known offering, OR a demo-data seed SPEC that backfills the 19 rows), the F-5 column will populate automatically. No code change needed.

**Why not absorbed into SPEC 5:** Demo-data linkage is data-engineering work, not pricing-screen work. SPEC 5 ships the consumer wiring; data-seed is a separate SPEC.

**Suggested next action:** Two options:
- **(a)** Quick demo-seed SPEC `M1_DEMO_BACKFILL_STOCK_LOT_OFFERING_IDS` (~30 min) to link the 19 existing demo stock_lot rows to their most-likely supplier_offering by variant match. Restores F-5 live verification.
- **(b)** Wait until natural usage. Once Daniel runs the Quick Receipt drawer flow on demo to receive new lens stock, the new lots will have `supplier_offering_id` set correctly via the Quick Receipt → m1_create_receipt_from_box → stock_lot insert path (verified to populate supplier_offering_id per the RPC body inspection from previous SPECs).

Recommend (a) for cleaner Tier C history on future SPECs that touch lens-inventory lots-table.

---

## F-3 — `suppliers` table query had bogus `is_deleted` filter (ABSORBED as hotfix commit `070a30d`)

**Severity:** LOW (caught + fixed during Tier C)
**Location:** `modules/lens-pricing/lens-pricing-filters.js loadBrandsAndSuppliers()` — had `.eq('is_deleted', false)` filter
**Description:** The `suppliers` table has no `is_deleted` column (verified via `information_schema.columns` — has `active` column instead). My initial query silently returned 0 rows → supplier chip-filter row showed only "הכל" without per-supplier chips.

**Action taken:** Fixed in commit `070a30d` (single-line removal of the bogus filter; `.eq('active', true)` is the actual lifecycle gate). Logged here so the pattern surfaces for future executors.

**Suggested next action:** Already resolved. Pattern note added in Executor SKILL improvement Proposal 1.

---

*End of FINDINGS. 3 entries: 1 MEDIUM (F-1 schema gap → follow-up SPEC), 2 INFO (F-2 demo data gap → optional seed SPEC, F-3 absorbed as hotfix).*
