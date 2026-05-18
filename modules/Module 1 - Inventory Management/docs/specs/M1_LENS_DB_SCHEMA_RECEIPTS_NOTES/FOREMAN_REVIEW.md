# FOREMAN_REVIEW — M1_LENS_DB_SCHEMA_RECEIPTS_NOTES

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/FOREMAN_REVIEW.md`
> **Written by:** opticup-architect (acting as Foreman, Cowork session)
> **Written on:** 2026-05-17 IDT
> **Commits reviewed:** `05e28bb` through `0e7d524` (4 commits + recovery cycle)
> **Sibling artifacts:** ARCHITECT_DECISION_001_SPEC3_AMENDMENT, MIGRATION.md, RESOLVED_PREFLIGHT_HALT escalation

---

## 1. Verdict

🟢 **CLOSED.** Clean recovery from pre-flight HALT. ARCHITECT_DECISION_001 amendment pathway worked end-to-end — exactly the discipline `opticup-supervisor` Shadow Mode is designed to validate.

---

## 2. SPEC Quality Audit

**What missed:** SPEC §9 assumed wrong table shapes (`permissions(key,description)` vs actual `permissions(id, module, action, name_he, description, tenant_id)`) AND assumed wrong roles (`admin` doesn't exist; actual: ceo/manager/team_lead/viewer/worker). Two structural errors in one SPEC section.

The author (me, this skill) was authoring against assumed schema instead of probed schema. This is the recurring "live-schema verification gap" pattern — surfaced in this SPEC for the 4th time across project history. Time to codify.

**What worked:** SPEC §9 itself flagged "column names may differ; executor pre-flight must verify". The hedge was correct; the underlying authoring discipline was lax. The hedge saved the run, but the discipline needs upgrading.

**SPEC quality score:** 6/10. Structure ok, evidence base weak. The recovery is what saved it from 4/10.

## 3. Execution Quality Audit

**Session A (HALT):** Stop-on-deviation discipline applied correctly. Two real triggers caught (coordination collision + schema mismatch). Wrote escalation, claimed no lock, made no commits. Read-only data gathering excellent — 8 baseline checks all verified.

**Session B (RESUME):** Followed ARCHITECT_DECISION_001 amendment verbatim. Live pre-flight re-ran 5 verifications (UNIQUE constraints, tenants.slug, role existence). 4 atomic commits, MIGRATION.md applied-log per E1 pattern.

Iron Rules 5/9/14/15/18/21/23/31/32 all touched + clean. Canonical 2-policy RLS (service_bypass + JWT-claim tenant_isolation) applied verbatim.

**Execution quality score:** 9.8/10. The escalation + recovery loop is exactly how this layer is supposed to work.

## 4. Findings Processing

| Code | Severity | Disposition |
|---|---|---|
| F-1 LOW FIELD_MAP doc points at wrong file | LOW | **NEW_SPEC** `DOC_CURRENCY_SWEEP_2026_05_17` (~30 min) — bundle with cross-cutting flag #3 below |
| F-2 INFO phantom stop-trigger | INFO | **DISMISS** + apply E-1 (hook-keyword enumeration in SKILL) |
| F-3 LOW rule-15 hook scans MAP files | LOW | **TECH_DEBT** `M1_5-DEBT-XX` — extend `isDocFile()` heuristic |
| F-4 LOW TECH_DEBT.md naming inconsistent | LOW | **NEW_SPEC** (tiny, bundle with F-1 doc sweep) |
| F-5 INFO purchase_receipt.delivery_note_number nullable | INFO | **DISMISS** — nullable correct; doc was wrong, doc was fixed inline |
| F-6 INFO flag mismatch v1 prompt | INFO | **DISMISS** — historical, v2 corrected |
| F-7 INFO shared.js + shared-field-map.js > 300 | INFO | **MONITOR** — within 350 cap |

Plus filed: `TECH_DEBT.md` entry `#M1_LENS_PERMISSIONS_TEMPLATE_AUTO_REPLICATION` (per ARCHITECT_DECISION_001 Q2).

## 5. Master-doc Update Checklist

| Doc | Touched? | State |
|---|---|---|
| `docs/GLOBAL_SCHEMA.sql` | ✅ | Updated with new column + table + RLS |
| `docs/DB_TABLES_REFERENCE.md` | ✅ | T constant for lens_variant_notes |
| Module 1 db-schema.sql | ✅ | Updated |
| Module 1 SESSION_CONTEXT/CHANGELOG | ✅ | Updated |
| `TECH_DEBT.md` | ✅ | permissions_template entry filed |

## 6. Self-Improvement Proposals

### Author-skill (opticup-strategic)

**A-1 — Mandatory live-schema probe for lookup-table SPECs.** When authoring a SPEC that writes to `permissions`, `role_permissions`, `roles`, `tenant_config`, `plans`, or `tenant_active_offerings`, the SPEC §0 MUST include the live `information_schema.columns` result for the target table. NEVER paste an assumed shape from memory. Add to `opticup-strategic/SKILL.md` SPEC Authoring Protocol Step 1.5. This is **the 4th recurrence** of this defect class — apply now per 3-strike rule.

**A-2 — Pre-author check on pipeline-coordination constraints.** When a SPEC's ACTIVATION_PROMPT contemplates parallel execution, the author MUST verify the `pipeline-coordination.mjs` tool allows it on the target branch. The default is one-Pipeline-per-branch on develop. Add to SPEC §13 Pipeline Coordination Pre-Check template.

### Executor-skill (opticup-executor)

**E-1 — Multi-tenant lookup-table shape probe pre-flight Step 5a.** New First Action step for any SPEC that writes to a lookup table: query `information_schema.columns` + `information_schema.table_constraints` for the target. Surface mismatches BEFORE attempting the migration. Saved this Pipeline; should be SKILL-level.

**E-2 — Ship `PERMISSION_SEED_TEMPLATE.sql` reference.** Add `.claude/skills/opticup-executor/references/PERMISSION_SEED_TEMPLATE.sql` with canonical `CROSS JOIN tenants WHERE slug IN (...)` pattern + actual PK/UNIQUE shapes as comments. Mirrors existing `BLOCK_A_DEMO_TESTS.sql` precedent.

## 7. Strategic flag to next Foreman session

**The PARALLEL_PIPELINE_COORDINATION tool worked exactly as designed** — caught the collision at claim time, no rollback needed. Authors should now treat parallel-execution prompts as default-illegal on develop until the coordination tool's one-Pipeline-per-branch rule is explicitly relaxed (which it isn't yet).

## 8. Verdict

🟢 **CLOSED.** All criteria GREEN after recovery. DB foundation ready for SPEC 5 (Pricing rebuild — lens_variant_notes consumer) + SPEC 4a (delivery note + cost-price permission consumer). The recovery loop validates the Supervisor + Architect-decision pattern.
