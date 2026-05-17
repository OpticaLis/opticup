# SPEC — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Claude Code, 2026-05-18 evening
> **Authored on:** 2026-05-18
> **Module:** 1 — Inventory Management
> **Phase (within Pipeline):** A — DB Schema
> **Parent Brief:** `architecture-brief/M1_LENS_INVENTORY_UNIFIED_FLOW_BRIEF.md` §3 + §13
> **Pipeline:** `M1_LENS_INVENTORY_UNIFIED_FLOW` (5 sequential phases A→B→C→D→E)

---

## 0. Pre-Authoring Reality Check

- Brief read in full 2026-05-18 evening (5 phases, no time budget, Tier C + Fidelity).
- Both mockup files read per Brief §9 (P-AR-16): `LENS_INVENTORY_MOCKUP.html` (1117 lines), `LENS_GOODS_RECEIPT_MOCKUP.html` (635 lines).
- DB pre-flight ran via Supabase MCP — 4 of 4 column-existence probes returned `false` (no name collisions).
- Prizma supplier "בדולח" probed → single exact match found: `id = 0b868b66-e814-4a4b-af57-f300e5a95a5f` (escalation filed: `escalations/2026-05-18T_M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A_PRIZMA_AUTH.md`).
- Demo first active supplier identified: `AZMON (דמו)` (`bb4bdec6-5fe0-4e27-b6b6-ba097cf37112`).
- Existing `m1_create_receipt_from_box` RPC signature captured (8 args — extension deferred to Phase C SPEC, not this one).
- Roles per tenant probed: BOTH demo + Prizma share 5 system roles (`ceo`, `manager`, `team_lead`, `viewer`, `worker`). **Brief mentions `branch_manager` — actual role is `manager`. Resolution documented in §0.C.**
- `role_permissions` table structure: (`role_id text`, `permission_id text`, `granted boolean`, `tenant_id uuid`).
- `employees` table exists (FK target for `manager_reviewed_by` is valid).
- Iron Rule 31 integrity gate exit 0 baseline.
- 3 untracked architecture-brief .md files in working tree (the Brief itself + 2 sibling Briefs from earlier same day) — executor leaves them alone (selective `git add` by filename).

### 0.B — Lessons applied from prior FOREMAN_REVIEWs

| Lesson | Source | How honored |
|---|---|---|
| P-AUTHOR-4 Brief-vs-DB reality audit | M1_CONTACT_LENSES_ACCESSORIES | Brief role names `branch_manager` resolved to actual `manager` in §0.C; bdolach probed at author time not executor time |
| P-AUTHOR-2 decision-gate pattern | M1_LENS_PHASE_2_COMPLETION | Prizma backfill is the explicit decision gate; escalation file pre-written; SPEC §5 stop-trigger explicit |
| §5.3 Runtime semantics rehearsal | SECURITY_HOTFIX_2 | CHECK constraint mental trace + FK ON DELETE SET NULL behavior rehearsed in §0.D |
| §1.5 Cross-Reference Check | All recent SPECs | Performed in §0.C below |

### 0.C — Cross-Reference Check (Rule 21)

