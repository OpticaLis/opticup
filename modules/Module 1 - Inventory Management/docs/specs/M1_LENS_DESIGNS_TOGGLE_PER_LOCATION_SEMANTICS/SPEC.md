---
spec_id: M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS
title: New array-RPC toggle_active_offerings_array for correct per-location bulk semantics
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/POST_GROUP_A_FIXES_AND_GROUP_B_BRIEF.md
parent_finding: M1_LENS_DESIGNS_SELECTION_REBUILD F-1 (Daniel-approved Option a)
phase: Group C — Toggle Semantics (3 of 3)
---

# SPEC — M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6)

| Path | Exists | Notes |
|---|---|---|
| `modules/lens-active-designs/lens-active-designs-toggle.js` (65 lines) | ✅ | Sole JS consumer of `toggle_active_offering` RPC |
| `modules/lens-active-designs/lens-active-designs-detail.js` | ✅ | Calls `LensADToggle.toggleMany` for bulk activate/deactivate from side panel |
| `modules/lens-active-designs/lens-active-designs-table.js` | ✅ | Calls `LensADToggle.toggleOfferingSilent` for per-row toggle |

### Step 1.7 — Consumer grep on `toggle_active_offering` + `LensADToggle`

```
modules/lens-active-designs/lens-active-designs-toggle.js  — defines all 3 helpers + sole RPC call site (2 places: lines 19, 47)
modules/lens-active-designs/lens-active-designs-detail.js  — calls window.LensADToggle.toggleMany (bulk activate/deactivate)
modules/lens-active-designs/lens-active-designs-table.js   — calls window.LensADToggle.toggleOfferingSilent (per-row)
```

**Zero external consumers.** Toggle logic is fully contained in 3 files of one module.

### DB pre-flight (live 2026-05-18 IDT)

| Object | Notes |
|---|---|
| `toggle_active_offering(p_tenant_id uuid, p_offering_id uuid, p_is_active boolean, p_location_id uuid DEFAULT NULL)` | EXISTING — SECURITY DEFINER + JWT-tenant guard + ON CONFLICT (tenant_id, offering_id, location_id) WHERE is_deleted=false. **Keep as-is** for per-row use; the bug is the JS passing `p_location_id=null` which creates a parallel "all-locations" row instead of flipping per-location actuals. |
| `tenant_active_offerings` table | (id, tenant_id, offering_id, location_id NULLable, is_active, activated_by, activated_at, notes, created_at, updated_at, is_deleted) — partial unique index on `(tenant_id, offering_id, location_id) WHERE is_deleted=false`. |
| `tenant_location` table | Demo has 2 rows (Smoke Loc A, Smoke Loc B). NULL `location_id` in tenant_active_offerings is the legacy "all-locations" placeholder — the bug. |

### Baselines

| Symbol | Value |
|---|---|
| `BASE_RPC_COUNT_BEFORE` | 1 (`toggle_active_offering`) |
| `BASE_RPC_COUNT_AFTER`  | 2 (`toggle_active_offering` KEPT + NEW `toggle_active_offerings_array`) |
| `BASE_JS_TOGGLE_LINES`  | 65 |
| `EXPECTED_JS_TOGGLE_LINES_AFTER` | ~100-130 (3 helpers: `toggleOffering` (per-row) + `toggleOfferingSilent` (silent per-row) + NEW `toggleAcrossLocations` (array bulk) + KEPT `toggleMany` (renamed for clarity)) |

### Daniel-approved design (Option a from SPEC 4 F-1, morning 2026-05-18)

> **Option (a) server-side array RPC** — new `toggle_active_offerings_array(p_offering_ids UUID[], p_location_ids UUID[], p_active BOOLEAN)` that server-side iterates per `(offering, location)` pair, atomic transaction. Bulk UI ("Activate all branches") resolves to array of all branch IDs, calls array RPC once.

### Lessons applied from today's harvest

- **P-STRAT-D** — §8 Tier C must enumerate ALL side-effect tables. The new RPC writes to `tenant_active_offerings` only (no PO/receipt side-effects); cleanup soft-deletes the test rows via standard `is_deleted=true`.
- **P-EXEC-E** — `tenant_active_offerings.is_deleted` only (no `deleted_at`).
- **P-EXEC-E** — `set_config('request.jwt.claims', ...)` for direct RPC call from MCP if needed during Tier C verification.
- **P-EXEC-A** — Tier C polls must wait on STATE-COMPLETE.

---

## 1. Goal

Replace the buggy "all-locations placeholder row" semantics (`p_location_id=null`) with a correct server-side array RPC that flips per-(offering × location) actuals in one atomic transaction. New RPC: `toggle_active_offerings_array(p_tenant_id uuid, p_offering_ids uuid[], p_location_ids uuid[], p_is_active boolean)`. Old RPC `toggle_active_offering` kept unchanged for per-row UI clicks. JS layer routes bulk actions through the new array RPC.

## 2. Background

