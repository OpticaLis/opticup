# FINDINGS — M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX

> **Executor:** opticup-executor (Claude Sonnet 4.6)
> **Date:** 2026-05-19
> **SPEC:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/SPEC.md`

Findings are items discovered during execution that are OUT OF SCOPE for this SPEC.
They are logged here — not fixed — per Iron Rule "one concern per task."

---

## Inherited from Parent SPEC (M4_FB_CAPI_PURCHASE_EVENTS)

The parent SPEC's FINDINGS.md pre-classified these at author time. Inherited verbatim.

### F-A1 — Foreman skill gap: §0.7 rehearsal missed schema-location verification

- **Severity:** HIGH (Foreman/strategic skill)
- **Location:** `opticup-strategic` SKILL.md -> §"Runtime Semantics Rehearsal"
- **Description:** The parent SPEC's §0.7 rehearsal verified that the uuid-ossp extension was enabled (v1.1) but did NOT verify the schema location of its installed functions. Supabase's convention since 2023 places extension functions in the `extensions` schema. A `pg_proc JOIN pg_namespace` probe before prescribing `public.uuid_generate_v5(...)` would have caught this in seconds.
- **Suggested action:** Promote to P-AUTHOR-1 in the FOREMAN_REVIEW.md — codify a schema-location probe requirement in the strategic skill's §0.7 rehearsal protocol for any SQL body that calls extension-installed functions.

### F-A2 — Executor skill gap: verbatim acceptance of Foreman-prescribed schema qualifier

- **Severity:** MEDIUM (Executor skill)
- **Location:** `opticup-executor` SKILL.md -> §"Step 1.5 — DB Pre-Flight Check"
- **Description:** The parent SPEC's Executor applied the Foreman's CREATE OR REPLACE FUNCTION bodies verbatim without independently verifying that `public.uuid_generate_v5` resolved in the DB. A `SELECT n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='uuid_generate_v5'` probe takes 1 second. Missing this probe allowed a P0 production regression to reach production.
- **Suggested action:** P-EXEC-1 in this SPEC's EXECUTION_REPORT.md — add namespace probe as item 10 in Step 1.5.

### F-A3 — Reviewer skill gap: static SQL audit without BEGIN/ROLLBACK rehearsal

- **Severity:** MEDIUM (Reviewer skill)
- **Location:** `opticup-reviewer` SKILL.md -> audit protocol for SECURITY DEFINER trigger functions
- **Description:** The parent SPEC's Reviewer audited the 3 trigger function bodies statically (reading `pg_proc.prosrc`) but did not run a BEGIN/ROLLBACK rehearsal of the actual DML path. A DO-block INSERT + RAISE EXCEPTION rollback-clean test would have surfaced SQLSTATE 42883 immediately during the Reviewer phase, before the parent SPEC was closed.
- **Suggested action:** Informational only — opticup-reviewer is not currently in the self-improvement loop. Log as P-REVIEW-1 in the closure FOREMAN_REVIEW for future reviewer skill evolution.

---

## New Finding from This Execution

### F-NEW-1 — Queue row baseline drift is a recurring pattern that needs standard handling

- **Severity:** INFO
- **Location:** SPEC §3 Criterion 11 ("Existing queue rows UNCHANGED | 33")
- **Description:** The SPEC baseline was captured at 2026-05-19T15:50 UTC. This Executor session ran later. The queue row count was 34 (not 33). The delta is pre-existing and unrelated to this migration (which has zero DML), but required a judgment call. This pattern (count baseline captured at author time, observed count differs at execution time due to intervening production/test activity) will recur on any SPEC that references row counts in live tables.
- **Suggested action:** P-EXEC-2 in EXECUTION_REPORT.md — standardize "baseline drift annotation" in the criteria evidence table so reviewers can immediately classify the delta without reading prose.
