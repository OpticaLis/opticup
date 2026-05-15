# Activation Prompt — M1 Phase 1A Code Review

> Paste the block below into a fresh Claude Code chat (separate from the Strategic Review chat — these run in parallel).
> Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_PHASE_1A_CODE_REVIEW_BRIEF.md`

---

```
Code Review — M1 Lens Inventory Phase 1A (READ-ONLY security/RLS/schema/performance audit).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_PHASE_1A_CODE_REVIEW_BRIEF.md

Activate the `opticup-reviewer` skill. Read the Brief end-to-end FIRST, then follow the
Reading List in §5 (17 sources including 5 migrations + 9 RPCs + 1 trigger + 1 view + 1 EF
+ HTML/JS screen + live Supabase via MCP). Audit Phase 1A across the 9 axes (A through I)
defined in the Brief §2. Produce ONE deliverable:

  modules/Module 1 - Inventory Management/architecture-brief/CODE_REVIEW_REPORT.md

with the exact structure mandated in Brief §4.

Mode constraints (non-negotiable):
- READ-ONLY. Use Supabase MCP `execute_sql` for SELECT only. INSERT/UPDATE/DELETE/CREATE/
  DROP/ALTER ARE FORBIDDEN. `list_tables`, `get_advisors`, SELECT queries against pg_class /
  pg_policy / pg_proc / pg_indexes / information_schema are the toolset.
- Never modify any repo file except the single report file CODE_REVIEW_REPORT.md.
- No follow-up SPECs. Findings go into the report; Daniel decides which become SPECs later.
- No refactoring or rewriting. A finding may say "function X should be rewritten because Y"
  but the reviewer never writes the rewrite.
- Every CRITICAL/HIGH finding must be backed by concrete evidence (query result, file:line,
  advisor ID) per the opticup-guardian protocol.
- Target length 2000-4000 words. Tight. Evidence-dense. No padding.

Critical questions the report MUST answer with evidence (per Brief §6):
1. Can a tenant-A JWT read a tenant-B row in any of the 17 new tables?
2. Can `anon` execute any of the 9 RPCs?
3. Are any of the 9 RPCs SECURITY DEFINER without SET search_path=public?
4. Does record_stock_movement use FOR UPDATE before computing FIFO?
5. Can the K3 trigger leak tenant_id across boundaries?
6. Is lens-catalog-import EF callable by a non-platform-admin tenant user?
7. Any new tables missing a tenant_id index?
8. Any HIGH Supabase Advisor lints introduced by Phase 1A unaddressed?

After the report is written:
1. ONE commit on develop: `docs(m1): add Phase 1A code review report`
2. ONE short Hebrew line to Daniel:
   "Code Review הסתיים. Verdict: [🟢/🟡/🔴]. דו"ח: <path>."

Stop on deviation, not on success. If a pre-flight check (Brief §7) fails — STOP and write
a one-paragraph escalation note in the report explaining what's missing, then halt without
attempting any fix.

Iron Rules apply. Most relevant for this review: 1, 11, 14, 15, 18, 22, 23, 31, 32.
The sibling Strategic Review (different Claude Code chat) covers business-logic axes;
do NOT duplicate that work.
```

---

*End of activation prompt.*
