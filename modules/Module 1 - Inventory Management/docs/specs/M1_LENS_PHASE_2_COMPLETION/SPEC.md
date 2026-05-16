# SPEC — M1_LENS_PHASE_2_COMPLETION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_2_COMPLETION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Night Pipeline 2026-05-15→16, Claude Code Windows-desktop, opus-4-7[1m]
> **Authored on:** 2026-05-15 night
> **Module:** 1 — Inventory Management (+ Module 1.5 Shared Components for Part A)
> **Phase:** Lens Phase 2 (production-completion follow-up)
> **Predecessor:** `M1_LENS_PHASE_1B_GAP_CLOSURE` 🟢 (commit `53005b5`, today)
> **Source Brief:** `architecture-brief/M1_LENS_PHASE_2_COMPLETION_NIGHT_BRIEF.md`
> **Pipeline anchor tag:** `pre-night-pipeline-2026-05-15` (pushed)

> **Heading convention:** Plain numbered `## N. Title`. No `§` prefixes (Iron-Rule-32 hook regex).

---

## 0. Pre-Authoring Reality Check

Required before drafting any later section. Confirms the SPEC is grounded in actual repo state, not Brief assumptions.

- **Brief read in full** at 2026-05-15 night. 268-line Brief covering Parts A/B/C/D with expanded recovery autonomy.
- **Project state verified at HEAD `51dddbe`:**
  - Branch develop, clean tree, integrity-gate exit 0 (clean = 0 files scanned, expected behavior).
  - Smoke baseline 7/7 PASS (PIN auth, CRM lead create, inventory read, storefront pages, no 5xx).
  - Both local servers reachable: ERP :3000, Storefront :4321.
  - Tag `pre-night-pipeline-2026-05-15` placed and pushed.
  - Concurrency: sole CLI session; Cowork desktop app embedded agent (PID 40968) is the Electron child explicitly allowed by Brief.
- **M1_LENS_PHASE_1B_GAP_CLOSURE is closed** (REVIEW + TEST_REPORT + FOREMAN_REVIEW + close commit `53005b5`). The F-2 finding from that review (`_found` vs `_lost` asymmetry) is the motivation for Part B and is referenced by `M1_LENS_ADJUSTMENT_RPC_HARMONIZATION` in OPEN_TASKS.
- **Lessons applied from prior FOREMAN_REVIEWs in this module:** see §11.
- **Pre-existing untracked files surveyed:** 0 (`git status --porcelain | grep '^??'` = empty). Selective `git add` by filename throughout.

### 0.A — Empirical pre-flight probes (per P-AUTHOR-1/3/4 from recent FOREMAN_REVIEWs)

| Probe | Source | Finding |
|---|---|---|
| P1: Frames vs lens receipt code surface | `wc -l modules/{goods-receipts,lens-goods-receipt}/*.js` | Frames = 4,473 lines / 20 files (OCR-heavy: receipt-ocr-*.js, receipt-po-compare.js, receipt-excel.js, AI-learning). Lens = 632 lines / 8 files (PO-driven: lens-goods-receipt-{close,delivery-note,lines,main,manual,pre-fill,shipping-box,supplier}.js). **The shared UX surface is much narrower than the Brief assumed.** No OCR in lens, no PO-compare in lens, no AI learning in lens. |
| P2: 7 lens HTML pages exist at repo root | `ls *.html` | Confirmed all 7: `lens-active-designs.html`, `lens-catalog-admin.html`, `lens-goods-receipt.html`, `lens-inventory.html`, `lens-pos-list.html`, `lens-pricing.html`, `lens-purchase-order.html`. |
| P3: Main menu structure | `index.html` lines 147-159 | Single `MODULES` array. 11 modules as cards. ZERO lens screens linked. Frames-era `inventory.html` is one card with `permission: 'inventory.view'`. |
| P4: `record_adjustment_lost` body | `pg_get_functiondef('record_adjustment_lost')` | 11 params, SECDEF, search_path=public, JWT-claim guard (canonical Block A), reason_id FK lookup with direction=-1 check, INSERT stock_adjustment audit row, delegates to record_stock_movement. ACL: `{postgres=X,authenticated=X,service_role=X}` — anon REVOKED. Returns `v_adjustment_id`. |
| P5: `record_adjustment_found` body | `pg_get_functiondef('record_adjustment_found')` | 9 params, SECDEF, search_path=public, JWT-claim guard (canonical Block A), takes `p_reason TEXT` (free-text!), does NOT write stock_adjustment audit row, creates a NEW stock_lot, delegates to record_stock_movement. ACL: `{postgres=X,authenticated=X,service_role=X}` — anon REVOKED. Returns `v_movement_id` (NOT adjustment_id). |
| P6: `record_count_correction` exists? | `pg_get_functiondef('record_count_correction')` | **DOES NOT EXIST** in DB. Brief §2.2 autonomy band mentions it; reality says no such RPC. Part B will NOT add it (out of scope). |
| P7: `record_adjustment_found` callers in JS/HTML | `Grep "record_adjustment_found" --glob *.{js,html,mjs,ts}` | **ZERO live callers.** Only doc/brief/spec/migration refs. Part B's signature change is breaking-FREE for runtime. |
| P8: Live unindexed FK count | `pg_constraint LEFT JOIN pg_index leading-col` | **151 unindexed FK columns project-wide.** Brief §2.3 cites "21 from Phase 1A H-1 + new FKs"; live count includes M4 CRM + M3 + M1 1A/1B/Gap-Closure additions. M1 Lens-scoped subset = ~31 columns (see §0.D). |
| P9: 7 mockups exist | `ls modules/Module 1 - Inventory Management/architecture-brief/mockups/` | All 7 present: `LENS_ACTIVE_POS_LIST_MOCKUP.html`, `LENS_DESIGNS_SELECTION_MOCKUP.html`, `LENS_GOODS_RECEIPT_MOCKUP.html`, `LENS_INVENTORY_MOCKUP.html`, `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`, `LENS_PRICING_MOCKUP.html`, `LENS_PURCHASE_ORDER_MOCKUP.html`. Localhost-Tester (Stage 7) compares screenshots to these. |
| P10: stock_adjustment_reason +1-direction seed exists | (deferred to executor Step 1.5) | Brief §0 GAP_CLOSURE seeded 8 rows (4 per tenant). Executor must verify ≥1 row per tenant has direction=+1 BEFORE Part B applies; if not, Part B authorizes a single seed-extension INSERT under existing destructive-ops envelope. |

