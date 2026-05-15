# Module Brief — M1_LENS_PHASE_1B_FOUNDATION (3 read-heavy screens)

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Foreman review
**Pipeline:** Full Auto Pipeline (single chat, end-to-end)
**Branch:** `develop`. Daniel-only merge to main after Pipeline closes 🟢.
**Pre-condition:** `M1_SKILL_IMPROVEMENT_HARVEST` closed 🟢 (frozen skill state inherited).

---

## 1. Purpose

Phase 1B is being split into two halves to keep blast radius narrow and to separate **read-heavy display screens** (this SPEC) from **write-heavy transactional screens** (sibling Brief `M1_LENS_PHASE_1B_PROCUREMENT`).

This SPEC ships the **foundation half**: three screens that read the M1 Lens schema, present it to optical staff, and allow only metadata operations (activate/deactivate, edit price). No new RPCs beyond `effective_price` (Phase 1A) + light metadata-update RPCs. No goods-receipt, no PO creation, no stock movement.

After this SPEC closes, Daniel runs manual QA on the 3 foundation screens on demo with seeded catalog data. The sibling procurement SPEC then layers on top, building the heavier write-screens against a verified UI baseline.

---

## 2. Scope — In

Three screens + supporting JS + minimal metadata RPCs. Each screen lives in its own folder under `modules/lens-*/` per project convention.

### Screen #1 — Lens Inventory Management (יומיומי, צוות חנות)

**File:** `lens-inventory.html` at repo root (add to `scripts/checks/root-allowlist.json`).
**JS folder:** `modules/lens-inventory/` (4-7 sub-files, each ≤ 350 lines per Iron Rule 12).
**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html`.

**Reads:**
- `tenant_lens_stock` (FIFO state per variant + dioptry combination, filtered by `tenant_id`)
- `stock_lot` (lot-level depth on demand)
- `lens_variant` JOIN `lens_design` JOIN `lens_brand` (descriptive labels)
- `supplier_catalog_offering` (catalog/custom flag — primary filter per D-M1-01)
- `tenant_active_offerings` (which series the optic carries)

**Writes (limited):**
- None directly. Stock movements happen from the Goods Receipt screen (sibling Brief).
- The screen shows ➕➖ buttons per mockup, but in Phase 1B-foundation they are **display-only** — clicking surfaces a modal saying "Stock changes happen via Goods Receipt". (Sibling Brief wires the ➕➖ to actually create stock_movements.)

**Filters per mockup:**
- Stock vs Custom (primary)
- Brand → Design → Variant cascade
- SPH × CYL grid view
- Branch (location_id) — optional, defaults to the current branch from JWT or user setting

**No new RPCs.** This screen is pure SELECT + display.

### Screen #2 — Active Designs Selection (הקמה, מנהל סניף)

**File:** `lens-active-designs.html` at root (allowlist).
**JS folder:** `modules/lens-active-designs/` (3-5 sub-files).
**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html`.

**Reads:**
- `lens_design` + `lens_brand` (full catalog hierarchy)
- `supplier_catalog_offering` (which variants the supplier sells per design)
- `tenant_active_offerings` (current selection for the optic)

**Writes:**
- `tenant_active_offerings` — toggle a design ON/OFF for the optic. INSERT or UPDATE the row (`status='active'` / `status='inactive'`). This is the only write the screen does.

**RPCs (NEW):**
- `toggle_active_offering(p_tenant_id, p_supplier_catalog_offering_id, p_status TEXT) RETURNS UUID` — atomic UPSERT on `tenant_active_offerings`. SECURITY DEFINER, JWT-claim guard, REVOKE+GRANT discipline inherited from M1A_OPERATIONS_RPCS_FIX.

### Screen #3 — Catalog & Pricing (תמחור, מנהל)

