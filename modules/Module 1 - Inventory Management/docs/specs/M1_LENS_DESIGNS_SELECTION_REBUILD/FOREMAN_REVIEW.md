# FOREMAN_REVIEW — M1_LENS_DESIGNS_SELECTION_REBUILD

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DESIGNS_SELECTION_REBUILD/FOREMAN_REVIEW.md`
> **Written by:** opticup-architect (Cowork session)
> **Written on:** 2026-05-17 (night, post-Group A close)
> **Commits reviewed:** `52c0b0b..a92c4a8` (3 commits, ~70 min execution)

---

## 1. Verdict

🟢 **CLOSED.** 21/21 success criteria PASS structurally. Tier C VFV live (3 screenshots, 0 console errors). 1 MEDIUM finding documents pre-existing RPC semantics bug (not introduced by this SPEC).

## 2. SPEC Quality Audit

**What worked:**
- Step 1.6 + 1.7 pre-seal checks fired correctly — caught 2 phantom paths at author time
- F-5 isolation pattern (saved for SPEC 5, but inspiration came here)
- Defensive `#access-gate-ad` namespace prevented ID collision with lens-inventory partial

**What missed:**
- §0 didn't probe `toggle_active_offering` RPC semantics — Foreman assumed bulk-action with `p_location_id=null` flips per-location actuals; actual: it creates a parallel "all-locations" row. Pre-existing bug, but should have been documented.

**SPEC quality:** 8/10.

## 3. Execution Quality Audit

3 commits (vs SPEC's 4-6 estimate) — consolidation defensible: orchestrator + 4 child modules can't be split without intermediate broken state. Iron Rules clean across 3/7/8/9/12/21/22/23/31/32. Executor self-score 9.2/10 — concur.

**Execution quality:** 9.5/10.

## 4. Findings Processing

| Code | Severity | Disposition |
|---|---|---|
| F-1 toggle_active_offering per-location semantics | **MEDIUM** | **NEW_SPEC** `M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS` (~2-3h) — Daniel decision needed: (a) server-side array RPC or (b) client-side enumeration |
| F-2 toggleMany() Promise.all not atomic | INFO | **AUTO-RESOLVE** if F-1 picks server-side option |
| F-3 inventory-shell-lens.js 348 lines | LOW | **BUNDLE** into next M1 maintenance SPEC — extract manifest to JSON |

## 5. Self-Improvement Proposals

### Author-skill (opticup-strategic)
**A-1 — RPC contract documentation in §0.** When a SPEC will call an existing RPC (not author one), §0 must include `pg_get_functiondef` + a 1-line semantics note (what does each arg do, what does null mean). Would have caught F-1 at author time.

**A-2 — Note TableBuilder `_groupHeader` synthetic-row recipe** in opticup-strategic Code Patterns reference.

### Executor-skill (opticup-executor)
**E-1 — Document UPSERT `p_location_id=null` semantics** in SKILL.md DB patterns reference — null means "all locations" not "this location, no filter".

**E-2 — Document TableBuilder `_groupHeader` synthetic-row pattern** in references.

## 6. Verdict

🟢 **CLOSED.** Functional Designs screen ships. F-1 escalates to Daniel decision before that follow-up SPEC.