### 0.B — Runtime semantics rehearsal (DDL-touching SPECs — Part B)

Per SKILL.md §5.3 (added 2026-05-15 from SECURITY_HOTFIX_2 P-AUTHOR-2): rehearse runtime semantics before sealing any function-header SPEC.

**Part B header change for `record_adjustment_found`:**

| Caller type | Behavior |
|---|---|
| anon, no JWT | Block A fires: `v_jwt_tenant IS NULL` → 42501. ✅ |
| authenticated, wrong tenant_id | Block A fires: `v_jwt_tenant <> p_tenant_id` → 42501. ✅ |
| authenticated, correct tenant_id, NULL p_reason_id | Reason lookup returns NULL → 23503 "reason_id not active or wrong tenant". ✅ |
| authenticated, correct tenant, valid reason_id with direction=-1 | Direction check fires: `v_reason_dir <> 1` → P0001 "reason direction must be +1 for record_adjustment_found". ✅ |
| service_role (no JWT claim) | Block A fires (NULL JWT) → 42501. **DESIGN CHOICE:** consistent with `record_adjustment_lost` + `record_stock_movement` — service_role uses canonical JWT-claim path or fails. (F-5 INFO from GAP_CLOSURE = project convention.) |

**Status-column semantics probe (SECURITY_HOTFIX_3 P-AUTHOR-1):** `stock_adjustment_reason.is_active` is a boolean. `direction` is `smallint` with CHECK `direction IN (-1, 1)`. Probed at author time via Phase 1B GAP_CLOSURE FINDINGS — 4 seed rows per tenant cover both directions. No status-semantics mismatch.

**Runtime semantics rehearsed: yes — evidence above.**

### 0.C — Part A feasibility analysis & decision gate

The Brief §2.1 assumes a generic Module 1.5 component can absorb the shared UX surface between frames-receipt and lens-receipt. The empirical probe (P1) shows the surfaces are NOT actually parallel:

| Aspect | Frames receipt | Lens receipt |
|---|---|---|
| Entry point | Supplier sends invoice (paper + image) → OCR → reconcile | Supplier sends shipping box → match to PO → close |
| Volume | 4,473 lines, 20 files | 632 lines, 8 files |
| Major features | OCR + AI learning + PO compare + Excel export + manual line entry + supplier autocomplete + invoice-total compare gate + brand autocomplete + delivery-note display | Pre-fill from PO + delivery-note + shipping-box pick + manual line + supplier picker + summary recompute |
| Discrepancy model | Invoice line total vs cost-total with 1₪ tolerance | qty_received vs qty_expected per PO line + supplier_debt computation |
| Shared surface (eyeball estimate) | ~200 lines of truly shared logic: supplier picker, line-list rendering helpers, save/cancel wiring, modal builder usage |

**Decision gate (Part A only):** before any refactor commit, executor performs A1 = empirical analysis (read all 28 files, identify shared functions / DOM patterns / behavior). Apply this decision rule:

- **Branch A2-full** — if ≥ 500 lines genuinely extractable into a shared component → execute "full generic component" path. Estimated wall-clock 4-6 hours.
- **Branch A2-narrow** — if 100-500 lines extractable → extract narrow helpers only (e.g., `shared/js/goods-receipt-supplier-picker.js`, `shared/js/goods-receipt-line-list.js`, `shared/js/goods-receipt-discrepancy-banner.js`). Estimated wall-clock 2-3 hours. Close D-M1-09 promise at a smaller surface.
- **Branch A2-defer** — if < 100 lines extractable → Tier 3 defer Part A. Document analysis as `FINDINGS.md` entry `M1_LENS_GENERIC_RECEIPT_DEFERRED` with the empirical surface table. Tag `pre-night-2026-05-15-part-A-deferred`. Proceed to Parts B/C/D. Brief §4 item 4 explicitly authorizes this.

