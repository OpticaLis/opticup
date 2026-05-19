# FINDINGS — M4_WEEKLY_OPTIMIZATION_BRIEF

> **Executor:** opticup-executor (Sonnet 4.6)
> **Date:** 2026-05-19

---

## F-1 — rule-15-rls hook schema-prefix blind spot [LOW]

**Location:** `scripts/checks/rule-15-rls.mjs` line 3 (CREATE_TABLE_RE regex), `scripts/README-verify.md`

**Description:** The regex `CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)` captures the first `\w+` token after `CREATE TABLE`. When a migration uses `CREATE TABLE public.tablename` (schema-qualified), the hook captures `public` as the table name, then fails to find `ALTER TABLE public ENABLE ROW LEVEL SECURITY`. The file is technically correct but the hook raises a false positive. Fixed in this SPEC by writing `CREATE TABLE tablename` without the prefix.

**Severity:** LOW — cosmetic / developer UX issue; no security or correctness impact.

**Next action:** New SPEC or quick PR to add a schema-prefix strip in `rule-15-rls.mjs` + doc note in `scripts/README-verify.md`. TECH_DEBT candidate.

---

## F-2 — docs/FUNNEL_HEALTH_DASHBOARD.md line-budget convention [INFO]

**Location:** SPEC §8 file-size table, `docs/FUNNEL_HEALTH_DASHBOARD.md`

**Description:** SPEC budgeted "+15-30 lines" for the Weekly Brief documentation section. Actual: +44 lines. Caused by two markdown tables (classifier logic + tracked metrics) that cannot be meaningfully compressed. Content is accurate and useful.

**Severity:** INFO — no functional impact. SPEC authoring note only.

**Next action:** Foreman updates SPEC template to use floor-only budgets for documentation files. See Executor Proposal P-EXEC-2 in EXECUTION_REPORT.md.

---

*End of FINDINGS. 2 findings: 1 LOW, 1 INFO.*
