# SPEC — M1_INVENTORY_DEBT_DECOUPLING

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_DEBT_DECOUPLING/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Claude Code, 2026-05-18 evening
> **Authored on:** 2026-05-18
> **Module:** 1 — Inventory Management
> **Type:** Architectural correction — surgical decoupling of inventory from supplier-debt concerns
> **Trigger:** Daniel directive 2026-05-18 evening during `M1_LENS_INVENTORY_UNIFIED_FLOW` Phase C close. F-4 surfaced the architectural collision; the rule "inventory never creates supplier debt" is now durable (see auto-memory `project_inventory_debt_decoupling_rule.md`).

---

## 0. Pre-Authoring Reality Check

- Daniel HALT message read in full + the architectural rule restated for clarity.
- Pre-Phase-C `m1_create_receipt_from_box` body captured (commit `1eb2b5e` introduced the 10-arg version + supplier_debt PERFORM that today's correction strips out).
- Phase A's 5 audit columns + 2 permission keys + 20 grant rows confirmed not consumed by any production code path outside of Phase C's UI (which is also being stripped). The lens-goods-receipt module pre-Phase-C calls the RPC with 8 args — safe to revert.
- Phase B (`default_supplier_id` column + settings UI + Prizma backfill) explicitly PRESERVED per Daniel's directive.
- Phase C structural UI (Quick Scan drawer + Manual Add panel + RPC extension structure) PRESERVED minus the undocumented/delivery-note checkbox elements.
- F-5 hypothesis: the "PO300005-1 integer cast" trigger error fires INSIDE `m1_create_supplier_debt_from_receipt`. Stripping the PERFORM call removes the error path. Verify post-correction.
- Auto-memory rule `project_inventory_debt_decoupling_rule.md` written + indexed.

### 0.B — Lessons applied from prior reviews (M1)

| Lesson | Source | How honored |
|---|---|---|
| P-EXEC-1 Postgres CREATE OR REPLACE overload trap | Phase C DM-1 | The corrective RPC reversion explicitly DROPs the 10-arg overload first, then CREATEs the 8-arg version |
| Heading-format pre-check | Phase A | `## 4. Destructive Operations` (no suffix) |
| §3 arithmetic in parentheticals | Phase A | All counts hand-computed |
| Strict Iron Rule 32 declaration for DROP ops | Phase A + C | §4 lists every DROP COLUMN + DROP CONSTRAINT + DELETE explicitly |

### 0.C — Cross-Reference Check (Rule 21)

| Object | Action | Cross-ref result |
|---|---|---|
| RPC `m1_create_receipt_from_box(10-arg)` | DROP | exists (created by Phase C); no other callers in repo beyond this Pipeline's UI (which is also being reverted) |
| RPC `m1_create_receipt_from_box(8-arg)` | CREATE | restores pre-Phase-C signature; existing lens-goods-receipt callers expect this |
| `purchase_receipt.is_documented` etc. | DROP COLUMN × 5 | no consumers outside this Pipeline (verified via grep); 0 production-data rows depend on them (1 day old) |
| `permissions.id = 'inventory.add.undocumented' / 'inventory.manager_review.approve'` | DELETE × 4 (2 keys × 2 tenants) | seeded only by this Pipeline; no other consumers |
| `role_permissions` for those 2 perm ids | DELETE × 20 | cascade with permission deletes |
| `purchase_receipt_delivery_note_required_when_documented` CHECK constraint | DROP | added today by Phase C DM-3 hotfix; semantically meaningless without is_documented column |
| `delivery_note_number` NULL-ability | UNCHANGED | leave DROP NOT NULL in place — orthogonal to the inventory/debt boundary; harmless |

Cross-Reference Check completed 2026-05-18 evening: **0 collisions, all targets pre-verified to be Phase-A-or-C artifacts safe to remove.**

### 0.D — Runtime semantics rehearsal

1. **DROP FUNCTION 10-arg + CREATE 8-arg RPC:** Same Postgres semantic as Phase C DM-1 — `CREATE OR REPLACE` with different signature creates overload. Avoid by DROPping the 10-arg first, then CREATEing the 8-arg cleanly.
2. **The 8-arg body's content:** restore to pre-Phase-C state (commit `1eb2b5e^` pre-image) MINUS the `PERFORM m1_create_supplier_debt_from_receipt(...)` line at the end (the architectural removal). Body keeps: receipt INSERT (without is_documented columns), stock_lot/movement creation for non-manual lines, PO line update cascade, discrepancy_status recomputation. Body strips: 3 column writes in INSERT, supplier_debt PERFORM.
3. **DROP COLUMN × 5:** Postgres DDL straightforward. No FK violation risk (`manager_reviewed_by` FK to employees — DROP COLUMN automatically removes the FK).
4. **DELETE permissions + role_permissions:** delete order matters — role_permissions FIRST, then permissions (FK from role_permissions.permission_id → permissions.id). 20 + 4 = 24 rows total deleted.
5. **JS edits:** `_submitAddStock` helper loses `is_documented` + `undocumented_reason` params; Manual Add panel + Quick Scan drawer lose the undocumented checkbox + delivery-note input UI rows. Net JS line change ≈ -25 lines.

Runtime semantics rehearsed: yes — no NULL traps, no FK cascade surprises, no callers blocked.

### 0.E — Baselines (captured 2026-05-18 evening, pre-correction)

| Symbol | Value |
|---|---|
| `BASE_RPC_overload_count` | 1 (post-Phase-C DM-1) |
| `BASE_RPC_arg_count` | 10 (post-Phase-C) |
| `BASE_PR_audit_columns` | 5 |
| `BASE_PERMS_2_keys` | 4 rows (2 keys × 2 tenants) |
| `BASE_RP_2_keys` | 20 rows (5 roles × 2 perms × 2 tenants) |
| `BASE_INV_PARTIAL` | 665 lines |
| `BASE_MODAL_SHOWS` | 342 lines (post-Phase-C VFV fix) |
| `BASE_QUICK_SCAN` | 150 lines |

Expected post-correction values:
- `RPC_overload_count` = 1; `RPC_arg_count` = 8
- `PR_audit_columns` = 0
- `PERMS_2_keys` = 0; `RP_2_keys` = 0
- partial.html ≈ 635-650 (strip undocumented checkbox + dn input rows × 2)
- modal-shows.js ≈ 305-320 (strip param handling + permission check)
- quick-scan.js ≈ 130-140 (strip undocumented + dn handling)

---

## 1. Goal

Strip every artifact of the "inventory creates supplier debt" architectural collision from the repo + DB: remove the supplier_debt creation branch from `m1_create_receipt_from_box`, revert the RPC signature to 8 args, drop the 5 audit columns on `purchase_receipt`, delete the 2 misconceived permission keys + their 20 grant rows, and strip the related undocumented-checkbox UI from the Quick Scan drawer + Manual Add panel. Preserve Phase B's `default_supplier_id` work + Phase C's structural UI scaffolding. After this SPEC closes, the inventory module is architecturally clean per the durable rule.

## 2. Background & Motivation

During the `M1_LENS_INVENTORY_UNIFIED_FLOW` Pipeline (Phases A → B → C), the Brief assumed inventory could own document-tracking + manager-review state. Phase C's Tier C VFV exposed the architectural collision (F-4: cascading NOT NULL on `supplier_debt.delivery_note_number`). Daniel issued the corrective directive: **inventory module never creates supplier debt**. The financial side (debt rows, document matching, manager review of unmatched documents) is owned by the separate supplier-debt module. This SPEC removes the misconceived inventory-side artifacts so the codebase reflects the corrected architecture.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | Branch state | `develop`, clean post-commits | `git status` → clean |
| 2 | Commits produced | 6 (Seed + RPC revert + Schema drops + UI strip + Doc append + Close) | `git log <SAFETY_TAG>..HEAD --oneline | wc -l` → 6 |
| 3 | Safety tag exists | `pre-m1-inv-debt-decoupling-2026-05-18` | `git tag -l ...` matches |
| 4 | RPC `m1_create_receipt_from_box` signature reverted | 8 args (pre-Phase-C signature), `overload_count=1` | `pg_get_function_arguments` matches the 8-arg list |
| 5 | RPC body strips supplier_debt PERFORM | body does NOT contain `m1_create_supplier_debt_from_receipt` | `pg_get_functiondef` grep |
| 6 | `purchase_receipt` audit columns DROPPED | 0 of `is_documented`, `undocumented_reason`, `manager_review_status`, `manager_reviewed_by`, `manager_reviewed_at` | `information_schema.columns` count = 0 |
| 7 | CHECK constraint dropped | `purchase_receipt_delivery_note_required_when_documented` not present | `pg_constraint` query → 0 rows |
| 8 | 2 permission keys deleted | 0 rows in `permissions` for those ids | SQL count → 0 |
| 9 | 20 role_permissions deleted | 0 rows in `role_permissions` for those permission_ids | SQL count → 0 |
| 10 | Manual Add panel HTML — undocumented elements removed | 0 occurrences of `id="manual-undocumented"` + 0 of `id="manual-dn"` in lens-inventory-partial.html | grep count → 0 |
| 11 | Quick Scan drawer HTML — undocumented elements removed | 0 occurrences of `id="drawer-qs-undocumented"` + 0 of `id="drawer-qs-dn"` | grep count → 0 |
| 12 | `_submitAddStock` helper — is_documented / undocumented_reason params removed | 0 occurrences of `is_documented` or `undocumented_reason` in `lens-inventory-modal-shows.js` (post-strip) | grep count → 0 |
| 13 | Quick Scan JS — undocumented references removed | 0 occurrences of `undocumented` in `lens-inventory-quick-scan.js` | grep count → 0 |
| 14 | Phase B PRESERVED | `tenants.default_supplier_id` column still exists; `settings.inventory.manage` permission still seeded for both tenants; Prizma `default_supplier_id` still = `0b868b66-...` (בדולח) | SQL probes — all 3 PASS |
| 15 | F-5 verification | Manual Add (variant-less + with delivery note) on demo succeeds with NO PO300005-1 integer cast error in console; verifies the bug was inside the stripped supplier_debt branch | Tier C VFV |
| 16 | Demo Tier C — physical-only receipt creation | New purchase_receipt + line + (if variant_id passed) stock_lot + stock_movement; ZERO new supplier_debt rows attributable to this Tier C | SQL `SELECT count(*) FROM supplier_debt WHERE purchase_receipt_id = <new>` → 0 |
| 17 | Prizma row delta | exactly 0 row changes on any Prizma table; schema-only column drops don't affect tenant row counts | pre/post probe |
| 18 | Smoke 7/7 PASS | unchanged | `npm run smoke` |
| 19 | Iron Rule 31 integrity gate | exit 0 every commit | `npm run verify:integrity; echo $?` → 0 |
| 20 | Iron Rule 32 declared ops only | every destructive op in §4 below | manual diff vs §4 |

---

## 4. Destructive Operations

Declared list:

1. `DROP FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid, boolean, text)` — drop the Phase C 10-arg overload
2. `CREATE OR REPLACE FUNCTION public.m1_create_receipt_from_box(uuid, uuid, text, jsonb, uuid, text, text, uuid)` — restore 8-arg signature with body stripped of supplier_debt PERFORM + the 3 audit-column INSERT writes
3. `ALTER TABLE purchase_receipt DROP COLUMN is_documented` (cascade: also drops the CHECK constraint and the column dependency)
4. `ALTER TABLE purchase_receipt DROP COLUMN undocumented_reason`
5. `ALTER TABLE purchase_receipt DROP COLUMN manager_review_status`
6. `ALTER TABLE purchase_receipt DROP COLUMN manager_reviewed_by` (auto-drops the FK to employees)
7. `ALTER TABLE purchase_receipt DROP COLUMN manager_reviewed_at`
8. `ALTER TABLE purchase_receipt DROP CONSTRAINT IF EXISTS purchase_receipt_delivery_note_required_when_documented` (if not auto-dropped by op #3)
9. `DELETE FROM role_permissions WHERE permission_id IN ('inventory.add.undocumented', 'inventory.manager_review.approve')` — 20 rows
10. `DELETE FROM permissions WHERE id IN ('inventory.add.undocumented', 'inventory.manager_review.approve')` — 4 rows
11. File edits: strip undocumented checkbox + dn input rows from `modules/lens-inventory/lens-inventory-partial.html` (Manual Add panel + Quick Scan drawer)
12. File edits: strip undocumented + is_documented + undocumented_reason from `modules/lens-inventory/lens-inventory-modal-shows.js` (`_submitAddStock` signature + permission gate + click handler)
13. File edits: strip undocumented references from `modules/lens-inventory/lens-inventory-quick-scan.js`
14. File edits: append "Architectural Correction" section to `modules/Module 1 - Inventory Management/docs/db-schema.sql`
15. `git tag pre-m1-inv-debt-decoupling-2026-05-18` at parent commit

**Explicitly forbidden in this SPEC:**
- Touching `default_supplier_id` column on tenants (Phase B work — preserved).
- Touching `settings.inventory.manage` permission (Phase B work — preserved).
- Touching Prizma data (the column DROPs are schema-only — no row counts change on data tables).
- DROP TABLE / TRUNCATE / DROP POLICY.
- main branch touches / force-push / rebase.

---

## 5. Stop-on-Deviation Triggers

Stop and escalate if:
1. `DROP FUNCTION` fails (e.g., dependent function/view).
2. RPC restoration fails to compile.
3. `DROP COLUMN` returns non-zero rowcount surprise (e.g., FK from another table not anticipated).
4. DELETE on permissions/role_permissions returns row count ≠ expected (4 + 20).
5. Phase B's `default_supplier_id` column missing post-correction.
6. Prizma's `default_supplier_id` value changed.
7. Smoke 7/7 breaks at any commit.
8. Tier C VFV Flow 2 (Manual Add documented) fails (this validates the corrected RPC works).

---

## 6. Rollback Plan

| What | How |
|---|---|
| Failed correction SPEC | `git reset --hard pre-m1-inv-debt-decoupling-2026-05-18` |
| Revert RPC body | re-apply the Phase C 10-arg body (captured in this SPEC's body for traceability) |
| Re-add the 5 audit columns | re-run Phase A's `m1_unified_flow_a_schema` migration body |
| Re-seed the 2 permission keys | re-run Phase A's `m1_unified_flow_a_perms` migration body |
| File edit reverts | `git checkout <PRE_TAG> -- modules/lens-inventory/*` |

---

## 7. Out of Scope

- The supplier-debt-module-side work (manager review of unmatched documents) — entirely deferred to a future Brief targeting the supplier-debt module.
- F-1 (Full Receive modal) — deferred per Phase C SPEC.
- F-5 (PO300005-1 integer cast trigger) — expected to become moot once the supplier_debt branch is stripped; verify in Tier C, file follow-up SPEC only if bug persists.
- Default-supplier work (Phase A + B + Daniel-authorized Prizma backfill) — PRESERVED.
- Phase C structural UI (Quick Scan drawer + Manual Add panel + RPC extension structure) — PRESERVED minus undocumented elements.
- Touching MODULE_MAP.md, MODULE_SPEC.md, ROADMAP.md, GLOBAL_MAP.md, GLOBAL_SCHEMA.sql — Pipeline-close Integration Ceremony after this SPEC.

---

## 8. Expected Final State

After this SPEC:
- 6 new commits on develop above safety tag.
- Live DB: RPC has 8 args (no supplier_debt branch); 5 audit columns dropped from purchase_receipt; CHECK constraint dropped; 0 rows in permissions + role_permissions for the 2 misconceived keys.
- Phase B preserved: `default_supplier_id` column + Prizma=בדולח + demo=AZMON unchanged.
- Inventory screen: Quick Scan drawer + Manual Add panel still present + functional, minus the undocumented checkbox + delivery-note input UI elements.
- M1 db-schema.sql appends "Architectural Correction" section.
- Smoke 7/7 PASS; Tier C verifies physical-only flow + zero supplier_debt creation.
- F-5 bug becomes unreachable from inventory side (stripped branch).

---

## 9. Commit Plan

| # | Slug | Description |
|---|------|-------------|
| 1 | C-D0 | `chore(spec): seed M1_INVENTORY_DEBT_DECOUPLING SPEC + safety tag` |
| 2 | C-D1 | `feat(m1-inv): revert m1_create_receipt_from_box to 8-arg + strip supplier_debt branch` |
| 3 | C-D2 | `feat(m1-inv): drop 5 audit columns + 2 permission keys + 20 grants` |
| 4 | C-D3 | `feat(m1-inv): strip undocumented UI from Manual Add panel + Quick Scan drawer` |
| 5 | C-D4 | `docs(m1-inv): db-schema.sql Architectural Correction section + SPEC §13.A` |
| 6 | C-D5 | `chore(m1-inv-debt-decoupling): close — EXECUTION_REPORT + FINDINGS + TEST_REPORT` |

---

## 10. Lessons Already Incorporated

- §0.D explicit RPC revert plan with DROP FUNCTION before CREATE — prevents Phase C DM-1 overload trap.
- §3 row 14 splits Phase B preservation into 3 explicit sub-checks — protects against accidental over-strip.
- §4 op #6 explicitly notes the FK auto-drop on `manager_reviewed_by` column — prevents executor surprise.
- §0.C grep-verified zero external consumers of the 2 perm keys + 5 columns — confirms safe removal.
- Auto-memory rule written BEFORE this SPEC was authored — future SPECs won't repeat the architectural mistake.

---

## 11. References

- Daniel HALT directive 2026-05-18 evening (in-conversation).
- Auto-memory rule: `~/.claude/projects/.../memory/project_inventory_debt_decoupling_rule.md`
- Predecessor Pipeline: `M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A/`, `_PHASE_B/`, `_PHASE_C/`.
- Phase C F-4 + F-5 findings (the surfacing events).
- Original 8-arg RPC body: in git pre-image of commit `1eb2b5e` (PRE this Pipeline modified it).

---

## 13. Execution Marker (for Iron Rule 32 pre-commit hook)

> SPEC.md will be staged in each commit (C-D1..C-D4) that contains destructive ops. Hook reads §4 above.

### 13.A — Migrations + edits applied (Executor, populated per-commit)

| # | Commit | Type | Affects |
|---|--------|------|---------|
| 1 | C-D1 `8205966` | DDL (RPC) | DROP 10-arg overload + CREATE OR REPLACE 8-arg with supplier_debt PERFORM removed |
| 2 | C-D2 `e6a9bd4` | DDL + DML | DROP 5 audit columns + DROP CHECK + DELETE 2 perms + DELETE 20 grants |
| 3 | C-D3 `c980250` | UI + JS | Strip undocumented + delivery-note UI from Manual Add panel + Quick Scan drawer + JS helpers; comment-only audit trail kept |
| 4 | C-D4 (this commit) | docs | M1 db-schema.sql Architectural Correction section + this §13.A |
| 5 | C-D5 | docs | EXECUTION_REPORT + FINDINGS + TEST_REPORT |

Post-state verification (all SPEC §3 criteria 4-14 + 16-17 PASS):
- C4: RPC arg_count=8, overload_count=1 ✓
- C5: RPC body grep — `m1_create_supplier_debt_from_receipt` not present ✓
- C6: 0 of 5 audit columns remain ✓
- C7: CHECK constraint absent ✓
- C8: 0 rows in permissions for the 2 keys ✓
- C9: 0 rows in role_permissions for the 2 perm_ids ✓
- C10-13: 0 occurrences of the 4 removed DOM IDs in HTML/JS ✓ (1 comment-only audit-trail line per JS file)
- C14: Phase B preserved (default_supplier_id column alive; Prizma=בדולח; demo=AZMON; settings.inventory.manage = 2 rows) ✓
- C16-17: Tier C in C-D5 verifies physical-only flow + zero supplier_debt creation; Prizma row delta documented

*End of SPEC. Foreman-sealed 2026-05-18 evening. C-D1..C-D4 closed 2026-05-18 evening.*

*End of SPEC. Foreman-sealed 2026-05-18 evening. Architectural correction Pipeline.*
