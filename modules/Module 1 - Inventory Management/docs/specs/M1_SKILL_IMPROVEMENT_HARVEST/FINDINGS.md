# FINDINGS — M1_SKILL_IMPROVEMENT_HARVEST

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_SKILL_IMPROVEMENT_HARVEST/FINDINGS.md`
> **Written by:** opticup-strategic (single-skill Pipeline mode)
> **Written on:** 2026-05-15

Findings logged during this Pipeline. None CRITICAL or HIGH. All 4 are either dispositions already taken or future-harvest candidates.

---

## F-1 — Commit count budget (planned-5-vs-actual-6 due to smoke-time fix)

- **Severity:** LOW
- **Where:** SPEC §3 criterion #2 + §10 Commit Plan + §5 Stop-Trigger #4 (`commit-count > 5`)
- **Description:** The SPEC planned 5 commits; actual was 6. The +1 was `0923c88` (`fix(audit): unwrap MCP result envelope in advisors-for-objects.mjs (smoke discovery)`) — a one-line fix to `extractLints()` discovered when the live MCP smoke run produced a payload wrapped as `{"result":{"lints":[...]}}` rather than the bare `{"lints":[...]}` the initial implementation assumed.
- **Suggested disposition:** **Future-harvest candidate.** When a SPEC introduces a NEW script that consumes external-tool output (MCP, HTTP, CLI), the commit budget should anticipate +1 commit for a smoke-time fix. Author guidance: SPEC §10 commit plan should include an explicit "smoke-discovery contingency" row for E-class promotions that create new CLI scripts. Not promoted in this harvest (out of scope per Brief anti-pattern #1: "no proposals invented during harvest"); logged here for the NEXT FOREMAN_REVIEW to consider as a 1st-strike Author Proposal.

## F-2 — No canonical MCP-response-shape reference in skill docs

- **Severity:** LOW
- **Where:** `.claude/skills/opticup-executor/SKILL.md` + `.claude/skills/opticup-strategic/SKILL.md` (neither documents canonical MCP tool response shapes)
- **Description:** The MCP `get_advisors` tool wraps its payload as `{"result":{"lints":[...]}}`. This shape is not documented in any skill file. The `advisors-for-objects.mjs` author (this session, c3) had to discover it at smoke time and patch the script in c4. Other future scripts that consume MCP output will face the same discovery cost unless the shape is documented.
- **Suggested disposition:** **Future-harvest candidate.** Either (a) add a new reference file `.claude/skills/opticup-executor/references/MCP_RESPONSE_SHAPES.md` enumerating the canonical shapes of `get_advisors`, `execute_sql`, `list_tables`, `apply_migration`, `get_logs`; or (b) bake a one-paragraph "MCP envelope is `{result: {...}}`" note into both skills' SQL/Verification sections. Logged here for the next FOREMAN_REVIEW.

## F-3 — Single-skill Pipeline retrospective filename convention not documented

- **Severity:** INFO
- **Where:** Brief §11 + this SPEC's §9 Expected Final State
- **Description:** The Brief called for `EXECUTION_REPORT.md + FINDINGS.md + RETROSPECTIVE.md`. The executor SKILL.md only documents the first two as default deliverables. `RETROSPECTIVE.md` is a single-skill-Pipeline addition (this Pipeline being its own retro since there is no separate Foreman review). The filename convention has now appeared 1× — needs to surface in a skill doc if it's to become reusable.
- **Suggested disposition:** **Dismiss for this SPEC** (the Brief was explicit; this SPEC honored it). **Future-harvest candidate** to bake the single-skill-Pipeline retrospective filename + structure into `.claude/skills/opticup-strategic/SKILL.md` §"Self-Improvement Mandate" or a new §"Single-Skill Pipelines" sub-section. Wait for a 2nd single-skill Pipeline to occur before promoting.

## F-4 — DECISIONS_LOG row granularity (defect fixes vs pattern promotions)

- **Severity:** INFO
- **Where:** `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` Pattern Recurrence Tracker
- **Description:** This Pipeline's c4 (script defect fix) was deliberately NOT added as a separate tracker row. The tracker is documented as tracking pattern promotions, not routine defect fixes. But the line is fuzzy — the smoke-time-fix pattern itself could become a 3-strike candidate if it recurs.
- **Suggested disposition:** **Dismiss** — judgment call already made in this Pipeline. Future-harvest candidate to add an explicit policy line to DECISIONS_LOG itself: "Tracker rows record only pattern promotions, not single-incident defect fixes. A pattern that's just 'script breaks at smoke time' is not yet a pattern; it's an event. Three of the same kind = a pattern."

---

## Findings disposition summary

| # | Severity | Disposition |
|---|---|---|
| F-1 | LOW | Future-harvest candidate (1st strike: budget +1 commit for E-class smoke-time fixes) |
| F-2 | LOW | Future-harvest candidate (1st strike: canonical MCP response shape reference) |
| F-3 | INFO | Dismiss for this SPEC; future-harvest candidate at 2nd occurrence |
| F-4 | INFO | Dismiss; future-harvest candidate as DECISIONS_LOG meta-policy line |

Zero findings are orphaned. Zero HIGH or CRITICAL. Zero require a new SPEC. All 4 are logged for the next session to consider promoting if they recur.

*End of FINDINGS.md.*
