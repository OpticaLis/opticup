---
spec_id: M1_LENS_ACTIVE_POS_LIST_REBUILD
title: 1:1 mockup-fidelity rebuild of lens-pos-list with overdue stat-card
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/POST_GROUP_A_FIXES_AND_GROUP_B_BRIEF.md
mockup: modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html
phase: Group B — Active POs List (2 of 3)
---

# SPEC — M1_LENS_ACTIVE_POS_LIST_REBUILD

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — paths verified live 2026-05-18 IDT)

| Path | Exists | Notes |
|---|---|---|
| `modules/lens-pos-list/` (4 .js + 1 .html, 383 lines total) | ✅ | Current implementation to be replaced |
| `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html` (509 lines) | ✅ | The spec (Pattern P-AR-16) |
| `shared/js/stat-card-row.js` + `shared/css/stat-card.css` | ✅ | Phase 0 shared component (5-card row required) |
| `shared/js/chip-filter-row.js` + `shared/css/chip-filter.css` | ✅ | Phase 0 shared component |
| `shared/js/side-detail-panel.js` + `shared/css/side-detail.css` | ✅ | Phase 0 shared component (PO detail drawer per row) |
| `shared/js/table-builder.js` | ✅ | Core dependency for the PO list table |
| `modules/inventory/inventory-shell-lens.js` line 95-101 — POs List manifest | ✅ | 4 JS deps + 1 partial currently registered |
| `modules/lens-purchase-order/` (SPEC 6 sibling) | ✅ | Group B SPEC 6 — runs BEFORE this SPEC per Path X sequential |

### Step 1.7 — Consumer grep on POs List assets

```
modules/lens-pos-list/*                    — owns this rewrite
modules/inventory/inventory-shell-lens.js  — manifest entries (lines 95-101) — updated by this SPEC
```
**Zero external cross-module callers.** No other module imports lens-pos-list files. Safe to rewrite in place.

### DB pre-flight (live 2026-05-18 IDT)

| Object | Exists | Notes |
|---|---|---|
| `purchase_order` (table, tenant-isolated, is_deleted soft-delete) | ✅ | 17 columns; status is the discriminator for the 5 stat cards |
| `purchase_order_line` (table) | ✅ | line items for totals/counts |
| `mark_po_sent(p_tenant_id, p_po_id)` RPC | ✅ | already consumed by current implementation |
| `cancel_purchase_order(p_tenant_id, p_po_id, p_reason)` RPC | ✅ | already consumed by current implementation |
| `purchase_order.status` distinct values pre-flight | ⚠️ | Executor MUST query `SELECT status, count(*) FROM purchase_order WHERE tenant_id={demo_tid} AND is_deleted=false GROUP BY status` at §0 of execution to confirm distinct values present (5.3 status-column semantics probe per opticup-strategic Step 5.3). Expected: subset of {'draft','sent','partial','received','cancelled'}. **If unexpected value appears → STOP, escalate.** |

### Status-column semantics (Step 5.3 enforcement)

Mockup defines 5 stat cards:
1. הכל — all non-deleted, non-cancelled POs (count + total ₪)
2. טיוטות — `status = 'draft'`
3. נשלחו לספק — `status = 'sent'`
4. חלקיות — `status = 'partial'` (partial receipt landed)
5. ⚠️ באיחור — `status = 'sent' AND expected_delivery_at < CURRENT_DATE` (DERIVED — not a status enum value; query joins status + date filter)

