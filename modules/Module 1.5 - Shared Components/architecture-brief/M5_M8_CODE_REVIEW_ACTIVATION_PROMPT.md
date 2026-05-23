# Activation Prompt — M5-M8 Code Review (parallel chat #2)

> Paste into a fresh Claude Code chat. Runs in PARALLEL with the Strategic Review chat.
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_CODE_REVIEW_BRIEF.md`

---

```
Code Review — M5/M6/M7/M8 Schema (READ-ONLY security/RLS/schema/performance audit).

Brief: modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_CODE_REVIEW_BRIEF.md

Activate the `opticup-reviewer` skill. Read the Brief end-to-end FIRST, then the Reading List
(§5: Iron Rules + SECURITY_HOTFIX patterns + 4 SPEC folders + shared.js FIELD_MAP + GLOBAL_SCHEMA
+ live Supabase via MCP). Audit M5/M6/M7/M8 across the 9 axes (A-I) in Brief §2.

Produce ONE deliverable:
  modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_CODE_REVIEW_REPORT.md
with the exact structure in Brief §4 (verdict + M9/UI-readiness + axis findings + Iron Rule
scorecard + advisor results + the 8 critical questions answered with evidence + top-5 risks +
readiness gate + Daniel questions).

Mode constraints (non-negotiable):
- READ-ONLY. Supabase MCP `execute_sql` for SELECT only. INSERT/UPDATE/DELETE/CREATE/DROP/ALTER
  FORBIDDEN. `list_tables`, `get_advisors`, SELECT against pg_class/pg_policy/pg_proc/pg_indexes/
  pg_trigger/pg_constraint/aclexplode are the toolset.
- Never modify any repo file except the single report file.
- No follow-up SPECs. No refactoring (a finding may say "rewrite X because Y"; never write it).
- Every CRITICAL/HIGH finding evidence-backed (query result / file:line / advisor ID) per
  opticup-guardian.
- Target 2000-4000 words. Tight. Evidence-dense.

The report MUST answer these 8 critical questions with evidence (Brief §4 #4):
1. Can tenant-A JWT read tenant-B rows in any of the ~24 new tables?
2. Can anon execute any of the ~29 new RPCs?
3. Any SECURITY DEFINER RPC without SET search_path=public?
4. Does allocate_tenant_number race under concurrent customer+order+payment creation? (highest-concurrency RPC in the spine)
5. Can the M8 event queue (payment_events_queue) double-enqueue on transaction retry?
6. Any cross-module FK with accidental CASCADE on financial records (payment→order→customer)?
7. Any new table missing a tenant_id / FK index?
8. Any HIGH Supabase Advisor lint introduced by M5-M8 unaddressed?

After the report: ONE commit on develop `docs(m1.5): add M5-M8 code review report`, then ONE
Hebrew line:
  "Code Review (M5-M8) הסתיים. Verdict: [🟢/🟡/🔴]. M9-readiness: [...]. דו"ח: <path>."

Stop on deviation, not on success. The sibling Strategic Review (different chat) covers business
logic + contracts; do NOT duplicate it. Your focus is code/RLS/security/performance.
Per P42, self-validate the report file before committing.
```

---

*End of activation prompt. Code review — security/RLS/perf emphasis. Parallel with Strategic Review.*
