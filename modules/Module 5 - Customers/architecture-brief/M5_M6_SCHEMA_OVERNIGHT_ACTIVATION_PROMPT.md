# Activation Prompt — M5 + M6 SCHEMA Overnight Build

> Paste into a fresh Claude Code chat. Overnight run-to-end, ~10-12 hours.
> Brief: `modules/Module 5 - Customers/architecture-brief/M5_M6_SCHEMA_OVERNIGHT_BRIEF.md`

---

```
Overnight Full-Auto Pipeline CHAIN — M5 + M6 SCHEMA (schema-only, no UI, no migration).

Brief: modules/Module 5 - Customers/architecture-brief/M5_M6_SCHEMA_OVERNIGHT_BRIEF.md

Activate `opticup-strategic` skill. Skill state inherits all harvested patterns (mandatory §0
Inner-call arity audit + Smoke-touched schema audit + Concurrent-Pipeline awareness envelope +
MIGRATION.md Applied Log + advisors-for-objects.mjs + P42 self-validate-before-delivery).

Read the overnight Brief end-to-end FIRST, then read both sealed module Briefs:
- modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_BRIEF.md (v3)
- modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTIONS_BRIEF.md (v2)

Run §6 pre-flight probes (9 SQL + shell — confirm tables don't exist, branches/crm_leads/tenants
shapes, demo branch present, ACCESS_AUDIT_REPORT.md location, next_*_number pattern, activity_log).
Pin every result as §0 baseline. The OpticPlus customers field-union (Probe 4 + 7) is the largest
unknown — pin the exact `customers` column list from the audit + crm_leads BEFORE authoring DDL.

THIS IS A CHAIN. Two halves, M5 first (M6 FKs to customers):

=== HALF 1 — M5 Customers schema (Phase A+B) ===
Author MODULE_5_ROADMAP.md (Phase A+B only) + M5_SCHEMA SPEC at
  modules/Module 5 - Customers/docs/specs/M5_SCHEMA/SPEC.md
Then opticup-executor builds:
- Tables: customers, households, health_funds, tenant_languages, customer_notes,
  customer_documents + branches extension (branch_code/is_active/deactivated_at).
- 7 customer-data Views (defer v_customer_queue_position = M14, defer v_customer_prescriptions_summary
  to Half 2 = M6 owns it).
- 5 RPCs: create_customer (atomic + dedup §4.7 + customer_number allocation), merge_customers,
  assign_to_household, delete_last_unused_customer (Iron Rule 32), update_customer_display_preferences.
- All M1A_OPERATIONS_RPCS_FIX discipline (SECURITY DEFINER + search_path + JWT guard + REVOKE/GRANT).
- Canonical 2-policy RLS, soft-delete, tenant-scoped UNIQUE, FK indexes.
- T-constants + FIELD_MAP for all new tables.
**MANDATORY M5 functional smoke ≥8/8 on demo** (Brief §2): create_customer happy + customer_number
allocated + dedup-duplicate-phone + merge + assign_household + delete_last_unused + cross-tenant
guard + anon-reject. Capture TEST_REPORT.md. If ANY fail → STOP, escalate, HALT chain.

=== HALF 2 — M6 Prescriptions schema ===
Author MODULE_6_ROADMAP.md + M6_SCHEMA SPEC at
  modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/SPEC.md
Then opticup-executor builds:
- Tables: eye_exams (state-machine Pattern 9), prescriptions_glasses + prescription_glasses_eyes
  (Pattern 11 two-rows), prescriptions_contacts + prescription_contacts_eyes, prescription_types
  (config P19 + capability flags), lens_manufacturers (config P19).
- 9 Views including the cross-contract v_customer_prescriptions_summary (M6 owns it).
- 7 RPCs: create_exam, create_prescription_draft (M5↔M6 contract), commit_prescription (atomic +
  prescription_number Iron Rule 11 + fires compute_recall_due_dates), cancel_draft_prescription
  (Iron Rule 32), supersede_prescription, compute_recall_due_dates, clone_prescription.
- Same discipline as Half 1.
**MANDATORY M6 functional smoke ≥8/8 + cross-contract smoke 5/5 on demo** (Brief §2): exam + draft +
commit + cancel + supersede + recall axes + clone + cross-tenant + anon-reject; THEN cross-contract:
create_customer → create_prescription_draft → commit_prescription → v_customer_prescriptions_summary
shows it → v_prescription_glasses_for_order shows it. If ANY fail → STOP, escalate, HALT.

=== CLOSE ===
- opticup-reviewer reviews each half → REVIEW.md per module + runs advisors-for-objects.mjs.
- opticup-strategic Foreman-reviews each → FOREMAN_REVIEW.md per module.
- Module-level docs: M5 + M6 SESSION_CONTEXT + CHANGELOG + MODULE_MAP + ROADMAP (Phase A+B done,
  UI + migration phases pending).
- GLOBAL_MAP + GLOBAL_SCHEMA + DB_TABLES_REFERENCE merged additive.
- MIGRATION.md Applied Log (MCP-migration-heavy).

Pipeline returns ONE Hebrew status line at chain end (finish-the-sequence — no pause between M5
and M6 unless real deviation):
  "M5 + M6 SCHEMA [🟢/🟡/🔴]. M5 smoke 8/8 + M6 smoke 8/8 + cross-contract 5/5. דו"חות בתיקיות הספקים.
   M7/M8/M9 פתוחים לבנייה (schema). UI + migration = ספקים נפרדים."

Iron Rules in sharp focus: 1, 11, 14, 15, 18, 19, 22, 23, 31, 32.

Out of scope (HARD — do NOT touch):
- ANY UI (customer card, list, create-mode, prescription editor) — separate UI SPECs, Daniel-in-loop
- OpticPlus migration (5,028 customers + 1,158 leads) — separate M5_MIGRATION SPEC
- crm_leads decommission / row migration — schema only; crm_leads stays live untouched (M4 runs on it)
- v_customer_queue_position (M14 not built) — document deferred
- lifecycle_stage dormant cron + prescription→order auto-commit M7 wiring — build functions, don't fire
- recall_rules table (M12 owns it)
- Prizma data writes — DDL applies to both tenants but functional smoke data on demo only
- Merge to main (Daniel-only after QA)
- Relitigating the 30 M5 + M6 sealed decisions

On escalation: write modules/Module {5,6}/escalations/{ISO_TS}_{topic}.md + one Hebrew line. Halt.

Stop on deviation, not on success. Run-to-end overnight. No 🟢 without M5 8/8 + M6 8/8 +
cross-contract 5/5 all passing on demo. Per P42, self-validate every file write (line count + tail +
markers) before declaring any phase complete.
```

