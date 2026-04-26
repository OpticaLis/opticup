# SPEC — M4_CAMPAIGNS_CLEANUP

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_CLEANUP/SPEC.md`
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Drives:** Final cleanup after the V1+V2+V3 sequence closed and the campaigns pipeline went operational. Removes the orphan Data Structure, updates the master docs, and brings the campaigns work to a fully closed state on demo.

---

## 1. Goal

The campaigns measurement pipeline is operational on demo (verified end-to-end: Make scenario active, EF v4 deployed, 7 campaigns visible on the CRM screen with correct Hebrew names + spend). After 4 SPECs in this sequence (the original M4_CAMPAIGNS_SCREEN + V1/V2/V3 of the body fix), three artifacts remain that need cleanup:

1. **Data Structure 573694** in Make team 402680 — created during V1, used in V1+V2 (both failed), unused since V3's iteration pivot. Orphan per Iron Rule 21.
2. **`SESSION_CONTEXT.md` for Module 4** — last updated 2026-04-25, missing the entire campaigns sequence (V1, V2, V3) and the operational state.
3. **`MASTER_ROADMAP.md`** — should reflect that campaigns measurement is unblocked and ready for QA + P7 prep.

This SPEC closes those three. After it commits, the campaigns work is fully wrapped on demo, and the next strategic step is Daniel's QA + the historical-import SPEC (separate, deferred).

## 2. Background

### What's done
- Module 4 CRM Campaigns Screen built and merged (M4_CAMPAIGNS_SCREEN, 6 commits, closed 🟡 with follow-ups).
- Campaigns body-fix sequence: V1 🔴, V2 🔴, V3 🟢. All 3 reviewed and committed.
- Make scenario `9126542` active, syncing 7 demo campaigns every 4 hours.
- EF `facebook-campaigns-sync` v4 with env-based MAKE_SECRET, deployed.
- Bootstrap fix `f12605a` wired the campaigns dispatcher in `crm-bootstrap.js`.

### What's left undone
- Data Structure 573694 unused, harmless but orphaned (Rule 21).
- Master docs reflect 2026-04-25 state, missing 2 days of campaigns work.
- No follow-up SPEC for "delete DS" or "update docs" exists yet.

### What's NOT in scope
- Historical data import from Monday for prizma. That's a separate SPEC (`M4_CAMPAIGNS_PRIZMA_HISTORICAL_IMPORT`) authored after Daniel completes demo QA.
- P7 cutover. Separate SPEC.
- The ongoing `M4-DEBT-CRM-BOOTSTRAP-WRAP` tech debt (bootstrap structurally replaces vs. wraps `showCrmTab`). Patched today by `f12605a`; structural refactor deferred.
- Any change to the campaigns screen UI, KPIs, or decision logic. The screen as-is passes Daniel's first-look approval.
- The "Active/Paused/Stopped" status logic per Daniel's earlier description. That's a separate strategic feature, not cleanup.

## 3. Hypothesis Ladder

This SPEC has no failure modes worth ladder-ing — every step is independent and reversible. If the DS deletion fails, doc updates still proceed. If a doc update fails its pre-commit hook, fix and retry. No production risk.

Single rung: execute all 3 cleanup tasks in order, commit per task or as one bundle (executor decides).

## 4. Success Criteria

All measurable, all binary pass/fail.

### Make platform
1. ✅ Data Structure 573694 (`optic_up_facebook_campaigns_sync_body`) is deleted from Make team 402680. Verified via `mcp__make__data-structures_list` returning empty (or no entry with id=573694).
2. ✅ Make scenario `9126542` continues to function — verify by `scenarios_get` returning the same 3-module flow (List → Insights → HTTP) with `mapper.data` containing the flat template, `isActive: true` (Daniel activated earlier).

### Master docs
3. ✅ `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` has a new Phase History row at the top of the table summarizing the campaigns sequence: M4_CAMPAIGNS_SCREEN + V1/V2/V3 + bootstrap-wire fix + Make scenario operational + 7 campaigns syncing on demo. The "Last updated" line reflects 2026-04-26.
4. ✅ `MASTER_ROADMAP.md` (root) has the current campaigns state reflected: pipeline operational on demo, ready for Daniel's QA and event-manager testing, P7 cutover pending. The relevant module-status line for Module 4 mentions campaigns is no longer blocked.
5. ✅ `modules/Module 4 - CRM/docs/MODULE_MAP.md` references the new `make-patterns/` directory (added in V3).

### Repo hygiene
6. ✅ All commits are explicit `git add <path>` only — no wildcards.
7. ✅ Pre-commit hooks pass on every commit. No `--no-verify`.
8. ✅ `npm run verify:integrity` exits 0.
9. ✅ `git status` at end: same dirty state as session start (3 guardian files modified + untracked outputs/strays) MINUS the doc files committed by this SPEC.
10. ✅ `git diff --staged | grep -iE 'fbsync_'` returns zero matches across all commits in this SPEC.

### Verification
11. ✅ After the cleanup commits land, the campaigns screen on localhost still renders correctly (one final smoke check via Chrome MCP — load page, click קמפיינים, confirm 7 rows still visible). Optional but recommended.

## 5. Autonomy Envelope

**CAN do without asking:**
- Delete Data Structure 573694 via `mcp__make__data-structures_delete`.
- Edit `SESSION_CONTEXT.md`, `MASTER_ROADMAP.md`, `MODULE_MAP.md` with the cleanup-relevant updates.
- Commit each file separately OR bundle all 3 doc updates into one commit (executor's call — bundling is fine since they're related; separating is fine if pre-commit hooks complain about scope).
- Run a final Chrome MCP smoke check (Step 11) if confident from prior verification. Skip if redundant.

**MUST stop and ask if:**
- `data-structures_delete` returns an error (e.g., DS still referenced somewhere). Don't force-delete.
- The `SESSION_CONTEXT.md` Phase History table doesn't have a clear "row at top" pattern (read it first to see the existing structure).
- `MASTER_ROADMAP.md` doesn't have an obvious "Module 4 status" line — its structure may have evolved since last edit.
- Any doc edit grows beyond ~30 lines added — that's outside cleanup scope, flag for review.
- Pre-commit hooks fail.

## 6. Stop-on-Deviation Triggers

1. **STOP** if `data-structures_delete` fails or reports the DS is in use somewhere unexpected.
2. **STOP** if any commit's diff contains content unrelated to the cleanup (e.g., guardian files accidentally staged, EF code touched).
3. **STOP** if `MASTER_ROADMAP.md` has a structure that the SPEC didn't anticipate — the executor should describe what they see and ask before editing.
4. **STOP** if Chrome MCP verification (Step 11) shows the campaigns screen broken — a regression occurred during cleanup.

## 7. Rollback Plan

Cleanup is non-destructive enough that rollback is simple:

- **DS deletion fails or causes issues:** the deletion is via Make UI; if needed, re-create the DS with the same schema (we have it documented in V1 EXECUTION_REPORT). But this is unlikely — DS 573694 has zero references after V3.
- **Doc updates introduce conflicts:** `git revert <commit>` and re-author with smaller scope.
- **Final smoke check fails:** investigate before declaring cleanup done. The cleanup itself shouldn't break the screen, but if it does, roll back the commit.

## 8. Out of Scope

- Historical import from Monday for prizma.
- P7 cutover.
- Bootstrap structural refactor.
- Any feature work on the campaigns screen.
- Lead attribution wiring (so `leads_num` and `buyers_num` aren't always 0). That's a separate piece — `lead-intake` EF needs to write `campaign_id` on incoming leads. Already noted in V3 FINDINGS.

## 9. Expected Final State

### Make team 402680
- Data Structures: no entry named `optic_up_facebook_campaigns_sync_body`.
- Scenario `9126542`: unchanged (3 modules, active, syncing).

### Repo files modified
```
modified:   modules/Module 4 - CRM/docs/SESSION_CONTEXT.md   (+~25 lines)
modified:   MASTER_ROADMAP.md                                (+~5 lines)
modified:   modules/Module 4 - CRM/docs/MODULE_MAP.md        (+~3 lines)
```

### Repo state
```
On branch develop
Your branch is up to date with origin/develop.
Changes not staged for commit:
  modified:   docs/guardian/DAILY_SUMMARY.md
  modified:   docs/guardian/GUARDIAN_ALERTS.md
  modified:   docs/guardian/GUARDIAN_REPORT.md
