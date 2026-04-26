# FOREMAN_REVIEW — M4_PRE_MERGE_HIGH_FIXES

> **Verdict:** 🟢 **CLOSED (retroactively).** Both HIGH fixes are in develop. SPEC folder created retroactively to preserve folder-per-SPEC discipline.
> **Reviewer:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Reviewed commits:** `c190751` (HIGH-1), `0d7f4f5` (HIGH-2), `4cce9d8` (retroactive close).

---

## SPEC quality audit

The SPEC itself was well-structured: surgical scope, evidence-backed (cited QA_REPORT findings with line numbers), 2-commit plan, explicit out-of-scope clauses to prevent rule-cleanup creep. If it had arrived first, it would have driven the work cleanly.

The procedural break is the entire story here. While I (the strategic chat) was authoring the formal SPEC, Daniel had already issued a short Hebrew dispatch prompt directly to a Claude Code session with the same instructions. By the time the formal SPEC reached the executor, both fixes were already on develop. The executor correctly STOPPED on the Edit failure (Path 1 step 2: `old_string` not found because the fix already applied) and reported the conflict instead of forcing changes.

What this isn't: a SPEC quality issue. The SPEC was sound.
What this is: a workflow question — "what happens when the user wants something fixed faster than the formal authoring loop allows."

## Execution quality audit

Three things to call out, all positive:

1. **The inline executor (who handled Daniel's short dispatch) did the work cleanly.** Two atomic commits, one per HIGH, both pre-commit hooks clean, both EFs redeployed (`send-message` v9, `dispatch-queue` v3), curl-verified that the allowlist gate now passes for `0507168471`. Chrome MCP spot-check on the Activity Log confirmed names rendering. Commit hashes `c190751` and `0d7f4f5`.

2. **The formal-SPEC executor caught the conflict correctly.** Tried Path 1 step 2, got `old_string` not found, STOPPED per Bounded Autonomy (rather than forcing). Recommended the right options (no-op close / retroactive close / leave as-is), and the chat picked retroactive. This is exactly the right discipline.

3. **The retroactive close was clean.** SPEC moved to canonical location, EXECUTION_REPORT written explaining the situation transparently, single commit `4cce9d8` with verify gate clean. No history rewrite, no force-push, no shortcuts.

The executor self-improvement proposal in EXECUTION_REPORT §8 is concrete and useful: detect "work already in develop" by comparing recent `git log` against SPEC's success criteria, STOP and report retroactive-close recommendation rather than attempting Edit. This belongs in opticup-executor's First Action protocol — added to the proposals queue below.

## Findings processing

No new findings. The 2 HIGH items are now closed. The procedural workflow break is captured as an author-skill proposal below.

## 2 author-skill improvement proposals (opticup-strategic)

### Proposal 1 — Establish a "fast-track dispatch" protocol for trivial fixes

**Section to update:** `.claude/skills/opticup-strategic/SKILL.md` → SPEC Authoring Protocol → add new sub-section "Dispatch vs. SPEC".

**Change:** introduce a 2-tier authoring model. When a fix is:
- **≤2 file changes**, AND
- **≤10 lines changed total**, AND
- **explicitly named in a recent FOREMAN_REVIEW or QA_REPORT with concrete success criteria**

→ then the strategic chat can issue a "dispatch prompt" (short Hebrew/English instructions, no formal SPEC). The executor commits the fix directly. After the fix lands, the strategic chat retroactively creates the SPEC folder with EXECUTION_REPORT pointing at the commit hashes — like what just happened with `M4_PRE_MERGE_HIGH_FIXES` — but BY DESIGN, not as a recovery.

For everything else (architecture changes, multi-commit work, hypothesis ladders, anything touching the DB schema or RLS) → formal SPEC first, dispatch second, no exceptions.

**Rationale:** today's incident showed that Daniel's instinct to issue a short dispatch was correct for this scope of fix — but the dual authoring caused confusion. Codifying the protocol turns it from "exception" to "documented norm" and removes the ambiguity. The retroactive-close pattern stays the same; only the legitimacy of the path forward changes.

**Why this isn't bad:** SPECs exist to prevent confabulation, scope creep, and "we don't know what just happened." For a 2-line column-name fix with a verbatim quote from QA_REPORT — the prevention work is already done. The SPEC adds documentation, not safety. Trim the cost.

### Proposal 2 — When a SPEC is in-flight, the strategic chat must acknowledge dispatch attempts

**Section to update:** `.claude/skills/opticup-strategic/SKILL.md` → Communication Patterns.

**Change:** when the user issues a dispatch prompt directly to Claude Code while the strategic chat is mid-SPEC-authoring, the strategic chat should:
1. Detect the dispatch (the user mentions sending instructions to Claude Code) — this is hard to automate; rely on user signaling.
2. Pause SPEC authoring at that moment.
3. Wait for the dispatch to land or fail.
4. If the dispatch landed → switch to retroactive-close mode for the SPEC.
5. If the dispatch failed → continue SPEC authoring as planned.

**Rationale:** this is the dual-stream pattern that just caught us. There's no automation for it; the human-in-the-loop signals are what the strategic chat keys on. Document the pattern so future Daniel-Foreman interactions handle it gracefully without 3 round-trips of "wait, the fix is already in develop."

## 1 executor-skill improvement proposal (per EXECUTION_REPORT §8)

Already captured in EXECUTION_REPORT §8 — agreed, deserves to be added to the executor skill: detect "SPEC's work already in recent commits" before attempting Edits. Won't restate.

## Master-doc update checklist

| File | Status |
|---|---|
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Pending — add Phase History row noting HIGH fixes landed |
| `MASTER_ROADMAP.md` | Not pending — no roadmap shift |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | Not pending — no new files |
| `docs/GLOBAL_MAP.md` | Not pending |
| `docs/GLOBAL_SCHEMA.sql` | Not pending |

The SESSION_CONTEXT update will land in the next merge-prep SPEC, bundled with the merge-readiness summary.

## Verdict

🟢 **CLOSED (retroactively).**

Both HIGH findings from `M4_PRE_MERGE_QA/QA_REPORT.md` are fixed and in develop. The retroactive-close pattern preserved folder-per-SPEC discipline despite the procedural break.

Develop is now merge-ready:
- All M4 build phases closed.
- Campaigns sequence (5 SPECs) closed.
- Pre-merge QA performed (cef5618).
- Pre-merge HIGH-1 + HIGH-2 fixed (c190751 + 0d7f4f5).
- Pre-merge HIGH-3 + HIGH-4 explicitly accepted as debt (separate post-merge SPECs).
- All MEDIUM/LOW/INFO findings explicitly deferred per QA_REPORT recommendations.

What's needed next:
1. **Merge-prep SPEC** — strategic chat authors. Bundles: SESSION_CONTEXT update (current state), confirmation of clean repo, the actual `git checkout main && git merge develop && git push && git checkout develop` sequence (Daniel runs manually per CLAUDE.md §9 working rule 7).
2. **Daniel runs the merge.**
3. **Event manager testing on Prizma.**
4. **Post-merge SPECs** for the deferred HIGH-3, HIGH-4, MEDIUM, LOW items.

The biggest takeaway from this episode is that **trivial fixes don't need full SPECs** — and the project should formalize that with a Dispatch-vs-SPEC protocol (Proposal 1 above) so the next time Daniel wants a 2-line fix in 10 minutes, both sides know how to handle it cleanly.

---

*End of FOREMAN_REVIEW.md.*
