# M1 — Contact Lenses + Accessories + Sample Catalogs (Night Pipeline)

**Author:** opticup-architect (Cowork, 2026-05-16 evening)
**Owning module:** Module 1 — Inventory Management
**Type:** Extended Autonomous Night Pipeline — full build of 2 new product categories + sample catalog seeding + comprehensive testing
**Estimated duration:** 8-14 hours
**Mode:** Multi-stage Pipeline with full self-recovery rights
**Predecessor:** `M1_INVENTORY_UNIFIED_SCREEN` 🟢 + 2 hotfixes (sidebar overlap + catalog-admin auth gate) — all merged to main 2026-05-16

**Source:** Daniel directive 2026-05-16 evening — complete the M1 trio (lenses already shipped today; contact-lenses + accessories pending) + seed sample catalogs in DEMO only so Daniel can verify the flow end-to-end.

**Risk envelope:** ZERO Prizma writes. All work on demo tenant. Categories don't exist in Prizma at all. Worst case: revert the commits, demo state is sandbox-acceptable to reset.

---

## 1. Purpose

The M1 inventory module today supports frames (mature) + lenses (production-complete since 2026-05-16). The sidebar shows two more categories as "בקרוב" placeholders: עדשות-מגע (contact lenses) and אביזרים (accessories). This night Pipeline activates both.

After this Pipeline ships, the sidebar's 4 product categories all become functional. Daniel can verify the complete flow on demo for all 3 lens-family categories (lenses / contact lenses / accessories) using seeded sample catalogs. Frames already work in production.

Daniel's principle for this run: **"לא אמור להיות סיכון כי אנחנו לא משתמשים בזה בכלל זה משהו חדש. מקסימום נחזור אחורה."** — Bounded Autonomy with maximum execution latitude, because the blast radius is contained to demo.

---

## 2. Scope — What This Pipeline Ships

### 2.1 Part A — Contact Lenses Schema

Mirror the lens schema with the documented divergences from the Strategic Scoping Audit:

**New tables:**
1. `contact_lens_variant` — different shape from `lens_variant`:
   - Common: tenant_id (NULL for platform-owned), design_id, sph, cyl, **axis** (different from lens — present here)
   - Contact-specific: `base_curve NUMERIC(4,2)`, `water_content_pct INT`, `wearing_schedule ENUM('daily','weekly','monthly','yearly')`, `qty_per_box INT`, `unit_of_sale ENUM('pair','single','box')`, `expiry_warning_months INT DEFAULT 3`
   - Display ID: `CL-NNNNNN` via new `next_contact_variant_display_id()` RPC + sequence state table
2. `tenant_contact_stock` — mirror of `tenant_lens_stock` but with axis:
   - (tenant_id, variant_id, location_id, sph, cyl, **axis**, qty_on_hand, expiry_date)
3. **(Optional)** `pending_contact_advancement_queue` — TBD by executor pre-flight (M9 contract). If lenses + contact lenses share advancement → reuse `pending_lens_advancement_queue` with product_type discriminator. Decision documented in EXECUTION_REPORT.

**Reused tables (with product_type discriminator added):**
- `lens_design` → add `product_type TEXT CHECK (product_type IN ('glasses','contact_lens','accessory'))` (default 'glasses' for existing rows)
- `supplier_catalog_offering` → variant_id now FKs both `lens_variant` AND `contact_lens_variant` (polymorphic via product_type — discussed in §1.5 Pre-flight)
- `pricing_overlay` → same polymorphic approach
- `stock_lot`, `stock_movement`, `stock_transfer`, `purchase_receipt`, `purchase_receipt_line` → add `product_type` column for routing
- `change_approval_log.entity_type` CHECK expanded to include `contact_lens_brand/design/variant`

### 2.2 Part B — Accessories Schema

Minimal shape — no optical properties:

**New tables:**
1. `accessory_variant` — minimal:
   - tenant_id (NULL for platform-owned), design_id, `sku TEXT UNIQUE`, `upc_barcode TEXT`, `material TEXT`, `color TEXT`, `size TEXT` (optional)
   - Display ID: `AC-NNNNNN` via new `next_accessory_variant_display_id()` RPC + sequence state table
2. `tenant_accessory_stock` — minimal:
   - (tenant_id, variant_id, location_id, qty_on_hand)
   - NO prescription columns. NO axis.

**Reused tables** (same as Part A — product_type discriminator).

### 2.3 Part C — UI Integration

