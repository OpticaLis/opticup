# Activation Prompt — M1_SKILL_IMPROVEMENT_HARVEST

> Paste the block below into a fresh Claude Code chat. Single-skill Pipeline — `opticup-strategic` only.
> Sibling Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_SKILL_IMPROVEMENT_HARVEST_BRIEF.md`

---

```
Single-skill Pipeline — M1_SKILL_IMPROVEMENT_HARVEST (apply 4 accumulated FOREMAN_REVIEW proposals to skill files).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_SKILL_IMPROVEMENT_HARVEST_BRIEF.md

Activate `opticup-strategic` skill. Read the Brief end-to-end. Then run §6 pre-flight probes
(5 checks confirming skill-file paths + SPEC_TEMPLATE.md path + scripts/audit/ existence +
DECISIONS_LOG.md structure + current executor SKILL.md section anchors).

Author the SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/SPEC.md

Then apply the 4 proposals in 3-5 commits:
- A1 — §0 Inner-call arity audit + Smoke-touched schema audit as MANDATORY sub-headings in
  .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md
- A2 — §11 Concurrent-Pipeline awareness bullet-template in the same template file
- E1 — MIGRATION.md Applied Log convention added to
  .claude/skills/opticup-executor/SKILL.md §"SPEC Execution Protocol" / Step 2
- E2 — NEW file scripts/audit/advisors-for-objects.mjs (pure Node, no deps, reads
  --advisors-json <path> + positional object names, exits 1 on HIGH/ERROR match) +
  reference in .claude/skills/opticup-executor/SKILL.md §"Verification After Changes" /
  SQL Autonomy Level 1

Source CHANGE blocks are verbatim from:
  modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/FOREMAN_REVIEW.md
  §6 Proposals 1 + 2 (author-skill)
  §7 Proposals 1 + 2 (executor-skill)

After applying:
1. Smoke-run advisors-for-objects.mjs against the M1B0 object list using live MCP advisor
   JSON. Capture exit code (expected 0 — M1B0 closed with no HIGH advisor findings).
2. Update .claude/skills/opticup-architect/references/DECISIONS_LOG.md Pattern Recurrence
   Tracker with 4 new rows.
3. Write EXECUTION_REPORT.md + FINDINGS.md + RETROSPECTIVE.md inside the SPEC folder.
4. Commit on develop, conventional-commit format, single-concern each.

Iron Rules in sharp focus: 21, 23, 31, 32.

Out of scope:
- Inventing new proposals (only the 4 named)
- Touching skill files other than opticup-strategic + opticup-executor
- DB changes, migrations, RPC edits
- Code outside .claude/skills/ + scripts/audit/ + the SPEC folder + the DECISIONS_LOG row update
- Modifying CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT
- Rewriting whole skill files (targeted edits at named anchors)

Return ONE Hebrew status line:
  "M1_SKILL_IMPROVEMENT_HARVEST [🟢/🟡/🔴]. ארבע הצעות יושמו. דוחות בתיקיית הספק."

Stop on deviation, not on success. The whole point of this SPEC is to freeze the skill state
BEFORE Phase 1B-foundation. A failed harvest → STOP and escalate; do not start any other
Pipeline until harvest is resolved.
```

---

## Pre-flight checklist for the dispatcher (Daniel)

- [ ] Brief sealed at the path above
- [ ] M1B0 closed 🟢 (commit `941dc0c`)
- [ ] No other M1 SPEC in flight
- [ ] Working directory: `C:\Users\User\opticup` (confirm at session start)

---

## Expected execution timeline

- §6 pre-flight probes: ~5 min
- SPEC authoring: ~15 min
- A1 + A2 SPEC_TEMPLATE edits: ~20 min
- E1 SKILL.md edit: ~10 min
- E2 script creation + smoke run: ~25 min
- DECISIONS_LOG update: ~5 min
- EXECUTION_REPORT + FINDINGS + RETROSPECTIVE: ~15 min

**Total estimate: 1.5-2 hours.** Single uninterrupted session.

---

## What happens after this SPEC closes

1. Returns Hebrew status line.
2. Architect dispatches `M1_LENS_PHASE_1B_FOUNDATION` (Brief already prepared; Activation Prompt at `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_FOUNDATION_ACTIVATION_PROMPT.md`).
3. Foundation runs on the frozen, freshly-improved skill state.
4. Procurement follows foundation after Daniel manual QA.

---

*End of activation prompt.*
