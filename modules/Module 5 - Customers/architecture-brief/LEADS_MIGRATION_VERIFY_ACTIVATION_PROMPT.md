# Activation Prompt — Leads-Migration Count Verification (1296 vs 1354)

> Paste the block below into a FRESH Claude Code chat.
> Brief: `modules/Module 5 - Customers/architecture-brief/LEADS_MIGRATION_VERIFY_BRIEF.md`
> READ-ONLY reconciliation. ~30-45 min.

---

```
Leads-Migration count reconciliation — READ-ONLY. The night-run's Track 2 (crm_leads → customers) reported Prizma 1296 migrated; the Brief projected 1354. Delta = 58. Confirm with live SQL that the 58 are fully explained by expected behavior (phone-dedup + documented exclusions) and that ZERO Prizma leads were silently lost.

Brief: modules/Module 5 - Customers/architecture-brief/LEADS_MIGRATION_VERIFY_BRIEF.md

Activate the `opticup-reviewer` skill. Read the Brief end-to-end FIRST, then read the migration SPEC + its retrospective so you reconcile against the SAME dedup/exclusion rules the migration actually used:
  modules/Module 5 - Customers/docs/specs/M5_LEADS_MIGRATION/SPEC.md
  modules/Module 5 - Customers/docs/specs/M5_LEADS_MIGRATION/EXECUTION_REPORT.md
  modules/Module 5 - Customers/docs/specs/M5_LEADS_MIGRATION/FINDINGS.md

Then via Supabase MCP execute_sql (SELECT ONLY) reconcile, Prizma-scoped:
  1. Exact starting count of Prizma crm_leads (total + active vs soft-deleted).
  2. Exact migrated-into-customers count attributable to this migration (identify by whatever tag/source/created_at window the SPEC used).
  3. Full delta breakdown — every excluded/collapsed row bucketed by reason: dedup-merged-to-existing-customer (count + sample), soft-deleted (count), empty/malformed phone (count), any other documented exclusion (count).
  4. The reconciliation equation: starting = migrated + sum(buckets). It MUST sum exactly. If it does not sum → unexplained rows = the bug.

Produce ONE deliverable:
  modules/Module 5 - Customers/architecture-brief/LEADS_MIGRATION_RECONCILIATION_2026_05_23.md
with every count evidence-backed by its SQL result, the reconciliation equation, and a verdict:
  ✅ delta fully explained (no action) — OR — 🔴 N rows unexplained (list them).

Constraints (non-negotiable):
- READ-ONLY. SELECT only. No INSERT/UPDATE/DELETE/DDL. This is reconciliation, not repair.
- Do NOT invent dedup/exclusion rules — reconcile against the SPEC's actual rules.
- If a real gap is found (equation doesn't sum, real distinct people missing): write modules/Module 5 - Customers/escalations/{ISO_TS}_leads_migration_gap.md + emit ONE Hebrew line + HALT. Do NOT migrate the missing rows yourself — a production data fix needs Daniel-in-loop + backup.
- After the report (if ✅): ONE commit on develop `docs(m5): add leads-migration reconciliation report`, then ONE Hebrew line:
  "אימות הגירת-לידים: [✅/🔴]. התחלה [N] = הוגר [1296] + דדופ [X] + מחוקים [Y] + טלפון-ריק [Z]. דו"ח: <path>."

Branch: develop. Stop on deviation, not on success. Per P42, self-validate the report file before committing.
```

---

## Pre-flight checklist for Daniel

- [ ] Running in Claude Code (Supabase MCP connected)
- [ ] Branch = develop, repo = opticalis/opticup
- [ ] The M5_LEADS_MIGRATION SPEC folder present (the run created it)

---

*End of activation prompt. Read-only reconciliation. One report.*