`M1_LENS_DESIGNS_SELECTION_REBUILD` (SPEC 4, closed 🟢 2026-05-17) surfaced F-1 MEDIUM: the bulk "Activate all branches" button passed `p_location_id=null` to `toggle_active_offering`, which the RPC's ON CONFLICT (tenant_id, offering_id, location_id) treated as a distinct row — creating a parallel "all-locations" record instead of toggling each per-branch actual. Daniel approved Option (a) the morning of 2026-05-18.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch clean post-push | `git status` | clean |
| S2 | Commits | `git log {start}..HEAD --oneline` | 3-4 |
| S3 | New RPC `toggle_active_offerings_array` exists with signature `(p_tenant_id uuid, p_offering_ids uuid[], p_location_ids uuid[], p_is_active boolean)` | `pg_get_function_identity_arguments` | matches |
| S4 | Old RPC `toggle_active_offering` UNCHANGED (signature + body) | `pg_get_functiondef` matches pre-flight | yes |
| S5 | New RPC body iterates per (offering × location) pair, atomic transaction | inspect body | confirmed |
| S6 | New RPC has SECURITY DEFINER + JWT-tenant guard + service_role bypass (canonical M1 pattern) | inspect body | confirmed |
| S7 | New RPC has same ON CONFLICT semantics as the single-row RPC | inspect body | confirmed |
| S8 | `lens-active-designs-toggle.js` exports `toggleAcrossLocations(offeringIds, locationIds, makeActive)` that calls the new array RPC | grep | yes |
| S9 | Side-panel "Activate all branches" / "Deactivate all branches" routes through `toggleAcrossLocations`, resolving the location_ids from `getLocations()` (no more `null` placeholder) | grep `null,` against `p_location_id` in module — should be 0 | confirmed |
| S10 | Per-row toggle (`toggleOffering` / `toggleOfferingSilent`) UNCHANGED — still calls `toggle_active_offering` for single-(offering, location) pairs | grep | preserved |
| S11 | Each JS file ≤ 300 lines | `wc -l` | confirmed |
| S12 | Tier C: bulk activate on demo for 1 design × 2 locations → 2 rows in `tenant_active_offerings` with is_active=true, location_id NOT NULL | DB query | 2 rows |
| S13 | Tier C: bulk deactivate flips both to is_active=false | DB query | both false |
| S14 | Tier C cleanup: soft-delete the 2 created rows via `UPDATE tenant_active_offerings SET is_deleted=true` | UPDATE | succeeded |
| S15 | Tier C: ZERO new "all-locations" rows (location_id IS NULL) created by the smoke | DB count before vs after | unchanged |
| S16 | get_advisors(security) clean of new ERROR/HIGH on new RPC | get_advisors | confirmed |
| S17 | Integrity gate exit 0 at every commit | `npm run verify:integrity` | exit 0 |
| S18 | Iron Rule 32 declared (§4 lists 1 DDL — CREATE OR REPLACE FUNCTION for the new RPC; no DROP) | pre-commit | 0 violations |
| S19 | Module 1 ROADMAP + CHANGELOG + SESSION_CONTEXT updated | grep | entries appended |
| S20 | EXECUTION_REPORT + FINDINGS + ≥ 2 screenshots | `ls` | yes |
| S21 | Group A + B + C SPEC 9/10 regression | tabs load | confirmed |

## 4. Destructive Operations

1. **`CREATE FUNCTION public.toggle_active_offerings_array(p_tenant_id uuid, p_offering_ids uuid[], p_location_ids uuid[], p_is_active boolean) RETURNS jsonb`** — NEW function; SECURITY DEFINER; iterates per (offering × location), upserts via the same ON CONFLICT shape as the single-row RPC; atomic transaction; returns `jsonb` summarizing the number of rows affected per pair. **Reversible** by `DROP FUNCTION` in a rollback migration.

**Forbidden:**
- Any change to `toggle_active_offering` (the existing single-row RPC)
- Any change to `tenant_active_offerings` table schema or RLS
- Any change to `supplier_catalog_offering` (the source-of-truth offering table)
- Any UI changes outside the 3 `lens-active-designs/*` files
- Any new tables / views
- Any data cleanup of the "all-locations" rows that may already exist in demo (out of scope — those are a separate cleanup SPEC if needed; Foreman recommends leaving them as historical residue from SPEC 4)

## 5. Autonomy Envelope

**Can do without asking:**
- Apply 1 migration via Supabase MCP `apply_migration`
- Verify the new RPC body + signature
- Update 3 JS files in `modules/lens-active-designs/`:
  - `lens-active-designs-toggle.js` — add `toggleAcrossLocations` helper + keep all existing helpers unchanged in behavior
  - `lens-active-designs-detail.js` — route the bulk "Activate all branches" / "Deactivate all branches" buttons through the new helper
  - `lens-active-designs-table.js` — no change needed (per-row uses `toggleOfferingSilent`)