**File:** `lens-pricing.html` at root (allowlist).
**JS folder:** `modules/lens-pricing/` (4-6 sub-files).
**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html`.

**Reads:**
- `supplier_catalog_offering` (catalog price + currency)
- `pricing_overlay` (active discounts — per D-M1-05 tiered: default-layer + variant-level exceptions)
- `lens_brand` JOIN `lens_design` JOIN `lens_variant`
- `vat_rates` (Israel row, JOIN for VAT display)
- `effective_price(p_tenant_id, p_supplier_catalog_offering_id, p_variant_id NULL)` RPC (existing — Phase 1A)

**3 price columns per D-M1-04:**
- Catalog price (read-only from offering)
- Discount % (editable inline)
- Final price (computed by `effective_price`)

**Writes:**
- `pricing_overlay` — INSERT/UPDATE for inline discount edit + bulk operations. CANNOT use `service_bypass`; must go through an RPC that validates tenant + adds the JWT-claim guard.

**RPCs (NEW):**
- `upsert_pricing_overlay(p_tenant_id, p_overlay_data JSONB) RETURNS UUID` — atomic UPSERT, applies one overlay row. Inputs include `overlay_type`, `scope_supplier_id` OR `scope_design_id` OR `scope_variant_id` (exactly-one CHECK), `discount_pct`, `application_order`, `stacking_rule`, `status`. SECURITY DEFINER + standard discipline.
- `bulk_apply_pricing_overlay(p_tenant_id, p_overlay_template JSONB, p_target_variant_ids UUID[]) RETURNS INT` — atomic bulk INSERT (N rows) of overlay rows applying the same template to multiple variants. Returns row count. SECURITY DEFINER + standard discipline.

**Bulk operations per D-M1-04** ship in Phase 1B-foundation, NOT deferred.

### Shared infrastructure (across the 3 screens)

- **Permissions check at page load.** Each screen calls `is_user_authorized_for(p_screen_key TEXT)` (existing infra from M2 Platform Admin) — fails fast if user lacks permission. Permission keys: `lens.inventory.view`, `lens.designs.manage`, `lens.pricing.manage`.
- **Tenant branding header.** Each screen uses the existing `shared/components/tenant-header.js` (per Iron Rule "customer-facing branding"). NOT a new component.
- **Use existing DB wrapper.** Every read through `DB.fetchAll` / `DB.fetchOne` (per Iron Rule 7). NO `sb.from()` direct calls (lesson from Phase 1A Reviewer G-1 finding).
- **`escapeHtml` from `js/shared.js`.** Reuse, do not reimplement (Phase 1A Reviewer G-6 lesson).

### Functional smoke (mandatory before close)

Smoke is screen-based + scenario-based, run on demo with seeded catalog data:

1. **Inventory screen — read scenario:** load page, confirm 7+ brands display, drill into Hoya → Stellify, confirm SPH×CYL grid shows seeded stock from M1A_OPERATIONS_RPCS_FIX smoke (1 lot, qty 5). Switch to Custom filter — confirm no stock displayed (M1A smoke had no custom rows).
2. **Active Designs screen — toggle scenario:** load page, find a currently-inactive design, click Activate, refresh, confirm `tenant_active_offerings` row inserted with `status='active'`. Toggle back to inactive — confirm UPDATE.
3. **Pricing screen — display scenario:** load page, confirm 3 price columns render for 5+ variants. `effective_price` returns expected ILS values (use the M1B0 smoke's PO line's offering as a known-good fixture).
4. **Pricing screen — inline edit scenario:** select 1 variant, edit discount % from 0 → 10, save inline, confirm `pricing_overlay` row inserted, refresh, confirm final price recomputes (catalog × 0.9).
5. **Pricing screen — bulk scenario:** select 3 variants of the same design, apply 5% supplier-wide overlay, confirm 3 `pricing_overlay` rows inserted via `bulk_apply_pricing_overlay`, exit-code = row-count = 3.
6. **Anon-reject test:** anon JWT calling `toggle_active_offering`, `upsert_pricing_overlay`, `bulk_apply_pricing_overlay` → 42501.
7. **Cross-tenant guard test:** tenant-A JWT calling RPCs with `p_tenant_id=tenant-B-uuid` → RAISE.
8. **Permission gate test:** demo user without `lens.pricing.manage` permission opens `lens-pricing.html` — gate fails, redirect to error page.
9. **No console errors:** open each of the 3 screens in browser, confirm zero console errors at load + after one interaction.

If any smoke step fails → STOP and escalate.

---

## 3. Scope — Out (anti-creep)

Explicitly NOT in this SPEC:

- **The 3 procurement screens** (PO + POs List + Goods Receipt). Sibling Brief `M1_LENS_PHASE_1B_PROCUREMENT`.
- **Stock movement creation** (the actual ➕➖ wiring). Sibling Brief.
- **Goods Receipt** workflow. Sibling Brief.
- **PO creation** workflow. Sibling Brief.
- **Custom-per-customer line linkage to M7.** Out-of-module (M7 not yet built).
- **FX conversion** in `effective_price`. Israel-only Day-1.
- **Promotional discount engine** (time-windowed overlays). Phase 2+.
- **Modifying `lens_brand` / `lens_design` / `lens_variant`** — those are Platform Catalog Admin scope (Phase 1A `lens-catalog-admin.html`). This SPEC reads from them but never writes.
- **Bulk catalog import.** Phase 1A.
- **`window.prompt()` / `window.confirm()` patterns** — use existing `Modal.*` from `shared/components/`. (Phase 1A G-4 finding still open; this SPEC fixes-by-pattern, not by retroactive Phase 1A edit.)
- **Modifying the 7 sealed mockups, the Phase 1 Brief, decisions/M1.md.** No architectural movement.
- **CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT.** Standard docs-only effect on GLOBAL_MAP + MODULE_MAP.
- **21 FK indexes** (`M1A_FK_INDEXES_PREP_FOR_1B` — separate parallel SPEC; if Daniel wants it before procurement, dispatch in parallel).
- **3 MAX-based sequence generator refactors.** Accept Phase 1A consistency.

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Phase 1B split: foundation (3 read screens) first, procurement (3 write screens) second | Daniel 2026-05-15 |
| 2 | Foundation ships before procurement; Daniel QA's foundation on demo between SPECs | Architect — staged validation |
| 3 | Inventory screen ➕➖ buttons display-only in 1B-foundation; wired in 1B-procurement | Architect — keeps read/write split clean |
| 4 | Bulk pricing operations ship in 1B-foundation (NOT deferred) | D-M1-04 |
| 5 | All new RPCs inherit M1A_OPERATIONS_RPCS_FIX discipline (REVOKE/GRANT, search_path, JWT guard) | Project policy |
| 6 | Iron Rule 32 §7 = None | Project policy |
| 7 | Screen permissions gated by M2 `is_user_authorized_for(screen_key)` infra | Reuse, no reinvention |
| 8 | Single Pipeline run for all 3 screens + 3 RPCs + functional smoke | Architect |

---

## 5. Success Criteria

1. **3 HTML pages at root**, all in `scripts/checks/root-allowlist.json`. Verified by `ls *.html | grep lens-` + grep allowlist.
2. **3 JS folders under `modules/lens-*/`** with file count appropriate to the screen.
3. **No file > 350 lines** (Iron Rule 12). Verified by `find modules/lens-*/ -name "*.js" -exec wc -l {} +`.
4. **3 new RPCs deployed** (`toggle_active_offering`, `upsert_pricing_overlay`, `bulk_apply_pricing_overlay`), all SECURITY DEFINER with `search_path=public` + JWT guard + REVOKE/GRANT. Verified by `pg_proc` + `aclexplode`.
5. **`pricing_overlay` UPSERT logic preserves the exactly-one-scope CHECK** (Phase 1A). Verified by INSERT tests violating it → RAISE.
6. **Each new screen calls `is_user_authorized_for` at page load** with the appropriate `screen_key`. Verified by grep in each screen's main JS.
7. **All DB reads through `DB.fetchAll` / `DB.fetchOne`** (Iron Rule 7). Zero `sb.from(` matches in the 3 new JS folders.
8. **`escapeHtml` imported from `js/shared.js`** — zero local reimplementations. Verified by grep.
9. **Functional smoke 9/9 PASS on demo** (see §2). Captured in TEST_REPORT.md.
10. **No new console errors** at page load on demo. Captured in smoke.
11. **Iron Rules 1, 7, 8, 11, 12, 14, 15, 18, 22, 23, 31, 32** — no new violations. Verified by `npm run verify --full`.
12. **No new HIGH/ERROR advisor lints** (run `scripts/audit/advisors-for-objects.mjs` from M1_SKILL_IMPROVEMENT_HARVEST against the 3 new RPCs).
13. **Iron Rule 32 §7 = None.** Honored across commits.
14. **No Prizma data written.** All smoke on demo.
15. **Commit count: 8-12, single-concern, on `develop`.**
16. **`docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md` + `docs/DB_TABLES_REFERENCE.md`** updated (additive).
17. **`js/shared.js`** — no new T-constants needed (existing tables reused) unless probe surfaces a missed table.
18. **EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW** all inside the SPEC folder.

Module Strategist may add criteria.

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

Inherits the new MANDATORY §0 audits per `M1_SKILL_IMPROVEMENT_HARVEST` Proposal A1 (Inner-call arity audit + Smoke-touched schema audit).

Specific probes:

```sql
-- Probe 1: confirm tenant_lens_stock + stock_lot demo fixtures from M1A smoke still present
SELECT count(*) FROM tenant_lens_stock WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
SELECT count(*) FROM stock_lot WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- Probe 2: confirm supplier_catalog_offering + pricing_overlay shape
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('supplier_catalog_offering','pricing_overlay','tenant_active_offerings')
ORDER BY table_name, ordinal_position;

-- Probe 3: confirm effective_price signature (changed?)
SELECT pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='effective_price';

-- Probe 4: confirm permission key infrastructure
SELECT pg_get_functiondef('is_user_authorized_for'::regproc);
-- If the function doesn't exist, Module Strategist confirms the actual permission RPC name via grep

-- Probe 5: existing JS conventions
ls -la modules/lens-catalog-admin/  # confirm Phase 1A file layout to mirror
grep -n "DB.fetchAll\|DB.fetchOne" js/shared.js | head -5

-- Probe 6: M1B0 PO smoke fixtures present (referenced by pricing display scenario)
SELECT po_number, status, supplier_id FROM purchase_order
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- Probe 7: bulk operation pattern — Phase 1A used JSONB array input
-- Check js/shared.js DB.batchCreate signature

-- Probe 8: Modal component shape
ls -la shared/components/ | head -20
grep -n "Modal\." shared/components/*.js | head -10

-- Probe 9: existing screen structure for similar pattern (e.g. inventory.html for frames)
head -50 inventory.html
```

Pin every result. Skipping = Phase 1A repeat.

---

## 7. Iron Rules in Sharp Focus

- **Rule 7** — every DB read through wrapper; zero `sb.from(`.
- **Rule 8** — every dynamic insert uses `escapeHtml` or `textContent`.
- **Rule 12** — every file ≤ 350 lines.
- **Rule 14, 15, 18** — RLS canonical + UNIQUE tenant-scoped (no new tables here, but verify the 3 RPCs honor patterns on the existing tables).
- **Rule 21** — reuse existing helpers; don't reimplement `escapeHtml`, `Modal`, `tenant-header`.
- **Rule 22** — defense-in-depth; every RPC `.update()` includes `tenant_id` in WHERE.
- **Rule 31** — gate clean each commit.
- **Rule 32** — None.

---

## 8. Anti-Patterns (Things to Avoid)

- **Authoring the SPEC blind.** Run §6 probes first.
- **Direct `sb.from()` calls** in the new JS. Phase 1A Reviewer G-1 lesson.
- **Reimplementing shared helpers.** Phase 1A G-6 lesson.
- **`window.prompt()` / `window.confirm()`.** Use `Modal.*`.
- **Wiring the ➕➖ buttons to actual stock movements.** Sibling Brief.
- **Inventing new RPCs beyond the 3 named.** Out-of-scope.
- **Modifying Phase 1A artifacts** (`lens-catalog-admin.html`, the 17 tables, the 9 RPCs).
- **Skipping `is_user_authorized_for` permission gate.** Every customer-facing screen must gate.
- **No console errors at smoke time = mandatory.** Phase 1A smoke missed this; M1A_OPERATIONS_RPCS_FIX added it; M1B0 inherited; this SPEC inherits.

---

## 9. Open Questions for the Module Strategist

1. **`is_user_authorized_for` actual function name?**
*Recommendation: probe first; the M2 Platform Admin likely calls it `is_user_authorized_for(p_screen_key TEXT)` or `has_permission`.* Adapt SPEC.

2. **Screen permission keys — do `lens.inventory.view`, `lens.designs.manage`, `lens.pricing.manage` already exist or need seeding?**
*Recommendation: probe the permissions table; if missing, seed via a small migration as part of this SPEC.*

3. **`bulk_apply_pricing_overlay` — JSONB template + UUID[] target, or a single JSONB with target UUIDs embedded?**
*Recommendation: separate params (JSONB template + UUID[] targets).* Cleaner contract; matches PG idioms.

4. **Inventory screen — branch selector. Always required, or default to first active location?**
*Recommendation: default to the user's `default_location_id` from the employee record; show selector if employee can switch.*

5. **Permission seeding — micro-migration in this SPEC or separate?**
*Recommendation: micro-migration in this SPEC* if the keys don't exist; logged as a §0 baseline.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` | Screen #1 spec |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html` | Screen #2 spec |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html` | Screen #3 spec |
| `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1_BRIEF.md` | Original Phase 1 plan |
| `modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_SESSION_HANDOFF.md` | Schema reference |
| `modules/Module 1 - Inventory Management/architecture-brief/STRATEGIC_REVIEW_REPORT.md` | Phase 1A strategic findings |
| `modules/Module 1 - Inventory Management/architecture-brief/CODE_REVIEW_REPORT.md` | Phase 1A code-review patterns to inherit |
| `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md` | RPC discipline reference |
| `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md` | RPC + schema patterns |
| `lens-catalog-admin.html` + `modules/lens-catalog-admin/` | Phase 1A UI patterns to mirror (with G-1 / G-6 fixes) |
| `shared/components/` | Modal, Toast, TableBuilder, tenant-header |
| `js/shared.js` | DB wrapper, escapeHtml, T-constants |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | D-M1-04 (3 columns + bulk + inline), D-M1-05 (tiered overlay) |
| `CLAUDE.md` §4-§6 | Iron Rules |

---

## 11. Hand-off Note

Full Auto Pipeline. The sibling Activation Prompt (`M1_LENS_PHASE_1B_FOUNDATION_ACTIVATION_PROMPT.md`) is what Daniel pastes — **ONLY after `M1_SKILL_IMPROVEMENT_HARVEST` closes 🟢**.

Pipeline order:
1. `opticup-strategic` reads this Brief + runs §6 pre-flight probes + applies the now-inherited harvest patterns (Inner-call arity audit + Smoke-touched schema audit + Concurrent-Pipeline awareness envelope).
2. Authors `SPEC.md` inside `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/`.
3. Hands off to `opticup-executor` (same chat).
4. Executor builds the 3 screens + 3 RPCs + permission seeding (if needed) + functional smoke.
5. Executor writes `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` + `MIGRATION.md` (Applied Log per harvested E1) + `ROLLBACK.md`.
6. `opticup-reviewer` re-runs criteria + uses new `advisors-for-objects.mjs` (per E2) → writes `REVIEW.md`.
7. `opticup-strategic` Foreman-reviews → writes `FOREMAN_REVIEW.md`.
8. ONE Hebrew status line to Daniel.

After 🟢: Daniel runs manual QA on demo for 3 screens. On QA-pass, Architect dispatches `M1_LENS_PHASE_1B_PROCUREMENT`.

---

*End of Brief. 3 read-heavy screens + 3 metadata RPCs + functional smoke. No procurement workflow. Inherits all M1A_OPERATIONS_RPCS_FIX + M1B0 discipline + harvested skill patterns.*
