# Activation Prompt — M5-M8 Strategic Review (parallel chat #1)

> Paste into a fresh Claude Code chat. Runs in PARALLEL with the Code Review chat.
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_STRATEGIC_REVIEW_BRIEF.md`

---

```
Strategic Review — M5/M6/M7/M8 Schema (READ-ONLY business-logic + cross-contract audit).

Brief: modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_STRATEGIC_REVIEW_BRIEF.md

Activate the `opticup-strategic` skill. Read the Brief end-to-end FIRST, then the Reading List
(§5: 4 sealed Architecture Briefs + 4 SPEC folders + decisions/M{5,6,7,8}.md + live Supabase
SELECT-only + 3 UI mockups). Audit M5/M6/M7/M8 across the 8 axes (A-H) in Brief §2, with
PRIMARY emphasis on Axis B (cross-module contracts: M5↔M6↔M7↔M8 + M1).

Produce ONE deliverable:
  modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_STRATEGIC_REVIEW_REPORT.md
with the exact structure in Brief §4 (verdict + M9-readiness + UI-readiness + axis findings +
cross-contract matrix + concurrence with the 4 FOREMAN_REVIEWs + top-5 risks + Daniel questions).

Mode constraints (non-negotiable):
- READ-ONLY. Never INSERT/UPDATE/DELETE/CREATE/DROP/ALTER any DB object or any repo file except
  the single report file.
- No follow-up SPECs. Findings go in the report; Daniel decides which become SPECs.
- No relitigating sealed decisions unless concrete evidence shows one will fail.
- Every CRITICAL/HIGH finding evidence-backed (file:line / DB query / contract ref / decision #)
  per opticup-guardian.
- Target 1500-3000 words. Tight. Evidence-dense.

After the report: ONE commit on develop `docs(m1.5): add M5-M8 strategic review report`, then ONE
Hebrew line:
  "Strategic Review (M5-M8) הסתיים. Verdict: [🟢/🟡/🔴]. M9-readiness: [...]. דו"ח: <path>."

Stop on deviation, not on success. The sibling Code Review (different chat) covers code/RLS/perf;
do NOT duplicate it. Your focus is business logic + the contracts between the 4 modules.
Per P42, self-validate the report file (line count + tail + no truncation) before committing.
```

---

*End of activation prompt. Strategic review — cross-contract emphasis. Parallel with Code Review.*