---

## Pre-flight checklist for Daniel

- [ ] Brief sealed at `modules/Module 5 - Customers/architecture-brief/M5_M6_SCHEMA_OVERNIGHT_BRIEF.md`
- [ ] M4 closed (confirmed — done in parallel session)
- [ ] No other Claude Code session running on the same repo overnight (or both claim pipeline-coordination locks per the new PARALLEL_PIPELINE_COORDINATION mechanism)
- [ ] Demo tenant accessible + has ≥1 branch (Probe 6)
- [ ] Supabase MCP connected
- [ ] Working directory confirmed (Windows desktop / laptop / Mac)
- [ ] Running in Claude Code, NOT Cowork (MCP 45s timeout would break DDL)

---

## Expected timing

- §6 pre-flight probes + OpticPlus field-union pin: ~30 min
- M5 SPEC authoring + ROADMAP: ~45 min
- M5 schema + Views + RPCs build: ~3-4 hours
- M5 functional smoke (8 cases): ~30 min
- M6 SPEC authoring + ROADMAP: ~45 min
- M6 schema + Views + RPCs build: ~3-4 hours
- M6 + cross-contract smoke (13 cases): ~45 min
- Reviews + Foreman + docs merge per module: ~1.5 hours

**Total estimate: ~10-12 hours.** Single overnight Claude Code session.

---

## What you'll have in the morning

Two new module schemas live on demo:
- M5 Customers: 6 tables + 7 Views + 5 RPCs, smoke 8/8.
- M6 Prescriptions: 6 tables + 9 Views + 7 RPCs, smoke 8/8 + cross-contract 5/5.

**M7 (Orders), M8 (Payments), M9 (Lab) become buildable** — their `customer_id` + `prescription_id` FK foundations now exist.

**Next waves (Daniel-in-loop):**
- M5 UI SPEC (customer card 5 tabs + list + create-mode) — needs Chrome MCP smoke.
- M6 UI SPEC (prescription editor) — same.
- M5_MIGRATION SPEC (OpticPlus 5,028 + crm_leads 1,158 import).

---

*End of activation prompt. Overnight schema-only chain. Two modules. No UI. No migration.*
