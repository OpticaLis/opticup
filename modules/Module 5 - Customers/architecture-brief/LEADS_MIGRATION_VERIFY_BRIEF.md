# Brief — Leads-Migration Count Verification (1296 vs 1354)

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **Activation Prompt:** `LEADS_MIGRATION_VERIFY_ACTIVATION_PROMPT.md` (sibling — paste THAT into Claude Code).
> **Context:** the night-run (`modules/Module 1.5 - Shared Components/architecture-brief/NIGHT_RUN_2026_05_23_BRIEF.md`) closed 🟢. Track 2 (crm_leads → customers) reported **Prizma 1296** migrated; the Brief projected **1354**. Delta = **58**.

---

## 0. Goal

Confirm — with live SQL evidence — that the 58-row delta between projected (1354) and migrated (1296) is **fully accounted for by expected behavior** (phone-dedup against existing customers + any legitimately-excluded rows), and that **zero Prizma leads were silently dropped or lost**. This is a READ-ONLY reconciliation. No fixes unless a real gap is proven, in which case STOP and escalate — do not self-heal a production data discrepancy.

## 1. Why this matters

58 leads is not a number to assume. Two possibilities:
- **Benign (expected):** the M5 §4.7 phone-dedup collapsed leads who were already `customers` (same person, not a new row), plus any rows excluded by documented migration rules (e.g. soft-deleted leads, malformed/empty phone, test rows). If every one of the 58 maps to a documented exclusion → ✅ closed, no action.
- **Bug (data loss):** some of the 58 are real, distinct people who should be in `customers` but aren't. → STOP, escalate, do NOT proceed to any further work on the spine until reconciled.

## 2. What to produce

ONE reconciliation report at:
`modules/Module 5 - Customers/architecture-brief/LEADS_MIGRATION_RECONCILIATION_2026_05_23.md`

It must contain, with live SQL evidence per line:
1. **Exact starting count** of Prizma `crm_leads` rows at migration time (total, and split: active vs soft-deleted).
2. **Exact migrated count** into `customers` attributable to this migration (how it's identified — by a migration tag/source field, created_at window, or whatever the M5_LEADS_MIGRATION SPEC used).
3. **The full delta breakdown** — every excluded/collapsed row classified into a reason bucket:
   - dedup-merged into an existing customer (same phone) — count + sample rows
   - soft-deleted lead (excluded by design) — count
   - empty/malformed phone (excluded by design) — count
   - any other documented exclusion — count
4. **The reconciliation equation:** starting = migrated + each-bucket, summing exactly. If it does NOT sum to the starting count → there are unexplained rows → that is the bug.
5. **Verdict:** ✅ delta fully explained (no action) OR 🔴 N rows unexplained (escalate with the list).

## 3. Constraints

- **READ-ONLY.** Supabase MCP `execute_sql` for SELECT only. No INSERT/UPDATE/DELETE/DDL. This is reconciliation, not repair.
- If a real gap is found → write the escalation file, emit one Hebrew line, HALT. Do NOT migrate the missing rows yourself (a production data fix needs Daniel-in-loop + backup).
- Read the M5_LEADS_MIGRATION SPEC + its EXECUTION_REPORT/FINDINGS first, so the dedup + exclusion rules used are the ones you reconcile against (don't invent your own rules).
- Both tenants exist; this is Prizma-scoped (the 1354/1296 numbers are Prizma). Demo was 28/—.

## 4. Out of scope

- Re-running or amending the migration.
- The visual/UI QA on M5-M9 (separate Cowork chat with Daniel).
- Anything beyond the count reconciliation.

---

*End of Brief. Read-only reconciliation, single report deliverable.*
