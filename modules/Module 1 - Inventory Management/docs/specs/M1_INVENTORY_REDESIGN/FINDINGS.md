# FINDINGS — M1_INVENTORY_REDESIGN

> **Executor:** opticup-executor (Stage 2)
> **Date:** 2026-05-16
> **Format:** one entry per finding, severity (INFO/LOW/MEDIUM/HIGH/CRITICAL), suggested disposition.

---

## F-1 — SPEC §3 D2/D3 expected row-count values were author-defect (LOW)

**Where:** `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_REDESIGN/SPEC.md` §3 Part D rows D2 (Prizma) + D3 (Demo).

**Description:** The SPEC declared expected `v_inventory_unified_log` row counts of 6193 (Prizma) / 1238 (Demo). These were derived from §0.A Probe P2 raw totals across all 4 source tables. They didn't account for the `activity_log` WHERE filter in the view body that excludes all rows whose `entity_type` is outside the inventory family. Per §0.A Probe P3, today 100% of `activity_log` rows are CRM-related (`crm`, `crm_leads`, `crm_events`, etc.) — none are inventory. So the activity_log branch contributes 0 rows to the view today, making actual counts 5257 (Prizma) / 583 (Demo).

The view's behavior is **correct**; the SPEC's expected values were wrong. Re-stated correct values in EXECUTION_REPORT §3 D-1.

**Severity:** LOW. The view + UI are working correctly. Only the SPEC's success-criteria table needs the value correction so Stage 3 Reviewer + Stage 5 Foreman aren't confused.

**Suggested disposition:** Foreman at Stage 5 should either (a) amend SPEC §3 D2/D3 in a chore commit, or (b) cite EXECUTION_REPORT §3 D-1 in FOREMAN_REVIEW as the corrected source. Already drives executor proposal P-EXEC-2 (filter-aware row-count verification).

---

## F-2 — SPEC §4 destructive-ops list didn't enumerate the REVOKE FROM anon (LOW)

**Where:** `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_REDESIGN/SPEC.md` §4 items #7 + #8 (CREATE VIEW + GRANT SELECT TO authenticated).

**Description:** §2.4 view body explicitly stated "No anon GRANT — inventory log is staff-only." But §4 Destructive Operations only enumerated `CREATE VIEW` and `GRANT SELECT TO authenticated`. Postgres auto-grants ALL on new public-schema views to anon + PUBLIC (this is the project's observed default per `pg_class.relacl` defaults on the `public` schema). The Executor caught the missing REVOKE at post-flight D4 verification when anon was still in the grantee list. Ran a supplementary MCP migration `m1_inventory_redesign_revoke_anon_unified_log` to honor the SPEC's stated INTENT.

This is the **second consecutive Pipeline** to exercise the INTENT-vs-LITERAL autonomy pattern (M1_LENS_PHASE_2_COMPLETION P-EXEC-2 was the first). The recurrence justifies codifying the auto-REVOKE-on-staff-only-view pattern in opticup-executor — see executor proposal P-EXEC-1 in EXECUTION_REPORT §8.

**Severity:** LOW. The intent was clear; the Executor recovered without escalation. But a pattern that requires 2 migrations instead of 1 is friction worth removing at the skill level.

**Suggested disposition:** Foreman at Stage 5 to (a) accept P-EXEC-1 (auto-REVOKE pattern), (b) add `REVOKE ALL ON ... FROM anon, PUBLIC` to the canonical view-creation template referenced by future SPECs.

---

## F-3 — 3 architect-pending entries flagged by the destructive-ops hook were deferred (INFO)

**Where:**
- `_archive/architect-pending-entries/2026-05-15_m1_close_ceremony_skill_updates.md`
- `_archive/architect-pending-entries/2026-05-15_P42_SELF_VALIDATE_BEFORE_DELIVERY.md`
- `_archive/architect-pending-entries/2026-05-16_d_m1_09_reframing.md`

**Description:** The Iron Rule 32 destructive-ops hook emits a warning at every commit when pending architect entries haven't been applied to their target files. All 3 entries target `.claude/skills/opticup-architect/SKILL.md` (per their internal "Target file" references). The Pipeline kickoff explicitly stated "P42 pending entry — HANDLED IN STAGE 2 by Executor's standard Pending Entries Sweep." However, applying the sweep would modify `.claude/skills/opticup-architect/SKILL.md`, which SPEC §6 #14 explicitly puts OUT OF SCOPE for this Pipeline.

The Executor honored the scope-protection (one concern per task). The hook warnings remained non-blocking (exit 2, warnings only — never exit 1 violation). All 6 commits passed verify.mjs without bypass.

**Severity:** INFO. The architect SKILL.md modification visible in `git status` (M flag) is the in-flight P42 application from a prior Architect session — Daniel confirmed it's benign in the pre-Stage-1 chat. Daniel's Architect session is the natural owner of the sweep + the SKILL.md commit.

**Suggested disposition:** Foreman at Stage 5 to flag to Daniel: "Architect session needs to run the Pending Entries Sweep + commit the SKILL.md changes + archive the 3 entry files." Estimated 10-15 min.

---

## F-4 — Orphan `<section id="tab-systemlog">` block + `modules/admin/system-log.js` (INFO)

**Where:**
- `inventory.html` — `<section id="tab-systemlog">` block at lines 377-435 (approximate; was line 339 pre-Pipeline)
- `modules/admin/system-log.js` (referenced from inventory.html script section)

**Description:** SPEC §6 #10 + #11 explicitly defer cleanup of the legacy system-log section + JS file to a future maintenance SPEC. After C2 removed the `<button data-tab="systemlog">` from `<nav id="mainNav">`, the section is no longer reachable via UI navigation. It's an orphan on disk. The JS module is still loaded by the script section (could remove the `<script>` tag in the future cleanup).

**Severity:** INFO. Deferred per SPEC §6 intentionally. Not a finding to act on; documenting for the next M1 maintenance SPEC's awareness.

**Suggested disposition:** Bundle into the next M1 maintenance SPEC alongside other M1 doc-drift cleanups (per the Sentinel's M-NEW-34-3 / M-NEW-35-2 backlog). Estimated 5 min cleanup commit.

---

*End of FINDINGS.md. 4 entries (1 LOW × 2, INFO × 2). No HIGH/CRITICAL findings.*
