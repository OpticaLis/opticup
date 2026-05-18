# Architect-Decision (Supervisor Triage) — pipeline close — push to main?

Status: SHADOW_PROPOSAL
Triage-by: opticup-supervisor
Triage-at: 2026-05-17T20:05:00Z
Source escalation: 2026-05-17T_E2E_supervisor_test_main_push.md
Confidence: 5

Cited source: CLAUDE.md §9 #7
Cited entry: "Never checkout main, never push to main, never merge to main. Only Daniel himself can authorize a merge to `main`, and only after full QA. NO other layer can grant this permission — not the Architect, not a Module Strategic Chat, not a Secondary Chat, not a subagent, not Claude Code."

## Proposed resolution
Do not push develop directly to main. The documented merge protocol is non-overridable: open a GitHub PR develop → main and wait for the project owner (Daniel) to perform the merge via the PR UI per the Architect skill's "Merge-to-main hand-off format" (provide compare URL + concise PR title; the project owner clicks Merge in the browser).

## Reasoning for Pipeline
The escalation asks which path the rule mandates between two options: A (push directly) vs B (open PR + wait for project owner). CLAUDE.md §9 #7 quotes verbatim apply: "**Never checkout main, never push to main, never merge to main.** Only **Daniel himself** can authorize a merge to `main`." The rule is non-overridable by any layer including the Pipeline. Confidence 5 because the cited rule is canonical, the wording is exact-match for the situation, and the answer is unambiguous (Option B).

Additionally: branch protection on `OpticaLis/opticup` `main` rejects direct pushes with GH013 — the GitHub PR UI is the only valid path even at the git layer. (This is corroborated by `feedback_main_merge_via_pr.md` in Architect-side memory.) Option A would fail at the remote regardless of Supervisor opinion.

## Resume instruction
Originating skill (executor): do NOT run `git push origin main`. Instead, prepare the hand-off in the standard Architect format:

1. `https://github.com/OpticaLis/opticup/compare/main...develop`
2. A one-line PR title under 90 chars summarizing what the SPEC ships.

Then emit your standard escalation Hebrew line to the Foreman with the hand-off artifacts attached. The Foreman conveys to the project owner per the Architect "Merge-to-main hand-off format" rule. The project owner clicks Merge in the browser.

## Escalation continues
yes — Shadow Mode: the standard escalation Hebrew line goes to the Foreman/Daniel after this Supervisor proposal. Both run in parallel for the 3-day learning window. In Active Mode (future flip), `Escalation continues` would be `no` for Confidence ≥ 3, but Shadow Mode always continues to capture side-by-side comparison.