Untracked files: [same as session start]
```

## 10. Commit Plan

**Commit 1 — Master docs update (single bundled commit):**
```
docs(crm): close M4 campaigns sequence — pipeline operational on demo

Updates SESSION_CONTEXT.md, MASTER_ROADMAP.md, and MODULE_MAP.md to
reflect the completed campaigns sequence:
- M4_CAMPAIGNS_SCREEN built + merged
- M4_CAMPAIGNS_MAKE_BODY_FIX V1+V2+V3 (last one 🟢 closed)
- Make scenario 9126542 active, syncing 7 demo campaigns every 4 hours
- New `make-patterns/` doc directory for future Make → EF integrations

Next steps: Daniel's demo QA, event-manager testing, P7 historical
import (separate SPEC).
```

The DS deletion is in Make's cloud, not git — handled separately, no commit needed.

**Commit 2 — SPEC retrospective:** at SPEC close, per the folder-per-SPEC protocol.

## 11. Pre-flight Checks

1. `git status` matches the post-V3 state: 3 guardian files modified, outputs/strays untracked, no staged files.
2. `git log -1` shows `f12605a fix(crm): wire campaigns tab dispatch in crm-bootstrap (was missing from showCrmTab override)`.
3. Branch is `develop`. Repo is `opticalis/opticup`.
4. `mcp__make__data-structures_get` for id 573694 confirms it still exists.
5. `mcp__make__scenarios_get` for `9126542` confirms 3 modules + `isActive: true`.
6. Read `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` (or its first 100 lines) to confirm the Phase History table structure.
7. Read `MASTER_ROADMAP.md` (full or relevant Module 4 section) to confirm the structure.
8. Read `modules/Module 4 - CRM/docs/MODULE_MAP.md` (relevant section) to confirm where to add the `make-patterns/` reference.

If pre-flight reveals unexpected state — STOP and report.

## 12. Lessons Already Incorporated

- **V1 author-skill Proposal 2 (FOREMAN_REVIEW must surface cumulative cost):** the SESSION_CONTEXT and MASTER_ROADMAP updates this SPEC adds will reflect the 4-SPEC sequence cost — explicit calibration data for future planning.
- **V3 author-skill Proposal 1 (Make module renumbering):** N/A here — this SPEC doesn't modify the Make scenario's module structure.
- **Iron Rule 21 (No Orphans):** the entire Track 1 of this SPEC is honoring this rule.
- **Iron Rule 23 (no secrets):** the doc updates mask any secret values (use `fbsync_***` in any reference, no real values).
- **Cross-Reference Check (Step 1.5 of opticup-strategic protocol):** completed at SPEC author time. Files touched: `SESSION_CONTEXT.md` (existing), `MASTER_ROADMAP.md` (existing), `MODULE_MAP.md` (existing). No new objects, no DB changes, no code changes. Zero collision risk.

## 13. QA Protocol

### Path 0 — Pre-flight
1. All §11 checks pass.

### Path 1 — Delete the orphan Data Structure
1. `mcp__make__data-structures_delete` with id=573694.
2. Verify with `mcp__make__data-structures_list` — id 573694 no longer in results.
3. Sanity check: `mcp__make__scenarios_get` for `9126542` still returns the 3-module flow with active state. The DS deletion shouldn't affect the scenario (DS 573694 is unused since V3).

### Path 2 — Update SESSION_CONTEXT.md
1. Read the file's Phase History table.
2. Add a new row at the top:
   ```
   | M4_CAMPAIGNS_CLEANUP | ✅ CLOSED | Final cleanup: deleted orphan DS 573694 from Make team 402680 (used in V1+V2, abandoned in V3 pivot). Updated SESSION_CONTEXT, MASTER_ROADMAP, MODULE_MAP. Campaigns sequence (M4_CAMPAIGNS_SCREEN + V1+V2+V3 + bootstrap-wire fix `f12605a`) fully closed on demo. Pipeline operational: scenario 9126542 syncing 7 demo campaigns every 4 hours via iteration pattern. Next: Daniel's QA + event-manager testing + P7 historical import (separate SPEC). |
   ```
3. Add (above that, in the same table) one summary row for the campaigns sequence as a whole, citing the cumulative cost from V3 FOREMAN_REVIEW: 4 SPECs, ~95 minutes execution time, ~98 Make ops, 3 architectural attempts before iteration pattern landed.
4. Update the "Last updated:" line to "2026-04-26".
5. Update the "Status:" line to reflect campaigns operational.

### Path 3 — Update MASTER_ROADMAP.md
1. Read the file. Find the section that lists Module 4 status / campaigns / data pipeline.
2. Update the relevant lines:
   - Note that campaigns measurement is operational on demo.
   - Note that 4-SPEC sequence (V1+V2+V3 + cleanup) closed.
   - Note that historical import for prizma + P7 cutover are pending.
3. If MASTER_ROADMAP has a "Decisions log" or "Recent updates" section, add a 1-line entry: `2026-04-26: Campaigns measurement pipeline operational on demo. 4-SPEC sequence closed (M4_CAMPAIGNS_MAKE_BODY_FIX V1+V2+V3+CLEANUP). Make iteration pattern documented at modules/Module 4 - CRM/docs/make-patterns/.`

### Path 4 — Update MODULE_MAP.md
1. Read the file. Find the section that lists Module 4's docs subdirectory.
2. Add a reference to the new `make-patterns/` directory:
   - "make-patterns/README.md — Make → Optic Up EF integration pattern (v3 architectural pivot)"
   - "make-patterns/data-structure-fb-campaigns-sync.json — UNUSED after V3, safe to delete in cleanup" (or similar — adjust based on whether the file actually exists; check with `ls`).

### Path 5 — Commit & push
1. Stage the 3 doc files explicitly:
   ```
   git add "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md" "MASTER_ROADMAP.md" "modules/Module 4 - CRM/docs/MODULE_MAP.md"
   ```
2. `git diff --staged` to verify the changes are scoped + no secrets leaked.
3. Run integrity gate.
4. Commit per §10.
5. Push.

### Path 6 — Final smoke (Chrome MCP, optional but recommended)
1. Reload `localhost:3000/crm.html?t=demo` in Chrome MCP.
2. Click קמפיינים tab.
3. Confirm 7 campaign rows still visible + 6 KPI cards populated.
4. No console errors.

If smoke fails — investigate before declaring done.

### Path 7 — Final state verification
1. `git log -1` shows the doc commit.
2. `git status` matches §9.
3. Make platform: DS 573694 gone, scenario 9126542 still active.
4. Smoke (if run): campaigns screen still rendering 7 rows.

---

## 14. Doc Update Snippets — Reference

### SESSION_CONTEXT.md addition (suggested):

Insert at top of Phase History table (above current top row):

```markdown
| **M4_CAMPAIGNS_SEQUENCE_CLOSE** | ✅ CLOSED | **Campaigns measurement pipeline operational on demo.** 4-SPEC sequence: M4_CAMPAIGNS_SCREEN (built + merged), M4_CAMPAIGNS_MAKE_BODY_FIX V1 🔴, V2 🔴, V3 🟢 (architectural pivot to iteration pattern). Make scenario `9126542` syncing 7 demo Facebook campaigns every 4 hours via 3-module flow (List → Insights → HTTP per campaign). EF `facebook-campaigns-sync` v4 with env-based MAKE_SECRET. Bootstrap dispatcher wired in `f12605a`. Cumulative cost: ~95 minutes execution + ~98 Make ops across 3 architectural attempts. Next: Daniel's demo QA, event-manager testing, P7 historical import (separate SPEC). See `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_*` for all 5 SPECs. |
```

Update header:
```markdown
> **Last updated:** 2026-04-26 (campaigns sequence closed — pipeline operational on demo)
> **Status:** Campaigns measurement live on demo. Module 4 ready for QA + event-manager testing.
```

### MASTER_ROADMAP.md addition (suggested):

Find the Module 4 status row, update to reflect campaigns is operational. Add to a recent-updates section if present:

```markdown
- **2026-04-26 — Campaigns Measurement Pipeline Live (Demo):** 4-SPEC sequence closed. Make scenario `9126542` syncs 7 demo Facebook campaigns every 4 hours into the CRM Campaigns Screen. Required 3 architectural attempts (V1+V2+V3) before iteration pattern landed. Reference: `modules/Module 4 - CRM/docs/make-patterns/README.md` documents the trap journey + working recipe for future Make → EF integrations.
```

### MODULE_MAP.md addition (suggested):

Find the section listing `modules/Module 4 - CRM/docs/`. Add:

```markdown
- `make-patterns/README.md` — Make → Optic Up Edge Function integration pattern. Documents the V1/V2/V3 trap journey and the iteration pattern that works.
```

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26 evening.*