The executor MUST document the chosen branch in EXECUTION_REPORT.md §"Part A Decision". Any branch is acceptable under Bounded Autonomy.

### 0.D — Part C scope (M1 Lens FK index set, captured 2026-05-15 night)

Per Brief §2.3 autonomy band: "new FKs introduced after H-1 was filed should be included." Live advisor returned 151 unindexed FKs project-wide; the M1 Lens-scoped subset (the tables M1 owns + the M1B0/Phase-1B additions) = **31 columns**:

| Table | Column count | Columns |
|---|---|---|
| `stock_adjustment` | 5 | location_id, performed_by, reason_id, stock_lot_id, variant_id |
| `stock_lot` | 4 | original_lot_id, purchase_order_id, purchase_receipt_id, supplier_offering_id |
| `stock_movement` | 2 | location_id, transfer_id |
| `stock_transfer` | 3 | from_location_id, to_location_id, variant_id |
| `purchase_order` | 2 | created_by, supplier_id |
| `purchase_order_line` | 3 | purchase_order_id, variant_id, vat_rate_id |
| `purchase_receipt` | 1 | purchase_order_id |
| `purchase_receipt_line` | 1 | location_id |
| `supplier_debt` | 2 | purchase_receipt_id, supplier_id |
| `supplier_catalog_offering` | 3 | supplier_brand_distribution_id, supplier_id, vat_rate_id |
| `lens_variant` | 1 | superseded_by_id |
| `pricing_overlay` | 2 | offering_id, proposed_by |
| `tenant_active_offerings` | 1 | location_id |
| `pending_lens_advancement_queue` | 1 | purchase_receipt_id |
| **Total** | **31** | |

Executor MUST re-run the same probe at Stage 4 start to capture drift (concurrent M4/M3 sessions may add or close FKs). The SPEC's expected count is "≥ 25, ≤ 35" to absorb minor drift; precise count documented in EXECUTION_REPORT.

### 0.E — Baselines (referenced by §3 Success Criteria)

| Symbol | File | Metric | Value (captured 2026-05-15 night) |
|---|---|---|---|
| `BASE_INDEX_MODULES_COUNT` | `index.html` | Module objects in MODULES array | 11 |
| `BASE_LENS_HTML_AT_ROOT` | repo root | `ls lens-*.html | wc -l` | 7 |
| `BASE_FRAMES_RECEIPT_LINES` | `modules/goods-receipts/` | `wc -l *.js` total | 4,473 |
| `BASE_LENS_RECEIPT_LINES` | `modules/lens-goods-receipt/` | `wc -l *.js` total | 632 |
| `BASE_M1_LENS_FK_UNINDEXED` | live DB | per §0.D | 31 ±5 |
| `BASE_RECORD_ADJ_FOUND_CALLERS` | repo grep | `record_adjustment_found` callers in .js/.html/.ts | 0 |

---

## 1. Goal

