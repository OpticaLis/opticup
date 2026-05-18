# BRIEF — Post-Group A Fixes + Group B Authoring

**For:** Claude Code session on Daniel's Windows desktop (same session that closed Group A). Acting as opticup-strategic (Foreman).

**Parent Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md`

**Daniel's authorization (2026-05-18 morning):**
- ✅ F-1 Designs toggle semantics → Option (a) server-side array RPC
- ✅ F-1 Pricing notes FK fix → dispatch BEFORE Group B/C
- ✅ F-5 sell-price demo backfill → SKIP, fill naturally via Quick Receipt usage
- ✅ Group B dispatch path → **Path X sequential on develop** (same as Group A; worked cleanly in 3.5h)

---

## Step 1 — Push 2 FOREMAN_REVIEWs (already on disk)

```powershell
cd C:\Users\User\opticup
git add "modules\Module 1 - Inventory Management\docs\specs\M1_LENS_DESIGNS_SELECTION_REBUILD\FOREMAN_REVIEW.md" "modules\Module 1 - Inventory Management\docs\specs\M1_LENS_PRICING_REBUILD\FOREMAN_REVIEW.md"
git commit -m "chore(spec): FOREMAN_REVIEWs for Group A — both 🟢 CLOSED"
git push origin develop
```

---

## Step 2 — Author + execute `M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX` (~30 min, BLOCKING for Group B)

**Why:** `lens_variant_notes.author_id` currently FKs to `auth.users(id)`. Project uses PIN auth → no rows in auth.users → CREATE blocked. Notes table is empty (zero orphans risk).

**Foreman authoring instructions:**

- Folder: `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX/`
- Run pre-seal Step 1.6 (path verification) + Step 1.7 (consumer grep — confirm only Pricing screen reads from notes; lens_variant_notes.author_id has 0 rows so no migration backfill needed)
- SPEC §0 must include:
  - `pg_constraint` query verifying the FK target = auth.users
  - `SELECT COUNT(*) FROM lens_variant_notes` = 0 confirmation
  - `pg_constraint` query for FK target on `employees(id)` (verify `employees` table + `id` column exist; project's canonical employees table)
- 2 migrations:
  1. `ALTER TABLE lens_variant_notes DROP CONSTRAINT <fk_name>;`
  2. `ALTER TABLE lens_variant_notes ADD CONSTRAINT lens_variant_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES employees(id) ON DELETE SET NULL;`
- §4 Destructive Ops: 2 DDL statements above
- §8 QA: insert a test note via Chrome MCP (the Lens Details drawer's "הוסף הערה" button), verify row lands, soft-delete per Iron Rule 3

**Execution after authoring:** Dispatch executor sequentially on develop. Same session ok.

---

## Step 3 — Author `M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS` (~2-3h, NON-BLOCKING)

**Why:** Designs screen bulk-action ("Activate all" / "Deactivate all") with `p_location_id=null` creates a parallel "all-locations" row instead of flipping per-location actuals. Pre-existing RPC bug, surfaced by new UI. Daniel approved Option (a): server-side array RPC.

**Foreman authoring instructions:**

- Folder: `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS/`
- Pre-seal Step 1.6 + 1.7
- SPEC §0:
  - `pg_get_functiondef` of current `toggle_active_offering` (document existing single-offering signature)
  - `pg_constraint` of `tenant_active_offerings` (verify column shape)
  - Query: `SELECT count(*) FROM tenant_active_offerings WHERE location_id IS NULL` — baseline of existing "all-locations" rows (need to know if anything to migrate)
- 1 new RPC: `toggle_active_offerings_array(p_offering_ids UUID[], p_location_ids UUID[], p_active BOOLEAN)` — server-side iterates per (offering, location) pair, atomic transaction
- JS refactor: `lens-active-designs-toggle.js` calls new RPC with array of location_ids resolved from `getLocations()` instead of `p_location_id=null`
- Bulk UI: "Activate all branches" → resolves to array of all branch IDs, calls array RPC once (Iron Rule 1 atomicity)
- Old RPC `toggle_active_offering` (single-offering): KEEP as-is — used by per-row toggle in same screen. Not deprecated.
- §4 Destructive: 1 new RPC, 0 drops
- §8 QA: Chrome MCP — open Designs, bulk-deactivate, verify `tenant_active_offerings.active=false` for all per-branch rows of selected designs (NOT a parallel "all-locations" row), DB query confirms, soft-delete via re-activate per Iron Rule 3

**Execution:** AFTER Group B closes (lower priority — bulk action works, just wrong semantics for one edge case). OR if Daniel wants this in tonight's batch, run it after FK fix + before Group B.

**Foreman decision:** Recommend defer to AFTER Group B. Lower-risk to ship Group B first.

---

## Step 4 — Author Group B (3 SPECs, ~13-17h sequential)

**Group B Pipelines** (per parent Brief §10.2):
- SPEC 6 — `M1_LENS_PURCHASE_ORDER_REBUILD` (~5-6h)
- SPEC 7 — `M1_LENS_ACTIVE_POS_LIST_REBUILD` (~3-4h)
- SPEC 8 — `M1_LENS_GOODS_RECEIPT_REBUILD` (~5-6h)

**Authoring discipline (all 3):**
- Pre-seal Step 1.6 + 1.7 mandatory
- §0 must include: live partial line-count, live JS file line-counts, mockup line-count, RPC contract grep for any RPC the SPEC will call, FK target probe if writing to any table, demo-data baseline probe if consumer wiring depends on row counts
- All 3 must consume Phase 0 shared components (chip-filter, stat-card, side-detail-panel, group-header, data-table)
- SPEC 6 (Purchase Order) MUST consume `shared/js/wizard-step-indicator.js` (4-step wizard mockup-defined)
- SPEC 7 (POs List) MUST include "overdue" stat-card (per Daniel decision #7)
- SPEC 8 (Goods Receipt) is distinct from Quick Receipt drawer — full screen for bulk receipts with group-header bands by source-type

**Strategic flag for Foreman:** After authoring all 3 + sealing, BEFORE dispatching executor for SPEC 6, report back to Daniel with summary (commit hash of SPECs, any phantom-path defects caught by Step 1.6, any cross-reference issues, any deviation from parent Brief). Same protocol as Group A.

**Dispatch protocol:** Path X sequential. After SPEC 6 closes → SPEC 7 → SPEC 8. No pause between unless deviation.

---

## Constraints (Brief-wide)

- All Iron Rules enforced. No bypass.
- All `permissions` gating via `.col-permission-gated` + `data-permission`.
- Mockup IS the spec (Pattern P-AR-16).
- Tier C VFV mandatory at every SPEC close — screenshots + live DB query + 0 console errors.
- No Prizma writes during execution.

## Stop-on-deviation

- FK fix migration fails advisor → STOP
- Any SPEC §0 reveals a schema/data state that breaks the Brief's assumptions → STOP, escalate to Daniel
- Path X sequential principle: if SPEC N deviates, do NOT dispatch SPEC N+1

---

**END BRIEF**

_Authored by Cowork-Architect (Daniel-via-Cowork) 2026-05-18 morning. Path X sequential dispatch authorized for both Group B and the FK fix._