The sidebar entries "עדשות מגע" and "אביזרים" currently show "בקרוב" placeholders. Activate both:

- Sidebar clicks load tab-content sections inside `inventory.html` (same architecture as lenses, per M1_INVENTORY_UNIFIED_SCREEN)
- 7 tabs per category (mirroring lens):
  - Contact lenses: inventory / active-designs / pricing / purchase-order / pos-list / goods-receipt / catalog-admin
  - Accessories: same 7 tabs, but goods-receipt UI simplified (no prescription fields), inventory UI simplified (no SPH/CYL/AXIS)
- Visual design **identical** to lenses (which is identical to frames per the design unification done today)
- Permission keys: `contact_lens.inventory.view`, `contact_lens.pricing.manage`, etc. (mirror lens permission keys). Seed for both demo + Prizma admin role.
- URL pattern: `inventory.html?cat=contact_lenses&tab=inventory` / `inventory.html?cat=accessories&tab=inventory`

### 2.4 Part D — Sample Catalog Seeding (DEMO ONLY)

Seed comprehensive sample data on demo tenant so Daniel can verify flows end-to-end:

**Lenses (~30 variants, supplements existing seed if any):**
- 5 brands: Hoya, Essilor, Zeiss, Nikon, Rodenstock
- Mix of stock + custom production types
- ~30 variants across SPH/CYL/Index/Coating combinations
- Sample stock in 1-2 demo locations
- 2 active POs (one partial, one fully received)

**Contact lenses (~40 variants):**
- 5 brands: Acuvue, Bausch+Lomb, CooperVision, Alcon, Ciba
- Mix of daily/monthly/yearly wearing schedules
- ~40 variants across SPH/CYL/AXIS/base_curve combinations
- Sample stock with expiry dates (some near-expiry to test the warning flow)
- 2 active POs (one partial, one fully received)

**Accessories (~25 variants):**
- 5 brands: Zeiss, Rayban, Warby, Crizal, Persol
- Categories: cases (5), cloths (5), cleaning solutions (5), repair kits (5), cords (5)
- ~25 SKUs total
- Sample stock
- 2 active POs (one partial — to test variant-less manual line via bonus accessory, F-2 path)

**Seeding mechanism:**
- Platform catalog (`*_brand`, `*_design`, `*_variant`) via existing `lens-catalog-import` Edge Function (extended with product_type parameter) OR direct migrations
- Tenant-scoped data via SQL INSERTs (this is sandbox demo, no need for UI-driven creation)
- Stock movements via existing RPCs (`record_stock_movement`, `record_adjustment_found`) to keep audit trail integrity

### 2.5 Part E — Comprehensive Testing on Demo

After build + seeding, run a comprehensive functional test matrix on demo:

**Per-category tests (3 categories × ~10 tests = 30 tests):**
1. Open inventory tab → see seeded stock with correct counts
2. Open active-designs tab → see brand/design list
3. Open pricing tab → see overlay rules
4. Create a new PO via purchase-order tab
5. View PO list → new PO appears with "sent" status
6. Open goods-receipt → receive partial qty of an active PO
7. PO status transitions to "partial"
8. Receive remaining qty → status flips to "fully_received"
9. ➖ adjustment flow → quantity decreases atomically
10. ➕ adjustment found flow → quantity increases atomically

**Cross-category tests:**
- Suppliers screen shows category badges correctly (a supplier providing lenses + contacts shows both 🔬 + 👁 badges)
- Unified log shows entries from all 3 categories
- Combined invoice flow (mock scenario): one supplier_debt across multiple receipts of different categories

**Visual smoke (Chrome MCP):**
- 12 screenshots: 3 categories × 4 representative tabs (inventory / pricing / PO / goods-receipt) — all share same chrome, same fonts, same RTL sidebar position

**Autonomous fix loop:**
- If any test fails → executor investigates root cause, applies fix in next commit, re-runs test
- Fix only within build scope (DB / UI / RPCs introduced in this Pipeline). Don't touch unrelated code.
- If a fix would require changes outside scope (e.g., the unified log view from yesterday needs adjustment) → document in FINDINGS.md as a follow-up SPEC. Don't block on it.

---

## 3. Out of Scope (Explicit Deferrals)