Grep against `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `docs/DB_TABLES_REFERENCE.md`, `docs/FILE_STRUCTURE.md`, `modules/*/docs/db-schema.sql`, `modules/*/docs/MODULE_MAP.md`, plus live DB probe.

| New name | Hits | Resolution |
|---|---|---|
| `tenants.default_supplier_id` (column) | 0 | Genuinely new |
| `purchase_receipt.is_documented` | 0 | Genuinely new |
| `purchase_receipt.undocumented_reason` | 0 | Genuinely new |
| `purchase_receipt.manager_review_status` | 0 | Genuinely new |
| `purchase_receipt.manager_reviewed_by` | 0 | Genuinely new |
| `purchase_receipt.manager_reviewed_at` | 0 | Genuinely new |
| `inventory.add.undocumented` (perm key) | 0 (live DB) | Genuinely new (existing inventory.* keys: `view/edit/delete/export/reduce` only) |
| `inventory.manager_review.approve` (perm key) | 0 (live DB) | Genuinely new |
| `mark_receipt_reviewed` (RPC) | 0 (live DB) | Reserved for Phase D — out of scope of this SPEC |

**Brief-vs-DB discrepancies resolved:**
- Brief §3.4 says "ceo + branch_manager get both" → uses `manager` role id (the actual system role; no `branch_manager` exists).
- Brief §3.4 says "team_lead + worker get NEITHER" → also `viewer` gets NEITHER (read-only role per system convention).

Cross-Reference Check completed 2026-05-18 evening: **0 collisions, 9 hits resolved.**

### 0.D — Runtime semantics rehearsal (§5.3 mandate)

For the additive DDL in this SPEC:

1. **`ALTER TABLE purchase_receipt ADD COLUMN is_documented BOOLEAN NOT NULL DEFAULT true`** — Postgres applies the DEFAULT to all existing rows at ALTER time (logically; Postgres 11+ stores DEFAULT as metadata, so this is O(1) and does NOT rewrite the table). No separate backfill UPDATE needed; existing rows read `true` immediately.
2. **CHECK constraint** `manager_review_status IN ('pending','approved','requires_doc','exception_allowed') OR manager_review_status IS NULL` — explicit NULL-tolerant. Mental test: (a) NULL on existing row → passes (`X OR NULL` short-circuits to TRUE if X is TRUE, but here `X = FALSE` → expression is `FALSE OR NULL = NULL` which Postgres CHECK treats as PASS, per SQL spec NULL CHECK semantics; (b) value `'pending'` → passes; (c) value `'rejected'` → FAILS as intended.
3. **`FK default_supplier_id REFERENCES suppliers(id) ON DELETE SET NULL`** — if the supplier row is deleted, tenant's `default_supplier_id` becomes NULL (graceful — Phase B settings UI shows the tenant needs to pick a new default).
4. **`FK manager_reviewed_by REFERENCES employees(id)`** — no ON DELETE clause, defaults to NO ACTION (blocks employee deletion if any review row references them — acceptable because employees are soft-deleted, not hard-deleted; the FK never fires in practice).
5. **Permission seeding ordering:** Insert into `permissions` BEFORE `role_permissions`, because `role_permissions.permission_id` references the key in `permissions`. INSERTs are idempotent via `ON CONFLICT (id, tenant_id) DO NOTHING`.

No NULL-comparison loopholes; no rehearsed scenario yields silent failure.

### 0.E — Baselines

| Symbol | File | Metric | Value (captured 2026-05-18) |
|---|---|---|---|
| `BASE_SCHEMA_M1` | `modules/Module 1 - Inventory Management/docs/db-schema.sql` | `wc -l` | (capture at executor time, post-edit value = `BASE + ~75`) |
| `BASE_RECEIPTS_PRIZMA` | live DB | `SELECT count(*) FROM purchase_receipt WHERE tenant_id = '6ad0781b...'` | (capture at executor time pre-ALTER, post-ALTER count MUST equal) |
| `BASE_RECEIPTS_DEMO` | live DB | `SELECT count(*) FROM purchase_receipt WHERE tenant_id = '8d8cfa7e...'` | (same — count delta = 0 across SPEC) |

---

## 1. Goal

Add the DB substrate that the Unified Flow Pipeline (Phases B-E) builds on: a new `tenants.default_supplier_id` column for per-tenant default-supplier configuration, and 5 new `purchase_receipt` audit columns for "undocumented additions" tracking. Seed 2 new permission keys + role grants in both tenants. Demo gets autonomous default-supplier backfill; Prizma's default-supplier backfill is held for Daniel's explicit authorization (escalation already filed).

## 2. Background & Motivation

The Brief (§1) collapses the receive-goods flow INTO the inventory screen as modals/drawers so staff doesn't context-switch for the most common operation. To do that cleanly, three pieces of DB substrate must exist BEFORE the UI work:
1. A per-tenant default-supplier setting (so the new add-stock UI auto-fills sanely without hardcoding).
2. Audit columns on `purchase_receipt` so additions without a delivery-note are flagged for manager review.
3. Two permission keys gating the new "undocumented add" + "manager review approval" actions.

This phase ships ONLY the DB substrate. No UI changes. No new RPCs. No code wiring beyond the M1 db-schema.sql doc update.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state | `develop`, clean post-commits | `git status` → clean |
| 2 | Commits produced | 3 commits (Seed + Schema/Seed + Close) | `git log <SAFETY_TAG>..HEAD --oneline | wc -l` → 3 |
| 3 | Safety tag exists | `pre-m1-inv-unified-flow-phase-a-2026-05-18` | `git tag -l 'pre-m1-inv-unified-flow-phase-a-2026-05-18'` → matches |
| 4 | `tenants.default_supplier_id` exists | column present, FK to `suppliers(id) ON DELETE SET NULL`, NULL-able | `information_schema.columns` query |
| 5 | `purchase_receipt` 5 audit columns exist | `is_documented`/`undocumented_reason`/`manager_review_status`/`manager_reviewed_by`/`manager_reviewed_at` | `information_schema.columns` query — count = 5 of 5 |
| 6 | CHECK constraint on `manager_review_status` | 4 allowed values + NULL | `pg_constraint` query → CHECK definition contains 4 values |
| 7 | Existing `purchase_receipt` rows | `is_documented = true` for 100% of pre-ALTER rows | `SELECT count(*) FROM purchase_receipt WHERE is_documented IS NULL OR is_documented = false` → 0 |
| 8 | Demo default supplier set | `tenants.default_supplier_id = 'bb4bdec6-5fe0-4e27-b6b6-ba097cf37112'` for demo | SQL `SELECT default_supplier_id FROM tenants WHERE id = '8d8cfa7e...'` |
| 9 | Prizma default supplier NOT set | `tenants.default_supplier_id IS NULL` for Prizma (escalation pending) | SQL `SELECT default_supplier_id FROM tenants WHERE id = '6ad0781b...'` → NULL |
| 10 | 2 new permission keys exist × 2 tenants | 4 rows in `permissions` | `SELECT count(*) FROM permissions WHERE id IN ('inventory.add.undocumented','inventory.manager_review.approve')` → 4 |
| 11 | Role grants seeded correctly | `ceo` + `manager` GRANTED both; `team_lead` + `worker` + `viewer` GRANTED NEITHER | `SELECT role_id, permission_id, granted FROM role_permissions WHERE permission_id LIKE 'inventory.add.undocumented%' OR permission_id LIKE 'inventory.manager_review.approve%'` → 20 rows (5 roles × 2 perms × 2 tenants) with granted=true ONLY for `ceo` and `manager` |
| 12 | M1 db-schema.sql updated | new section "Phase 2 — Unified Flow Phase A" appended with CREATE/ALTER + permission docs | `grep -c "Phase 2 — Unified Flow Phase A" modules/Module 1 - Inventory Management/docs/db-schema.sql` → 1 |
| 13 | Smoke 7/7 PASS | unchanged | `npm test --silent -- tests/smoke/baseline.test.mjs` → 7/7 |
| 14 | Iron Rule 31 integrity gate | exit 0 every commit | `npm run verify:integrity; echo $?` → 0 |
| 15 | Iron Rule 32 declared ops only | every destructive op in this SPEC is in §4 below | manual diff vs §4 list |
| 16 | Prizma row delta | exactly 0 rows changed in ANY Prizma table | pre/post row-count probe on `tenants` + `purchase_receipt` + `permissions` + `role_permissions` for tenant_id=`6ad0781b...` — delta on `permissions`+`role_permissions` = +12 (2 perms + 10 grants), delta on `tenants`+`purchase_receipt` row count = 0 (only column-level changes to tenants/purchase_receipt are ALTER ADD COLUMN which add nullable/defaulted columns to existing rows — no row delta) |

---

## 4. Destructive Operations

Declared list (anything not on this list is forbidden mid-SPEC; encountering a need to expand → STOP, escalate):

1. `ALTER TABLE tenants ADD COLUMN default_supplier_id UUID NULL REFERENCES suppliers(id) ON DELETE SET NULL`
2. `ALTER TABLE purchase_receipt ADD COLUMN is_documented BOOLEAN NOT NULL DEFAULT true`
3. `ALTER TABLE purchase_receipt ADD COLUMN undocumented_reason TEXT NULL`
4. `ALTER TABLE purchase_receipt ADD COLUMN manager_review_status TEXT NULL CHECK (manager_review_status IN ('pending','approved','requires_doc','exception_allowed') OR manager_review_status IS NULL)`
5. `ALTER TABLE purchase_receipt ADD COLUMN manager_reviewed_by UUID NULL REFERENCES employees(id)`
6. `ALTER TABLE purchase_receipt ADD COLUMN manager_reviewed_at TIMESTAMPTZ NULL`
7. INSERT × 4 into `permissions` (`inventory.add.undocumented` + `inventory.manager_review.approve`, one row per tenant_id) — `ON CONFLICT (id, tenant_id) DO NOTHING`
8. INSERT × 20 into `role_permissions` (5 roles × 2 perms × 2 tenants — 4 granted=true, 16 granted=false) — `ON CONFLICT DO NOTHING`
9. UPDATE × 1 row on `tenants` for **demo only** (`default_supplier_id = bb4bdec6...`) — explicit `WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`
10. `git tag pre-m1-inv-unified-flow-phase-a-2026-05-18` at parent commit
11. File edits: `modules/Module 1 - Inventory Management/docs/db-schema.sql` (append-only, new section)

**Explicitly forbidden in this SPEC:**
- ANY write to Prizma tenant data EXCEPT seeding the 2 new permission rows + 10 role_permissions rows in Prizma. **`UPDATE tenants SET default_supplier_id = ... WHERE id = '6ad0781b...'` is FORBIDDEN — wait for Daniel.**
- DROP / ALTER COLUMN / DROP COLUMN / DROP POLICY / TRUNCATE / DELETE
- main branch touches
- force-push, rebase
- modifying `suppliers` table structure
- removing `tab=goods-receipt` route

If the Executor encounters a need for any forbidden op → write an escalation file under `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_*.md` and STOP.

---

## 5. Stop-on-Deviation Triggers (beyond global)

Stop and escalate (do NOT silently continue) if:

1. ANY ALTER TABLE returns a non-zero rowcount surprise (e.g., constraint violation on backfill) — investigate before any further migration.
2. The CHECK constraint creation fails on existing data (would only happen if a `manager_review_status` value already exists, which §0.C verified does not).
3. Demo backfill UPDATE affects ≠ 1 row.
4. Any `permissions` or `role_permissions` insert is rejected (e.g., FK violation on a non-existent role_id).
5. `npm run verify:integrity` exits non-zero after any commit.
6. Pre/post Prizma row-count probe shows row-level delta on `tenants.purchase_receipt` (the SPEC's only Prizma "writes" are the +12 perm/grant rows; row count on data tables MUST be flat).
7. Smoke 7/7 baseline breaks (any newly-failing baseline test).

---

## 6. Rollback Plan

| What | How |
|---|---|
| Failed Phase A | `git reset --hard pre-m1-inv-unified-flow-phase-a-2026-05-18` + Supabase migration reverts (see below) |
| Revert ALTER TABLE additions | `ALTER TABLE tenants DROP COLUMN default_supplier_id;` + 5× `ALTER TABLE purchase_receipt DROP COLUMN <col>;` (Iron Rule 32 says don't, but this is the rollback case — Daniel approves the rollback explicitly before executing) |
| Revert permission seeding | `DELETE FROM role_permissions WHERE permission_id IN ('inventory.add.undocumented','inventory.manager_review.approve');` + `DELETE FROM permissions WHERE id IN ('inventory.add.undocumented','inventory.manager_review.approve');` |
| Revert demo default_supplier_id | `UPDATE tenants SET default_supplier_id = NULL WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';` |

