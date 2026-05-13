# M4_STATUS_MODEL_DOC_UPDATE — Foreman Review

**Reviewer:** opticup-strategic (Foreman)
**Date:** 2026-05-14

## Summary

Doc-only SPEC. STATUS_MODEL.md now describes the 2026-05-14 reality. Deliberate Brief-divergence on the "Mark F-CSF-1 RESOLVED" line — pre-flight verified F-CSF-1 is genuinely open. The divergence is the right call.

## Spec Quality

§0 pre-flight is the key element here. It caught the Brief's inaccuracy and made the SPEC explicit about diverging. Documented the divergence in BOTH the SPEC (§0, §2) and the FINDINGS (F-SMD-1).

## Execution Quality

3 surgical edits + 1 new sub-section (§6.8). No accidental touches to Mermaid blocks or to the Authority Matrix. File grew 12 lines.

## Findings Processing

- F-SMD-1 → folded into the morning summary's "Open questions for Daniel" — F-CSF-1 remains open.

## Author Skill Improvement Proposals

### Proposal 1 — Brief authors should run pre-flight on EVERY "Mark X RESOLVED" instruction
**File:** `.claude/skills/opticup-architect/SKILL.md` (Brief authoring section)
**Why:** Brief §3.4 said "Mark F-CSF-1 RESOLVED" without confirming F-CSF-1 was actually resolved by the upcoming SPECs. Today's pre-flight caught it; tomorrow's pre-flight may not.
**Proposed change:** Add to "Brief authoring checklist": "Before listing any 'Mark X RESOLVED' or 'Close X' in §3, verify X is actually resolved by an upstream SPEC OR by a same-Brief SPEC. If neither, do not list the resolution claim."

### Proposal 2 — STATUS_MODEL.md style: prefer historical-notes section over inline rewrites
**File:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (Doc-update SPEC sub-template)
**Why:** Two paths for keeping a long-lived doc current: (a) rewrite §X each time facts change, (b) keep §X stable and append a "Historical notes" section. This SPEC chose (a) for §5.4 (the canonical reference is needed correct) and (b) for §6.8 (the historical record matters). The hybrid worked. Codify it.
**Proposed change:** Add to the doc-update template: "Update authoritative sections in-place. Append historical notes for context, not for current state."

## Executor Skill Improvement Proposals

### Proposal 1 — Brief discrepancies surface to SPEC §0, not to the executor
**Why:** This SPEC's pre-flight in §0 caught the Brief discrepancy at AUTHOR time, so the executor never had to make the judgment call. That's the right place — the executor's job is to execute the SPEC, not to second-guess the Brief.
**Proposed change:** Add to executor SKILL: "If you spot a Brief discrepancy during execution that the SPEC did not pre-flight, STOP and escalate. Do not silently override the SPEC even if the Brief is right and the SPEC is wrong."

### Proposal 2 — Doc edits must verify Mermaid block integrity post-edit
**Why:** STATUS_MODEL.md has 3 Mermaid stateDiagram-v2 blocks. A doc edit that accidentally breaks the fence syntax (extra/missing backticks) silently turns the diagram into preformatted text. This executor ran `grep -c "stateDiagram-v2"` post-edit and got 3 — green. Codify the check.
**Proposed change:** "After ANY edit to a markdown file containing Mermaid: grep for the diagram start sentinels (e.g., `stateDiagram-v2`, `flowchart TD`, `sequenceDiagram`) and compare count to pre-edit. Mismatch → STOP."

## Verdict

**🟢 CLOSED.**

Doc refresh landed. Brief discrepancy caught and documented. Improvement proposals captured.

---

*End of FOREMAN_REVIEW.*
