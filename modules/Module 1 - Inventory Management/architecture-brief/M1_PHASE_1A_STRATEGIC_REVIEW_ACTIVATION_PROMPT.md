# Activation Prompt — M1 Phase 1A Strategic Review

> Paste the block below into a fresh Claude Code chat (separate from the Code Review chat — these run in parallel).
> Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_PHASE_1A_STRATEGIC_REVIEW_BRIEF.md`

---

```
Strategic Review — M1 Lens Inventory Phase 1A (READ-ONLY business-logic audit).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_PHASE_1A_STRATEGIC_REVIEW_BRIEF.md

Activate the `opticup-strategic` skill. Read the Brief end-to-end FIRST, then follow the
Reading List in §5 (15 files + live Supabase SELECT-only). Audit Phase 1A across the 8 axes
(A through H) defined in the Brief §2. Produce ONE deliverable:

  modules/Module 1 - Inventory Management/architecture-brief/STRATEGIC_REVIEW_REPORT.md

with the exact structure mandated in Brief §4.

Mode constraints (non-negotiable):
- READ-ONLY. Never INSERT/UPDATE/DELETE/CREATE/DROP/ALTER any DB object or any repo file
  except the single report file STRATEGIC_REVIEW_REPORT.md.
- No follow-up SPECs. Findings go into the report; Daniel decides which become SPECs later.
- No re-litigation of D-M1-01..D-M1-16 unless concrete evidence shows a decision will fail.
- Every CRITICAL/HIGH finding must be backed by concrete evidence (file:line, DB row,
  mockup screenshot, decision number) per the opticup-guardian protocol.
- Target length 1500-3000 words. Tight. Evidence-dense. No padding.

After the report is written:
1. ONE commit on develop: `docs(m1): add Phase 1A strategic review report`
2. ONE short Hebrew line to Daniel:
   "Strategic Review הסתיים. Verdict: [🟢/🟡/🔴]. דו"ח: <path>."

Stop on deviation, not on success. If a pre-flight check (Brief §7) fails — STOP and write
a one-paragraph escalation note in the report explaining what's missing, then halt without
attempting any fix.

Iron Rules apply. Most relevant for this review: 6, 13, 14, 15, 16, 17, 18, 19, 20.
The sibling Code Review (different Claude Code chat) covers Rules 1, 11, 22, 31, 32 in depth.
```

---

*End of activation prompt.*