**The "overdue" card is a COMPUTED filter, not a status enum value.** Executor MUST implement the overdue count as a derived predicate on the loaded rows, not as `status='overdue'`. This is the Step 5.3 trap canonical example (overdue is NOT a status enum value — it's a time-window predicate on the 'sent' subset).

### Baselines

| Symbol | Value |
|---|---|
| `BASE_MOCKUP_LINES` | 509 |
| `BASE_JS_TOTAL_LINES` (existing 4 files) | 328 |
| `BASE_PARTIAL_LINES` | 55 |
| `BASE_INVENTORY_MANIFEST_POS_LIST_JS_COUNT` | 4 |
| `EXPECTED_TARGET_JS_LINES` | 500-750 across 4-5 files (each ≤ 300 lines per Iron Rule 12) |
| `EXPECTED_TARGET_PARTIAL_LINES` | 90-130 |
| `STAT_CARD_COUNT` | 5 |
| `EXPECTED_STAT_CARD_LABELS` | ["הכל", "טיוטות", "נשלחו לספק", "חלקיות", "⚠️ באיחור"] |

### Lessons applied from prior FOREMAN_REVIEWs

- **From `M1_LENS_DESIGNS_SELECTION_REBUILD` F-1** — stat-card values must derive from the same query that drives the list, not a separate count query (eventual consistency drift). Applied: §1 explicitly requires shared data source.
- **From `M1_LENS_PRICING_REBUILD` F-3 (ABSORBED)** — silent 0-row returns from filters on nonexistent columns. Applied: §0 ground-truth tells the Executor the exact column shape of `purchase_order`.
- **From `SECURITY_HOTFIX_3` P-AUTHOR-1** — status-column distinct-values probe required before sealing any SPEC that filters by status. Applied: §0 mandates the probe at execution time + flags the overdue-as-derived trap.

---

## 1. Goal

1:1 rebuild of `modules/lens-pos-list/` per the mockup at
`architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html`. Display all active (non-deleted) POs in a table with 5 stat-cards (one is the "overdue" derived predicate per Daniel decision #7) + chip-filters + per-row detail drawer. Reuse `mark_po_sent` + `cancel_purchase_order` RPCs unchanged. Stat-card values must derive from the SAME loaded row set so counts never drift from the table.

## 2. Background

Current `lens-pos-list/` is a basic table without the 5-card status header or the overdue alerting. Parent Brief Step 4 mandates the "overdue" card per Daniel decision #7. Mockup defines the visual layout; this SPEC binds the layout to the real `purchase_order` table semantics.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch state | `git status` post-push | clean |
| S2 | Commits | `git log {start}..HEAD --oneline | wc -l` | 3-4 |
| S3 | 5 stat cards render in mockup order | DOM contains `.stat-card-row` with exactly 5 `.stat-card` children, labels match `EXPECTED_STAT_CARD_LABELS` | yes |
| S4 | Overdue card uses derived predicate, NOT a status enum query | grep `modules/lens-pos-list/` — must contain `expected_delivery_at` filter; must NOT contain `status === 'overdue'` or `status='overdue'` | yes / no |
| S5 | Stat card values derived from loaded rows (not separate queries) | grep — no `count` aggregator query separate from the list-load query | confirmed |
| S6 | Chip filters drive table rows (not a re-query) | DOM contains `.chip-filter-row` with status chips; clicking filters the on-page table | yes |
| S7 | Side detail panel mounts per row | Clicking a row opens `.side-detail-panel` with PO metadata + lines | yes |
| S8 | No DDL applied | `git diff {start}..HEAD -- supabase/migrations/` | empty |
| S9 | Each JS file ≤ 300 lines | `wc -l modules/lens-pos-list/*.js \| awk '$1>300'` | empty |
| S10 | RPCs unchanged | grep `mark_po_sent\|cancel_purchase_order` — only these 2 RPC names appear in the module | yes |
| S11 | Tier C: open POs List tab on demo — 5 cards visible | Chrome MCP snapshot finds 5 stat-cards | yes |
| S12 | Tier C: overdue card value reflects DB truth | `SELECT count(*) FROM purchase_order WHERE tenant_id={demo_tid} AND status='sent' AND expected_delivery_at < CURRENT_DATE AND is_deleted=false` matches displayed value | matches |
| S13 | Tier C: click "טיוטות" chip filter → table shows only status='draft' rows | DOM rows narrow to draft set | yes |
| S14 | Tier C: click any row → detail panel opens with PO metadata | side-detail-panel populated | yes |
| S15 | Tier C: cancel any draft PO via row action (test ACT — uses SPEC 6's smoke PO if present, else creates one in §8 step 2) | cancel_purchase_order RPC succeeds; row reflects cancelled | yes |
| S16 | Tier C: cleanup soft-deletes the test row | `UPDATE purchase_order SET is_deleted=true ...` | succeeded |
| S17 | Zero console errors | Chrome MCP `list_console_messages` filter type=error | 0 (pre-existing GoTrueClient warns OK) |
| S18 | Integrity gate | `npm run verify:integrity` | exit 0 |
| S19 | Iron Rule 32 | pre-commit | 0 violations (§4 declares None.) |
| S20 | EXECUTION_REPORT + FINDINGS in SPEC folder | `ls` | files exist |
| S21 | ≥ 3 screenshots (overview + chip-filter active + side-panel open) | `ls screenshots/` | ≥ 3 .png |

## 4. Destructive Operations

**None.** This SPEC ships zero DDL, zero file removals. Old JS files are overwritten by new ones with the same names (file count may shrink from 4 to 3 if natural decomposition warrants; Executor may delete only if explicitly noting in EXECUTION_REPORT and committing the removal in commit 2). No table drops. No column drops. No RPC drops. No policy changes.

## 5. Autonomy Envelope

**Can do without asking:**
- Read mockup in full (509 lines) + current `modules/lens-pos-list/*.js`
- Read SPEC 6 deliverables (just-shipped sibling) as reference
- Backup old files per Iron Rule 9 (> 100 lines refactored)
- Rewrite each JS file
- Update inventory-shell-lens.js manifest if file count changes
- 3-4 commits per §10
- Tier C smoke creates 0 new PO rows if SPEC 6 left one available; otherwise creates 1 (cancel + soft-delete cleanup)

**MUST stop and report:**
- §0 status-column distinct-values probe returns an unexpected value (not in {'draft','sent','partial','received','cancelled'})
- File-size hook fires
- Iron Rule 32 hook fires (only acceptable if §4 amended after declaring it)
- Stat-card values don't match DB truth in S12
- Any wizard/RPC contract drift surfaces

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals + §5 above:
- If S4 grep finds `status === 'overdue'` (i.e., overdue treated as enum value not derived predicate) → STOP, escalate
- If `mark_po_sent` or `cancel_purchase_order` signatures require a change → STOP, this SPEC has no DDL scope
- Group A regression from this rebuild → STOP

## 7. Out of Scope (explicit)

- Any DB schema change (no migrations, no DDL, no policy changes)
- Any RPC modification
- Modifying the SPEC 6 wizard
- Persisting any "overdue" enum value to `purchase_order.status` (overdue is a derived runtime predicate, ONLY)
- Bulk actions on multiple POs (mockup is per-row actions)
- PDF export of the list (separate concern)
- Any change to `lens-purchase-order/` or `lens-goods-receipt/`
- Toggle-semantics work (deferred per Foreman recommendation)

## 8. QA / Tier C Verification Plan

1. Start local servers if not running
2. Chrome MCP navigate → `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=pos-list`
3. Verify 5 stat cards visible in mockup order
4. Verify overdue card value matches:
   `SELECT count(*) FROM purchase_order WHERE tenant_id={demo_tid} AND status='sent' AND expected_delivery_at < CURRENT_DATE AND is_deleted=false`
5. Click "טיוטות" chip — verify table narrows to draft-only rows
6. Click "הכל" chip — table restores
7. Click any row → side detail panel opens with PO metadata + lines list
8. If SPEC 6's smoke PO is still in DB (status='cancelled' but not soft-deleted): use it for the action test; otherwise create a fresh demo PO via SPEC 6 wizard or direct INSERT with status='draft'.
9. Cancel-action smoke: open row → click cancel → enter reason "test cancel" → confirm cancel_purchase_order RPC succeeded → status='cancelled' in DB
10. Cleanup: `UPDATE purchase_order SET is_deleted=true, deleted_at=now() WHERE id={smoke_id}`
11. Console errors = 0
12. Screenshots: overview (5 cards), chip-filter active, side detail panel open (3 minimum)

## 9. Expected Final State

### Repo
- `modules/lens-pos-list/` — 4-5 JS files + 1 partial.html, mockup-aligned
- `modules/inventory/inventory-shell-lens.js` — manifest reflects new file set (lines 95-101)
- `inventory.html` — any new CSS links added if needed
- `modules/Module 1 - Inventory Management/backups/M1_LENS_ACTIVE_POS_LIST_REBUILD_2026-05-18/` — full backup
- SPEC folder: SPEC.md + ACTIVATION_PROMPT.md + EXECUTION_REPORT + FINDINGS + ≥ 3 screenshots

### Docs
- Module ROADMAP — SPEC 7 marked ✅
- Module CHANGELOG — entry under "Group B"
- Module SESSION_CONTEXT — updated post-close
- Module db-schema.sql — unchanged (no DDL)

### DB
- 0 schema changes
- 0 persistent rows added (Tier C smoke cleans up)

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_ACTIVE_POS_LIST_REBUILD SPEC` (Foreman) | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `refactor(lens-pos-list): 1:1 mockup rebuild — 5 stat-cards (overdue derived) + chip-filters + side-detail panel` | rewritten JS + partial + manifest + inventory.html + backup folder |
| 3 | (optional) `fix(lens-pos-list): {hotfix subject}` | hotfix only on Tier C deviation |
| 4 | `chore(spec): close M1_LENS_ACTIVE_POS_LIST_REBUILD with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots + SESSION_CONTEXT + CHANGELOG + ROADMAP |

Expected total: 3-4 commits.

## 11. Pipeline Coordination

`files_owned_globs` for `pipeline-coordination.mjs claim`:
```
modules/lens-pos-list/**
modules/inventory/inventory-shell-lens.js
inventory.html
modules/Module 1 - Inventory Management/backups/M1_LENS_ACTIVE_POS_LIST_REBUILD_2026-05-18/**
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_ACTIVE_POS_LIST_REBUILD/**
```

Branch: `develop`. No worktree. Path X sequential (runs AFTER SPEC 6 closes 🟢).

## 12. Rollback Plan

If Tier C reveals a fundamental design issue:
- Restore old POs List files from backup folder
- Revert manifest + inventory.html
- Two commits: `revert` + `chore(spec): reopen`
- Tier C smoke row (if any): soft-delete

If the overdue card logic is wrong but the rest works:
- Land working portion in commit 2
- Open follow-up SPEC `M1_LENS_POS_LIST_OVERDUE_FIX`

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] `git status --short` returns scope-clean after closure
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] ≥ 3 Tier C screenshots in `screenshots/`
- [ ] Tier C smoke row (if any) soft-deleted (Iron Rule 3)
- [ ] Module ROADMAP + CHANGELOG + SESSION_CONTEXT updated
- [ ] S4 grep confirms overdue is derived, not enum

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Pre-seal Step 1.6 (paths clean) + Step 1.7 (zero external consumers) + status-column semantics probe (Step 5.3) deferred to Executor §0 since the probe is data-state-sensitive; SPEC mandates it as the first execution step._