- **No Prizma writes whatsoever.** Categories don't exist in Prizma. All seeding + tests on demo only.
- **No new RPC families that don't exist in lens equivalent.** Reuse `record_stock_movement`, `record_adjustment_lost`, `record_adjustment_found`, etc. with product_type param.
- **No M7 / M9 integration.** Contact lenses + accessories don't currently route to lab or orders. Reserved for those modules' own Briefs.
- **No prescription-driven matching** (for contact lenses, AXIS-based matching) — that's M6 prescription's job.
- **No tenant settings panel** for the new categories — deferred to M1 settings SPEC (F-07 in Strategic Audit).
- **No mobile / responsive rework.** Desktop only.
- **No design system changes.** Reuse all existing CSS / components / Hybrid+Navy palette.

---

## 4. Iron Rule Compliance

- **Rule 1** (atomic quantity changes via RPC) — preserved; ➕➖ buttons use RPCs.
- **Rule 12** (file size ≤350 lines) — split JS modules as needed.
- **Rule 14** (tenant_id on every new table) — all 4 new tables.
- **Rule 15** (RLS on every new table, canonical JWT-claim pattern) — all 4 new tables.
- **Rule 18** (UNIQUE per-tenant) — `accessory_variant.sku` UNIQUE (tenant_id, sku); same for any UNIQUE constraint added.
- **Rule 19/P19/P40** (config tables, not enums) — `wearing_schedule` for contact lenses MAY be enum (state-machine semantics) OR config table. Executor decides based on whether tenants need to add custom schedules. Default: ENUM, since "daily/weekly/monthly/yearly" is industry-standard.
- **Rule 21** (No Orphans) — every new RPC paired with permission; every new table paired with RLS.
- **Rule 22** (defense-in-depth) — every INSERT includes tenant_id.
- **Rule 31** (integrity gate) — exit 0 every commit.
- **Rule 32** (destructive ops) — see §6.

---

## 5. Cross-Module Impact

- **M2 Platform Admin** — Platform catalog admin gets 3 product_type sub-views (lenses / contact lenses / accessories). Inside `lens-catalog-admin` tab in inventory.html (already exists), add product_type filter.
- **M4 CRM** — none.
- **M3 Storefront** — none. Contact lenses + accessories are not yet published to public site.
- **Future M7 Orders** — orders module will deep-link to `inventory.html?cat=...` to pick products. Schema is ready.
- **Future M9 Lab** — only lens advancement queue routes to lab. Contact lens advancement may or may not — decided per pre-flight P-Q4 below.

---

## 6. Destructive Operations (Iron Rule 32)

Declared:

1. **CREATE TABLE × 4 new tables** (`contact_lens_variant`, `tenant_contact_stock`, `accessory_variant`, `tenant_accessory_stock`)
2. **CREATE TABLE × 2 sequence state tables** for new display_id RPCs
3. **ALTER TABLE × ~8 tables** to add `product_type` discriminator column (default 'glasses' for existing rows) — additive, non-destructive in effect
4. **ALTER TABLE × 1** for `change_approval_log.entity_type` CHECK expansion
5. **CREATE RPC × 2 new RPCs** (`next_contact_variant_display_id`, `next_accessory_variant_display_id`)
6. **CREATE INDEX × ~8 new partial FK indexes** for the new tables
7. **Structural HTML modification of `inventory.html`** — add 2 new category sections + their 7 tabs each
8. **CSS additions** — none if reusing lens styles; minor adjustments if pre-flight reveals lens styles not portable
9. **`git tag pre-contact-accessories-night-2026-05-16`** before any commit

**Demo DB writes authorized:**
- INSERT into platform catalog tables for ~95 variants total (30 lens + 40 contact + 25 accessory)
- INSERT into tenant-scoped demo tables for sample stock + sample POs

