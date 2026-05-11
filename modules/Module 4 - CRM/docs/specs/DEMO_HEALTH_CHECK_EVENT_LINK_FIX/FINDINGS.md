# FINDINGS — DEMO_HEALTH_CHECK_EVENT_LINK_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-11

Three findings during this SPEC's execution. None were fixed in this SPEC (one-concern-per-task discipline).

---

## F1 — `references/DECISIONS_LOG.md` doesn't exist on disk

- **Severity:** LOW (documentation / discoverability)
- **Location:** Repo root — `references/` directory does not exist.
- **Description:** The `opticup-architect` SKILL.md (`Self-improving: every Daniel interaction is logged in references/DECISIONS_LOG.md ...`) and the SPEC's success criterion 12 both name `references/DECISIONS_LOG.md` as the canonical decision log. The directory does not exist. CLAUDE.md §0.5 names `MASTER_ROADMAP.md` (with its §4 Decisions Log table) as the canonical cross-module decisions log. Two skills/docs point to different homes.
- **Why it matters:** Future SPECs referencing "DECISIONS_LOG entry" will repeat this runtime decision. Architect sessions may also be looking for `references/DECISIONS_LOG.md` and writing somewhere else if it isn't found.
- **Suggested next action:** **NEW SPEC** — an Architect-authored decision to either (a) officially name `MASTER_ROADMAP.md §4` the cross-module log and update `opticup-architect` SKILL.md, or (b) create `references/DECISIONS_LOG.md`, move §4 content there, and add a back-reference from MASTER_ROADMAP.md. Author proposal: option (a) — `MASTER_ROADMAP.md §4` is already established, in active use, and richer (rationale column).
- **Workaround applied in this SPEC:** wrote the decision entry to `MASTER_ROADMAP.md §4` per the existing convention. Noted in EXECUTION_REPORT §4 row 1.

## F2 — `destructive-ops-declared` hook regex rejects decimal section numbers

- **Severity:** LOW (developer experience / tooling)
- **Location:** `scripts/checks/destructive-ops-declared.mjs` (regex); `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (where the template currently uses `## 6.5. Destructive Operations`).
- **Description:** The pre-commit hook expects headings matching `## Destructive Operations` or `## N. Destructive Operations` where N is an **integer**. Headings like `## 6.5. Destructive Operations` (with a decimal section number) cause the hook to fail because the regex does not match. The SPEC_TEMPLATE.md mentions the constraint in prose but the template's own example numbering in §6.5 is itself decimal — invites authors into the trap.
- **Why it matters:** Every SPEC that uses decimal section numbering (`6.5`, `3a`) will bounce on the first commit. This SPEC's author hit it. Future SPECs will too. The hook is correct; the template is misleading.
- **Suggested next action:** **TECH_DEBT entry + SPEC_TEMPLATE.md fix.** Either (a) update `SPEC_TEMPLATE.md` to renumber its own example so `## Destructive Operations` is at an integer position, OR (b) loosen the hook regex to accept decimal section numbers (`## N(\.M)?\. Destructive Operations`). Author proposal: option (a) — the constraint is fine, fix the template's example placement.
- **Workaround applied in this SPEC:** renumbered §6.5 → §7 (and shifted §7-§13 to §8-§14). Logged as deviation 1 in EXECUTION_REPORT §3.

## F3 — Diagnostic SPECs with Path-A2 (defer) outcome are not pre-templated in commit plan or success criteria

- **Severity:** INFO (skill improvement)
- **Location:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §10 Commit Plan and §3 Success Criteria; this SPEC's §10 specifically.
- **Description:** The SPEC's §10 Commit Plan enumerated Path A/B/C as conditional commit-message variants but didn't include Path A2 (defer-no-fix). Similarly, Criterion 7 ("Fix applied at the chosen layer") had no clear DEFERRED disposition in §3a — the executor had to map A2 → DEFERRED → ⏸ at runtime. Diagnostic SPECs with built-in escalations CAN resolve as "no fix, follow-up SPEC stub" — that is a first-class outcome, not an exception.
- **Why it matters:** This SPEC is the first end-to-end test of the planned-escalation pattern in the project. The "defer" outcome was foreseeable from the SPEC's autonomy envelope (Path A2 listed in escalation file), but not pre-templated. Future diagnostic SPECs (likely cadence: 1-3 per quarter as cross-module strategic questions surface) would benefit.
- **Suggested next action:** **opticup-strategic SKILL improvement.** Add a "Diagnostic SPECs with built-in escalation" subsection to `.claude/skills/opticup-strategic/SKILL.md` describing: how to author criterion-7-as-DEFERRED dispositions, how to pre-template the closure commit message for each path, and how to pre-author follow-up SPEC stubs. The Foreman session writing FOREMAN_REVIEW.md for this SPEC should propose this as one of the 2 author-skill improvements.

---

*End of FINDINGS.md.*