Rollback is reversible AT ANY POINT — every change is additive or single-row-update. Nothing destroys existing data.

---

## 7. Out of Scope

- ANY UI changes (settings, inventory, log surfaces). All UI work in Phases B/C/D.
- Extending `m1_create_receipt_from_box` RPC to accept `p_is_documented` / `p_undocumented_reason` — Phase C.
- Creating `mark_receipt_reviewed` RPC — Phase D.
- Backfilling Prizma's `default_supplier_id` (escalation pending Daniel).
- Adding `settings.inventory.manage` permission (Phase B will own it as part of the settings-UI gate).
- Touching MODULE_MAP.md, MODULE_SPEC.md, ROADMAP.md (Pipeline-wide Integration Ceremony at Foreman close, not per-phase).

---

## 8. Expected Final State

After this SPEC:
- 3 new commits on develop above safety tag.
- Live DB: `tenants` has new column; `purchase_receipt` has 5 new columns; `permissions` has 4 new rows (2 keys × 2 tenants); `role_permissions` has 20 new rows.
- Demo tenant has `default_supplier_id` set. Prizma tenant has `default_supplier_id = NULL`.
- M1 db-schema.sql has a new appended section documenting the additions.
- No UI changes visible. Smoke 7/7 still PASS.

---

## 9. Commit Plan