**NOT authorized:**
- ANY write to Prizma tenant data (tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'). Verification: row-count delta = 0 on Prizma across ALL inventory-related tables pre/post.
- DROP of any table, column, policy, RPC, view.
- Modification of frames-side or lens-side existing code beyond what's needed for sidebar integration.
- Touching main branch.
- Force-push, rebase, reset --hard outside Tier 5 emergency rollback (develop only, with --force-with-lease).

---

## 7. Success Criteria

The Pipeline returns 🟢 when:

1. Sidebar entries "עדשות מגע" and "אביזרים" are clickable (no longer disabled "בקרוב")
2. Each category opens to its 7-tab strip identical visually to lenses
3. Demo has functional sample data: 30+ lens variants, 40+ contact variants, 25+ accessory variants, mixed stock + POs
4. Per-category functional smoke 10/10 PASS for each category (30 tests total)
5. Cross-category smoke 100% PASS (suppliers, unified log, combined-invoice scenario)
6. Visual Chrome MCP 12/12 screenshots show identical chrome across categories
7. Iron Rule 31 integrity gate exit 0 every commit
8. Smoke 7/7 baseline (frames flow) PASS unchanged
9. **Prizma row-count delta = 0** verified across 20+ inventory tables
10. ALL 4 new tables have canonical JWT-claim RLS policies
11. ALL new RPCs have REVOKE FROM PUBLIC, anon applied
12. Permission keys for new categories seeded for both demo + Prizma admin roles
13. Documentation updates: GLOBAL_MAP.md adds new tables, GLOBAL_SCHEMA.sql appends new DDL, MASTER_ROADMAP §2 marks M1 trio complete

---

## 8. Pre-Flight Probes (mandatory before Commit 1)

Executor MUST run + report results in §1.5 of authored SPEC:

**P-Q1.** `SELECT column_name FROM information_schema.columns WHERE table_name='lens_design' AND column_name='product_type'` — does it exist?
- If YES → already-implemented decision; just verify default + extend CHECK if needed
- If NO → first ALTER TABLE in Pipeline adds it

**P-Q2.** `SELECT column_name FROM information_schema.columns WHERE table_name='purchase_receipt_line' AND column_name='axis'` — does AXIS exist for contact-receipt lines?
- If NO → ALTER TABLE adds it nullable, default NULL
- If YES → confirm it's nullable

**P-Q3.** `SELECT prosrc FROM pg_proc WHERE proname='record_stock_movement'` — does it accept product_type?
- If NO → does it route correctly to stock_lot regardless? Probe a sample call.
- If product_type discriminator needed → either add parameter (preferred) or create wrapper RPCs

**P-Q4.** Check `pending_lens_advancement_queue` table — should contact lenses share it (with product_type) or get a sibling table?
- Recommendation: reuse with product_type. Confirm via reading the K3 trigger source and M9 contract design.

**P-Q5.** Check `change_approval_log.entity_type` CHECK constraint — get current allowed values
- Plan ALTER TABLE to expand for new entity types

**P-Q6.** Check `lens-catalog-import` Edge Function source — does it accept product_type or hardcode 'glasses'?
- If hardcoded → add parameter for the seeding step

**P-Q7.** Count Prizma rows on every inventory-touched table pre-Pipeline:
```sql
SELECT 'inventory' as tbl, COUNT(*) FROM inventory WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
UNION ALL ... [continue for all 20+ tables]
```
Save snapshot. Re-run identical query post-Pipeline. ALL deltas must = 0.

**P-Q8.** Concurrency guard: `Get-Process claude -ErrorAction SilentlyContinue | Where-Object CommandLine -match 'dangerously-skip-permissions'`
- Confirm you are the ONLY active CLI session before starting
- Desktop spawns (Electron children) are fine
- If others exist → halt + escalation

If any pre-flight probe reveals a divergence from this Brief's assumptions → STOP, write a finding, propose amendment, wait for autonomous decision per §9.

---

## 9. Autonomous Decision Authority

This Brief grants the Pipeline expanded latitude for night execution. The Pipeline MAY take the following decisions internally without escalating to Daniel:

1. **Schema variations within bounds** — column types, NULL/NOT NULL choices, default values for new tables. Document each in SPEC §1.5 + EXECUTION_REPORT.
2. **product_type discriminator approach** — single column on shared tables OR sibling tables per category. Either is acceptable; document choice + rationale.
3. **wearing_schedule ENUM vs config table** — pick based on Iron Rule 19 logic; document.
4. **Sample data quantities** — ±20% from the stated numbers (e.g., 30-50 contact variants). Below 20% bottom or above 20% top → document why.
5. **UI presentation of contact-receipt axis field** — additional input column in goods-receipt grid, OR inline below SPH/CYL/ADD. Pick whichever matches existing patterns.
6. **Adjustment to fix logic for variant-less manual lines** (F-2 from Gap Closure) for accessories — if a different solution emerges (e.g., a "miscellaneous accessory" sentinel variant per-tenant), document and apply.
7. **Mid-execution fixes** — if a test failure surfaces a bug in this Pipeline's build → fix in next commit. If a bug in earlier code (lens / frames) → document as finding, don't fix in this Pipeline.
8. **Commit reordering** — if dependencies require it.
9. **Add up to 6 new permission keys** for new categories (contact_lens.* + accessory.*).

### Background processes that are LEGITIMATE and should NOT trigger halt (§9.2 — per P-AR-14):
- **Sentinel cron** writes to `docs/guardian/GUARDIAN_ALERTS.md` + `GUARDIAN_REPORT.md` hourly. NOT a race. Ignore.
- **Watcher service** (`opticupsyncwatcher`) syncs Access exports. Doesn't touch git. Ignore.
- **Skill files** modified during this chat by other Pipelines (auto-applied pattern updates) are legitimate. Commit them in a Stage-0 cleanup commit at start of Pipeline.
- **Pending entries** under `_archive/architect-pending-entries/` are NOT this Pipeline's responsibility. Leave for next Architect session.

### Escalate to Daniel ONLY for:
- A destructive op outside Brief §6
- A failure on a Prizma row-count delta probe (any non-zero delta on Prizma → STOP IMMEDIATELY)
- Pre-flight P-Q1..P-Q6 returns wildly different than expected (e.g., lens_design.product_type already exists with values other than 'glasses' for existing rows)
- Iron Rule 31 integrity gate fails repeatedly
- Demo tenant becomes unusable mid-Pipeline
- Cross-module unintended impact (touched a file outside M1 scope)

---

## 10. Failure Recovery Protocol

**Tier 1 — Auto-recover within commit:** standard. Retry, fix, continue.

**Tier 2 — Auto-recover within Part:** investigate, fix in next commit. Document.

**Tier 3 — Defer the Part:** if Part A (contact lenses) genuinely cannot close, tag the Pipeline state, continue with Part B (accessories) + Part D (seeding for lenses only). Part A becomes a follow-up SPEC.

**Tier 4 — Halt Pipeline:** ONLY if Prizma row-count delta becomes non-zero, integrity gate fails repeatedly, or demo becomes unusable.

**Tier 5 — Self-rollback:** `git reset --hard pre-contact-accessories-night-2026-05-16` + `git push --force-with-lease origin develop`. Develop only, never main. Last resort.

---

## 11. Execution Flow

Full Auto Pipeline, single chat. 5-skill chain × 2 categories × 1 seeding stage = ~10 internal phases:

1. **opticup-strategic (Foreman)** — Pre-flight probes (§8), author SPEC at `modules/Module 1 - Inventory Management/docs/specs/M1_CONTACT_LENSES_ACCESSORIES/SPEC.md`
2. **opticup-executor** — Stage A: contact-lenses schema + RPCs (1-2 hours)
3. **opticup-executor** — Stage B: accessories schema + RPCs (1 hour)
4. **opticup-executor** — Stage C: UI integration both categories (2-3 hours)
5. **opticup-executor** — Stage D: sample catalog seeding for demo (lenses + contact lenses + accessories) (1-2 hours)
6. **opticup-reviewer** — Full review across all stages (30 min)
7. **opticup-localhost-tester** — 30 functional tests + 12 Chrome MCP screenshots (1-2 hours)
8. **opticup-executor** — Autonomous fix loop for any test failures (variable, 30 min-2 hours)
9. **opticup-strategic (Foreman)** — FOREMAN_REVIEW, Pipeline retro, Hebrew morning summary

Estimated total: 8-12 hours.

Pipeline writes morning summary to `_archive/night-pipeline-2026-05-16/MORNING_SUMMARY_FOR_DANIEL.md`.

---

## 12. Hebrew morning summary template

```
ריצת לילה הסתיימה [🟢/🟡/🔴]. משך: [hh:mm].
חלק A (סכמת עדשות מגע): [status]
חלק B (סכמת אביזרים): [status]
חלק C (אינטגרציה UI): [status]
חלק D (קטלוגי דמו): [status]
חלק E (טסטים מקיפים בדמו): [N/30 PASS]
מצב: 4 קטגוריות חיות (מסגרות + עדשות + עדשות מגע + אביזרים).
פריזמה ללא נגיעה (delta = 0 על כל הטבלאות).
[אם דרושה פעולה ממך: שורה. אחרת: "אין פעולה דרושה — הכל מוכן לבדיקה ידנית"]
```

---

*End of Brief. Iron Rule 32 §Destructive Operations declared. Autonomous Decision Authority defined per §9. Legitimate background processes documented per §9.2 — Pipeline should NOT halt on those. Daniel sleeps; Pipeline runs; morning summary at declared file path.*