- Run `get_advisors(security)` post-migration
- Tier C smoke: bulk activate 1 design × 2 demo locations, verify 2 rows, deactivate, soft-delete
- 3-4 commits per §10

**MUST stop and report:**
- Old `toggle_active_offering` would need modification to make the array RPC work → STOP, escalate (out of scope)
- ON CONFLICT semantics differ for the array path vs single-row path → STOP, investigate
- Migration fails
- get_advisors returns new ERROR/HIGH
- Tier C creates an "all-locations" row (location_id IS NULL) — would indicate the array logic still has the bug

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:
- If `tenant_active_offerings.is_active` doesn't flip for any (offering, location) pair → STOP (RPC logic error)
- If MCP `set_config` JWT claim injection fails for the new RPC → STOP (auth-shape regression)

## 7. Out of Scope (explicit)

- Cleanup of pre-existing "all-locations" rows in demo (those are SPEC 4 side-effects; separate concern if a cleanup is wanted)
- Any change to single-row toggle UX
- Any UI change to lens-active-designs OUTSIDE the 3 files mentioned
- Any RLS / policy change
- Any view change

## 8. QA / Tier C Verification Plan

1. Start local servers.
2. Chrome MCP navigate → `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=active-designs`.
3. Pick a design row → side detail panel opens.
4. Click "Activate all branches" (or equivalent bulk button per the new flow).
5. DB query:
   ```sql
   SELECT count(*) FROM tenant_active_offerings
   WHERE tenant_id = '{demo_tid}' AND offering_id IN ({offering_ids of picked design})
     AND location_id IS NOT NULL AND is_active = true AND is_deleted = false;
   ```
   Expect: count = (offerings × demo_locations) = 2 for one design × 2 locations.
6. Verify ZERO new rows with `location_id IS NULL` for those offerings:
   ```sql
   SELECT count(*) FROM tenant_active_offerings
   WHERE tenant_id = '{demo_tid}' AND offering_id IN ({offering_ids}) AND location_id IS NULL
     AND created_at > '{smoke_start_time}';
   ```
   Expect: 0.
7. Click "Deactivate all branches" → re-query, expect is_active = false on both.
8. Cleanup: `UPDATE tenant_active_offerings SET is_deleted = true WHERE created_at > '{smoke_start_time}' AND tenant_id = '{demo_tid}'`.
9. Verify zero console errors.
10. Regression: navigate SPEC 6 PO + SPEC 7 POs List + SPEC 9 Catalog Admin + SPEC 10 Private Catalog tabs.
11. Take ≥ 2 screenshots: before-bulk-activate (designs screen with side panel open), after-bulk-activate (DB result or UI feedback).

## 9. Expected Final State

### Repo
- 1 new migration in `supabase/migrations/`
- `modules/lens-active-designs/lens-active-designs-toggle.js` extended (~65 → ~110 lines)
- `modules/lens-active-designs/lens-active-designs-detail.js` updated to call `toggleAcrossLocations`
- Iron Rule 9 backup folder
- SPEC folder artifacts (SPEC + ACTIVATION + EXECUTION_REPORT + FINDINGS + screenshots)

### DB
- 1 new SECURITY DEFINER function
- 0 schema changes (no new tables, no column adds, no RLS change)
- 0 persistent test rows (Tier C cleans up)
- Pre-existing "all-locations" rows from SPEC 4 — UNTOUCHED (out of scope; flagged for optional future cleanup)

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS SPEC` | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `feat(db): toggle_active_offerings_array RPC for atomic per-location bulk toggle` | 1 migration .sql + JS updates (3 files in lens-active-designs) + backup |
| 3 | `chore(spec): close M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots + ROADMAP + CHANGELOG + SESSION_CONTEXT |

Expected: 3 commits.

## 11. Pipeline Coordination

`files_owned_globs`:
```
supabase/migrations/**
modules/lens-active-designs/**
modules/Module 1 - Inventory Management/backups/M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS_2026-05-18/**
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS/**
```

Branch: `develop`. Path X sequential (runs AFTER SPEC 10 closes 🟢).

## 12. Rollback Plan

If the migration lands but Tier C reveals a logic error:
- `DROP FUNCTION public.toggle_active_offerings_array(uuid, uuid[], uuid[], boolean);`
- Revert the 3 JS file changes
- Two commits: `revert: revert M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS migration + JS` + `chore(spec): reopen`
- Tier C residue (any tenant_active_offerings rows) soft-deleted

If 1 of (migration | JS update) lands but the other fails:
- Roll back both for consistency.

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] `git status --short` returns scope-clean
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] ≥ 2 Tier C screenshots
- [ ] All Tier C test rows soft-deleted
- [ ] get_advisors clean
- [ ] **Post-this-SPEC: M1 LENS 100% COMPLETE** — Module 1 ROADMAP marks the entire lens rebuild scope ✅

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Closes SPEC 4 F-1 MEDIUM per Daniel's morning Option (a) authorization. Last SPEC of the M1 lens 100%-complete arc._