| # | Slug | Description | Contains |
|---|------|-------------|----------|
| 1 | C-A0 | `chore(spec): seed M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A SPEC + escalation + safety tag` | This SPEC.md + the escalation file + `git tag pre-m1-inv-unified-flow-phase-a-2026-05-18` |
| 2 | C-A1 | `feat(m1-inv): Phase A — DB schema + permission seed + demo default supplier backfill` | All DB migrations via Supabase MCP (logged in commit body) + M1 db-schema.sql append + SPEC.md §13 Execution Marker |
| 3 | C-A2 | `chore(m1-inv-phase-a): close — EXECUTION_REPORT + FINDINGS` | EXECUTION_REPORT.md + FINDINGS.md inside this SPEC folder |

(Phases B-E will be authored as SIBLING SPEC folders after this Phase A pipeline closes 🟢. Reviewer + Tester + FOREMAN_REVIEW are separate commits AFTER C-A2 by their respective skill loadouts.)

---

## 10. Permission Grant Matrix (Reference)

For the 2 new permission keys, the grant matrix is the SAME for both tenants:

| Role         | inventory.add.undocumented | inventory.manager_review.approve |
|--------------|----------------------------|----------------------------------|
| `ceo`        | granted=true               | granted=true                     |
| `manager`    | granted=true               | granted=true                     |
| `team_lead`  | granted=false              | granted=false                    |
| `worker`     | granted=false              | granted=false                    |
| `viewer`     | granted=false              | granted=false                    |