Close M1 Lens department to **production-complete** by shipping 4 follow-up items in one Night Pipeline with self-recovery rights: (A) Module 1.5 generic goods-receipt extraction OR narrow-helper extraction (closing D-M1-09 at the surface that's actually shareable), (B) RPC harmonization of `record_adjustment_lost` + `record_adjustment_found` as twin canonical RPCs with consistent audit trail / signature / return shape, (C) FK index sweep for ~31 unindexed M1 Lens columns, (D) wire all 7 lens screens into the ERP main menu with permission gates.

---

## 2. Background & Motivation

After today's `M1_LENS_PHASE_1B_GAP_CLOSURE` 🟢 (3 HIGH foundational gaps closed: F-1 PO state recompute, F-2 variant-less manual lines, F-3 stock_adjustment infrastructure), M1 Lens is **production-correct** (the schema + RPCs work as intended on demo) but not **production-complete** (staff cannot navigate to the screens from the menu; the parallel `modules/lens-goods-receipt/` folder violates D-M1-09; the two adjustment RPCs are asymmetric; 31 FKs lack supporting indexes).

This SPEC closes those four items in one Pipeline. The Brief's strategic objective: when Daniel wakes up tomorrow, M1 Lens is shippable for daily shop-floor operations, OR has a precise list of why specific items did not close with concrete next steps.

Predecessors: `M1_LENS_PHASE_1B_GAP_CLOSURE` 🟢 (`53005b5`, 2026-05-15), Module 1 Close Ceremony commits, F-2 NEW_SPEC queue.

---

## 3. Success Criteria (Measurable)

Criteria are grouped by Part. Tier 3 deferral of a Part marks its criteria as "deferred" (not failed) and is a 🟡 verdict, not 🔴, per Brief §5.

### Global criteria (apply across all Parts)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| G1 | Branch state | On `develop`, clean at SPEC close | `git status --porcelain` → empty |
| G2 | Tag chain | `pre-night-pipeline-2026-05-15` exists + per-Part tags where Part-specific commits land | `git tag --list 'pre-night-*' 'pre-part-*'` |
| G3 | Iron Rule 31 integrity gate | exit 0 or 2 across every commit | `npm run verify:integrity` in pre-commit hook |
| G4 | Iron Rule 32 declared list | every commit passes hook | hook output |
| G5 | Smoke baseline | 7/7 PASS at every stage boundary | `npm run smoke` |
| G6 | Prizma untouched | row-count delta = 0 on touched tables; no Prizma write in any commit | spot-check SQL in EXECUTION_REPORT |
| G7 | No main-branch ops | 0 commits, merges, or pushes to main | `git log main..develop` exists; `git rev-parse main` unchanged vs pre-night-pipeline-2026-05-15 |
| G8 | Sole CLI session | concurrency guard re-checked at each stage boundary | Get-Process probe in EXECUTION_REPORT §"Concurrency Log" |
| G9 | No EF redeploys | 0 Edge Function deploys this Pipeline | Supabase MCP `list_edge_functions` delta = 0 |
| G10 | Live DB advisor delta | 0 NEW CRITICAL or HIGH findings (security advisor); MEDIUM/LOW from Part C index adds are allowed and expected | Sentinel Stage 8 cross-check |

### Part A criteria (Module 1.5 generic receipt or narrow extraction)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| A1 | Decision branch declared | One of {A2-full, A2-narrow, A2-defer} with reasoning in EXECUTION_REPORT.md §"Part A Decision" | manual grep of report |
| A2 | If A2-full or A2-narrow: extracted file(s) live under `shared/js/` or `modules/Module 1.5 - Shared Components/` | path(s) ls exit 0 | `ls` |
| A3 | If A2-full or A2-narrow: frames-receipt smoke unchanged | Daniel-equivalent demo smoke: open existing frames receipt → close → confirm zero console errors + same DB delta as pre-refactor | manual UI exercise or scripted localhost check |
| A4 | If A2-full or A2-narrow: lens-receipt smoke F-1/F-2/F-3 still PASS | re-run the GAP_CLOSURE smoke matrix on demo | scripted execute_sql probes per GAP_CLOSURE TEST_REPORT |
| A5 | If A2-full: `modules/lens-goods-receipt/` shrinks by ≥ 30% AND `modules/goods-receipts/` shrinks by ≥ 5% | `wc -l` delta vs baseline | wc -l |
| A6 | If A2-defer: `FINDINGS.md` contains `M1_LENS_GENERIC_RECEIPT_DEFERRED` entry with empirical surface table | grep | grep |
| A7 | Iron Rule 12 honored | every new file ≤ 350 lines | `wc -l shared/js/goods-receipt-*.js` if applicable |
| A8 | Iron Rule 21 honored | no two helpers do the same job; cross-reference check documented | EXECUTION_REPORT §"Cross-Reference Check" |

### Part B criteria (RPC harmonization)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| B1 | `record_adjustment_found` new signature | 11 params: `(p_tenant_id, p_variant_id, p_location_id, p_qty_found, p_reason_id, p_performed_by, p_notes, p_sph, p_cyl, p_add_value)` — note: NO p_lot_id because _found creates a new lot; the asymmetry is semantic, not drift | `pg_get_functiondef('record_adjustment_found')` |
| B2 | `record_adjustment_found` body harmonization | (a) JWT-claim Block A identical text to `record_adjustment_lost`, (b) reason_id FK lookup with direction=+1 check, (c) INSERT stock_adjustment audit row (with NEW lot_id), (d) delegate to record_stock_movement with movement_type='adjustment_found' and qty_delta=+p_qty_found, (e) return v_adjustment_id (NOT v_movement_id) | diff vs `record_adjustment_lost` body |
| B3 | `record_adjustment_found` ACL | `{postgres=X,authenticated=X,service_role=X}` — anon NOT in proacl | `pg_proc.proacl::text` |
| B4 | `record_adjustment_lost` body unchanged | identical body text pre/post | `pg_get_functiondef('record_adjustment_lost')` byte-equal to pre-Part-B snapshot |
| B5 | Day-1 seed coverage | each tenant has ≥1 active `stock_adjustment_reason` row with direction=+1 | execute_sql |
| B6 | Functional smoke: found-flow on demo | DO block as authenticated demo CEO: create stock_lot of qty=10 → call new `record_adjustment_found(qty_found=3)` → assert (a) returns UUID, (b) new stock_adjustment row with qty_delta=+3, (c) new stock_lot row with origin_type='adjustment_found' qty_received=3, (d) new stock_movement row with movement_type='adjustment_found' qty_delta=+3 adjustment_id=returned UUID | execute_sql DO block |
| B7 | Anon-reject probe for _found | anon JWT call → 42501 | execute_sql in anon role |
| B8 | Prizma untouched delta = 0 | `(SELECT count(*) FROM stock_adjustment WHERE tenant_id=prizma)` pre = post | execute_sql |

### Part C criteria (FK index sweep)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| C1 | Live FK probe re-run at Stage 4 start | M1 Lens scope count = 31 ±5 | execute_sql probe from §0.D |
| C2 | Single migration applied | 1 migration file OR 1 `apply_migration` call (or `execute_sql` fallback per P-AUTHOR-2) creating ALL partial indexes | MCP list_migrations + grep |
| C3 | Each index is partial | `CREATE INDEX ... ON ... (fk_col) WHERE fk_col IS NOT NULL` | `pg_indexes.indexdef` LIKE '%WHERE%' |
| C4 | Index naming convention | `idx_<table>_<col>` (lowercase, underscores) | pg_indexes.indexname |
| C5 | Post-Part-C re-run | M1 Lens-scope unindexed FK count = 0 | execute_sql probe |

### Part D criteria (main menu wiring)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| D1 | All 7 lens screens reachable from index.html within ≤ 2 clicks | Either: ONE "עדשות" card → lens hub with 7 sub-nav buttons; OR 7 cards directly; OR sub-nav widget on each lens page | manual click-through in localhost demo |
| D2 | Permission gating works | CEO sees all 7; non-CEO sees the screens their `lens.*` permissions allow; worker sees only `lens.inventory.view`-gated screens | manual UI probe with different PINs OR scripted hasPermission() probe per page |
| D3 | Each of 7 pages returns HTTP 200 on demo | curl http://localhost:3000/lens-*.html → 200 | scripted |
| D4 | Each of 7 pages renders without console errors | open in browser, check console | Chrome MCP screenshot + console probe (Stage 7 Localhost-Tester) |
| D5 | If a new permission key was added | added to demo + prizma `permissions` table + appropriate `role_permissions` rows; follows canonical Iron Rule 15 RLS pattern; key listed in EXECUTION_REPORT.md §"New Permission Keys" | execute_sql |
| D6 | Iron Rule 21 (no orphans) | menu addition extends existing MODULES array pattern; no new menu-rendering machinery invented | grep `index.html` for `renderModules` — unchanged |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo and any DB object (Level 1).
- Run SQL Level 2 (writes to demo tenant only) for smoke + RPC harmonization + FK indexes.
- Create/edit/move files listed in §8 Expected Final State.
- Commit and push to `develop` per §9 Commit Plan.
- Run the standard verify scripts.
- **Tier 1-3 self-recovery per Brief §5** — retry, in-Part diagnosis-and-fix, OR Tier 3 Part-defer on clean base.
- **Mid-execution SPEC amendment within scope** per Brief §4 item 1 — amend §0/§3 success criteria inline; document delta in EXECUTION_REPORT.md.
- **Commit reordering** per Brief §4 item 2 — if Part A's commit depends on Part C's index, reorder.
- **Additional commits within scope** per Brief §4 item 3 — fix bugs surfaced by the refactor, within the same Part's scope.
- **Skip a Part if predecessor fails** per Brief §4 item 4 — Tier 3 deferral.
- **Spawn sub-agents for read-only investigation** per Brief §4 item 5 — for cross-module impact analysis.
- **Add 1-2 new permission keys** per Brief §4 item 6 — for menu visibility, following canonical pattern.
- **Apply skill-improvement proposals as pending-entries** per Brief §4 item 7 — write to `_archive/architect-pending-entries/2026-05-16_*.md`; NEVER touch `.claude/skills/`.
- **MCP `apply_migration` PK-collision fallback to `execute_sql`** per P-AUTHOR-2 from GAP_CLOSURE — pre-authorized; no escalation.
- **Mid-execution per-column probe** per P-AUTHOR-1 / P-EXEC-1 — run column existence probes for every new DDL reference at Step 1.5 DB Pre-Flight.

### What REQUIRES stopping and reporting (Tier 4 halt)

- Iron Rule 31 integrity gate fails repeatedly (3+ retries same null-byte ERROR).
- Demo tenant becomes unusable (smoke baseline drops below 6/7 and cannot be restored within Part scope).
- Cross-module unintended impact detected (an M4/M3/M2 file gets modified by the Pipeline, or an M4/M3/M2 functional test starts failing).
- Any attempt to modify `main` branch.
- Any write to Prizma tenant beyond authorized scope.
- A destructive operation surfaces that is not declared in §Destructive Operations.

Halt = write `escalations/{ISO_TS}_HALT_<reason>.md` + STOP. Daniel handles in morning.

### Tier 5 last-resort rollback

If Pipeline state is genuinely corrupted (e.g., develop got into an unrecoverable state mid-Part): `git reset --hard pre-night-pipeline-2026-05-15` + `git push --force-with-lease origin develop`. **EXCEPTION ONLY for develop branch.** Never for main. Write `FAILURE_REPORT.md`.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

Tier 4 triggers above are the absolute stop list. In addition:

- If Part A1 analysis surfaces a hidden dependency the refactor would break (e.g., a global function `setReceiptDirty()` that frames-receipt uses but isn't documented) → STOP at end of A1, document, decide branch A2-narrow vs A2-defer.
- If Part B's stock_adjustment_reason seed lacks a direction=+1 row for either tenant AND a seed-extension INSERT would create more than 1 new row per tenant → STOP, escalate (the Brief Day-1 seed should already have +1 reasons; if not, that's a Gap Closure regression).
- If Part C re-run shows ≥ 50 unindexed FKs in M1 Lens scope (well above the +5 drift band) → STOP, re-scope at Foreman discretion.
- If Part D's chosen menu approach requires modifying `js/auth-service.js` or `js/shared.js` beyond a single MODULES array addition → STOP, escalate (architectural change per Brief §2.4 step 5).
- If 7+ commits land in a Part without smoke baseline 7/7 being re-verified → STOP and re-verify before continuing.

---

## 6. Rollback Plan

Per-Part rollback strategy (Tier 3 deferral path):

**Part A rollback:** if the refactor introduces regression: `git reset --hard pre-part-A` + tag `pre-night-2026-05-15-part-A-deferred` + proceed to Parts B/C/D. DB unchanged (Part A is code-only).

**Part B rollback:** if the new `record_adjustment_found` body fails B6 smoke: `CREATE OR REPLACE FUNCTION record_adjustment_found(...old signature)` from snapshot in `MIGRATION.md` Applied Log. DB delta = 0.

**Part C rollback:** if a partial index causes lock contention or 23505 collision: `DROP INDEX IF EXISTS idx_<table>_<col>` for the offending one. The remaining indexes stay (they're partial CREATE INDEX, independent).

**Part D rollback:** revert the `index.html` MODULES addition (one git revert). New permission rows (if any) can stay (additive, harmless).

**Full Pipeline rollback (Tier 5):** `git reset --hard pre-night-pipeline-2026-05-15` + `git push --force-with-lease origin develop`. Plus DB rollback per individual Parts (Part B requires re-applying old `record_adjustment_found` body from snapshot; Part C DROP INDEX statements; Part A is code-only).

---

## 7. Destructive Operations

Per Iron Rule 32 + Brief §6, this SPEC authorizes the following destructive operations only:

1. **`git mv` of files within Part A refactor scope** — preserving git history when moving lens-goods-receipt/* helpers into shared/js/* or Module 1.5 location. Authorized only if Part A branch = A2-full or A2-narrow.
2. **`git rm` of files that become empty after Part A refactor** — only if a file truly becomes 0 functional lines after extraction; otherwise leave as shrunken file. Authorized only if Part A branch = A2-full.
3. **Migration `DROP INDEX IF EXISTS ...`** — Tier 4-only within Part C: if a Part C partial index collides with a previously-erroneous index. Each DROP must be documented with reason in MIGRATION.md.
4. **`_archive/` move of pre-refactor lens-goods-receipt snapshot** — non-destructive but declared for completeness. Authorized only if Part A branch = A2-full collapses the entire folder.
5. **`_archive/night-pipeline-2026-05-15/` directory creation** — for screenshots, reports, morning summary. NOT a code path; always authorized.
6. **`git tag` operations** — `pre-part-A`, `pre-part-B`, `pre-part-C`, `pre-part-D` anchor tags; `pre-night-2026-05-15-part-A-deferred` (or similar) on Tier 3 deferral. Tags are append-only; this is declared for completeness.
7. **`git reset --hard pre-night-pipeline-2026-05-15` + `git push --force-with-lease origin develop`** — Tier 5 ONLY. Develop branch only. Never main. Documented in FAILURE_REPORT.md.

**NOT authorized:**

- Any modification of `main` branch (no merge, no push, no checkout).
- Any `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `DROP FUNCTION` (the `CREATE OR REPLACE FUNCTION` for `record_adjustment_found` is NOT a DROP; signature change in CREATE OR REPLACE drops old overload behavior only if signature mismatches in body — verified safe for this case because old signature has 0 callers).
- Any `TRUNCATE`.
- Any mass `DELETE FROM <table>` without tenant_id-scoped `WHERE`.
- Any file delete outside the Part A refactor scope.
- Any `git rebase` on develop.
- Any modification of `.claude/skills/` files (pending-entries pattern used instead).
- Any modification of files in other modules (M2 / M3 / M4 / M5+ etc.).

If a destructive op outside §Destructive Operations becomes necessary → Tier 4 halt + escalation.

---

## 8. Out of Scope (explicit)

- **Other modules:** M2 Platform Admin, M3 Storefront, M4 CRM, M5+ — no files modified. Touching these = Tier 4 halt.
- **Prizma tenant data:** all writes to demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). Prizma row-count + md5 invariant must hold pre/post-every-stage.
- **Edge Function changes:** no deploys this Pipeline. (G9.)
- **Main branch:** no commits, merges, pushes.
- **OCR/AI changes in frames-receipt:** Part A only touches what's truly shareable; the OCR + AI learning surface stays untouched.
- **Phase 1A/1B retro changes:** the Phase 1A/1B SPECs are closed; this Pipeline cannot reopen them.
- **Storefront repo:** out of scope by repo boundary.
- **`record_count_correction`:** does not exist (P6); not added.
- **`p_reason TEXT` backward compatibility for `record_adjustment_found`:** with 0 callers (P7), no compat shim. Clean signature replacement.
- **New Lighthouse runs / SaaS-cleanup work / Sentinel rule edits:** out of scope.

---

## 9. Expected Final State

After the executor finishes, the repo should contain (path lists per chosen Part A branch):

### Part A (if A2-full)
**New files:**
- `shared/js/goods-receipt-modal.js` (or similar) — extracted generic component
- `shared/js/goods-receipt-line-list.js` (or similar) — extracted line rendering
- `shared/js/goods-receipt-supplier-picker.js` (or similar) — extracted supplier picker
- `shared/css/goods-receipt.css` (if styles extracted)
- `modules/Module 1.5 - Shared Components/docs/goods-receipt-component.md` — usage docs

**Modified files:**
- `modules/goods-receipts/receipt-form.js` (and siblings) — rewired to use generic component
- `modules/lens-goods-receipt/lens-goods-receipt-main.js` (and siblings) — rewired to use generic component
- Possibly `index.html` if new script tags needed (these would be loaded on inventory.html + lens pages, not index.html)
- `inventory.html` + `lens-goods-receipt.html` — script tag adds

**Deleted files (if any):**
- Files in `modules/lens-goods-receipt/` that become fully redundant — likely 1-3 files at most

### Part A (if A2-narrow)
**New files:**
- `shared/js/goods-receipt-supplier-picker.js` (or only the truly-shared narrow helpers)
**Modified files:**
- 2-4 frames receipt files + 2-4 lens receipt files

### Part A (if A2-defer)
**New files:**
- `_archive/architect-pending-entries/2026-05-16_M1_LENS_GENERIC_RECEIPT_DEFERRED.md` — empirical analysis + next-step recommendations
**Modified files:** none

### Part B
**No new files.** RPC body updated via MCP `apply_migration`.

**DB state:**
- `record_adjustment_found` re-defined with new 11-param signature, same body shape as `record_adjustment_lost` (mutatis mutandis for the create-lot vs consume-lot semantic), returning adjustment_id.
- `stock_adjustment_reason` seed verified to include direction=+1 rows for both tenants (executor MAY INSERT 1 new row per tenant if missing).
- No row deletion.

### Part C
**No new files** (migration applied via MCP).

**DB state:**
- 25-35 new partial indexes named `idx_<table>_<col>`, all WHERE `<col>` IS NOT NULL.
- 0 indexes dropped (unless Tier 4 collision; documented).

### Part D
**Modified files:**
- `index.html` — MODULES array gets 1 new entry OR 7 new entries (executor decides per A2-equivalent decision).
- (If sub-nav widget chosen) `shared/js/lens-nav-strip.js` + script tag adds to 7 lens HTML files.
- If new permission keys: handled via execute_sql + `js/shared.js` T-constant if needed (extending Iron Rule 5 FIELD_MAP if new column).

### Docs updated (mandatory deliverables, written by executor at close)
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — new section for M1_LENS_PHASE_2_COMPLETION
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — appendage section
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_2_COMPLETION/EXECUTION_REPORT.md` — mandatory
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_2_COMPLETION/FINDINGS.md` — mandatory
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_2_COMPLETION/MIGRATION.md` — required for Parts B + C
- `_archive/night-pipeline-2026-05-15/MORNING_SUMMARY_FOR_DANIEL.md` — Stage 9 output (Hebrew + status line + file paths)
- `_archive/night-pipeline-2026-05-15/screenshots/` — Stage 7 outputs (7 PNGs)

### Docs deferred to next Architect session (NOT this Pipeline's responsibility)
- `MASTER_ROADMAP.md` updates
- `docs/GLOBAL_MAP.md` integration ceremony entries
- `docs/GLOBAL_SCHEMA.sql` consolidation
- `docs/DB_TABLES_REFERENCE.md` T-constant additions

The Pipeline records these as TODOs in FOREMAN_REVIEW.md §Master-Doc Update Checklist; the next Architect session (Daniel-driven) does the actual updates.

---

## 10. Commit Plan

Staged per Part. Anchor tags BEFORE each Part. Skip-a-Part tags ONLY on Tier 3 deferral.

### Pre-Part-A
- (commit 0) `chore(spec): seal M1_LENS_PHASE_2_COMPLETION SPEC` — this commit creates SPEC.md only.
- (tag) `pre-part-A` at SPEC seal HEAD.

### Part A
- (commit A1) `chore(m1,m1.5): empirical analysis of receipt shareable surface — Part A1 in night Pipeline` — touches: EXECUTION_REPORT.md §"Part A Decision" + any analysis notes. NO code changes.
- (commits A2-N, where N depends on chosen branch) `feat(m1.5): extract <component>` / `refactor(m1): rewire <file> to use shared <component>` / `feat(m1): wire lens-receipt to shared <component>`.
- (commit A-close) `chore(spec): Part A close — branch=<A2-full|A2-narrow|A2-defer>` — EXECUTION_REPORT.md updated; smoke 7/7 PASS confirmed; tag `post-part-A` (or `pre-night-2026-05-15-part-A-deferred` on Tier 3).

### Part B
- (tag) `pre-part-B` at HEAD.
- (commit B1) `chore(m1): pre-flight Part B — stock_adjustment_reason +1 seed verification` — if seed extension needed, INSERT here. NO RPC changes yet.
- (commit B2) `feat(m1,rpc): harmonize record_adjustment_found to twin record_adjustment_lost (audit row + reason_id + adjustment_id return)` — RPC redefinition.
- (commit B3) `test(m1,rpc): functional smoke for harmonized record_adjustment_found on demo` — TEST_REPORT or inline smoke notes in EXECUTION_REPORT.
- (tag) `post-part-B` at HEAD.

### Part C
- (tag) `pre-part-C` at HEAD.
- (commit C1) `feat(m1,perf): partial FK indexes — M1 Lens scope (N indexes)` — single migration commit.
- (tag) `post-part-C` at HEAD.

### Part D
- (tag) `pre-part-D` at HEAD.
- (commit D1) `feat(m1,nav): wire 7 lens screens into ERP main menu` — index.html change + (optionally) shared/js/lens-nav-strip.js + 7 HTML edits.
- (commit D2, optional) `feat(m1,perms): add lens.* permission keys for menu visibility` — if needed.
- (commit D3) `test(m1,nav): click-through verification — 7 lens pages on demo` — manual verification notes in EXECUTION_REPORT.
- (tag) `post-part-D` at HEAD.

### Close
- (commit close) `chore(spec): close M1_LENS_PHASE_2_COMPLETION — EXECUTION_REPORT + FINDINGS + SESSION_CONTEXT + CHANGELOG` — executor's retrospective.

### Stage 6-9 commits (Reviewer / Localhost-Tester / Sentinel / Foreman) follow standard pattern.

---

## 11. Dependencies / Preconditions

- M1_LENS_PHASE_1B_GAP_CLOSURE closed (`53005b5`) — verified.
- Smoke baseline 7/7 PASS at SPEC seal time — verified.
- ERP :3000 + Storefront :4321 dev servers running — verified.
- `pre-night-pipeline-2026-05-15` tag exists and pushed — verified.
- Supabase MCP available for apply_migration + execute_sql — verified (executor connects from same Claude Code session).
- Sole CLI session per Brief — verified (Cowork desktop child explicitly allowed).
- Daniel asleep; expanded recovery autonomy authorized per Brief §4.

---

## 12. Lessons Already Incorporated

Each item from prior FOREMAN_REVIEWs in this module, with this SPEC's response:

- **M1_LENS_PHASE_1B_GAP_CLOSURE P-AUTHOR-1 (per-column reference probe):** APPLIED — §0.A P4/P5/P6 probed every column/function the SPEC body references via `pg_get_functiondef` + information_schema.
- **M1_LENS_PHASE_1B_GAP_CLOSURE P-AUTHOR-2 (MCP apply_migration PK-collision fallback):** APPLIED — §4 autonomy envelope explicitly pre-authorizes `execute_sql` fallback for 23505 collisions; no escalation needed.
- **M1_LENS_PHASE_1B_PROCUREMENT P-AUTHOR-3 (RPC body + check-constraint pre-flight probe):** APPLIED — §0.A P4 + P5 + §0.B runtime semantics rehearsal covers both RPC bodies before sealing.
- **M1_LENS_PHASE_1B_PROCUREMENT P-AUTHOR-4 (Brief-vs-DB-reality gap audit):** APPLIED — §0.A is exactly this audit. Three gaps surfaced: (a) `record_count_correction` doesn't exist (P6), (b) `record_adjustment_found` has 0 JS callers despite Brief tone implying live caller (P7), (c) FK count is 151 not 21 (P8).
- **M1B_FOUNDATION_PERMISSIONS_HOTFIX P-AUTHOR-1 (UI-level real-user smoke discipline):** APPLIED — D2 (permission gating) requires real-user PIN-auth click-through OR scripted hasPermission() probe per page. Counter advances from 2/3 to 3/3 — this is the third screen-gated SPEC firing the same pattern; pending-entry will codify the rule into the skill (Brief §4 item 7).
- **SECURITY_HOTFIX_2 P-AUTHOR-1 (canonical JWT-claim header reference):** APPLIED — §0.B runtime semantics rehearsal aligns `record_adjustment_found` Block A to byte-identical text with `record_adjustment_lost` (which already uses canonical Block A).
- **SECURITY_HOTFIX_3 P-AUTHOR-1 (status-column semantics probe):** APPLIED — §0.B "Status-column semantics probe" sub-section probes `stock_adjustment_reason.is_active` + `direction` semantics before sealing.
- **MIGRATION_2 Author Proposal #2 (Baselines as symbols):** APPLIED — §0.E Baselines sub-table pins 6 measured values referenced from §3 Success Criteria.
- **MIGRATION_1 Author Proposal #1 (heading convention):** APPLIED — all headings use plain `## N. Title` form; no `§` prefixes. Iron-Rule-32 hook regex verified.
- **PRE-EXISTING UNTRACKED FILES SURVEY (codified after 4 consecutive Full-Auto Pipelines):** APPLIED — §0 confirms 0 untracked at SPEC seal; executor uses selective `git add` by filename throughout.

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + MIGRATION.md written in the SPEC folder.
- [ ] Module ROADMAP / SESSION_CONTEXT / CHANGELOG updated per §9 Expected Final State.
- [ ] All per-Part tags placed (`post-part-A` / B / C / D OR Tier 3 deferral tags).
- [ ] Morning summary written at `_archive/night-pipeline-2026-05-15/MORNING_SUMMARY_FOR_DANIEL.md`.
- [ ] Concurrency log captured in EXECUTION_REPORT.md §"Concurrency Log" (≥3 spot checks across the night).
- [ ] No commits to main; no Prizma writes; no .claude/skills/ edits.

---

*End of SPEC. Authored by opticup-strategic (Foreman) per Night Pipeline Brief. Executor (Stage 2) reads this and proceeds under Bounded Autonomy with expanded recovery per Brief §4. Tier 3 Part-defer authorized; Tier 4 halt only on Brief §5 triggers; Tier 5 force-push-with-lease on develop authorized as absolute last resort.*
