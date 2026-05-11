# FINDINGS — M1_5_DESIGN_SYSTEM_HYBRID_FINAL

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-11
> **Companion to:** `EXECUTION_REPORT.md` in this folder.

Findings are issues / observations encountered during execution that are NOT in the SPEC's scope. They are NOT fixed inside this SPEC (one concern per task). They are surfaced here for the Foreman to triage into future SPECs, TECH_DEBT entries, or dismissals.

---

## Finding 1 — Grep-based success criteria are vulnerable to prose-comment false positives

- **Severity:** LOW
- **Category:** SPEC authoring pattern
- **Location:** SPEC §3 SC #8 (violet leak) and SC #9 (serif leak); manifested in `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/_tokens.css` header comment.
- **Description:** Header documentation comments in `_tokens.css` initially read `…No violet, no serif, no topbar…` — prose describing what the design is NOT. SPEC §3 SC #8 / SC #9 use literal `grep -irE "violet"` and `grep -iE "serif"` which match the prose as eagerly as they would match a real token definition. First verification pass failed both criteria as false positives. The SPEC's authorization (§9 Commit 3 explicit SC-hotfix bundling, derived from prior FINDINGS Finding 5) absorbed the impact — the comment was edited mid-Commit-3 and now reads "…No v2-B top nav, solid Navy only…" with zero forbidden words.
- **Why it matters:** The literal-grep / prose-comment collision is a recurring class of issue across design-system SPECs (any SPEC that combines (a) a forbidden-token grep and (b) header documentation listing what the design rejects will hit it). Fixing it ONCE in SPEC_TEMPLATE shape — either by always allowing prose-comment exemption (`grep -irE "violet" --include="*.html" --include-types=css | grep -v "^[^:]*:[[:space:]]*[/*]"`) or by always pre-emptively documenting it in §13 anti-patterns ("don't say the forbidden word in prose either") — would eliminate the failure mode entirely.
- **Suggested next action:** UPDATE — add to `opticup-strategic` SKILL's SPEC-authoring checklist: "If §3 has a grep-for-forbidden-token criterion, scan the resulting file's header prose for the forbidden tokens BEFORE finalizing. Either grep with comment-exclusion, or write the criterion to require the forbidden token never appear OUTSIDE prose comments (which requires the executor to mark comments distinctively)."

---

## Finding 2 — Commit-count anchor in §3 SC #2 can be off-by-one when the SPEC-authoring commit lands between the anchor and the executor's start

- **Severity:** LOW
- **Category:** SPEC arithmetic — same family as v2's Finding 1, but a new sub-shape
- **Location:** SPEC §3 SC #2, "`git log 23349de..HEAD --oneline \| wc -l` → `3`"
- **Description:** The SPEC was authored at HEAD=`5b78fd7` (the SPEC-authoring commit itself), one commit past the anchor `23349de`. The criterion text says the executor will produce 3 commits AND the verify command counts the entire log range from `23349de` — which on first run already counts the SPEC-authoring commit (1) before the executor adds 3 more (= 4). The executor's actual work is 3 commits as intended; the log range reads 4. §5 trigger #4's self-correction authorization (also from v2's FINDINGS) absorbed it: 3 commits produced by this run is ground truth, logged it, continued.
- **Why it matters:** v2 already raised SPEC-arithmetic as Finding 1. This SPEC applied the lesson by anchoring to a specific hash and explicitly authorizing self-correction. BOTH applications worked. But the underlying root cause — anchor hash drift between SPEC-authoring time and SPEC-execution time — is still present. A SPEC author who anchors to `git rev-parse HEAD` at authoring time creates this issue every time, because the SPEC's own commit will land between authoring and execution.
- **Suggested next action:** UPDATE — `opticup-strategic` SPEC-authoring checklist should compute the anchor as `git rev-parse HEAD^` (one commit BEFORE the SPEC commit lands) AND state expected count from THAT anchor. Or simpler: the criterion text should read "the executor will produce 3 commits ON TOP OF the SPEC-authoring commit; `git log <SPEC-authoring-commit>..HEAD --oneline | wc -l` should return `3`" — anchoring to the SPEC-authoring commit itself, which the executor can read from `git log -1 --pretty=%H -- modules/.../docs/specs/<SPEC_SLUG>/SPEC.md`.

---

*End of findings. 2 total, both LOW severity, both pattern-level improvements to SPEC-authoring rather than code-level bugs. The Hybrid Final mockup files themselves have zero open issues.*