= 5 roles × 2 perms = 10 rows per tenant × 2 tenants = 20 `role_permissions` rows total.

---

## 11. Lessons Already Incorporated

- §0.D Runtime semantics rehearsal explicitly traces CHECK NULL behavior — prevents the SECURITY_HOTFIX_2 P-AUTHOR-1 NULL-comparison loophole.
- §0.C Cross-Reference Check distinguishes Brief's `branch_manager` from actual `manager` role id — prevents M1_CONTACT_LENSES_ACCESSORIES P-AUTHOR-4 Brief-vs-DB drift class.
- §4 Iron Rule 32 declared list is exhaustive and includes the Prizma-write prohibition explicitly — prevents the silent-destructive-op class.
- §3 success criteria split per-tenant for demo backfill and Prizma non-backfill (rows 8 + 9 are independent) — prevents accidentally "passing" the demo criterion while silently violating the Prizma prohibition.

---

## 12. References

- Brief: `architecture-brief/M1_LENS_INVENTORY_UNIFIED_FLOW_BRIEF.md`
- Mockups: `architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html`, `LENS_GOODS_RECEIPT_MOCKUP.html`
- Escalation: `escalations/2026-05-18T_M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A_PRIZMA_AUTH.md`
- Existing RPC: `m1_create_receipt_from_box` (8 args — extension in Phase C)
- Predecessor SPEC: `M1_LENS_INVENTORY_MOCKUP_1TO1` (just-closed today; same inventory.html scope, no overlap with Phase A's DB-only scope)

---

## 13. Execution Marker (for Iron Rule 32 pre-commit hook)

> This SPEC.md will be staged in the same commit as the destructive ops (C-A1). The Iron Rule 32 hook (`scripts/checks/destructive-ops-declared.mjs`) reads §4 above to validate that every destructive operation in the staged tree was pre-declared. Executor MUST `git add` SPEC.md alongside the migration files in C-A1.

*End of SPEC. Foreman-sealed 2026-05-18 evening. Ready for executor dispatch.*
